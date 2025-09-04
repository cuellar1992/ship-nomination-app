/**
 * Script para actualizar automáticamente los status de Ship Nominations existentes
 * basado en las fechas ETB y ETC
 */

const mongoose = require('mongoose');
const ShipNomination = require('../models/ShipNomination');

// Configuración de conexión a MongoDB Atlas (misma que el servidor)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:ujLUXXvzimfd08Tm@roster.zomfkho.mongodb.net/roster';

async function updateShipNominationStatuses() {
  try {
    console.log('🚀 Iniciando actualización de status de Ship Nominations...');
    
    // Conectar a la base de datos Atlas
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas exitosamente');

    // Obtener todas las nominations que no están canceladas
    const nominations = await ShipNomination.find({ 
      status: { $ne: 'cancelled' },
      etb: { $exists: true },
      etc: { $exists: true }
    });

    console.log(`📊 Encontradas ${nominations.length} nominaciones para revisar`);

    let updated = 0;
    const now = new Date();

    for (const nomination of nominations) {
      const etbDate = new Date(nomination.etb);
      const etcDate = new Date(nomination.etc);
      let newStatus = nomination.status;

      // Determinar el nuevo status basado en fechas
      if (now >= etcDate) {
        newStatus = 'completed';
      } else if (now >= etbDate && now < etcDate) {
        newStatus = 'in_progress';
      } else if (now < etbDate) {
        newStatus = 'confirmed';
      }

      // Actualizar solo si el status cambió
      if (newStatus !== nomination.status) {
        await ShipNomination.findByIdAndUpdate(nomination._id, { 
          status: newStatus,
          updatedAt: new Date()
        });
        
        console.log(`✅ Updated ${nomination.vesselName} (${nomination.amspecRef}): ${nomination.status} → ${newStatus}`);
        updated++;
      }
    }

    console.log(`🎉 Proceso completado. ${updated} nominaciones actualizadas de ${nominations.length} revisadas.`);
    
  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Sugerencia: Verifica que la cadena de conexión de MongoDB Atlas sea correcta');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB Atlas');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  updateShipNominationStatuses();
}

module.exports = updateShipNominationStatuses;
