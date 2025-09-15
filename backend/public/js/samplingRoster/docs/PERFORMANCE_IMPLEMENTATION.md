# 🔧 Implementación Técnica del Sistema de Performance

## Arquitectura de Implementación

### 1. PerformanceMonitor.js - Clase Principal

```javascript
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      validationService: { /* métricas de validación */ },
      cacheService: { /* métricas de cache */ },
      scheduleCalculator: { /* métricas de cálculo */ },
      system: { /* métricas del sistema */ }
    };
    this.performanceHistory = [];
    this.maxHistorySize = 100;
    this.reportingInterval = null;
    this.isMonitoring = false;
  }
}
```

### 2. PerformanceTracker - Helper Global

```javascript
export const PerformanceTracker = {
  validation: (operation, success, duration, details) => {
    getPerformanceMonitor().recordValidation('ValidationService', operation, success, duration, details);
  },
  cache: (operation, hit, duration, memoryUsage) => {
    getPerformanceMonitor().recordCacheOperation(operation, hit, duration, memoryUsage);
  },
  calculation: (success, duration, turnsGenerated, fallbackUsed) => {
    getPerformanceMonitor().recordScheduleCalculation(success, duration, turnsGenerated, fallbackUsed);
  },
  error: (module, operation, error) => {
    getPerformanceMonitor().recordError(module, operation, error);
  },
  warning: (module, operation, message) => {
    getPerformanceMonitor().recordWarning(module, operation, message);
  }
};
```

## Integración por Servicio

### ValidationService.js

#### Métodos Instrumentados

1. **validateSamplerWeeklyLimit**
```javascript
static async validateSamplerWeeklyLimit(samplerName, proposedHours, startTime, context, excludeRosterId) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
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

2. **validateSamplerDayRestriction**
```javascript
static async validateSamplerDayRestriction(samplerName, proposedDate, excludeRosterId) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    PerformanceTracker.validation('dayRestriction', isValid, performance.now() - startTime, {
      samplerName,
      proposedDate,
      dayOfWeek,
      isRestrictedDay
    });
    
    return result;
  } catch (error) {
    PerformanceTracker.error('ValidationService', 'validateSamplerDayRestriction', error);
    throw error;
  }
}
```

3. **getSamplerData**
```javascript
static async getSamplerData(samplerName) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    PerformanceTracker.apiCall('getSamplerData', true, performance.now() - startTime, {
      samplerName,
      responseSize: JSON.stringify(result).length
    });
    
    return result;
  } catch (error) {
    PerformanceTracker.error('ValidationService', 'getSamplerData', error);
    throw error;
  }
}
```

#### Patrón de Implementación

```javascript
// 1. Medir tiempo de inicio
const startTime = performance.now();

try {
  // 2. Ejecutar lógica existente
  // ... código del método ...
  
  // 3. Registrar métricas de éxito
  PerformanceTracker.validation('operationName', true, performance.now() - startTime, {
    // contexto relevante
  });
  
  return result;
} catch (error) {
  // 4. Registrar error de performance
  PerformanceTracker.error('ValidationService', 'methodName', error);
  throw error;
}
```

### ValidationCacheService.js

#### Métodos Instrumentados

1. **preloadWeekValidationData**
```javascript
async preloadWeekValidationData(startDate, endDate) {
  const startTime = performance.now();
  this.performanceMetrics.totalRequests++;

  try {
    // ... lógica existente ...
    
    // Registrar métricas de cache
    PerformanceTracker.cache('preloadWeekValidationData', isCacheHit, performance.now() - startTime, {
      weekKey,
      cacheHit: isCacheHit,
      cacheSize: this.weeklyCache.size,
      rosters: activeRosters.length,
      nominations: shipNominations.length,
      samplers: samplersData.length,
      memoryUsage: this.performanceMetrics.memoryUsage
    });
    
    return completeCacheData;
  } catch (error) {
    PerformanceTracker.error('ValidationCacheService', 'preloadWeekValidationData', error);
    throw error;
  }
}
```

2. **loadActiveRostersForWeek**
```javascript
async loadActiveRostersForWeek(startDate, endDate) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de API
    PerformanceTracker.apiCall('loadActiveRostersForWeek', true, performance.now() - startTime, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      responseSize: JSON.stringify(result).length
    });
    
    return result;
  } catch (error) {
    PerformanceTracker.error('ValidationCacheService', 'loadActiveRostersForWeek', error);
    return [];
  }
}
```

3. **calculateAllValidations**
```javascript
calculateAllValidations(activeRosters, shipNominations, samplersData, truckWorkDays, otherJobs, startDate, endDate) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de validación
    PerformanceTracker.validation('calculateAllValidations', true, performance.now() - startTime, {
      samplersIndexed: Object.keys(perSampler).length,
      activeRostersCount: activeRosters?.length || 0,
      samplersDataCount: samplersData?.length || 0,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString()
    });
    
    return perSampler;
  } catch (error) {
    PerformanceTracker.error('ValidationCacheService', 'calculateAllValidations', error);
    return {};
  }
}
```

### ScheduleCalculator.js

#### Métodos Instrumentados

1. **calculateLineSamplingTurns**
```javascript
static async calculateLineSamplingTurns(officeData, totalHours, samplersData, currentRosterId = null) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('calculateLineSamplingTurns', true, performance.now() - startTime, {
      totalTurns: turns.length,
      totalHoursAssigned: totalHours - remainingHours,
      totalHours: totalHours,
      remainingHours: remainingHours,
      samplersCount: samplersData?.length || 0,
      currentRosterId: currentRosterId
    });
    
    return turns;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'calculateLineSamplingTurns', error);
    throw error;
  }
}
```

2. **calculateFirstTurnWithValidations**
```javascript
static async calculateFirstTurnWithValidations(officeData, officeFinishTime, remainingHours, currentRosterId) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('calculateFirstTurnWithValidations', true, performance.now() - startTime, {
      officeSampler: officeData.samplerName,
      actualHours: actualHours,
      hoursToNextBlock: hoursToNextBlock,
      canContinue: true
    });
    
    return result;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'calculateFirstTurnWithValidations', error);
    throw error;
  }
}
```

3. **calculateNextTurnWithValidations**
```javascript
static async calculateNextTurnWithValidations(currentStartTime, remainingHours, samplersData, turnsInMemory, officeData, currentRosterId, weekValidationCache = null) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('calculateNextTurnWithValidations', true, performance.now() - startTime, {
      selectedSampler: bestSampler.sampler.name,
      turnHours: turnInfo.turnHours,
      availableSamplers: availableSamplers.length,
      cacheAvailable: !!weekValidationCache
    });
    
    return result;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'calculateNextTurnWithValidations', error);
    throw error;
  }
}
```

4. **calculateTurnDuration**
```javascript
static calculateTurnDuration(currentStartTime, remainingHours) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('calculateTurnDuration', true, performance.now() - startTime, {
      turnHours: turnHours,
      isBlockBoundary: isAtBlockBoundary,
      isLastTurn: remainingHours <= turnHours,
      remainingHours: remainingHours
    });
    
    return result;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'calculateTurnDuration', error);
    throw error;
  }
}
```

5. **trackSamplerAssignment**
```javascript
static trackSamplerAssignment(samplerName, hours, generationId = "default") {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('trackSamplerAssignment', true, performance.now() - startTime, {
      samplerName: samplerName,
      hours: hours,
      generationId: generationId,
      totalHours: hoursTracking.get(samplerName)
    });
    
    // ... logging existente ...
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'trackSamplerAssignment', error);
  }
}
```

6. **getRotatedSamplerWithMemory**
```javascript
static getRotatedSamplerWithMemory(availableSamplers, turnsInMemory = [], generationId = "default") {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('getRotatedSamplerWithMemory', true, performance.now() - startTime, {
      selectedSampler: selected.samplerName,
      score: Math.round(selected.score),
      currentHours: selected.currentHours,
      recentCount: selected.timesInRecent,
      totalOptions: availableSamplers.length,
      generationId: generationId
    });
    
    return selected.samplerData;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'getRotatedSamplerWithMemory', error);
    return null;
  }
}
```

7. **selectBestSampler**
```javascript
static selectBestSampler(availableSamplers, turnsInMemory, generationId = "default") {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('selectBestSampler', true, performance.now() - startTime, {
      selectedSampler: selectedSampler.sampler?.name || selectedSampler.name,
      availableOptions: availableSamplers.length,
      generationId: generationId
    });
    
    return selectedSampler;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'selectBestSampler', error);
    return null;
  }
}
```

8. **calculateFallbackTurn**
```javascript
static async calculateFallbackTurn(currentStartTime, remainingHours, samplersData, turnsInMemory, officeData) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('calculateFallbackTurn', true, performance.now() - startTime, {
      selectedSampler: sampler.name,
      currentDailyHours: dailyHours,
      proposedHours: turnInfo.turnHours,
      totalDailyAfter: dailyHours + turnInfo.turnHours,
      isFallback: true
    });
    
    return result;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'calculateFallbackTurn', error);
    return { success: false, reason: "Error in fallback calculation" };
  }
}
```

9. **generateTurnsSummary**
```javascript
static generateTurnsSummary(turns, officeData, totalHours) {
  const startTime = performance.now();
  
  try {
    // ... lógica existente ...
    
    // Registrar métricas de performance
    PerformanceTracker.validation('generateTurnsSummary', true, performance.now() - startTime, {
      totalTurns: turns.length,
      totalHours: totalHours,
      samplersCount: Object.keys(samplerHours).length,
      averageHoursPerSampler: summary.averageHoursPerSampler
    });
    
    return summary;
  } catch (error) {
    PerformanceTracker.error('ScheduleCalculator', 'generateTurnsSummary', error);
    return { totalTurns: 0, totalHours: 0, samplerDistribution: {}, averageHoursPerSampler: 0 };
  }
}
```

## Patrones de Implementación

### 1. Patrón Básico de Métricas

```javascript
// 1. Medir tiempo de inicio
const startTime = performance.now();

try {
  // 2. Ejecutar lógica existente
  const result = await existingLogic();
  
  // 3. Registrar métricas de éxito
  PerformanceTracker.validation('operationName', true, performance.now() - startTime, {
    // contexto relevante para debugging
  });
  
  return result;
} catch (error) {
  // 4. Registrar error de performance
  PerformanceTracker.error('ServiceName', 'methodName', error);
  throw error;
}
```

### 2. Patrón para Operaciones de Cache

```javascript
// 1. Medir tiempo de inicio
const startTime = performance.now();

try {
  // 2. Verificar cache
  const isCacheHit = this.isCacheValid(key);
  
  if (isCacheHit) {
    // 3. Registrar hit de cache
    PerformanceTracker.cache('operationName', true, performance.now() - startTime, memoryUsage);
    return cachedData;
  }
  
  // 4. Cargar datos
  const data = await loadData();
  
  // 5. Registrar miss de cache
  PerformanceTracker.cache('operationName', false, performance.now() - startTime, memoryUsage);
  
  return data;
} catch (error) {
  PerformanceTracker.error('ServiceName', 'methodName', error);
  throw error;
}
```

### 3. Patrón para Validaciones

```javascript
// 1. Medir tiempo de inicio
const startTime = performance.now();

try {
  // 2. Ejecutar validación
  const isValid = await performValidation();
  
  // 3. Registrar métricas de validación
  PerformanceTracker.validation('validationType', isValid, performance.now() - startTime, {
    // contexto específico de la validación
  });
  
  return { isValid, message: isValid ? "Valid" : "Invalid" };
} catch (error) {
  PerformanceTracker.error('ValidationService', 'validationMethod', error);
  return { isValid: false, message: "Validation error" };
}
```

## Consideraciones de Performance

### 1. Overhead Mínimo

- Las mediciones de tiempo tienen overhead mínimo (< 1ms)
- Los registros de métricas son asíncronos
- No se bloquean operaciones críticas

### 2. Memoria

- Historial limitado a 100 entradas
- Limpieza automática de datos antiguos
- Métricas en memoria durante la sesión

### 3. Logging

- Integrado con NotificationService existente
- Niveles de log apropiados (DEBUG, INFO, WARN, ERROR)
- No spam de logs en producción

## Testing

### 1. Unit Tests

```javascript
describe('PerformanceTracker', () => {
  it('should record validation metrics', () => {
    const startTime = performance.now();
    PerformanceTracker.validation('testOperation', true, 100, { test: 'data' });
    
    const monitor = getPerformanceMonitor();
    const metrics = monitor.getCurrentMetrics();
    
    expect(metrics.validationService.totalValidations).toBe(1);
    expect(metrics.validationService.successfulValidations).toBe(1);
  });
});
```

### 2. Integration Tests

```javascript
describe('ValidationService with Performance', () => {
  it('should record metrics for weekly limit validation', async () => {
    const result = await ValidationService.validateSamplerWeeklyLimit('John', 8, new Date());
    
    const monitor = getPerformanceMonitor();
    const metrics = monitor.getCurrentMetrics();
    
    expect(metrics.validationService.weeklyLimitValidations).toBeGreaterThan(0);
  });
});
```

## Debugging

### 1. Habilitar Logging Detallado

```javascript
// En consola del navegador
const monitor = getPerformanceMonitor();
console.log('Current Metrics:', monitor.getCurrentMetrics());
console.log('Health Score:', monitor.calculateHealthScore());
console.log('Performance History:', monitor.getPerformanceHistory(10));
```

### 2. Exportar Datos

```javascript
// Exportar métricas para análisis
const jsonData = monitor.exportMetrics('json');
const csvData = monitor.exportMetrics('csv');

// Guardar en archivo
const blob = new Blob([jsonData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'performance-metrics.json';
a.click();
```

## Mantenimiento

### 1. Limpieza Regular

```javascript
// Resetear métricas cada hora
setInterval(() => {
  const monitor = getPerformanceMonitor();
  monitor.resetMetrics();
}, 3600000);
```

### 2. Monitoreo de Salud

```javascript
// Verificar salud cada 5 minutos
setInterval(() => {
  const monitor = getPerformanceMonitor();
  const health = monitor.calculateHealthScore();
  
  if (health.score < 70) {
    console.warn('Performance degraded:', health.issues);
  }
}, 300000);
```

---

**Nota**: Esta implementación está diseñada para ser no-intrusiva y tener impacto mínimo en el rendimiento del sistema existente.
