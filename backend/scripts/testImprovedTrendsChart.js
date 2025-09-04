/**
 * Script para probar el gráfico Monthly Trends mejorado
 * Simula los nuevos cálculos que muestran Nominations vs Completed Operations
 */

const mongoose = require('mongoose');
const ShipNomination = require('../models/ShipNomination');

// Configuración de conexión a MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:ujLUXXvzimfd08Tm@roster.zomfkho.mongodb.net/roster';

async function testImprovedTrendsChart() {
  try {
    console.log('🚀 Probando el gráfico Monthly Trends MEJORADO...\n');
    
    // Conectar a la base de datos Atlas
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas\n');

    // Obtener todas las nominaciones
    const allNominations = await ShipNomination.find({});
    console.log(`📊 Total de nominaciones: ${allNominations.length}\n`);

    // Simular los cálculos del nuevo gráfico
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYear = new Date().getFullYear();
    
    // Inicializar contadores mensuales
    const monthlyData = {};
    months.forEach((month, index) => {
      monthlyData[index] = {
        nominations: 0,
        completedOperations: 0
      };
    });

    console.log('📈 NUEVA LÓGICA DEL GRÁFICO:\n');

    // === LÍNEA 1: Nominations (programadas por ETB) ===
    console.log('🔵 LÍNEA 1 - "Nominations" (operaciones programadas):');
    allNominations.forEach(nomination => {
      try {
        // Usar ETB (fecha de operación) para agrupar por mes
        const nominationDate = new Date(nomination.etb || nomination.date || new Date());
        if (!isNaN(nominationDate.getTime()) && nominationDate.getFullYear() === currentYear) {
          const monthIndex = nominationDate.getMonth();
          monthlyData[monthIndex].nominations++;
        }
      } catch (error) {
        console.warn('⚠️ Error procesando nomination:', error);
      }
    });

    // === LÍNEA 2: Completed Operations (finalizadas por ETC) ===
    console.log('\n🟢 LÍNEA 2 - "Completed Operations" (operaciones completadas):');
    allNominations.forEach(nomination => {
      try {
        // Solo contar nominaciones completadas
        if (nomination.status === 'completed') {
          // Usar ETC (fecha de finalización) para operaciones completadas
          const completionDate = new Date(nomination.etc || nomination.etb || new Date());
          if (!isNaN(completionDate.getTime()) && completionDate.getFullYear() === currentYear) {
            const monthIndex = completionDate.getMonth();
            monthlyData[monthIndex].completedOperations++;
          }
        }
      } catch (error) {
        console.warn('⚠️ Error procesando completed operation:', error);
      }
    });

    // Mostrar resultados por mes
    console.log('\n📊 DATOS DEL GRÁFICO MEJORADO:\n');
    console.log('Mes      | Nominations | Completed | Diferencia');
    console.log('---------|-------------|-----------|------------');
    
    let totalNominations = 0;
    let totalCompleted = 0;
    let monthsWithDifference = 0;

    months.forEach((month, index) => {
      const nominations = monthlyData[index].nominations;
      const completed = monthlyData[index].completedOperations;
      const difference = nominations - completed;
      
      totalNominations += nominations;
      totalCompleted += completed;
      
      if (difference !== 0) {
        monthsWithDifference++;
      }
      
      if (nominations > 0 || completed > 0) {
        console.log(`${month.padEnd(8)} | ${nominations.toString().padStart(11)} | ${completed.toString().padStart(9)} | ${difference > 0 ? '+' : ''}${difference}`);
      }
    });

    console.log('---------|-------------|-----------|------------');
    console.log(`TOTAL    | ${totalNominations.toString().padStart(11)} | ${totalCompleted.toString().padStart(9)} | ${totalNominations - totalCompleted > 0 ? '+' : ''}${totalNominations - totalCompleted}`);

    // Análisis del resultado
    console.log('\n🎯 ANÁLISIS DEL RESULTADO:\n');
    
    if (monthsWithDifference > 0) {
      console.log(`✅ EXCELENTE: El gráfico ahora muestra diferencias reales entre ${monthsWithDifference} meses!`);
      console.log('📈 Esto es mucho más útil que mostrar dos líneas idénticas.');
      console.log('\n📋 INTERPRETACIÓN:');
      console.log('- Nominations: Operaciones programadas (basado en ETB)');
      console.log('- Completed Operations: Operaciones finalizadas (basado en ETC y status=completed)');
      console.log('- La diferencia muestra operaciones pendientes o en progreso');
    } else if (totalNominations === totalCompleted && totalNominations > 0) {
      console.log('ℹ️ CASO ESPECIAL: Todas las operaciones están completadas');
      console.log('   Esto es normal si todas las nominaciones tienen status="completed"');
    } else if (totalNominations === 0) {
      console.log('📭 SIN DATOS: No hay nominaciones para mostrar en el gráfico');
    } else {
      console.log('🔍 CASO MIXTO: Hay nominaciones pero diferentes niveles de completación');
    }

    // Mostrar detalles de las nominaciones
    if (allNominations.length > 0) {
      console.log('\n📋 DETALLE DE NOMINACIONES:\n');
      allNominations.forEach(nomination => {
        const etbDate = new Date(nomination.etb).toLocaleDateString();
        const etcDate = new Date(nomination.etc).toLocaleDateString();
        const status = nomination.status;
        console.log(`- ${nomination.vesselName} (${nomination.amspecRef})`);
        console.log(`  ETB: ${etbDate} | ETC: ${etcDate} | Status: ${status}`);
        console.log('');
      });
    }

    console.log('🎉 MEJORAS IMPLEMENTADAS:');
    console.log('✅ 1. Eliminadas líneas duplicadas/idénticas');
    console.log('✅ 2. Métricas diferenciadas y útiles');
    console.log('✅ 3. Lógica basada en fechas operativas (ETB/ETC)');
    console.log('✅ 4. Información de progreso de operaciones');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB Atlas');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  testImprovedTrendsChart();
}

module.exports = testImprovedTrendsChart;
