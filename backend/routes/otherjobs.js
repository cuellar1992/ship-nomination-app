const express = require('express');
const router = express.Router();
const OtherJob = require('../models/OtherJob');
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
      console.warn('[OtherJobs] Sampler not found for name:', nameRaw);
    }
  } catch (err) {
    console.warn('[OtherJobs] Error resolving samplerId:', err?.message);
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
        const operationDate = body?.operationDate ? new Date(body.operationDate) : null;
        const cutoff = shiftEnd || operationDate;
        
        if (cutoff && now > cutoff) {
          body.status = 'completed';
        }
      } catch {}
    }
    
    const doc = await OtherJob.create(body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('Create OtherJob error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// List by range (optional)
router.get('/', async (req, res) => {
  try {
    const { from, to, surveyor, search } = req.query;
    const filter = {};
    
    // Filtro por rango de fechas
    if (from || to) {
      filter.operationDate = {};
      if (from) filter.operationDate.$gte = new Date(from);
      if (to) filter.operationDate.$lte = new Date(to);
    }
    
    // Filtro por sampler/surveyor
    if (surveyor && typeof surveyor === 'string') {
      filter.samplerName = new RegExp(`^${escapeRegex(surveyor)}$`, 'i');
    }
    
    // Filtro por búsqueda en descripción
    if (search && typeof search === 'string') {
      filter.jobDescription = new RegExp(escapeRegex(search), 'i');
    }
    
    const docs = await OtherJob.find(filter).sort({ operationDate: -1, createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error('List OtherJob error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const doc = await OtherJob.findById(req.params.id);
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
    const doc = await OtherJob.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const doc = await OtherJob.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/otherjobs/stats/hours - Estadísticas de horas para gráficos
router.get('/stats/hours', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchFilter = {};
    if (startDate || endDate) {
      matchFilter.operationDate = {};
      if (startDate) matchFilter.operationDate.$gte = new Date(startDate);
      if (endDate) matchFilter.operationDate.$lte = new Date(endDate);
    }

    const hoursStats = await OtherJob.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$samplerName',
          totalHours: { $sum: '$shift.hours' },
          jobCount: { $sum: 1 },
          breakdown: {
            $push: {
              date: '$operationDate',
              description: '$jobDescription',
              hours: '$shift.hours',
              status: '$status'
            }
          }
        }
      },
      {
        $project: {
          samplerName: '$_id',
          totalHours: 1,
          jobCount: 1,
          breakdown: 1,
          _id: 0
        }
      },
      { $sort: { totalHours: -1 } }
    ]);

    res.json({ success: true, data: hoursStats });
  } catch (err) {
    console.error('OtherJob hours stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/otherjobs/stats/summary - Estadísticas generales
router.get('/stats/summary', async (req, res) => {
  try {
    const totalJobs = await OtherJob.countDocuments();
    const statusCounts = await OtherJob.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const thisMonthJobs = await OtherJob.countDocuments({
      operationDate: { $gte: currentMonth }
    });

    const totalHours = await OtherJob.aggregate([
      { $group: { _id: null, total: { $sum: '$shift.hours' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalJobs,
        thisMonthJobs,
        totalHours: totalHours[0]?.total || 0,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (err) {
    console.error('OtherJob summary stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
