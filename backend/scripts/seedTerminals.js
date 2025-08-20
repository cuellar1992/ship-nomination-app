const mongoose = require('mongoose');
require('dotenv').config();

const Terminal = require('../models/Terminal');

const initialTerminals = [
    'Vopak',
    'Quantem',
    'Orica Newcastle',
    'Orica Botany',
    'Stolthaven',
    'Ampol Kurnell',
    'BP ATOM',
    'Park Fuels Newcastle',
    'Park Fuels Kembla'
];

async function seedTerminals() {
    try {
        // Conectar a MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Limpiar collection existente
        console.log('🧹 Cleaning existing terminals...');
        await Terminal.deleteMany({});
        console.log('✅ Existing terminals removed');

        // Crear nuevos terminals
        console.log('🔄 Creating terminals...');
        const createdTerminals = await Terminal.insertMany(
            initialTerminals.map(name => ({ name }))
        );

        console.log(`✅ Created ${createdTerminals.length} terminals:`);
        createdTerminals.forEach(terminal => {
            console.log(`   - ${terminal.name} (ID: ${terminal._id})`);
        });

        // Verificar resultados
        const totalCount = await Terminal.countDocuments();
        console.log(`📊 Total terminals in database: ${totalCount}`);

    } catch (error) {
        console.error('❌ Error seeding terminals:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔚 Database connection closed');
    }
}

// Ejecutar seed
if (require.main === module) {
    seedTerminals();
}

module.exports = { seedTerminals, initialTerminals };