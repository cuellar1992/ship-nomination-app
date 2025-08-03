const mongoose = require('mongoose');
require('dotenv').config();
const Berth = require('../models/Berth');

// Berths iniciales según la guía
const initialBerths = [
    'BLB-1',
    'BLB-2', 
    'Kurnell-1',
    'Kurnell-2',
    'Kurnell-3',
    'Koogarang-2',
    'M-7'
];

async function seedBerths() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔗 Connected to MongoDB Atlas');

        // Limpiar colección existente
        await Berth.deleteMany({});
        console.log('🗑️ Cleared existing berths');

        // Insertar berths iniciales
        const berthsToInsert = initialBerths.map(name => ({ name }));
        const insertedBerths = await Berth.insertMany(berthsToInsert);
        
        console.log(`✅ Successfully seeded ${insertedBerths.length} berths:`);
        insertedBerths.forEach((berth, index) => {
            console.log(`   ${index + 1}. ${berth.name} (ID: ${berth._id})`);
        });

        // Verificar inserción
        const count = await Berth.countDocuments();
        console.log(`📊 Total berths in database: ${count}`);

    } catch (error) {
        console.error('❌ Error seeding berths:', error.message);
        process.exit(1);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔐 Database connection closed');
        process.exit(0);
    }
}

// Ejecutar seed
console.log('🌱 Starting berths seed process...');
seedBerths();