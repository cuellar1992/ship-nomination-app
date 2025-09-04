const express = require('express');
const router = express.Router();
const TruckWorkDay = require('../models/TruckWorkDay');
const Sampler = require('../models/Sampler');

function escapeRegex(text = '') {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function enrichSampler(body = {}) {
  if (!body) return body;
  const nameRaw = (body.samplerName || '').trim();
  if (!nameRaw) {
    body.samplerId = undefined;
    return body;
  }
  try {
    const regex = new RegExp(`^${escapeRegex(nameRaw)}$`, 'i');
    const sampler = await Sampler.findOne({ name: regex });
    if (sampler) {
      body.samplerId = sampler._id;
      // Normalizar nombre a como está en la BD
      body.samplerName = sampler.name;
    } else {
      body.samplerId = undefined;
      console.warn('[TruckWorkDays] Sampler not found for name:', nameRaw);
    }
  } catch (err) {
    console.warn('[TruckWorkDays] Error resolving samplerId:', err?.message);
  }
  return body;
}

// Create
router.post('/', async (req, res) => {
  try {
    const body = await enrichSampler(req.body || {});
    // Auto-complete status for past records unless explicitly provided
    if (!body.status) {
      try {
        const now = new Date();
        const shiftEnd = body?.shift?.endTime ? new Date(body.shift.endTime) : null;
        const lastLoadStart = Array.isArray(body?.loads)
          ? body.loads
              .filter(l => l && l.startTime)
              .map(l => new Date(l.startTime))
              .sort((a, b) => b - a)[0] || null
          : null;
        const operationDate = body?.operationDate ? new Date(body.operationDate) : null;
        const cutoff = shiftEnd || lastLoadStart || operationDate;
        if (cutoff && now > cutoff) {
          body.status = 'completed';
        }
      } catch {}
    }
    const doc = await TruckWorkDay.create(body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('Create TruckWorkDay error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// List by range (optional)
router.get('/', async (req, res) => {
  try {
    const { from, to, surveyor } = req.query;
    const filter = {};
    if (from || to) {
      filter.operationDate = {};
      if (from) filter.operationDate.$gte = new Date(from);
      if (to) filter.operationDate.$lte = new Date(to);
    }
    if (surveyor && typeof surveyor === 'string') {
      filter.samplerName = new RegExp(`^${escapeRegex(surveyor)}$`, 'i');
    }
    const docs = await TruckWorkDay.find(filter).sort({ operationDate: -1, createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error('List TruckWorkDay error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const doc = await TruckWorkDay.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const body = await enrichSampler(req.body || {});
    const doc = await TruckWorkDay.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const doc = await TruckWorkDay.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;


