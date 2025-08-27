/**
 * PASO 2: Rutas SamplingRoster - Backend Endpoints
 * Archivo: backend/routes/samplingrosters.js
 */

const express = require('express');
const router = express.Router();
const SamplingRoster = require('../models/SamplingRoster');
const ShipNomination = require('../models/ShipNomination');
const Sampler = require('../models/Sampler');

// ✅ ENDPOINT 1: Verificar si existe roster para un ship nomination
// GET /api/sampling-rosters/by-nomination/:nominationId
router.get('/by-nomination/:nominationId', async (req, res) => {
  try {
    const { nominationId } = req.params;

    console.log(`🔍 Checking roster existence for nomination: ${nominationId}`);

    // Buscar roster existente
    const existingRoster = await SamplingRoster.findByShipNomination(nominationId);

    if (existingRoster) {
      console.log(`✅ Found existing roster: ${existingRoster._id}`);
      
      res.json({
        success: true,
        exists: true,
        data: existingRoster,
        message: 'Existing roster found'
      });
    } else {
      console.log(`📝 No roster found for nomination: ${nominationId}`);
      
      res.json({
        success: true,
        exists: false,
        data: null,
        message: 'No roster exists for this nomination'
      });
    }

  } catch (error) {
    console.error('❌ Error checking roster existence:', error);
    res.status(500).json({
      success: false,
      exists: false,
      data: null,
      message: 'Server error checking roster existence',
      error: error.message
    });
  }
});

// ✅ ENDPOINT 2: Crear nuevo roster
// POST /api/sampling-rosters
router.post('/', async (req, res) => {
  try {
    const rosterData = req.body;

    console.log(`📝 Creating new roster for vessel: ${rosterData.vesselName}`);

    // Validar que ship nomination existe
    const shipNomination = await ShipNomination.findById(rosterData.shipNomination);
    if (!shipNomination) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Ship nomination not found'
      });
    }

    // Verificar que no existe roster para esta nomination
    const existingRoster = await SamplingRoster.findOne({ 
      shipNomination: rosterData.shipNomination 
    });

    if (existingRoster) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'Roster already exists for this ship nomination'
      });
    }

    // Validar samplers
    // Para draft inicial permitimos lineSampling vacío y solo validamos sampler de office si viene
    if (rosterData.officeSampling && rosterData.officeSampling.sampler && rosterData.officeSampling.sampler.id) {
      await validateSamplers(rosterData);
    }

    // Crear nuevo roster
    const newRoster = new SamplingRoster({
      ...rosterData,
      status: 'draft',
      createdBy: 'user', // TODO: Implementar autenticación
      lastModifiedBy: 'user'
    });

    const savedRoster = await newRoster.save();

    console.log(`✅ Roster created successfully: ${savedRoster._id}`);

    res.status(201).json({
      success: true,
      data: savedRoster,
      message: 'Sampling roster created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating roster:', error);
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        data: null,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    } else {
      res.status(500).json({
        success: false,
        data: null,
        message: 'Server error creating roster',
        error: error.message
      });
    }
  }
});

// ✅ ENDPOINT 3: Actualizar roster existente (INTELIGENTE)
// PUT /api/sampling-rosters/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`🔄 Updating roster: ${id}`);

    // Buscar roster existente
    const existingRoster = await SamplingRoster.findById(id);
    if (!existingRoster) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Roster not found'
      });
    }

    // Validar samplers si se están actualizando
    if (updateData.officeSampling || updateData.lineSampling) {
      await validateSamplers(updateData, existingRoster);
    }

    // Detectar tipo de cambio para logging
    const changeType = detectChangeType(existingRoster, updateData);
    console.log(`📊 Change type detected: ${changeType}`);

    // Actualizar campos
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== '__v') {
        existingRoster[key] = updateData[key];
      }
    });

    existingRoster.lastModifiedBy = 'user'; // TODO: Implementar autenticación

    const updatedRoster = await existingRoster.save();

    console.log(`✅ Roster updated successfully: ${updatedRoster._id} (v${updatedRoster.version})`);

    res.json({
      success: true,
      data: updatedRoster,
      message: `Roster updated successfully (${changeType})`,
      changeType: changeType
    });

  } catch (error) {
    console.error('❌ Error updating roster:', error);
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        data: null,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    } else {
      res.status(500).json({
        success: false,
        data: null,
        message: 'Server error updating roster',
        error: error.message
      });
    }
  }
});

// ✅ ENDPOINT 4: Endpoint especial para auto-save inteligente
// PUT /api/sampling-rosters/auto-save/:id
router.put('/auto-save/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, data: updateData } = req.body;

    console.log(`💾 Auto-saving roster: ${id} (${changeType})`);

    const existingRoster = await SamplingRoster.findById(id);
    if (!existingRoster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found for auto-save'
      });
    }

    // Aplicar cambios específicos según tipo (simplificado y explícito)
    switch (changeType) {
      case 'timeUpdate': { // startDischarge, etcTime, dischargeTimeHours, flags
        updateTimesInRoster(existingRoster, updateData);
        if (typeof updateData.hasCustomStartDischarge === 'boolean') {
          existingRoster.hasCustomStartDischarge = updateData.hasCustomStartDischarge;
        }
        if (typeof updateData.hasCustomETC === 'boolean') {
          existingRoster.hasCustomETC = updateData.hasCustomETC;
        }
        break;
      }
      case 'officeSamplingUpdate': {
        if (updateData.officeSampling) {
          existingRoster.officeSampling = updateData.officeSampling;
        }
        break;
      }
      case 'lineTurnUpdate': {
        const { rowId, turn } = updateData;
        if (rowId && turn) {
          const turnIndex = parseInt(String(rowId).replace('line-sampler-row-', ''));
          if (!isNaN(turnIndex) && existingRoster.lineSampling[turnIndex]) {
            existingRoster.lineSampling[turnIndex] = turn;
          }
        }
        break;
      }
      case 'autoGenerate': {
        updateCompleteSchedule(existingRoster, updateData);
        break;
      }
      case 'generalUpdate':
      default: {
        Object.keys(updateData).forEach(key => {
          if (key !== '_id' && key !== 'createdAt' && key !== '__v') {
            existingRoster[key] = updateData[key];
          }
        });
        break;
      }
    }

    existingRoster.lastModifiedBy = 'user';
    const savedRoster = await existingRoster.save();

    console.log(`💾 Auto-save completed: ${savedRoster._id} (${changeType})`);

    res.json({
      success: true,
      data: savedRoster,
      message: 'Auto-save completed',
      changeType: changeType
    });

  } catch (error) {
    console.error('❌ Error in auto-save:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-save failed',
      error: error.message
    });
  }
});

// ✅ ENDPOINT 5: Obtener roster por ID
// GET /api/sampling-rosters/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const roster = await SamplingRoster.findById(id)
      .populate('shipNomination')
      .populate('officeSampling.sampler.id')
      .populate('lineSampling.sampler.id');

    if (!roster) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Roster not found'
      });
    }

    res.json({
      success: true,
      data: roster,
      message: 'Roster retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error retrieving roster:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error retrieving roster',
      error: error.message
    });
  }
});

// ✅ ENDPOINT 6: Listar todos los rosters (con filtros)
// GET /api/sampling-rosters
router.get('/', async (req, res) => {
  try {
    const { status, vessel, limit = 50, skip = 0 } = req.query;

    // Construir filtro dinámico
    const filter = {};
    if (status) filter.status = status;
    if (vessel) filter.vesselName = new RegExp(vessel, 'i');

    const rosters = await SamplingRoster.find(filter)
      .populate('shipNomination', 'vesselName amspecRef')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await SamplingRoster.countDocuments(filter);

    res.json({
      success: true,
      data: rosters,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + rosters.length) < total
      },
      message: `Found ${rosters.length} rosters`
    });

  } catch (error) {
    console.error('❌ Error listing rosters:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Server error listing rosters',
      error: error.message
    });
  }
});

// ✅ ENDPOINT 7: Eliminar roster
// DELETE /api/sampling-rosters/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const roster = await SamplingRoster.findById(id);
    if (!roster) {
      return res.status(404).json({
        success: false,
        message: 'Roster not found'
      });
    }

    // Solo permitir eliminar drafts o rosters no activos
    if (roster.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active roster. Change status first.'
      });
    }

    await SamplingRoster.findByIdAndDelete(id);

    console.log(`🗑️ Roster deleted: ${id} (${roster.vesselName})`);

    res.json({
      success: true,
      message: 'Roster deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting roster:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting roster',
      error: error.message
    });
  }
});

// ✅ ENDPOINT 8: Validar disponibilidad de sampler
// POST /api/sampling-rosters/validate-sampler
router.post('/validate-sampler', async (req, res) => {
  try {
    const { samplerId, timeRange, excludeRosterId } = req.body;

    // Buscar conflictos de horario
    const conflictingRosters = await findSamplerConflicts(samplerId, timeRange, excludeRosterId);

    const isAvailable = conflictingRosters.length === 0;

    res.json({
      success: true,
      isAvailable,
      conflicts: conflictingRosters,
      message: isAvailable ? 'Sampler is available' : 'Sampler has scheduling conflicts'
    });

  } catch (error) {
    console.error('❌ Error validating sampler availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating sampler availability',
      error: error.message
    });
  }
});

// 🔧 FUNCIONES AUXILIARES

// Validar que todos los samplers existen
async function validateSamplers(rosterData, existingRoster = null) {
  const samplerIds = new Set();

  // Recopilar IDs de samplers
  if (rosterData.officeSampling) {
    samplerIds.add(rosterData.officeSampling.sampler.id);
  }

  if (rosterData.lineSampling) {
    rosterData.lineSampling.forEach(turn => {
      samplerIds.add(turn.sampler.id);
    });
  }

  // Verificar que existen en la base de datos
  for (const samplerId of samplerIds) {
    const sampler = await Sampler.findById(samplerId);
    if (!sampler) {
      throw new Error(`Sampler not found: ${samplerId}`);
    }
  }
}

// Detectar tipo de cambio
function detectChangeType(existingRoster, updateData) {
  if (updateData.dischargeTimeHours && updateData.dischargeTimeHours !== existingRoster.dischargeTimeHours) {
    return updateData.dischargeTimeHours > existingRoster.dischargeTimeHours ? 'expansion' : 'reduction';
  }
  
  if (updateData.lineSampling && updateData.lineSampling.length !== existingRoster.lineSampling.length) {
    return 'schedule_modification';
  }
  
  if (updateData.officeSampling) {
    return 'office_sampling_update';
  }
  
  return 'general_update';
}

// Actualizar sampler específico
function updateSamplerInRoster(roster, updateData) {
  const { type, rowId, newSampler } = updateData;
  
  if (type === 'office') {
    roster.officeSampling.sampler = newSampler;
  } else if (type === 'line') {
    const turnIndex = parseInt(rowId.replace('line-sampler-row-', ''));
    if (roster.lineSampling[turnIndex]) {
      roster.lineSampling[turnIndex].sampler = newSampler;
    }
  }
}

// Actualizar tiempos
function updateTimesInRoster(roster, updateData) {
  if (updateData.startDischarge) roster.startDischarge = updateData.startDischarge;
  if (updateData.etcTime) roster.etcTime = updateData.etcTime;
  if (updateData.dischargeTimeHours) roster.dischargeTimeHours = updateData.dischargeTimeHours;
}

// Actualizar schedule completo
function updateCompleteSchedule(roster, updateData) {
  if (updateData.officeSampling) roster.officeSampling = updateData.officeSampling;
  if (updateData.lineSampling) roster.lineSampling = updateData.lineSampling;
  if (updateData.dischargeTimeHours) roster.dischargeTimeHours = updateData.dischargeTimeHours;
}

// Expandir roster
function expandRosterSchedule(roster, updateData) {
  const { additionalTurns, newDischargeHours } = updateData;
  roster.lineSampling.push(...additionalTurns);
  roster.dischargeTimeHours = newDischargeHours;
}

// Reducir roster
function reduceRosterSchedule(roster, updateData) {
  const { updatedTurns, newDischargeHours } = updateData;
  roster.lineSampling = updatedTurns;
  roster.dischargeTimeHours = newDischargeHours;
}

// Buscar conflictos de sampler
async function findSamplerConflicts(samplerId, timeRange, excludeRosterId = null) {
  const filter = {
    status: { $in: ['active', 'draft'] },
    $or: [
      { 'officeSampling.sampler.id': samplerId },
      { 'lineSampling.sampler.id': samplerId }
    ]
  };

  if (excludeRosterId) {
    filter._id = { $ne: excludeRosterId };
  }

  // TODO: Implementar lógica de overlapping de tiempo
  const conflictingRosters = await SamplingRoster.find(filter);
  
  return conflictingRosters; // Simplificado por ahora
}

module.exports = router;