// backend/scripts/fixDatabaseIndexes.js
require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');

async function fixDatabaseIndexes() {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        console.log('🔍 Verificando índices actuales...');
        const indexes = await Client.collection.getIndexes();
        console.log('📋 Índices existentes:', Object.keys(indexes));

        console.log('🧹 Eliminando índices antiguos...');
        
        try {
            // Intentar eliminar el índice único antiguo si existe
            await Client.collection.dropIndex({ name: 1 });
            console.log('✅ Índice único antiguo eliminado');
        } catch (error) {
            console.log('ℹ️ No había índice único antiguo para eliminar');
        }

        try {
            // Intentar eliminar cualquier otro índice problemático
            await Client.collection.dropIndex('name_1');
            console.log('✅ Índice name_1 eliminado');
        } catch (error) {
            console.log('ℹ️ No había índice name_1 para eliminar');
        }

        console.log('🔄 Actualizando documentos para agregar campo deleted...');
        
        // Actualizar todos los documentos existentes para agregar el campo deleted
        const updateResult = await Client.updateMany(
            { deleted: { $exists: false } },
            { 
                $set: { 
                    deleted: false 
                } 
            }
        );
        
        console.log(`✅ ${updateResult.modifiedCount} documentos actualizados con campo deleted`);

        console.log('🔄 Creando nuevos índices...');
        
        // Crear el índice compuesto correcto
        await Client.collection.createIndex(
            { name: 1, deleted: 1 }, 
            { 
                unique: true,
                partialFilterExpression: { deleted: false },
                name: 'unique_active_names'
            }
        );
        
        console.log('✅ Nuevo índice compuesto creado');

        console.log('🔍 Verificando estado final...');
        const finalIndexes = await Client.collection.getIndexes();
        console.log('📋 Índices finales:', Object.keys(finalIndexes));

        const totalClients = await Client.countDocuments();
        const activeClients = await Client.countDocuments({ deleted: false });
        const deletedClients = await Client.countDocuments({ deleted: true });

        console.log(`📊 Estado final:`);
        console.log(`   Total clients: ${totalClients}`);
        console.log(`   Active clients: ${activeClients}`);
        console.log(`   Deleted clients: ${deletedClients}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('📴 Conexión cerrada');
        process.exit(0);
    }
}

// Ejecutar el script
fixDatabaseIndexes();