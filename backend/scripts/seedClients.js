// backend/scripts/seedClients.js
require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');

// Lista de clients iniciales (los mismos que tenías en mock)
const initialClients = [
    'Mobil',
    'BP', 
    'Ampol SG',
    'Ampol AU',
    'Trafigura',
    'Chevron SG',
    'Chevron Downstream',
    'PCIA',
    'Glencore',
    'United',
    'Viva Energy',
    'S-Oil',
    'Q8',
    'Gunvor',
    'ASCC'
];

async function seedClients() {
    try {
        // Conectar a MongoDB
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Limpiar clients existentes (opcional)
        await Client.deleteMany({});
        console.log('🧹 Clients existentes eliminados');

        // Crear los clients
        console.log('📝 Creando clients...');
        const clientPromises = initialClients.map(clientName => {
            const client = new Client({ name: clientName });
            return client.save();
        });

        await Promise.all(clientPromises);
        console.log(`✅ ${initialClients.length} clients creados exitosamente`);

        // Verificar que se crearon
        const count = await Client.countDocuments({ isActive: true });
        console.log(`📊 Total de clients activos: ${count}`);

        // Mostrar la lista
        const clients = await Client.find({ isActive: true }).sort({ name: 1 });
        console.log('📋 Clients creados:');
        clients.forEach((client, index) => {
            console.log(`   ${index + 1}. ${client.name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('📴 Conexión cerrada');
        process.exit(0);
    }
}

// Ejecutar el script
seedClients();