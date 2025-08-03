// backend/scripts/seedProductTypes.js
require('dotenv').config();
const mongoose = require('mongoose');
const ProductType = require('../models/ProductType');

const initialProductTypes = [
    '91 Ron',
    '95 Ron',
    '98 Ron',
    'Diesel',
    'Jet-A1',
    'Anhydrous Ammonia',
    'Base Oils',
    'Containers'
];

async function seedProductTypes() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🔄 Clearing existing product types...');
        const deleteResult = await ProductType.deleteMany({});
        console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing product types`);

        console.log('🔄 Creating product types...');
        const productTypesData = initialProductTypes.map(name => ({ name }));
        const createdProductTypes = await ProductType.insertMany(productTypesData);
        
        console.log(`✅ Successfully created ${createdProductTypes.length} product types:`);
        createdProductTypes.forEach((productType, index) => {
            console.log(`   ${index + 1}. ${productType.name} (ID: ${productType._id})`);
        });

        // Verificación final
        const totalCount = await ProductType.countDocuments();
        console.log(`\n📊 Total product types in database: ${totalCount}`);

        console.log('\n🎉 Product Types seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding product types:', error);
        
        if (error.code === 11000) {
            console.error('💡 Duplicate key error - some product types may already exist');
        }
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit();
    }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
    seedProductTypes();
}

module.exports = seedProductTypes;