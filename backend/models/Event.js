const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: 2000
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  maxTeamSize: {
    type: Number,
    default: 5
  },

  // ── Participating Teams (from CSV/Excel upload) ─────────────────────────────
  participatingTeams: [{
    teamId: { type: String, trim: true },
    teamName: { type: String, trim: true, default: '' }
  }],

  // Original filename of the uploaded teams CSV/Excel
  teamsFileName: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Virtual: is deadline passed
eventSchema.virtual('isExpired').get(function() {
  return new Date() > this.deadline;
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
