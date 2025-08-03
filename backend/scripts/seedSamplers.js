// backend/scripts/seedSamplers.js
require('dotenv').config();
const mongoose = require('mongoose');
const Sampler = require('../models/Sampler');

const initialSamplers = [
    'Cesar',
    'Sakib', 
    'Laura',
    'Ruben',
    'Edwind'
];

async function seedSamplers() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔄 Clearing existing samplers...');
        const deleteResult = await Sampler.deleteMany({});
        console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing samplers`);

        console.log('🔄 Creating samplers...');
        const samplersData = initialSamplers.map(name => ({ name }));
        const createdSamplers = await Sampler.insertMany(samplersData);
        
        console.log(`✅ Successfully created ${createdSamplers.length} samplers:`);
        createdSamplers.forEach((sampler, index) => {
            console.log(`   ${index + 1}. ${sampler.name} (ID: ${sampler._id})`);
        });

        // Verificación final
        const totalCount = await Sampler.countDocuments();
        console.log(`\n📊 Total samplers in database: ${totalCount}`);

        console.log('\n🎉 Samplers seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding samplers:', error);
        
        if (error.code === 11000) {
            console.error('💡 Duplicate key error - some samplers may already exist');
        }
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit();
    }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    seedSamplers();
}

module.exports = seedSamplers;