const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'SUBMISSION_UPLOADED',
      'SUBMISSION_RESUBMITTED',
      'HASH_GENERATED',
      'BLOCKCHAIN_ANCHORED',
      'ML_CLASSIFIED',
      'PLAGIARISM_CHECK_RUN',
      'VERIFICATION_CHECKED'
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: {
    type: String,
    default: ''
  }
}, {
  timestamps: false
});

module.exports = mongoose.model('TimelineEvent', timelineEventSchema);
