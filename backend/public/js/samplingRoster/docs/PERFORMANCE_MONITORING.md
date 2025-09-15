# 📊 Sistema de Monitoreo de Performance - Sampling Roster

## Descripción General

El sistema de monitoreo de performance del Sampling Roster proporciona métricas en tiempo real y análisis detallado del rendimiento de todos los componentes críticos del sistema. Este sistema está diseñado para identificar cuellos de botella, optimizar el rendimiento y mantener la estabilidad del sistema.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **PerformanceMonitor** - Clase principal que gestiona todas las métricas
2. **PerformanceTracker** - Helper para registrar métricas fácilmente
3. **Integración en Servicios** - Métricas integradas en ValidationService, ValidationCacheService y ScheduleCalculator

### Estructura de Métricas

```javascript
{
  validationService: {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    averageValidationTime: 0,
    weeklyLimitValidations: 0,
    dayRestrictionValidations: 0,
    pobConflictValidations: 0,
    restValidationValidations: 0
  },
  cacheService: {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    cleanupOperations: 0
  },
  scheduleCalculator: {
    totalCalculations: 0,
    successfulCalculations: 0,
    failedCalculations: 0,
    averageCalculationTime: 0,
    turnsGenerated: 0,
    fallbackAssignments: 0
  },
  system: {
    uptime: Date.now(),
    lastActivity: Date.now(),
    errors: 0,
    warnings: 0
  }
}
```

## 🚀 Uso del Sistema

### Inicialización

```javascript
import { PerformanceTracker, getPerformanceMonitor } from './services/PerformanceMonitor.js';

// Obtener instancia global
const monitor = getPerformanceMonitor();

// O usar el helper directamente
PerformanceTracker.validation('weeklyLimit', true, 150, { samplerName: 'John' });
```

### Registro de Métricas

#### Validaciones

```javascript
// Registrar validación exitosa
PerformanceTracker.validation('weeklyLimit', true, 150, {
  samplerName: 'John',
  proposedHours: 8,
  weeklyLimit: 40,
  currentWeeklyHours: 32
});

// Registrar validación fallida
PerformanceTracker.validation('dayRestriction', false, 50, {
  samplerName: 'Jane',
  proposedDate: '2024-01-15',
  restrictedDay: 'sunday'
});
```

#### Operaciones de Cache

```javascript
// Registrar llamada exitosa a API
PerformanceTracker.apiCall('loadSamplersData', true, 150, {
  responseSize: 1024,
  endpoint: '/api/samplers'
});

// Registrar llamada fallida a API
PerformanceTracker.apiCall('loadActiveRosters', false, 500, {
  error: 'Network timeout',
  endpoint: '/api/rosters'
});
```

#### Operaciones de Cache

```javascript
// Registrar hit de cache
PerformanceTracker.cache('preloadWeekValidationData', true, 25, 1024000);

// Registrar miss de cache
PerformanceTracker.cache('preloadWeekValidationData', false, 500, 2048000);
```

#### Cálculos de Turnos

```javascript
// Registrar cálculo exitoso
PerformanceTracker.calculation(true, 1200, 5, false);

// Registrar cálculo con fallback
PerformanceTracker.calculation(true, 800, 3, true);
```

#### Errores y Warnings

```javascript
// Registrar error
PerformanceTracker.error('ValidationService', 'validateSamplerWeeklyLimit', error);

// Registrar warning
PerformanceTracker.warning('ScheduleCalculator', 'calculateFallbackTurn', 'Using fallback assignment');
```

## 📈 Métricas Disponibles

### ValidationService

| Métrica | Descripción | Tipo |
|---------|-------------|------|
| `totalValidations` | Total de validaciones realizadas | Counter |
| `successfulValidations` | Validaciones exitosas | Counter |
| `failedValidations` | Validaciones fallidas | Counter |
| `averageValidationTime` | Tiempo promedio de validación (ms) | Gauge |
| `weeklyLimitValidations` | Validaciones de límite semanal | Counter |
| `dayRestrictionValidations` | Validaciones de restricción de días | Counter |
| `pobConflictValidations` | Validaciones de conflicto POB | Counter |
| `restValidationValidations` | Validaciones de descanso | Counter |

### ValidationCacheService

| Métrica | Descripción | Tipo |
|---------|-------------|------|
| `totalRequests` | Total de requests al cache | Counter |
| `cacheHits` | Hits de cache | Counter |
| `cacheMisses` | Misses de cache | Counter |
| `averageResponseTime` | Tiempo promedio de respuesta (ms) | Gauge |
| `memoryUsage` | Uso de memoria del cache (bytes) | Gauge |
| `cleanupOperations` | Operaciones de limpieza | Counter |

### ScheduleCalculator

| Métrica | Descripción | Tipo |
|---------|-------------|------|
| `totalCalculations` | Total de cálculos realizados | Counter |
| `successfulCalculations` | Cálculos exitosos | Counter |
| `failedCalculations` | Cálculos fallidos | Counter |
| `averageCalculationTime` | Tiempo promedio de cálculo (ms) | Gauge |
| `turnsGenerated` | Turnos generados | Counter |
| `fallbackAssignments` | Asignaciones de fallback | Counter |

### Sistema

| Métrica | Descripción | Tipo |
|---------|-------------|------|
| `uptime` | Tiempo de actividad del sistema | Gauge |
| `lastActivity` | Última actividad registrada | Gauge |
| `errors` | Total de errores del sistema | Counter |
| `warnings` | Total de warnings del sistema | Counter |
| `totalApiCalls` | Total de llamadas a API | Counter |
| `successfulApiCalls` | Llamadas a API exitosas | Counter |
| `failedApiCalls` | Llamadas a API fallidas | Counter |
| `averageApiCallTime` | Tiempo promedio de llamadas a API (ms) | Gauge |

## 🏥 Health Score

El sistema calcula automáticamente un score de salud basado en:

- **Tasa de éxito de validaciones** (90%+ = excelente)
- **Tasa de hit del cache** (70%+ = excelente)
- **Tasa de éxito de cálculos** (80%+ = excelente)
- **Número de errores** (<10 = excelente)
- **Tiempo de respuesta** (<1000ms validaciones, <500ms cache)

### Niveles de Salud

- **Excellent** (90-100): Sistema funcionando perfectamente
- **Good** (80-89): Sistema funcionando bien con optimizaciones menores
- **Fair** (70-79): Sistema funcionando con algunos problemas
- **Poor** (50-69): Sistema con problemas significativos
- **Critical** (<50): Sistema con problemas críticos

## 📊 Reportes Automáticos

### Frecuencia
- **Reportes automáticos**: Cada 5 minutos
- **Historial**: Últimos 100 reportes
- **Retención**: En memoria durante la sesión

### Contenido del Reporte

```javascript
{
  timestamp: "2024-01-15T10:30:00.000Z",
  uptime: 3600000, // 1 hora en ms
  metrics: {
    validationService: { /* métricas detalladas */ },
    cacheService: { /* métricas detalladas */ },
    scheduleCalculator: { /* métricas detalladas */ },
    system: { /* métricas detalladas */ }
  },
  health: {
    score: 95,
    status: "excellent",
    issues: []
  }
}
```

## 🔧 Integración en Servicios

### ValidationService

```javascript
// Ejemplo de integración
static async validateSamplerWeeklyLimit(samplerName, proposedHours, startTime, context, excludeRosterId) {
  const startTime = performance.now();
  
  try {
    // ... lógica de validación ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('weeklyLimit', isValid, performance.now() - startTime, {
      samplerName,
      proposedHours,
      weeklyLimit,
      currentWeeklyHours
    });
    
    return result;
  } catch (error) {
    // Registrar error de performance
    PerformanceTracker.error('ValidationService', 'validateSamplerWeeklyLimit', error);
    throw error;
  }
}
```

### ValidationCacheService

```javascript
// Ejemplo de integración
async preloadWeekValidationData(startDate, endDate) {
  const startTime = performance.now();
  
  try {
    // ... lógica de cache ...
    
    // Registrar métricas de cache
    PerformanceTracker.cache('preloadWeekValidationData', isCacheHit, performance.now() - startTime, memoryUsage);
    
    return data;
  } catch (error) {
    PerformanceTracker.error('ValidationCacheService', 'preloadWeekValidationData', error);
    throw error;
  }
}
```

### ScheduleCalculator

```javascript
// Ejemplo de integración
static async calculateLineSamplingTurns(officeData, totalHours, samplersData, currentRosterId) {
  const startTime = performance.now();
  
  try {
    // ... lógica de cálculo ...
    
    // Registrar métricas de cálculo
    PerformanceTracker.calculation(true, performance.now() - startTime, turns.length, false);
    
    return turns;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'calculateLineSamplingTurns', error);
    throw error;
  }
}
```

## 📤 Exportación de Datos

### Formato JSON

```javascript
const monitor = getPerformanceMonitor();
const jsonData = monitor.exportMetrics('json');
console.log(jsonData);
```

### Formato CSV

```javascript
const monitor = getPerformanceMonitor();
const csvData = monitor.exportMetrics('csv');
console.log(csvData);
```

### Datos Raw

```javascript
const monitor = getPerformanceMonitor();
const rawData = monitor.exportMetrics('raw');
console.log(rawData);
```

## 🎯 Casos de Uso

### 1. Monitoreo en Tiempo Real

```javascript
// Obtener métricas actuales
const monitor = getPerformanceMonitor();
const metrics = monitor.getCurrentMetrics();

console.log('Health Score:', metrics.health.score);
console.log('Cache Hit Rate:', metrics.cacheService.cacheHitRate);
console.log('Validation Success Rate:', metrics.validationService.successRate);
```

### 2. Análisis de Tendencias

```javascript
// Obtener historial de performance
const monitor = getPerformanceMonitor();
const history = monitor.getPerformanceHistory(20); // Últimos 20 reportes

history.forEach(report => {
  console.log(`${report.timestamp}: Score ${report.health.score} (${report.health.status})`);
});
```

### 3. Detección de Problemas

```javascript
// Verificar salud del sistema
const monitor = getPerformanceMonitor();
const health = monitor.calculateHealthScore();

if (health.status === 'critical') {
  console.error('Sistema en estado crítico:', health.issues);
  // Enviar alerta al administrador
}
```

### 4. Optimización de Performance

```javascript
// Analizar métricas de cache
const metrics = monitor.getCurrentMetrics();
if (metrics.cacheService.cacheHitRate < '70%') {
  console.warn('Cache hit rate bajo, considerar optimizaciones');
}

// Analizar tiempo de validación
if (metrics.validationService.averageValidationTime > 1000) {
  console.warn('Validaciones lentas, revisar algoritmos');
}
```

## 🚨 Alertas y Notificaciones

### Configuración de Alertas

```javascript
// Verificar métricas cada minuto
setInterval(() => {
  const monitor = getPerformanceMonitor();
  const health = monitor.calculateHealthScore();
  
  if (health.score < 70) {
    // Enviar notificación
    if (window.Logger) {
      window.Logger.error('Sistema de performance degradado', {
        module: 'PerformanceMonitor',
        data: {
          score: health.score,
          status: health.status,
          issues: health.issues
        },
        showNotification: true
      });
    }
  }
}, 60000);
```

## 🔄 Mantenimiento

### Reset de Métricas

```javascript
// Resetear todas las métricas
const monitor = getPerformanceMonitor();
monitor.resetMetrics();
```

### Limpieza de Historial

```javascript
// El historial se limpia automáticamente (máximo 100 entradas)
// Para limpiar manualmente:
monitor.performanceHistory = [];
```

### Destrucción del Monitor

```javascript
// Limpiar recursos
const monitor = getPerformanceMonitor();
monitor.destroy();
```

## 📋 Mejores Prácticas

### 1. Registro Consistente

- Siempre registrar métricas al inicio y final de operaciones
- Incluir contexto relevante en los detalles
- Manejar errores apropiadamente

### 2. Monitoreo Proactivo

- Revisar métricas regularmente
- Configurar alertas automáticas
- Analizar tendencias de performance

### 3. Optimización Basada en Datos

- Identificar cuellos de botella usando métricas
- Optimizar operaciones con mayor tiempo de respuesta
- Ajustar configuraciones basándose en datos reales

### 4. Mantenimiento Regular

- Resetear métricas periódicamente
- Exportar datos para análisis histórico
- Limpiar recursos no utilizados

## 🛠️ Troubleshooting

### Problemas Comunes

1. **Métricas no se registran**
   - Verificar que PerformanceTracker esté importado correctamente
   - Confirmar que el monitor esté inicializado

2. **Performance degradado**
   - Revisar health score y issues
   - Analizar métricas de tiempo de respuesta
   - Verificar uso de memoria del cache

3. **Errores frecuentes**
   - Revisar logs de errores
   - Analizar patrones en las métricas
   - Verificar configuración del sistema

### Debugging

```javascript
// Habilitar logging detallado
const monitor = getPerformanceMonitor();
console.log('Current Metrics:', monitor.getCurrentMetrics());
console.log('Health Score:', monitor.calculateHealthScore());
console.log('Performance History:', monitor.getPerformanceHistory(5));
```

## 📚 Referencias

- [PerformanceMonitor.js](../services/PerformanceMonitor.js)
- [ValidationService.js](../services/ValidationService.js)
- [ValidationCacheService.js](../services/ValidationCacheService.js)
- [ScheduleCalculator.js](../services/ScheduleCalculator.js)
- [NotificationService.js](../../shared/NotificationService.js)

---

**Última actualización**: Enero 2024  
**Versión**: 1.0.0  
**Autor**: Sistema de Sampling Roster
