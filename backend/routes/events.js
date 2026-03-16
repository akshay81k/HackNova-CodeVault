const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const XLSX    = require('xlsx');
const Event   = require('../models/Event');
const Submission = require('../models/Submission');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Multer storage for teams CSV/Excel uploads ─────────────────────────────
const teamsDir = path.join(__dirname, '../uploads/teams');
if (!fs.existsSync(teamsDir)) {
  fs.mkdirSync(teamsDir, { recursive: true });
}

const teamsStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, teamsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `teams-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const teamsUpload = multer({
  storage: teamsStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV (.csv) or Excel (.xlsx, .xls) files are allowed for team lists.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

/**
 * Parse a CSV or Excel file and extract team data.
 * Looks for columns: teamId (or id/team_id), teamName (or name/team_name).
 * Falls back to first column = teamId, second column = teamName.
 *
 * @param {string} filePath - Absolute path to the uploaded file
 * @returns {Array<{teamId: string, teamName: string}>}
 */
function parseTeamsFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of objects (first row = headers)
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) {
    throw new Error('Teams file is empty or has no data rows.');
  }

  const teams = [];
  for (const row of rows) {
    // Try to find teamId column (case-insensitive)
    const keys = Object.keys(row);
    const teamIdKey = keys.find(k =>
      /^(teamid|team_id|id|team id)$/i.test(k.trim())
    ) || keys[0];

    const teamNameKey = keys.find(k =>
      /^(teamname|team_name|name|team name)$/i.test(k.trim())
    ) || keys[1] || null;

    const teamId = String(row[teamIdKey] || '').trim();
    const teamName = teamNameKey ? String(row[teamNameKey] || '').trim() : '';

    if (teamId) {
      teams.push({ teamId, teamName });
    }
  }

  if (teams.length === 0) {
    throw new Error('No valid team IDs found in the uploaded file.');
  }

  return teams;
}

// ── Routes ─────────────────────────────────────────────────────────────────

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
      .sort({ createdAt: -1 })
      // Don't expose full team list in the public list
      .select('-participatingTeams');

    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/events/organizer/my-events
// @desc    Get events created by logged-in organizer
// @access  Organizer, Admin
// NOTE: This MUST come before /:id to avoid Express matching "organizer" as an :id param
router.get('/organizer/my-events', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { organizer: req.user._id };
    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ createdAt: -1 })
      .select('-participatingTeams'); // omit team list for performance

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

// @route   GET /api/events/:id
// @desc    Get single event
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email organization')
      .select('-participatingTeams'); // hide team list from public

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const submissionCount = await Submission.countDocuments({ event: event._id });

    res.json({ success: true, event, submissionCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/events/:id/verify-team
// @desc    Check whether a teamId is registered for this event
// @query   ?teamId=TEAM-001
// @access  Private (authenticated users only)
router.get('/:id/verify-team', protect, async (req, res) => {
  try {
    const { teamId } = req.query;

    if (!teamId || !teamId.trim()) {
      return res.status(400).json({ success: false, message: 'teamId query parameter is required.' });
    }

    const event = await Event.findById(req.params.id).select('title participatingTeams teamsFileName deadline isActive');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // If no teams file was uploaded, verification is not required
    if (!event.teamsFileName || event.participatingTeams.length === 0) {
      return res.json({
        success: true,
        verified: true,
        message: 'No team roster configured for this event — all teams are accepted.',
        noRoster: true
      });
    }

    // Check if teamId exists (case-insensitive)
    const found = event.participatingTeams.find(
      t => t.teamId.toLowerCase() === teamId.trim().toLowerCase()
    );

    if (found) {
      return res.json({
        success: true,
        verified: true,
        teamId: found.teamId,
        teamName: found.teamName,
        message: `Team "${found.teamId}" is registered for this event.`
      });
    } else {
      return res.status(404).json({
        success: false,
        verified: false,
        message: `Team ID "${teamId.trim()}" is not registered for this event. Please check your Team ID.`
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/events
// @desc    Create event (with optional teams CSV/Excel)
// @access  Organizer, Admin
router.post('/', protect, authorize('organizer', 'admin'), teamsUpload.single('teamsFile'), async (req, res) => {
  const uploadedFilePath = req.file ? req.file.path : null;

  try {
    const { title, description, deadline, tags, maxTeamSize } = req.body;

    if (!title || !description || !deadline) {
      if (uploadedFilePath) fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Title, description, and deadline are required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Teams list (CSV/Excel) is required.' });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      if (uploadedFilePath) fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({ success: false, message: 'Deadline must be a valid future date.' });
    }

    // Parse teams file if provided
    let participatingTeams = [];
    let teamsFileName = null;

    if (req.file) {
      try {
        participatingTeams = parseTeamsFile(req.file.path);
        teamsFileName = req.file.filename;
      } catch (parseErr) {
        fs.unlinkSync(uploadedFilePath);
        return res.status(400).json({ success: false, message: `Teams file error: ${parseErr.message}` });
      }
    }

    // Parse tags from JSON string or comma-separated
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch {
        parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const event = await Event.create({
      title,
      description,
      deadline: deadlineDate,
      organizer: req.user._id,
      tags: parsedTags,
      maxTeamSize: Number(maxTeamSize) || 5,
      participatingTeams,
      teamsFileName
    });

    await event.populate('organizer', 'name email organization');

    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      event: {
        ...event.toJSON(),
        teamsCount: participatingTeams.length
      }
    });
  } catch (err) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event (with optional new teams file)
// @access  Organizer (own event), Admin
router.put('/:id', protect, authorize('organizer', 'admin'), teamsUpload.single('teamsFile'), async (req, res) => {
  const uploadedFilePath = req.file ? req.file.path : null;

  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      if (uploadedFilePath) fs.unlinkSync(uploadedFilePath);
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      if (uploadedFilePath) fs.unlinkSync(uploadedFilePath);
      return res.status(403).json({ success: false, message: 'Not authorized to update this event.' });
    }

    const { title, description, deadline, tags, isActive, maxTeamSize } = req.body;
    if (title) event.title = title;
    if (description) event.description = description;
    if (deadline) event.deadline = new Date(deadline);
    if (tags) {
      try {
        event.tags = JSON.parse(tags);
      } catch {
        event.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    if (typeof isActive === 'boolean') event.isActive = isActive;
    if (typeof isActive === 'string') event.isActive = isActive === 'true';
    if (maxTeamSize) event.maxTeamSize = Number(maxTeamSize);

    // Replace teams file if a new one was uploaded
    if (req.file) {
      try {
        const newTeams = parseTeamsFile(req.file.path);
        // Delete old teams file if it exists
        if (event.teamsFileName) {
          const oldPath = path.join(teamsDir, event.teamsFileName);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        event.participatingTeams = newTeams;
        event.teamsFileName = req.file.filename;
      } catch (parseErr) {
        fs.unlinkSync(uploadedFilePath);
        return res.status(400).json({ success: false, message: `Teams file error: ${parseErr.message}` });
      }
    }

    await event.save();
    await event.populate('organizer', 'name email organization');

    res.json({ success: true, message: 'Event updated.', event });
  } catch (err) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
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

    // Clean up teams file
    if (event.teamsFileName) {
      const teamFilePath = path.join(teamsDir, event.teamsFileName);
      if (fs.existsSync(teamFilePath)) fs.unlinkSync(teamFilePath);
    }

    res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
