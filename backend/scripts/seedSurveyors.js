const mongoose = require('mongoose');
require('dotenv').config();
const Surveyor = require('../models/Surveyor');

// Surveyors iniciales según la guía
const initialSurveyors = [
    'Ash',
    'Jay-Cen'
];

async function seedSurveyors() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔗 Connected to MongoDB Atlas');

        // Limpiar colección existente
        await Surveyor.deleteMany({});
        console.log('🗑️ Cleared existing surveyors');

        // Insertar surveyors iniciales
        const surveyorsToInsert = initialSurveyors.map(name => ({ name }));
        const insertedSurveyors = await Surveyor.insertMany(surveyorsToInsert);
        
        console.log(`✅ Successfully seeded ${insertedSurveyors.length} surveyors:`);
        insertedSurveyors.forEach((surveyor, index) => {
            console.log(`   ${index + 1}. ${surveyor.name} (ID: ${surveyor._id})`);
        });

        // Verificar inserción
        const count = await Surveyor.countDocuments();
        console.log(`📊 Total surveyors in database: ${count}`);

    } catch (error) {
        console.error('❌ Error seeding surveyors:', error.message);
        process.exit(1);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔐 Database connection closed');
        process.exit(0);
    }
}

// Ejecutar seed
console.log('🌱 Starting surveyors seed process...');
seedSurveyors();