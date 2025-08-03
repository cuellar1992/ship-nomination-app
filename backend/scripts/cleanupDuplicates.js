// backend/scripts/cleanupDuplicates.js
require('dotenv').config();
const mongoose = require('mongoose');
const ShipNomination = require('../models/ShipNomination');

async function cleanupDuplicates() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('🔍 Finding duplicates...');
        
        // Encontrar duplicados por amspecRef
        const amspecDuplicates = await ShipNomination.aggregate([
            {
                $group: {
                    _id: "$amspecRef",
                    count: { $sum: 1 },
                    docs: { $push: "$$ROOT" }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        console.log(`📋 Found ${amspecDuplicates.length} AmSpec duplicates`);

        // Eliminar duplicados (mantener el más reciente)
        for (const duplicate of amspecDuplicates) {
            const docs = duplicate.docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const toDelete = docs.slice(1); // Mantener el primero (más reciente)
            
            console.log(`🗑️  Deleting ${toDelete.length} duplicates for AmSpec: ${duplicate._id}`);
            
            for (const doc of toDelete) {
                await ShipNomination.findByIdAndDelete(doc._id);
                console.log(`   ✅ Deleted: ${doc._id} (${doc.vesselName})`);
            }
        }

        // Verificar resultado final
        const total = await ShipNomination.countDocuments();
        console.log(`✅ Cleanup completed. Total ship nominations: ${total}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupDuplicates();