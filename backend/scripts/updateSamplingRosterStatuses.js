/**
 * Script para actualizar automáticamente los status de Sampling Rosters existentes
 * basado en las fechas startDischarge y etcTime
 */

const mongoose = require('mongoose');
const SamplingRoster = require('../models/SamplingRoster');

// Configuración de conexión a MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:ujLUXXvzimfd08Tm@roster.zomfkho.mongodb.net/roster';

async function updateSamplingRosterStatuses() {
  try {
    console.log('🚀 Iniciando actualización de status de Sampling Rosters...');
    
    // Conectar a la base de datos Atlas
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas exitosamente');

    // Obtener todas los rosters que no están cancelados
    const rosters = await SamplingRoster.find({ 
      status: { $ne: 'cancelled' },
      startDischarge: { $exists: true },
      etcTime: { $exists: true }
    });

    console.log(`📊 Encontrados ${rosters.length} rosters para revisar`);

    let updated = 0;
    const now = new Date();

    for (const roster of rosters) {
      const startDate = new Date(roster.startDischarge);
      const endDate = new Date(roster.etcTime);
      let newStatus = roster.status;

      // Determinar el nuevo status basado en fechas
      if (now >= endDate) {
        newStatus = 'completed';
      } else if (now >= startDate && now < endDate) {
        newStatus = 'in_progress';
      } else if (now < startDate) {
        newStatus = 'confirmed';
      }

      // Actualizar solo si el status cambió
      if (newStatus !== roster.status) {
        await SamplingRoster.findByIdAndUpdate(roster._id, { 
          status: newStatus,
          updatedAt: new Date(),
          lastModifiedBy: 'system_update'
        });
        
        console.log(`✅ Updated ${roster.vesselName} (${roster.amspecRef}): ${roster.status} → ${newStatus}`);
        console.log(`   Start: ${startDate.toLocaleDateString()} | ETC: ${endDate.toLocaleDateString()}`);
        updated++;
      }
    }

    console.log(`🎉 Proceso completado. ${updated} rosters actualizados de ${rosters.length} revisados.`);
    
    // Mostrar un resumen por status
    const updatedRosters = await SamplingRoster.find({});
    const statusSummary = {};
    updatedRosters.forEach(roster => {
      statusSummary[roster.status] = (statusSummary[roster.status] || 0) + 1;
    });
    
    console.log('\n📊 Resumen de status después de la actualización:');
    Object.entries(statusSummary).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} rosters`);
    });
    
  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Sugerencia: Verifica que la cadena de conexión de MongoDB Atlas sea correcta');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB Atlas');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  updateSamplingRosterStatuses();
}

module.exports = updateSamplingRosterStatuses;
