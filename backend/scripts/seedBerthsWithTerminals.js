const mongoose = require('mongoose');
require('dotenv').config();
const Terminal = require('../models/Terminal');
const Berth = require('../models/Berth');

// Mapeo exacto de terminales a berths según especificación
const terminalBerthMapping = {
    'Vopak': ['BLB-1', 'BLB-2'],
    'Quantem': ['BLB-1', 'BLB-2'],
    'Orica Newcastle': ['K-1', 'K-2', 'K-3'],
    'Orica Botany': ['BIP'],
    'Stolthaven': ['M-7'],
    'Ampol Kurnell': ['K-1', 'K-2', 'K-3'],
    'BP ATOM': ['Dyke-1'],
    'Park Fuels Newcastle': ['K-1', 'K-2', 'K-3'],
    'Park Fuels Kembla': ['102', '112']
};

async function seedBerthsWithTerminals() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Limpiar berths existentes
        await Berth.deleteMany({});
        console.log('🗑️ Cleared existing berths');

        // Obtener terminales existentes
        const terminals = await Terminal.find({});
        console.log(`📋 Found ${terminals.length} terminals`);

        // Crear un mapa de berths únicos con sus terminales
        const berthTerminalMap = new Map();
        
        for (const [terminalName, berthNames] of Object.entries(terminalBerthMapping)) {
            const terminal = terminals.find(t => t.name === terminalName);
            
            if (terminal) {
                for (const berthName of berthNames) {
                    if (berthTerminalMap.has(berthName)) {
                        // Si el berth ya existe, agregar este terminal a la lista
                        berthTerminalMap.get(berthName).push(terminal._id);
                    } else {
                        // Si es un berth nuevo, crear nueva entrada
                        berthTerminalMap.set(berthName, [terminal._id]);
                    }
                }
                console.log(`✅ Processed ${berthNames.length} berths for ${terminalName}`);
            } else {
                console.log(`⚠️ Terminal not found: ${terminalName}`);
            }
        }

        // Crear berths con múltiples terminales
        const berthsToCreate = [];
        
        for (const [berthName, terminalIds] of berthTerminalMap.entries()) {
            berthsToCreate.push({
                name: berthName,
                terminals: terminalIds
            });
        }

        // Insertar todos los berths
        if (berthsToCreate.length > 0) {
            await Berth.insertMany(berthsToCreate);
            console.log(`🎯 Created ${berthsToCreate.length} unique berths with terminal relationships`);
            
            // Mostrar resumen
            for (const berth of berthsToCreate) {
                const terminalNames = terminals
                    .filter(t => berth.terminals.includes(t._id))
                    .map(t => t.name)
                    .join(', ');
                console.log(`  - ${berth.name}: ${terminalNames}`);
            }
        }

        console.log('✅ Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
}

seedBerthsWithTerminals();
