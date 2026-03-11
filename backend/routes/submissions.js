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
const { uploadFileToS3, getSignedDownloadUrl } = require('../services/s3');

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
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end',  () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Generate unique verification ID
const generateVerificationId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'HN-';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// Helper: safely delete a local file
const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/submissions
// @desc    Submit a ZIP for an event. After hashing the file is uploaded to S3.
//          The S3 key is stored in MongoDB; the local temp file is removed.
// @body    { eventId, teamId, teamName?, notes? }
// @access  User (team leader)
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

    if (!eventId) {
      safeUnlink(filePath);
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    if (!teamId) {
      safeUnlink(filePath);
      return res.status(400).json({ success: false, message: 'teamId is required.' });
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
    const isBeforeDeadline = now <= event.deadline;
    if (!isBeforeDeadline) {
      safeUnlink(filePath);
      return res.status(400).json({
        success: false,
        message: `Submission deadline has passed. Deadline was: ${event.deadline.toISOString()}`
      });
    }

    // Count existing submissions for this user+event (for submissionNumber tracking)
    const previousCount = await Submission.countDocuments({ event: eventId, submittedBy: req.user._id });
    const submissionNumber = previousCount + 1;

    // Step 1: SHA-256 of the raw uploaded file
    const sha256Hash       = await hashFile(filePath);
    const trustedTimestamp = now;
    const timestampISO     = trustedTimestamp.toISOString();

    // Step 2: Extract ZIP → find .git → hash it
    let gitHash = null;
    try {
      gitHash = await computeGitHash(filePath);
    } catch (gitErr) {
      console.error('[Submission] .git hash failed (non-fatal):', gitErr.message);
    }

    // Step 3: Anchor hash on Solana Devnet
    let blockchainTxId     = null;
    let blockchainAnchored = false;
    let blockchainError    = null;

    try {
      const hashToAnchor = gitHash || sha256Hash;
      blockchainTxId     = await anchorHashOnSolana(teamId, hashToAnchor, trustedTimestamp);
      blockchainAnchored = true;
    } catch (chainErr) {
      blockchainError = chainErr.message;
      console.error('[Submission] Solana anchoring failed (non-fatal):', chainErr.message);
    }

    // Step 4: Upload file to AWS S3
    let fileUrl = null;
    let s3Key   = null;
    let s3UploadError = null;

    try {
      // Key format: submissions/<eventId>/<teamId>/<filename>
      s3Key   = `submissions/${eventId}/${teamId}/${req.file.filename}`;
      fileUrl = await uploadFileToS3(filePath, s3Key, 'application/zip');
    } catch (s3Err) {
      s3UploadError = s3Err.message;
      console.error('[Submission] S3 upload failed (non-fatal):', s3Err.message);
      // Fall back: store local URL so the submission is still usable
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Remove local temp file after S3 upload (whether successful or not)
    if (s3Key && !s3UploadError) {
      safeUnlink(filePath);
    }

    // Step 5: Generate unique verification ID
    let verificationId;
    let unique = false;
    while (!unique) {
      verificationId = generateVerificationId();
      const existingVid = await Submission.findOne({ verificationId });
      if (!existingVid) unique = true;
    }

    // Step 6: Save everything to MongoDB
    const submission = await Submission.create({
      event:     eventId,
      submittedBy: req.user._id,
      teamId,
      teamName:  teamName || req.user.name,
      originalFileName: req.file.originalname,
      storedFileName:   req.file.filename,
      fileSize:  req.file.size,
      fileUrl,
      s3Key,

      sha256Hash,
      gitHash,

      trustedTimestamp,
      timestampISO,

      verificationId,
      submittedBeforeDeadline: isBeforeDeadline,
      notes: notes || '',

      submissionNumber,

      blockchainTxId,
      blockchainAnchored,
      blockchainError,
    });

    await submission.populate([
      { path: 'event',        select: 'title deadline' },
      { path: 'submittedBy',  select: 'name email' }
    ]);

    return res.status(201).json({
      success: true,
      message: submissionNumber === 1
        ? 'Submission received, hashed, and anchored on the blockchain.'
        : `Re-submission #${submissionNumber} received and anchored on the blockchain.`,
      submission: {
        id:             submission._id,
        verificationId: submission.verificationId,
        sha256Hash:     submission.sha256Hash,
        gitHash:        submission.gitHash,
        trustedTimestamp: submission.timestampISO,
        teamId:         submission.teamId,
        teamName:       submission.teamName,
        originalFileName: submission.originalFileName,
        fileSize:       submission.fileSize,
        fileUrl:        submission.fileUrl,
        s3Key:          submission.s3Key,
        submissionNumber: submission.submissionNumber,
        blockchainTxId: submission.blockchainTxId,
        blockchainAnchored: submission.blockchainAnchored,
        blockchainError: submission.blockchainError,
        solanaTxUrl: submission.blockchainTxId
          ? `https://explorer.solana.com/tx/${submission.blockchainTxId}?cluster=devnet`
          : null,
        event:       submission.event,
        submittedBy: submission.submittedBy
      }
    });
  } catch (err) {
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

module.exports = router;
