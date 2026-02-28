const express = require('express');
const Event = require('../models/Event');
const Submission = require('../models/Submission');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events (public, with search)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, active } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (active === 'true') {
      query.isActive = true;
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email organization')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email organization');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const submissionCount = await Submission.countDocuments({ event: event._id });

    res.json({ success: true, event, submissionCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/events
// @desc    Create event
// @access  Organizer, Admin
router.post('/', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const { title, description, deadline, tags, maxTeamSize } = req.body;

    if (!title || !description || !deadline) {
      return res.status(400).json({ success: false, message: 'Title, description, and deadline are required.' });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'Deadline must be a valid future date.' });
    }

    const event = await Event.create({
      title,
      description,
      deadline: deadlineDate,
      organizer: req.user._id,
      tags: tags || [],
      maxTeamSize: maxTeamSize || 5
    });

    await event.populate('organizer', 'name email organization');

    res.status(201).json({ success: true, message: 'Event created successfully.', event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Organizer (own event), Admin
router.put('/:id', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this event.' });
    }

    const { title, description, deadline, tags, isActive, maxTeamSize } = req.body;
    if (title) event.title = title;
    if (description) event.description = description;
    if (deadline) event.deadline = new Date(deadline);
    if (tags) event.tags = tags;
    if (typeof isActive === 'boolean') event.isActive = isActive;
    if (maxTeamSize) event.maxTeamSize = maxTeamSize;

    await event.save();
    await event.populate('organizer', 'name email organization');

    res.json({ success: true, message: 'Event updated.', event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/events/organizer/my-events
// @desc    Get events created by logged-in organizer
// @access  Organizer, Admin
router.get('/organizer/my-events', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { organizer: req.user._id };
    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ createdAt: -1 });

    // Add submission counts
    const eventsWithCounts = await Promise.all(events.map(async (event) => {
      const count = await Submission.countDocuments({ event: event._id });
      return { ...event.toJSON(), submissionCount: count };
    }));

    res.json({ success: true, events: eventsWithCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
