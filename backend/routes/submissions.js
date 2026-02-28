const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('crypto');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
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
  // Accept .zip files and any uploaded folder (multipart)
  const allowedExtensions = ['.zip', '.gz', '.tar', '.tar.gz'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  // We accept zip or any file named .git related
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

// Generate SHA-256 hash of a file
const hashFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
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

// @route   POST /api/submissions
// @desc    Submit .git folder (as zip) for an event
// @access  User (team leader)
router.post('/', protect, authorize('user'), upload.single('gitFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Please upload your .git folder as a ZIP.' });
    }

    const { eventId, teamName, notes } = req.body;

    if (!eventId) {
      // Remove uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    // Check event exists
    const event = await Event.findById(eventId);
    if (!event) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Check if event is still active
    if (!event.isActive) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'This event is no longer active.' });
    }

    // Check deadline
    const now = new Date();
    const isBeforeDeadline = now <= event.deadline;

    if (!isBeforeDeadline) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Submission deadline has passed. Deadline was: ${event.deadline.toISOString()}`
      });
    }

    // Check if already submitted
    const existing = await Submission.findOne({ event: eventId, submittedBy: req.user._id });
    if (existing) {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({
        success: false,
        message: 'You have already submitted for this event. Only one submission per team leader is allowed.'
      });
    }

    // Generate SHA-256 hash
    const sha256Hash = await hashFile(req.file.path);

    // Trust timestamp (server-side)
    const trustedTimestamp = now;
    const timestampISO = trustedTimestamp.toISOString();

    // Generate verification ID
    let verificationId;
    let unique = false;
    while (!unique) {
      verificationId = generateVerificationId();
      const existingVid = await Submission.findOne({ verificationId });
      if (!existingVid) unique = true;
    }

    const submission = await Submission.create({
      event: eventId,
      submittedBy: req.user._id,
      teamName: teamName || req.user.name,
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      fileSize: req.file.size,
      sha256Hash,
      trustedTimestamp,
      timestampISO,
      verificationId,
      submittedBeforeDeadline: isBeforeDeadline,
      notes: notes || ''
    });

    await submission.populate([
      { path: 'event', select: 'title deadline' },
      { path: 'submittedBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Submission received and hashed successfully.',
      submission: {
        id: submission._id,
        verificationId: submission.verificationId,
        sha256Hash: submission.sha256Hash,
        trustedTimestamp: submission.timestampISO,
        teamName: submission.teamName,
        originalFileName: submission.originalFileName,
        fileSize: submission.fileSize,
        event: submission.event,
        submittedBy: submission.submittedBy
      }
    });
  } catch (err) {
    // Cleanup file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already submitted for this event.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/submissions/my
// @desc    Get current user's submissions
// @access  User
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

// @route   GET /api/submissions/event/:eventId
// @desc    Get all submissions for an event
// @access  Organizer (own events), Admin
router.get('/event/:eventId', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Organizer can only see their own events
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

// @route   GET /api/submissions/all
// @desc    Get all submissions (Admin)
// @access  Admin
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

// @route   GET /api/submissions/:id
// @desc    Get single submission
// @access  Owner, Organizer of event, Admin
router.get('/:id', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('event', 'title deadline organizer')
      .populate('submittedBy', 'name email');

    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const isOwner = submission.submittedBy._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
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
