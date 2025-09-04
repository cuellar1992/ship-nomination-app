/**
 * Script para probar la nueva lógica del KPI "Nominations This Month"
 * Verifica que cuenta nominaciones por fecha de operación (ETB) no por fecha de creación
 */

const mongoose = require('mongoose');
const ShipNomination = require('../models/ShipNomination');

// Configuración de conexión a MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:ujLUXXvzimfd08Tm@roster.zomfkho.mongodb.net/roster';

async function testKPILogic() {
  try {
    console.log('🧪 Probando nueva lógica del KPI "Nominations This Month"...\n');
    
    // Conectar a la base de datos Atlas
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas\n');

    // Obtener todas las nominaciones
    const allNominations = await ShipNomination.find({});
    
    console.log(`📊 Total de nominaciones en la base de datos: ${allNominations.length}\n`);

    // Fecha actual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    console.log(`📅 Mes actual: ${currentMonth + 1}/${currentYear} (${now.toLocaleDateString()})\n`);

    // Lógica ANTERIOR (por createdAt)
    const nominationsByCreatedAt = allNominations.filter(nomination => {
      const createdDate = new Date(nomination.createdAt);
      return createdDate.getMonth() === currentMonth && 
             createdDate.getFullYear() === currentYear;
    });

    // Lógica NUEVA (por ETB)
    const nominationsByETB = allNominations.filter(nomination => {
      const etbDate = new Date(nomination.etb);
      return etbDate.getMonth() === currentMonth && 
             etbDate.getFullYear() === currentYear;
    });

    console.log('🔍 COMPARACIÓN DE LÓGICAS:\n');
    
    console.log(`📝 Lógica ANTERIOR (createdAt): ${nominationsByCreatedAt.length} nominaciones`);
    nominationsByCreatedAt.forEach(nomination => {
      console.log(`  - ${nomination.vesselName} (${nomination.amspecRef})`);
      console.log(`    Creado: ${new Date(nomination.createdAt).toLocaleDateString()}`);
      console.log(`    ETB: ${new Date(nomination.etb).toLocaleDateString()}\n`);
    });

    console.log(`🚢 Lógica NUEVA (ETB): ${nominationsByETB.length} nominaciones`);
    nominationsByETB.forEach(nomination => {
      console.log(`  - ${nomination.vesselName} (${nomination.amspecRef})`);
      console.log(`    Creado: ${new Date(nomination.createdAt).toLocaleDateString()}`);
      console.log(`    ETB: ${new Date(nomination.etb).toLocaleDateString()}`);
      console.log(`    Status: ${nomination.status}\n`);
    });

    console.log('✅ RESULTADO:');
    if (nominationsByCreatedAt.length !== nominationsByETB.length) {
      console.log(`🎯 El cambio es EFECTIVO. KPI cambió de ${nominationsByCreatedAt.length} a ${nominationsByETB.length} nominaciones.`);
      console.log('📈 Ahora el KPI muestra operaciones PROGRAMADAS para este mes, no nominaciones CREADAS este mes.');
    } else {
      console.log('ℹ️ Mismo resultado en ambas lógicas para este mes.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB Atlas');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  testKPILogic();
}

module.exports = testKPILogic;
