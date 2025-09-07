// backend/routes/shipnominations.js
const express = require("express");
const router = express.Router();
const ShipNomination = require("../models/ShipNomination");

// Importar modelos para validación de referencias
const Client = require("../models/Client");
const Agent = require("../models/Agent");
const Terminal = require("../models/Terminal");
const Berth = require("../models/Berth");
const Surveyor = require("../models/Surveyor");
const Sampler = require("../models/Sampler");
const Chemist = require("../models/Chemist");
const ProductType = require("../models/ProductType");

// GET /api/shipnominations - Obtener todas las ship nominations
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit,  // Sin valor por defecto
      status,
      terminal,
      startDate,
      endDate,
      sortBy = "etb",
      sortOrder = "desc",
      search,  // NUEVO: parámetro de búsqueda
      mode = "recent"  // NUEVO: modo de operación
    } = req.query;

    // LÓGICA INTELIGENTE DE LÍMITE
    let actualLimit;
    if (limit) {
      actualLimit = parseInt(limit);
    } else if (search) {
      actualLimit = 50; // Más resultados para búsqueda
    } else if (mode === "recent") {
      actualLimit = 5;  // Solo 5 más recientes por ETB
    } else {
      actualLimit = 100; // Fallback general
    }

    // Construir filtros
    const filters = {};

    if (status) {
      filters.status = status;
    }

    if (terminal) {
      filters["terminal.name"] = new RegExp(terminal, "i");
    }

    if (startDate || endDate) {
      filters.etb = {};
      if (startDate) filters.etb.$gte = new Date(startDate);
      if (endDate) filters.etb.$lte = new Date(endDate);
    }

    // NUEVO: Filtro de búsqueda por vessel name o AmSpec
    if (search) {
      filters.$or = [
        { vesselName: new RegExp(search, "i") },
        { amspecRef: new RegExp(search, "i") }
      ];
    }

    // Configurar ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Ejecutar consulta con paginación
    const shipNominations = await ShipNomination.find(filters)
      .sort(sort)
      .limit(actualLimit)
      .skip((page - 1) * actualLimit)
      .exec();

    // Contar total para paginación
    const total = await ShipNomination.countDocuments(filters);

    res.json({
      success: true,
      data: shipNominations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / actualLimit),
        totalItems: total,
        itemsPerPage: actualLimit,
        hasMore: total > (page * actualLimit)
      },
      searchMode: !!search,
      mode: mode,
      sortBy: sortBy  // Para debugging
    });
  } catch (error) {
    console.error("Error fetching ship nominations:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching ship nominations",
    });
  }
});

// GET /api/shipnominations/stats/summary - Estadísticas generales
router.get("/stats/summary", async (req, res) => {
  try {
    const totalNominations = await ShipNomination.countDocuments();
    const statusCounts = await ShipNomination.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // Obtener el final del mes para el rango completo
    const nextMonth = new Date(thisMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const thisMonthCount = await ShipNomination.countDocuments({
      etb: { 
        $gte: thisMonth,
        $lt: nextMonth
      },
    });

    res.json({
      success: true,
      data: {
        totalNominations,
        statusBreakdown: statusCounts,
        thisMonthCount,
      },
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({
      success: false,
      error: "Error getting statistics",
    });
  }
});

// GET /api/shipnominations/debug - Debug endpoint
router.get("/debug", async (req, res) => {
  try {
    const shipNominations = await ShipNomination.find({}).limit(5);
    const count = await ShipNomination.countDocuments();

    res.json({
      success: true,
      debug: {
        total: count,
        sample: shipNominations,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Debug endpoint error",
    });
  }
});

// GET /api/shipnominations/:id - Obtener una ship nomination específica
router.get("/:id", async (req, res) => {
  try {
    const shipNomination = await ShipNomination.findById(req.params.id);

    if (!shipNomination) {
      return res.status(404).json({
        success: false,
        error: "Ship nomination not found",
      });
    }

    res.json({ success: true, data: shipNomination });
  } catch (error) {
    console.error("Error fetching ship nomination:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching ship nomination",
    });
  }
});

// ========================================
// HELPER FUNCTION MEJORADA
// ========================================
const findReference = async (Model, name, fieldName) => {
  if (!name) {
    throw new Error(`${fieldName} is required`);
  }

  // Manejar arrays (para MultiSelect)
  if (Array.isArray(name)) {
    if (name.length === 0) {
      throw new Error(`At least one ${fieldName} is required`);
    }

    const results = [];
    for (const itemName of name) {
      if (typeof itemName !== "string") {
        throw new Error(`${fieldName} contains invalid data`);
      }
      const item = await Model.findOne({ name: itemName.trim() });
      if (!item) {
        throw new Error(`${fieldName} "${itemName}" not found`);
      }
      results.push({ id: item._id, name: item.name });
    }
    return results;
  } else {
    // Manejar strings (para SingleSelect)
    if (typeof name !== "string") {
      throw new Error(`${fieldName} must be a string`);
    }
    const item = await Model.findOne({ name: name.trim() });
    if (!item) {
      throw new Error(`${fieldName} "${name}" not found`);
    }
    return { id: item._id, name: item.name };
  }
};

// POST /api/shipnominations - Crear nueva ship nomination
router.post("/", async (req, res) => {
  try {
    console.log("📨 Received data:", req.body);

    const {
      shipName,
      amspecRef,
      clientRef,
      clientName,
      agent,
      terminal,
      berth,
      surveyor,
      sampler,
      chemist,
      productTypes,
      pilotOnBoard,
      etb,
      etc,
      notes,
      samplerRestrictions,
    } = req.body;

    // ========================================
    // VALIDACIONES BÁSICAS
    // ========================================
    if (!shipName || !amspecRef) {
      return res.status(400).json({
        success: false,
        error: "Vessel name and AmSpec Reference # are required",
      });
    }

    // ========================================
    // VALIDAR Y OBTENER REFERENCIAS
    // ========================================
    console.log("🔍 Validating references...");

    // SingleSelects
    const agentRef = await findReference(Agent, agent, "Agent");
    const terminalRef = await findReference(Terminal, terminal, "Terminal");
    const berthRef = await findReference(Berth, berth, "Berth");
    const surveyorRef = await findReference(Surveyor, surveyor, "Surveyor");
    const samplerRef = await findReference(Sampler, sampler, "Sampler");
    const chemistRef = await findReference(Chemist, chemist, "Chemist");

    // MultiSelects
    const clientReferences = await findReference(Client, clientName, "Clients");
    const productTypeRefs = await findReference(
      ProductType,
      productTypes,
      "Product Types"
    );

    // ========================================
    // VALIDAR FECHAS
    // ========================================
    const pilotDate = new Date(pilotOnBoard);
    const etbDate = new Date(etb);
    const etcDate = new Date(etc);

    if (
      isNaN(pilotDate.getTime()) ||
      isNaN(etbDate.getTime()) ||
      isNaN(etcDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Please provide valid dates.",
      });
    }

    // ========================================
    // CREAR SHIP NOMINATION
    // ========================================
    console.log("💾 Creating ship nomination...");

    const nominationData = {
      // Campos HTML
      vesselName: shipName.trim(),
      amspecRef: amspecRef.trim(),
      clientRef: clientRef ? clientRef.trim() : undefined,

      // Referencias SingleSelect
      agent: agentRef,
      terminal: terminalRef,
      berth: berthRef,
      surveyor: surveyorRef,
      sampler: samplerRef,
      chemist: chemistRef,

      // MultiSelect
      clientName: clientReferences,
      productTypes: productTypeRefs,

      // DateTimePickers
      pilotOnBoard: pilotDate,
      etb: etbDate,
      etc: etcDate,

      // Opcional
      notes: notes ? notes.trim() : undefined,
    };

    // Agregar samplerRestrictions si existen
    if (samplerRestrictions && typeof samplerRestrictions === "object") {
      nominationData.samplerRestrictions = samplerRestrictions;
    }

    const shipNomination = new ShipNomination(nominationData);
    // Auto status: completed if ETC está en el pasado (a menos que se envíe status explícito)
    if (!shipNomination.status) {
      try {
        const now = new Date();
        const etcCutoff = etbDate && etcDate ? etcDate : etbDate || pilotDate;
        if (etcCutoff && now > etcCutoff) {
          shipNomination.status = 'completed';
        }
      } catch {}
    }

    const savedShipNomination = await shipNomination.save();

    console.log("✅ Ship nomination saved with ID:", savedShipNomination._id);

    res.status(201).json({
      success: true,
      data: savedShipNomination,
      message: `Ship nomination for "${shipName}" created successfully`,
    });
  } catch (error) {
    console.error("❌ Error creating ship nomination:", error);

    if (
      error.message.includes("not found") ||
      error.message.includes("required")
    ) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else if (error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        error: `Validation failed: ${error.message}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error creating ship nomination",
      });
    }
  }
});

// PUT /api/shipnominations/:id - Actualizar ship nomination
router.put("/:id", async (req, res) => {
  try {
    console.log("📨 PUT - Received data for update:", req.body);
    console.log("📋 Updating nomination ID:", req.params.id);

    // Verificar que la nomination existe
    const existingNomination = await ShipNomination.findById(req.params.id);

    if (!existingNomination) {
      return res.status(404).json({
        success: false,
        error: "Ship nomination not found",
      });
    }

    const {
      shipName,
      amspecRef,
      clientRef,
      clientName,
      agent,
      terminal,
      berth,
      surveyor,
      sampler,
      chemist,
      productTypes,
      pilotOnBoard,
      etb,
      etc,
      notes,
      samplerRestrictions,
    } = req.body;

    // ========================================
    // VALIDACIONES BÁSICAS
    // ========================================
    if (!shipName || !amspecRef) {
      return res.status(400).json({
        success: false,
        error: "Vessel name and AmSpec Reference # are required",
      });
    }

    // ========================================
    // VALIDAR Y OBTENER REFERENCIAS
    // ========================================
    console.log("🔍 Validating references for update...");

    // SingleSelects
    const agentRef = await findReference(Agent, agent, "Agent");
    const terminalRef = await findReference(Terminal, terminal, "Terminal");
    const berthRef = await findReference(Berth, berth, "Berth");
    const surveyorRef = await findReference(Surveyor, surveyor, "Surveyor");
    const samplerRef = await findReference(Sampler, sampler, "Sampler");
    const chemistRef = await findReference(Chemist, chemist, "Chemist");

    // MultiSelects
    const clientReferences = await findReference(Client, clientName, "Clients");
    const productTypeRefs = await findReference(
      ProductType,
      productTypes,
      "Product Types"
    );

    // ========================================
    // VALIDAR FECHAS
    // ========================================
    const pilotDate = new Date(pilotOnBoard);
    const etbDate = new Date(etb);
    const etcDate = new Date(etc);

    if (
      isNaN(pilotDate.getTime()) ||
      isNaN(etbDate.getTime()) ||
      isNaN(etcDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Please provide valid dates.",
      });
    }

    // ========================================
    // PREPARAR DATOS PARA ACTUALIZACIÓN
    // ========================================
    const updateData = {
      // Campos HTML
      vesselName: shipName.trim(),
      amspecRef: amspecRef.trim(),
      clientRef: clientRef ? clientRef.trim() : undefined,

      // Referencias SingleSelect      
      agent: agentRef,
      terminal: terminalRef,
      berth: berthRef,
      surveyor: surveyorRef,
      sampler: samplerRef,
      chemist: chemistRef,

      // MultiSelect
      clientName: clientReferences,
      productTypes: productTypeRefs,

      // DateTimePickers
      pilotOnBoard: pilotDate,
      etb: etbDate,
      etc: etcDate,

      // Opcional
      notes: notes ? notes.trim() : undefined,

      // Actualizar timestamp
      updatedAt: new Date(),
    };

    // Agregar samplerRestrictions si existen
    if (samplerRestrictions && typeof samplerRestrictions === "object") {
      updateData.samplerRestrictions = samplerRestrictions;
    }

    console.log("💾 Updating ship nomination with processed data...");

    // ========================================
    // ACTUALIZAR SHIP NOMINATION
    // ========================================
    const updatedNomination = await ShipNomination.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    );

    console.log(
      "✅ Ship nomination updated successfully:",
      updatedNomination._id
    );

    res.json({
      success: true,
      data: updatedNomination,
      message: `Ship nomination "${shipName}" updated successfully`,
    });
  } catch (error) {
    console.error("❌ Error updating ship nomination:", error);

    if (
      error.message.includes("not found") ||
      error.message.includes("required")
    ) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else if (error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        error: `Validation failed: ${error.message}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error updating ship nomination",
      });
    }
  }
});

// DELETE /api/shipnominations/:id - Eliminar ship nomination
router.delete("/:id", async (req, res) => {
  try {
    const deletedNomination = await ShipNomination.findByIdAndDelete(
      req.params.id
    );

    if (!deletedNomination) {
      return res.status(404).json({
        success: false,
        error: "Ship nomination not found",
      });
    }

    res.json({
      success: true,
      message: `Ship nomination "${deletedNomination.vesselName}" deleted successfully`,
      data: deletedNomination,
    });
  } catch (error) {
    console.error("Error deleting ship nomination:", error);
    res.status(500).json({
      success: false,
      error: "Error deleting ship nomination",
    });
  }
});

// ===============================
// ✅ RUTAS DE VALIDACIÓN EN TIEMPO REAL
// ===============================

// GET /api/shipnominations/check-amspec/:amspecRef
router.get("/check-amspec/:amspecRef", async (req, res) => {
  try {
    const exists = await ShipNomination.exists({
      amspecRef: req.params.amspecRef.trim(),
    });
    res.json({ exists: !!exists });
  } catch (error) {
    console.error("❌ Error checking amspecRef:", error);
    res.status(500).json({ exists: false, error: "Internal server error" });
  }
});

// GET /api/shipnominations/check-clientref/:clientRef
router.get("/check-clientref/:clientRef", async (req, res) => {
  try {
    const exists = await ShipNomination.exists({
      clientRef: req.params.clientRef.trim(),
    });
    res.json({ exists: !!exists });
  } catch (error) {
    console.error("❌ Error checking clientRef:", error);
    res.status(500).json({ exists: false, error: "Internal server error" });
  }
});

// ===============================
// ✅ ACTUALIZACIÓN AUTOMÁTICA DE STATUS
// ===============================

// PUT /api/shipnominations/update-statuses - Actualizar status automáticamente
router.put("/update-statuses", async (req, res) => {
  try {
    console.log("🔄 Iniciando actualización automática de status...");

    // Obtener todas las nominations que no están canceladas
    const nominations = await ShipNomination.find({ 
      status: { $ne: 'cancelled' },
      etb: { $exists: true },
      etc: { $exists: true }
    });

    let updated = 0;
    const now = new Date();
    const updates = [];

    for (const nomination of nominations) {
      const etbDate = new Date(nomination.etb);
      const etcDate = new Date(nomination.etc);
      let newStatus = nomination.status;

      // Determinar el nuevo status basado en fechas
      if (now >= etcDate) {
        newStatus = 'completed';
      } else if (now >= etbDate && now < etcDate) {
        newStatus = 'in_progress';
      } else if (now < etbDate) {
        newStatus = 'confirmed';
      }

      // Actualizar solo si el status cambió
      if (newStatus !== nomination.status) {
        await ShipNomination.findByIdAndUpdate(nomination._id, { 
          status: newStatus,
          updatedAt: new Date()
        });
        
        updates.push({
          id: nomination._id,
          vesselName: nomination.vesselName,
          amspecRef: nomination.amspecRef,
          oldStatus: nomination.status,
          newStatus: newStatus
        });
        
        updated++;
      }
    }

    console.log(`✅ Proceso completado. ${updated} nominaciones actualizadas de ${nominations.length} revisadas.`);

    res.json({
      success: true,
      message: `${updated} nominaciones actualizadas de ${nominations.length} revisadas`,
      data: {
        totalReviewed: nominations.length,
        totalUpdated: updated,
        updates: updates
      }
    });

  } catch (error) {
    console.error("❌ Error updating status:", error);
    res.status(500).json({
      success: false,
      error: "Error updating nomination statuses",
      details: error.message
    });
  }
});

module.exports = router;
