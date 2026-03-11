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
  // The team identifier sent from the frontend (used for Solana memo payload)
  teamId: {
    type: String,
    trim: true,
    default: ''
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

  // S3 object key (e.g. "submissions/<eventId>/<teamId>/submission-xxx.zip")
  // Used to generate pre-signed download URLs. Null if S3 upload failed.
  s3Key: {
    type: String,
    default: null
  },

  // Public or local download URL. Falls back to local /uploads URL if S3 is unavailable.
  fileUrl: {
    type: String,
    default: null
  },

  // SHA-256 hash of the entire uploaded file
  sha256Hash: {
    type: String,
    required: true,
    length: 64
  },

  // SHA-256 hash of the extracted .git folder contents
  gitHash: {
    type: String,
    default: null
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
  },

  // Submission number for this team/event (1 = first, 2 = re-submission, etc.)
  submissionNumber: {
    type: Number,
    default: 1
  },

  // ── Blockchain Anchoring (Solana Devnet) ───────────────────────────────────
  blockchainTxId: {
    type: String,
    default: null
  },
  blockchainAnchored: {
    type: Boolean,
    default: false
  },
  blockchainError: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// NOTE: Removed unique compound index { event, submittedBy } to allow
// multiple submissions per user per event (until deadline).

module.exports = mongoose.model('Submission', submissionSchema);
