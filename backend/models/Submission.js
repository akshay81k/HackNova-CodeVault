const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamName: {
    type: String,
    trim: true,
    default: ''
  },
  originalFileName: {
    type: String,
    required: true
  },
  storedFileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  sha256Hash: {
    type: String,
    required: true,
    length: 64
  },
  trustedTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  // ISO 8601 string for display
  timestampISO: {
    type: String,
    required: true
  },
  verificationId: {
    type: String,
    unique: true,
    required: true
  },
  submittedBeforeDeadline: {
    type: Boolean,
    required: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// One submission per user per event
submissionSchema.index({ event: 1, submittedBy: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
