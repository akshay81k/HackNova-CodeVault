const express = require('express');
const multer  = require('multer');
const crypto  = require('crypto');
const path    = require('path');
const fs      = require('fs');
const Submission        = require('../models/Submission');
const Event             = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');
const { computeGitHash }     = require('../services/gitHasher');
const { anchorHashOnSolana } = require('../services/solana');
const { uploadFileToS3, getSignedDownloadUrl, downloadFileFromS3 } = require('../services/s3');
const { compareSubmissions } = require('../services/plagiarism');
const { runClassifier } = require('../services/classifier');
const https = require('https');
const http  = require('http');

const router = express.Router();

// Ensure uploads directory exists (used as temp staging area before S3)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config — disk storage (temp, cleaned up after S3 upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `submission-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.zip', '.gz', '.tar', '.tar.gz'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext) || file.originalname.includes('.git') || ext === '') {
    cb(null, true);
  } else {
    cb(new Error('Only .zip or .git folder archives are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB max
});

// Generate SHA-256 hash of a file (stream-based)
const hashFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash   = crypto.createHash('sha256');
    // Using a larger buffer size (256KB) for faster hashing
    const stream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 });
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end',  () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// ... (keep generateVerificationId and safeUnlink as they were)
const generateVerificationId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'HN-';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/submissions
// @desc    Submit a ZIP for an event. Optimized: parallelized tasks and 
//          background processing for slow operations.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', protect, authorize('user'), upload.single('gitFile'), async (req, res) => {
  const filePath = req.file ? req.file.path : null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload your full repository as a ZIP (including the .git folder).'
      });
    }

    const { eventId, teamId, teamName, notes } = req.body;

    if (!eventId || !teamId) {
      safeUnlink(filePath);
      return res.status(400).json({ success: false, message: 'Event ID and teamId are required.' });
    }

    // Validate event
    const event = await Event.findById(eventId);
    if (!event) {
      safeUnlink(filePath);
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (!event.isActive) {
      safeUnlink(filePath);
      return res.status(400).json({ success: false, message: 'This event is no longer active.' });
    }

    const now = new Date();
    if (now > event.deadline) {
      safeUnlink(filePath);
      return res.status(400).json({
        success: false,
        message: `Submission deadline has passed. Deadline was: ${event.deadline.toISOString()}`
      });
    }

    // Prepare non-blocking tasks
    const trustedTimestamp = now;
    const timestampISO     = trustedTimestamp.toISOString();

    // Step 1: Start all heavy tasks in parallel
    console.log(`[Submission] Starting parallel processing for team ${teamId}...`);
    
    // Hashing tasks (wait for these)
    const sha256Promise = hashFile(filePath);
    const gitHashPromise = computeGitHash(filePath).catch(err => {
      console.error('[Submission] .git hash failed:', err.message);
      return null;
    });

    // S3 Upload task (wait for this)
    const s3Key = `submissions/${eventId}/${teamId}/${req.file.filename}`;
    const s3Promise = uploadFileToS3(filePath, s3Key, 'application/zip').catch(err => {
      console.error('[Submission] S3 upload failed:', err.message);
      return null; 
    });

    // ML Task (background - don't wait for response)
    const mlPromise = runClassifier(filePath).catch(err => {
      console.error('[Submission] ML classification failed:', err.message);
      return null;
    });

    // Step 2: Wait ONLY for hashing and S3 upload before replying
    const [sha256Hash, gitHash, uploadedUrl, previousCount] = await Promise.all([
      sha256Promise,
      gitHashPromise,
      s3Promise,
      Submission.countDocuments({ event: eventId, submittedBy: req.user._id })
    ]);

    const submissionNumber = previousCount + 1;
    let fileUrl = uploadedUrl;
    if (!fileUrl) {
      // Fallback to local URL if S3 failed
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Generate unique verification ID
    let verificationId;
    let unique = false;
    while (!unique) {
      verificationId = generateVerificationId();
      const existingVid = await Submission.findOne({ verificationId });
      if (!existingVid) unique = true;
    }

    // Step 3: Save initial record to MongoDB
    const submission = await Submission.create({
      event: eventId,
      submittedBy: req.user._id,
      teamId,
      teamName: teamName || req.user.name,
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      fileSize: req.file.size,
      fileUrl,
      s3Key,
      sha256Hash,
      gitHash,
      trustedTimestamp,
      timestampISO,
      verificationId,
      submittedBeforeDeadline: true,
      notes: notes || '',
      submissionNumber,
      blockchainAnchored: false, // Updated in background
      mlCategory: null,          // Updated in background
      mlConfidence: null         // Updated in background
    });

    await submission.populate([
      { path: 'event', select: 'title deadline' },
      { path: 'submittedBy', select: 'name email' }
    ]);

    // Step 4: Respond quickly to the client
    res.status(201).json({
      success: true,
      message: submissionNumber === 1
        ? 'Submission received and processing in background.'
        : `Re-submission #${submissionNumber} received and processing in background.`,
      submission: {
        id: submission._id,
        verificationId: submission.verificationId,
        sha256Hash: submission.sha256Hash,
        gitHash: submission.gitHash,
        trustedTimestamp: submission.timestampISO,
        teamId: submission.teamId,
        teamName: submission.teamName,
        originalFileName: submission.originalFileName,
        fileSize: submission.fileSize,
        fileUrl: submission.fileUrl,
        s3Key: submission.s3Key,
        submissionNumber: submission.submissionNumber,
        blockchainAnchored: false,
        mlCategory: null,
        event: submission.event,
        submittedBy: submission.submittedBy
      }
    });

    // Step 5: Finalize slow tasks in the background
    (async () => {
      try {
        console.log(`[Submission] [Background] Finalizing tasks for ${submission._id}...`);
        
        // Run Solana anchoring and wait for ML classifier
        const [mlResult, blockchainTxId] = await Promise.all([
          mlPromise,
          anchorHashOnSolana(teamId, gitHash || sha256Hash, trustedTimestamp).catch(err => {
            console.error('[Submission] [Background] Solana anchoring failed:', err.message);
            return null;
          })
        ]);

        const updateData = {};
        if (mlResult) {
          updateData.mlCategory = mlResult.category;
          updateData.mlConfidence = mlResult.confidence;
        }
        if (blockchainTxId) {
          updateData.blockchainTxId = blockchainTxId;
          updateData.blockchainAnchored = true;
        } else {
          updateData.blockchainError = 'Background anchoring failed or was partially successful without confirmation';
        }

        await Submission.findByIdAndUpdate(submission._id, updateData);
        console.log(`[Submission] [Background] Tasks complete for ${submission._id}.`);
      } catch (bgErr) {
        console.error(`[Submission] [Background] Error: ${bgErr.message}`);
      } finally {
        // Only delete local file once S3, Hashing, and ML are ALL finished
        safeUnlink(filePath);
      }
    })();

  } catch (err) {
    console.error(`[Submission] CRITICAL ERROR: ${err.message}`);
    safeUnlink(filePath);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/submissions/my
// @desc    Get current user's submissions (all events, all re-submissions)
// @access  User
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const submissions = await Submission.find({ submittedBy: req.user._id })
      .populate('event', 'title deadline description')
      .sort({ createdAt: -1 });
    res.json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/submissions/event/:eventId
// @desc    Get all submissions for an event
// @access  Organizer (own events), Admin
// ─────────────────────────────────────────────────────────────────────────────
router.get('/event/:eventId', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    if (req.user.role === 'organizer' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const submissions = await Submission.find({ event: req.params.eventId })
      .populate('submittedBy', 'name email organization')
      .sort({ trustedTimestamp: -1 });

    res.json({ success: true, count: submissions.length, submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/submissions/all
// @desc    Get all submissions (Admin)
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate('event', 'title deadline')
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: submissions.length, submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/submissions/:id/download
// @desc    Generate a pre-signed S3 download URL (valid for 5 minutes)
//          Falls back to the stored fileUrl if no S3 key is present.
// @access  Organizer of the event, Admin
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/download', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('event', 'title organizer');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    // Organizer can only download from their own events
    if (
      req.user.role === 'organizer' &&
      submission.event.organizer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // If we have an S3 key, generate a pre-signed link (5 minutes)
    if (submission.s3Key) {
      try {
        const signedUrl = await getSignedDownloadUrl(submission.s3Key, 300);
        return res.json({
          success: true,
          downloadUrl: signedUrl,
          fileName: submission.originalFileName,
          expiresInSeconds: 300,
          source: 's3'
        });
      } catch (s3Err) {
        console.error('[Download] Pre-sign failed, falling back to stored URL:', s3Err.message);
      }
    }

    // Fall back to the stored file URL (local or public S3 URL)
    if (submission.fileUrl) {
      return res.json({
        success: true,
        downloadUrl: submission.fileUrl,
        fileName: submission.originalFileName,
        source: 'stored'
      });
    }

    return res.status(404).json({ success: false, message: 'No download URL available for this submission.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/submissions/:id
// @desc    Get single submission
// @access  Owner, Organizer of event, Admin
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('event', 'title deadline organizer')
      .populate('submittedBy', 'name email');

    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const isOwner    = submission.submittedBy._id.toString() === req.user._id.toString();
    const isAdmin    = req.user.role === 'admin';
    const isOrganizer = req.user.role === 'organizer' &&
      submission.event.organizer.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/submissions/compare
// @desc    Compare two submissions for code similarity (plagiarism detection)
// @body    { submissionIdA, submissionIdB }
// @access  Organizer (own event), Admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Download a file from a URL and return it as a Buffer.
 */
function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadToBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with status ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Get a ZIP buffer for a submission — from S3 (pre-signed URL) or local uploads.
 */
async function getSubmissionZipBuffer(submission) {
  console.log(`[Plagiarism] Fetching ZIP for ${submission.teamId}...`);
  // Try S3 first
  if (submission.s3Key) {
    try {
      console.log(`[Plagiarism] Attempting S3 download via SDK: ${submission.s3Key}`);
      const buffer = await downloadFileFromS3(submission.s3Key);
      console.log(`[Plagiarism] S3 download successful (${buffer.length} bytes)`);
      return buffer;
    } catch (err) {
      console.warn('[Plagiarism] S3 download failed, trying local fallback:', err.message);
    }
  }

  // Fallback: local file
  const localPath = path.join(__dirname, '../uploads', submission.storedFileName);
  console.log(`[Plagiarism] Checking local path: ${localPath}`);
  if (fs.existsSync(localPath)) {
    try {
      const buffer = fs.readFileSync(localPath);
      console.log(`[Plagiarism] Local read successful (${buffer.length} bytes)`);
      return buffer;
    } catch (err) {
      console.error(`[Plagiarism] Local read failed: ${err.message}`);
    }
  }

  console.error(`[Plagiarism] ZIP not found for submission ${submission._id}`);
  throw new Error(`Cannot retrieve ZIP for submission ${submission._id} (${submission.teamName || submission.teamId})`);
}

router.post('/compare', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const { submissionIdA, submissionIdB } = req.body;

    if (!submissionIdA || !submissionIdB) {
      return res.status(400).json({
        success: false,
        message: 'Both submissionIdA and submissionIdB are required.'
      });
    }

    if (submissionIdA === submissionIdB) {
      return res.status(400).json({
        success: false,
        message: 'Cannot compare a submission with itself.'
      });
    }

    // Fetch both submissions
    const [subA, subB] = await Promise.all([
      Submission.findById(submissionIdA).populate('event', 'title organizer'),
      Submission.findById(submissionIdB).populate('event', 'title organizer'),
    ]);

    if (!subA || !subB) {
      return res.status(404).json({
        success: false,
        message: `Submission not found: ${!subA ? submissionIdA : submissionIdB}`
      });
    }

    // Verify both belong to the same event
    if (subA.event._id.toString() !== subB.event._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Both submissions must belong to the same event.'
      });
    }

    // Organizer can only compare submissions from their own events
    if (
      req.user.role === 'organizer' &&
      subA.event.organizer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    console.log(`[Plagiarism] Comparing: "${subA.teamName}" (${subA.teamId}) vs "${subB.teamName}" (${subB.teamId})`);

    // Download both ZIPs
    console.log('[Plagiarism] Downloading ZIPs...');
    const [zipBufferA, zipBufferB] = await Promise.all([
      getSubmissionZipBuffer(subA),
      getSubmissionZipBuffer(subB),
    ]);

    // Run comparison
    console.log('[Plagiarism] ZIPs received, starting comparison engine...');
    const result = await compareSubmissions(zipBufferA, zipBufferB);
    console.log('[Plagiarism] Comparison complete!');

    return res.json({
      success: true,
      comparison: {
        teamA: { id: subA.teamId, name: subA.teamName, submissionId: subA._id },
        teamB: { id: subB.teamId, name: subB.teamName, submissionId: subB._id },
        eventTitle: subA.event.title,
        ...result,
      }
    });
  } catch (err) {
    console.error('[Plagiarism] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
