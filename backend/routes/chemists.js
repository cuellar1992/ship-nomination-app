const express = require("express");
const router = express.Router();
const Chemist = require("../models/Chemist");

// GET / - Obtener todos los chemists CON INFORMACIÓN COMPLETA
router.get("/", async (req, res) => {
  try {
    const chemists = await Chemist.find({}).sort({ name: 1 });

    // IMPORTANTE: Formatear datos igual que samplers.js
    const formattedChemists = chemists.map((chemist) => ({
      _id: chemist._id, // CRÍTICO: Incluir _id explícitamente
      name: chemist.name,
      email: chemist.email || null,
      phone: chemist.phone || null,
      hasEmail: !!(chemist.email && chemist.email.trim()),
      createdAt: chemist.createdAt,
      updatedAt: chemist.updatedAt,
    }));

    res.json({ success: true, data: formattedChemists });
  } catch (error) {
    console.error("Error fetching chemists:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching chemists" });
  }
});

// POST / - Crear nuevo chemist CON EMAIL/PHONE OPCIONALES
router.post("/", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    // Preparar datos con campos extendidos
    const chemistData = { name: name.trim() };

    if (email && email.trim() !== "") {
      chemistData.email = email.trim().toLowerCase();
    }
    if (phone && phone.trim() !== "") {
      chemistData.phone = phone.trim();
    }

    const chemist = new Chemist(chemistData);
    const savedChemist = await chemist.save();

    // Devolver datos formateados consistentemente
    const responseData = {
      _id: savedChemist._id,
      name: savedChemist.name,
      email: savedChemist.email || null,
      phone: savedChemist.phone || null,
      hasEmail: !!(savedChemist.email && savedChemist.email.trim()),
      createdAt: savedChemist.createdAt,
      updatedAt: savedChemist.updatedAt,
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: `Chemist "${savedChemist.name}" created successfully`,
    });
  } catch (error) {
    if (error.code === 11000) {
      res
        .status(400)
        .json({ success: false, message: "Chemist already exists" });
    } else if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    } else {
      console.error("Error creating chemist:", error);
      res
        .status(500)
        .json({ success: false, message: "Error creating chemist" });
    }
  }
});

// PUT /:id - Actualizar chemist existente CON EMAIL/PHONE
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    // Preparar datos de actualización con campos extendidos
    const updateData = { name: name.trim() };

    // Manejar email (puede ser vacío para remover)
    if (email !== undefined) {
      updateData.email =
        email && email.trim() !== "" ? email.trim().toLowerCase() : null;
    }

    // Manejar phone (puede ser vacío para remover)
    if (phone !== undefined) {
      updateData.phone = phone && phone.trim() !== "" ? phone.trim() : null;
    }

    const updatedChemist = await Chemist.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedChemist) {
      return res
        .status(404)
        .json({ success: false, message: "Chemist not found" });
    }

    // Devolver datos formateados consistentemente
    const responseData = {
      _id: updatedChemist._id,
      name: updatedChemist.name,
      email: updatedChemist.email || null,
      phone: updatedChemist.phone || null,
      hasEmail: !!(updatedChemist.email && updatedChemist.email.trim()),
      createdAt: updatedChemist.createdAt,
      updatedAt: updatedChemist.updatedAt,
    };

    res.json({
      success: true,
      data: responseData,
      message: `Chemist "${updatedChemist.name}" updated successfully`,
    });
  } catch (error) {
    if (error.code === 11000) {
      res
        .status(400)
        .json({ success: false, message: "Chemist name already exists" });
    } else if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    } else {
      console.error("Error updating chemist:", error);
      res
        .status(500)
        .json({ success: false, message: "Error updating chemist" });
    }
  }
});

// DELETE /:id - Eliminar chemist (hard delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedChemist = await Chemist.findByIdAndDelete(id);

    if (!deletedChemist) {
      return res
        .status(404)
        .json({ success: false, message: "Chemist not found" });
    }

    res.json({
      success: true,
      message: `Chemist "${deletedChemist.name}" deleted successfully`,
      data: {
        _id: deletedChemist._id,
        name: deletedChemist.name,
        email: deletedChemist.email || null,
        phone: deletedChemist.phone || null,
      },
    });
  } catch (error) {
    console.error("Error deleting chemist:", error);
    res.status(500).json({ success: false, message: "Error deleting chemist" });
  }
});

// GET /debug - Debug endpoint para troubleshooting
router.get("/debug", async (req, res) => {
  try {
    const chemists = await Chemist.find();
    const count = await Chemist.countDocuments();

    res.json({
      success: true,
      debug: {
        totalCount: count,
        chemists: chemists.map((c) => ({
          _id: c._id,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          hasEmail: !!(c.email && c.email.trim()),
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        collectionName: Chemist.collection.name,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in chemists debug:", error);
    res
      .status(500)
      .json({ success: false, message: "Debug error", error: error.message });
  }
});

module.exports = router;
