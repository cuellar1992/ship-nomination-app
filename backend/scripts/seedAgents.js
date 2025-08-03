const mongoose = require('mongoose');
require('dotenv').config();

const Agent = require('../models/Agent');

const initialAgents = [
    'Wave Shipping',
    'ISS', 
    'GAC',
    'SGM',
    'Wilhelmsen'
];

async function seedAgents() {
    try {
        // Conectar a MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Limpiar collection existente
        console.log('🧹 Cleaning existing agents...');
        await Agent.deleteMany({});
        console.log('✅ Existing agents removed');

        // Crear nuevos agents
        console.log('🔄 Creating agents...');
        const createdAgents = await Agent.insertMany(
            initialAgents.map(name => ({ name }))
        );

        console.log(`✅ Created ${createdAgents.length} agents:`);
        createdAgents.forEach(agent => {
            console.log(`   - ${agent.name} (ID: ${agent._id})`);
        });

        // Verificar resultados
        const totalCount = await Agent.countDocuments();
        console.log(`📊 Total agents in database: ${totalCount}`);

    } catch (error) {
        console.error('❌ Error seeding agents:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔚 Database connection closed');
    }
}

// Ejecutar seed
if (require.main === module) {
    seedAgents();
}

module.exports = { seedAgents, initialAgents };