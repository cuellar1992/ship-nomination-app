# 📊 API de Monitoreo de Performance

## PerformanceMonitor Class

### Constructor

```javascript
new PerformanceMonitor()
```

Crea una nueva instancia del monitor de performance con métricas inicializadas.

### Métodos Principales

#### `startMonitoring()`

Inicia el monitoreo automático con reportes cada 5 minutos.

```javascript
const monitor = new PerformanceMonitor();
monitor.startMonitoring();
```

#### `stopMonitoring()`

Detiene el monitoreo automático.

```javascript
monitor.stopMonitoring();
```

#### `recordValidation(service, operation, success, duration, details)`

Registra una métrica de validación.

**Parámetros:**
- `service` (string): Nombre del servicio
- `operation` (string): Tipo de operación
- `success` (boolean): Si la operación fue exitosa
- `duration` (number): Duración en milisegundos
- `details` (object): Detalles adicionales

```javascript
monitor.recordValidation('ValidationService', 'weeklyLimit', true, 150, {
  samplerName: 'John',
  proposedHours: 8
});
```

#### `recordCacheOperation(operation, hit, duration, memoryUsage)`

Registra una operación de cache.

**Parámetros:**
- `operation` (string): Nombre de la operación
- `hit` (boolean): Si fue un hit de cache
- `duration` (number): Duración en milisegundos
- `memoryUsage` (number): Uso de memoria en bytes

```javascript
monitor.recordCacheOperation('preloadWeekValidationData', true, 25, 1024000);
```

#### `recordScheduleCalculation(success, duration, turnsGenerated, fallbackUsed)`

Registra un cálculo de turnos.

**Parámetros:**
- `success` (boolean): Si el cálculo fue exitoso
- `duration` (number): Duración en milisegundos
- `turnsGenerated` (number): Número de turnos generados
- `fallbackUsed` (boolean): Si se usó fallback

```javascript
monitor.recordScheduleCalculation(true, 1200, 5, false);
```

#### `recordError(module, operation, error)`

Registra un error del sistema.

**Parámetros:**
- `module` (string): Módulo donde ocurrió el error
- `operation` (string): Operación que falló
- `error` (Error): Objeto de error

```javascript
monitor.recordError('ValidationService', 'validateSamplerWeeklyLimit', error);
```

#### `recordWarning(module, operation, message)`

Registra un warning del sistema.

**Parámetros:**
- `module` (string): Módulo donde ocurrió el warning
- `operation` (string): Operación que generó el warning
- `message` (string): Mensaje de warning

```javascript
monitor.recordWarning('ScheduleCalculator', 'calculateFallbackTurn', 'Using fallback assignment');
```

#### `getCurrentMetrics()`

Obtiene las métricas actuales del sistema.

**Retorna:** Object con métricas formateadas

```javascript
const metrics = monitor.getCurrentMetrics();
console.log(metrics.validationService.successRate);
console.log(metrics.cacheService.cacheHitRate);
console.log(metrics.scheduleCalculator.averageCalculationTime);
```

#### `calculateHealthScore()`

Calcula el score de salud del sistema.

**Retorna:** Object con score, status e issues

```javascript
const health = monitor.calculateHealthScore();
console.log(`Health Score: ${health.score} (${health.status})`);
if (health.issues.length > 0) {
  console.log('Issues:', health.issues);
}
```

#### `generatePerformanceReport()`

Genera un reporte completo de performance.

**Retorna:** Object con reporte detallado

```javascript
const report = monitor.generatePerformanceReport();
console.log('Uptime:', report.uptime);
console.log('Health:', report.health);
console.log('Metrics:', report.metrics);
```

#### `getPerformanceHistory(limit)`

Obtiene el historial de performance.

**Parámetros:**
- `limit` (number): Número máximo de entradas a retornar

**Retorna:** Array de reportes históricos

```javascript
const history = monitor.getPerformanceHistory(10);
history.forEach(report => {
  console.log(`${report.timestamp}: Score ${report.health.score}`);
});
```

#### `resetMetrics()`

Resetea todas las métricas a cero.

```javascript
monitor.resetMetrics();
```

#### `exportMetrics(format)`

Exporta las métricas en diferentes formatos.

**Parámetros:**
- `format` (string): Formato de exportación ('json', 'csv', 'raw')

**Retorna:** String o Object con datos exportados

```javascript
// JSON
const jsonData = monitor.exportMetrics('json');

// CSV
const csvData = monitor.exportMetrics('csv');

// Raw object
const rawData = monitor.exportMetrics('raw');
```

#### `destroy()`

Destruye el monitor y limpia recursos.

```javascript
monitor.destroy();
```

## PerformanceTracker Helper

### `validation(operation, success, duration, details)`

Helper para registrar métricas de validación.

```javascript
PerformanceTracker.validation('weeklyLimit', true, 150, {
  samplerName: 'John',
  proposedHours: 8
});
```

### `cache(operation, hit, duration, memoryUsage)`

Helper para registrar métricas de cache.

```javascript
PerformanceTracker.cache('preloadWeekValidationData', true, 25, 1024000);
```

### `calculation(success, duration, turnsGenerated, fallbackUsed)`

Helper para registrar métricas de cálculo.

```javascript
PerformanceTracker.calculation(true, 1200, 5, false);
```

### `apiCall(operation, success, duration, details)`

Helper para registrar métricas de llamadas a API.

```javascript
PerformanceTracker.apiCall('loadSamplersData', true, 150, {
  responseSize: 1024,
  endpoint: '/api/samplers'
});
```

### `error(module, operation, error)`

Helper para registrar errores.

```javascript
PerformanceTracker.error('ValidationService', 'validateSamplerWeeklyLimit', error);
```

### `warning(module, operation, message)`

Helper para registrar warnings.

```javascript
PerformanceTracker.warning('ScheduleCalculator', 'calculateFallbackTurn', 'Using fallback assignment');
```

## Funciones de Utilidad

### `getPerformanceMonitor()`

Obtiene la instancia global del monitor.

```javascript
const monitor = getPerformanceMonitor();
```

## Estructura de Datos

### Métricas de ValidationService

```javascript
{
  totalValidations: 0,
  successfulValidations: 0,
  failedValidations: 0,
  averageValidationTime: 0,
  weeklyLimitValidations: 0,
  dayRestrictionValidations: 0,
  pobConflictValidations: 0,
  restValidationValidations: 0,
  successRate: "0%"
}
```

### Métricas de CacheService

```javascript
{
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0,
  memoryUsage: 0,
  cleanupOperations: 0,
  cacheHitRate: "0%",
  memoryUsageMB: "0.00MB"
}
```

### Métricas de ScheduleCalculator

```javascript
{
  totalCalculations: 0,
  successfulCalculations: 0,
  failedCalculations: 0,
  averageCalculationTime: 0,
  turnsGenerated: 0,
  fallbackAssignments: 0,
  successRate: "0%"
}
```

### Métricas del Sistema

```javascript
{
  uptime: 1640995200000,
  lastActivity: 1640995200000,
  errors: 0,
  warnings: 0,
  totalApiCalls: 0,
  successfulApiCalls: 0,
  failedApiCalls: 0,
  averageApiCallTime: 0,
  uptimeFormatted: "1h 30m",
  lastActivityFormatted: "5m",
  apiSuccessRate: "0%"
}
```

### Health Score

```javascript
{
  score: 95,
  status: "excellent",
  issues: []
}
```

### Reporte de Performance

```javascript
{
  timestamp: "2024-01-15T10:30:00.000Z",
  uptime: 3600000,
  metrics: {
    validationService: { /* métricas de validación */ },
    cacheService: { /* métricas de cache */ },
    scheduleCalculator: { /* métricas de cálculo */ },
    system: { /* métricas del sistema */ }
  },
  health: {
    score: 95,
    status: "excellent",
    issues: []
  }
}
```

## Ejemplos de Uso

### Monitoreo Básico

```javascript
import { getPerformanceMonitor } from './services/PerformanceMonitor.js';

const monitor = getPerformanceMonitor();

// Obtener métricas actuales
const metrics = monitor.getCurrentMetrics();
console.log('Validation Success Rate:', metrics.validationService.successRate);
console.log('Cache Hit Rate:', metrics.cacheService.cacheHitRate);

// Verificar salud del sistema
const health = monitor.calculateHealthScore();
if (health.status === 'critical') {
  console.error('Sistema en estado crítico:', health.issues);
}
```

### Análisis de Tendencias

```javascript
// Obtener historial de performance
const history = monitor.getPerformanceHistory(20);

// Analizar tendencias
const scores = history.map(report => report.health.score);
const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
console.log('Average Health Score:', averageScore);

// Identificar problemas
const criticalReports = history.filter(report => report.health.score < 70);
if (criticalReports.length > 0) {
  console.warn('Períodos críticos detectados:', criticalReports.length);
}
```

### Exportación de Datos

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

### Debugging

```javascript
// Habilitar logging detallado
const monitor = getPerformanceMonitor();

// Ver métricas actuales
console.log('Current Metrics:', monitor.getCurrentMetrics());

// Ver salud del sistema
console.log('Health Score:', monitor.calculateHealthScore());

// Ver historial reciente
console.log('Recent History:', monitor.getPerformanceHistory(5));

// Exportar datos para análisis
const data = monitor.exportMetrics('raw');
console.log('Raw Data:', data);
```

## Consideraciones de Performance

### Overhead

- Las mediciones de tiempo tienen overhead mínimo (< 1ms)
- Los registros de métricas son asíncronos
- No se bloquean operaciones críticas

### Memoria

- Historial limitado a 100 entradas
- Limpieza automática de datos antiguos
- Métricas en memoria durante la sesión

### Logging

- Integrado con NotificationService existente
- Niveles de log apropiados
- No spam de logs en producción

## Troubleshooting

### Problemas Comunes

1. **Métricas no se registran**
   - Verificar que PerformanceTracker esté importado
   - Confirmar que el monitor esté inicializado

2. **Performance degradado**
   - Revisar health score y issues
   - Analizar métricas de tiempo de respuesta

3. **Errores frecuentes**
   - Revisar logs de errores
   - Analizar patrones en las métricas

### Debugging

```javascript
// Verificar estado del monitor
const monitor = getPerformanceMonitor();
console.log('Is Monitoring:', monitor.isMonitoring);
console.log('Metrics:', monitor.getCurrentMetrics());
console.log('Health:', monitor.calculateHealthScore());
```

---

**Última actualización**: Enero 2024  
**Versión**: 1.0.0
