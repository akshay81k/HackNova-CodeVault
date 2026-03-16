const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Submission = require('../models/Submission');
const TimelineEvent = require('../models/TimelineEvent');

const router = express.Router();

// Temp upload for verification
const tempDir = path.join(__dirname, '../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    cb(null, `verify-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  }
});

const tempUpload = multer({
  storage: tempStorage,
  limits: { fileSize: 200 * 1024 * 1024 }
});

// Hash a file using SHA-256
const hashFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// @route   POST /api/verify/file
// @desc    Verify a submission by uploading file and comparing hash
// @access  Public
router.post('/file', tempUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for verification.' });
    }

    const { verificationId } = req.body;

    if (!verificationId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Verification ID is required.' });
    }

    // Find submission by verification ID
    const submission = await Submission.findOne({ verificationId: verificationId.toUpperCase().trim() })
      .populate('event', 'title deadline organizer')
      .populate('submittedBy', 'name email');

    if (!submission) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: `No submission found with Verification ID: ${verificationId}`
      });
    }

    // Hash the uploaded file
    const uploadedHash = await hashFile(req.file.path);

    // Cleanup temp file
    fs.unlinkSync(req.file.path);

    // Compare hashes
    const isMatch = uploadedHash === submission.sha256Hash;

    res.json({
      success: true,
      result: isMatch ? 'MATCH' : 'MISMATCH',
      isMatch,
      details: {
        verificationId: submission.verificationId,
        expectedHash: submission.sha256Hash,
        providedHash: uploadedHash,
        submittedBy: submission.submittedBy.name,
        submissionTime: submission.timestampISO,
        eventTitle: submission.event.title,
        eventDeadline: submission.event.deadline,
        submittedBeforeDeadline: submission.submittedBeforeDeadline,
        teamName: submission.teamName,
        originalFileName: submission.originalFileName
      }
    });

    // ── Timeline: VERIFICATION_CHECKED ──
    TimelineEvent.create({ submission: submission._id, eventType: 'VERIFICATION_CHECKED', details: `File verification: ${isMatch ? 'MATCH' : 'MISMATCH'}` })
      .catch(err => console.error('[Timeline] Error:', err.message));
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/verify/:verificationId
// @desc    Lookup submission record by verification ID (no file needed)
// @access  Public
router.get('/:verificationId', async (req, res) => {
  try {
    const submission = await Submission.findOne({
      verificationId: req.params.verificationId.toUpperCase().trim()
    })
      .populate('event', 'title deadline description organizer')
      .populate('submittedBy', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: `No submission found with Verification ID: ${req.params.verificationId}`
      });
    }

    res.json({
      success: true,
      record: {
        verificationId: submission.verificationId,
        sha256Hash: submission.sha256Hash,
        submittedBy: submission.submittedBy.name,
        submissionTime: submission.timestampISO,
        eventTitle: submission.event.title,
        eventDeadline: submission.event.deadline,
        submittedBeforeDeadline: submission.submittedBeforeDeadline,
        teamName: submission.teamName,
        originalFileName: submission.originalFileName,
        fileSize: submission.fileSize
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/verify/hash
// @desc    Verify by providing just a hash string (no file upload)
// @access  Public
router.post('/hash', async (req, res) => {
  try {
    const { verificationId, hashString } = req.body;

    if (!verificationId || !hashString) {
      return res.status(400).json({ success: false, message: 'Verification ID and hash string are required.' });
    }

    const submission = await Submission.findOne({
      verificationId: verificationId.toUpperCase().trim()
    })
      .populate('event', 'title deadline')
      .populate('submittedBy', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'No submission found with this Verification ID.'
      });
    }

    const isMatch = hashString.toLowerCase().trim() === submission.sha256Hash.toLowerCase();

    res.json({
      success: true,
      result: isMatch ? 'MATCH' : 'MISMATCH',
      isMatch,
      details: {
        verificationId: submission.verificationId,
        expectedHash: submission.sha256Hash,
        providedHash: hashString.toLowerCase().trim(),
        submittedBy: submission.submittedBy.name,
        submissionTime: submission.timestampISO,
        eventTitle: submission.event.title,
        teamName: submission.teamName
      }
    });

    // ── Timeline: VERIFICATION_CHECKED ──
    TimelineEvent.create({ submission: submission._id, eventType: 'VERIFICATION_CHECKED', details: `Hash verification: ${isMatch ? 'MATCH' : 'MISMATCH'}` })
      .catch(err => console.error('[Timeline] Error:', err.message));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
