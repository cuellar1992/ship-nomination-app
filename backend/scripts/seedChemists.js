// backend/scripts/seedChemists.js
require('dotenv').config();
const mongoose = require('mongoose');
const Chemist = require('../models/Chemist');

const initialChemists = [
    'Tomas',
    'Anh', 
    'Farshid',
    'Aram'
];

async function seedChemists() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔄 Clearing existing chemists...');
        const deleteResult = await Chemist.deleteMany({});
        console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing chemists`);

        console.log('🔄 Creating chemists...');
        const chemistsData = initialChemists.map(name => ({ name }));
        const createdChemists = await Chemist.insertMany(chemistsData);
        
        console.log(`✅ Successfully created ${createdChemists.length} chemists:`);
        createdChemists.forEach((chemist, index) => {
            console.log(`   ${index + 1}. ${chemist.name} (ID: ${chemist._id})`);
        });

        // Verificación final
        const totalCount = await Chemist.countDocuments();
        console.log(`\n📊 Total chemists in database: ${totalCount}`);

        console.log('\n🎉 Chemists seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding chemists:', error);
        
        if (error.code === 11000) {
            console.error('💡 Duplicate key error - some chemists may already exist');
        }
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit();
    }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    seedChemists();
}

module.exports = seedChemists;