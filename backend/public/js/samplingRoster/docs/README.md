# 📚 Documentación del Sistema de Sampling Roster

## Descripción General

Este directorio contiene la documentación completa del sistema de Sampling Roster, incluyendo el nuevo sistema de monitoreo de performance implementado.

## 📁 Estructura de Documentación

### 📊 Sistema de Monitoreo de Performance

- **[PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md)** - Documentación completa del sistema de métricas y monitoreo
- **[PERFORMANCE_IMPLEMENTATION.md](./PERFORMANCE_IMPLEMENTATION.md)** - Guía técnica de implementación para desarrolladores
- **[PERFORMANCE_API.md](./PERFORMANCE_API.md)** - Referencia de API y ejemplos de uso

## 🚀 Inicio Rápido

### Para Desarrolladores

1. **Leer la implementación técnica**: [PERFORMANCE_IMPLEMENTATION.md](./PERFORMANCE_IMPLEMENTATION.md)
2. **Consultar la API**: [PERFORMANCE_API.md](./PERFORMANCE_API.md)
3. **Entender el sistema completo**: [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md)

### Para Administradores

1. **Leer la documentación general**: [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md)
2. **Consultar la API para monitoreo**: [PERFORMANCE_API.md](./PERFORMANCE_API.md)

## 🔧 Componentes del Sistema

### Archivos Principales

- **`PerformanceMonitor.js`** - Clase principal del sistema de métricas
- **`ValidationService.js`** - Servicio de validación con métricas integradas
- **`ValidationCacheService.js`** - Servicio de cache con métricas integradas
- **`ScheduleCalculator.js`** - Calculadora de turnos con métricas integradas

### Integración

El sistema de métricas está integrado en todos los servicios críticos:

- ✅ **ValidationService** - 18 métodos instrumentados
- ✅ **ValidationCacheService** - 7 métodos instrumentados
- ✅ **ScheduleCalculator** - 9 métodos instrumentados

## 📈 Métricas Disponibles

### Por Servicio

| Servicio | Métricas | Descripción |
|----------|----------|-------------|
| **ValidationService** | 8 tipos | Validaciones de límites, restricciones, conflictos |
| **ValidationCacheService** | 6 tipos | Operaciones de cache, hit/miss rates, memoria |
| **ScheduleCalculator** | 6 tipos | Cálculos de turnos, rotación, fallbacks |
| **Sistema** | 4 tipos | Uptime, errores, warnings, actividad |

### Tipos de Métricas

- **Counters** - Contadores de eventos (validaciones, errores, etc.)
- **Gauges** - Valores instantáneos (tiempo promedio, memoria, etc.)
- **Health Scores** - Scores de salud del sistema (0-100)
- **Performance Reports** - Reportes automáticos cada 5 minutos

## 🎯 Casos de Uso

### 1. Monitoreo en Tiempo Real

```javascript
import { getPerformanceMonitor } from './services/PerformanceMonitor.js';

const monitor = getPerformanceMonitor();
const metrics = monitor.getCurrentMetrics();
console.log('Health Score:', metrics.health.score);
```

### 2. Análisis de Performance

```javascript
const history = monitor.getPerformanceHistory(20);
const scores = history.map(report => report.health.score);
const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
```

### 3. Detección de Problemas

```javascript
const health = monitor.calculateHealthScore();
if (health.status === 'critical') {
  console.error('Sistema crítico:', health.issues);
}
```

### 4. Exportación de Datos

```javascript
const jsonData = monitor.exportMetrics('json');
const csvData = monitor.exportMetrics('csv');
```

## 🏥 Health Monitoring

### Niveles de Salud

- **Excellent** (90-100) - Sistema funcionando perfectamente
- **Good** (80-89) - Sistema funcionando bien
- **Fair** (70-79) - Sistema con algunos problemas
- **Poor** (50-69) - Sistema con problemas significativos
- **Critical** (<50) - Sistema con problemas críticos

### Factores de Salud

- Tasa de éxito de validaciones (90%+)
- Tasa de hit del cache (70%+)
- Tasa de éxito de cálculos (80%+)
- Número de errores (<10)
- Tiempo de respuesta (<1000ms)

## 📊 Reportes Automáticos

### Frecuencia

- **Reportes automáticos**: Cada 5 minutos
- **Historial**: Últimos 100 reportes
- **Retención**: En memoria durante la sesión

### Contenido

- Métricas detalladas por servicio
- Health score y status
- Tiempo de actividad
- Identificación de problemas

## 🔧 Configuración

### Inicialización

```javascript
// Automática al importar
import { PerformanceTracker } from './services/PerformanceMonitor.js';

// Manual
import { getPerformanceMonitor } from './services/PerformanceMonitor.js';
const monitor = getPerformanceMonitor();
```

### Configuración de Alertas

```javascript
// Verificar cada minuto
setInterval(() => {
  const monitor = getPerformanceMonitor();
  const health = monitor.calculateHealthScore();
  
  if (health.score < 70) {
    // Enviar alerta
  }
}, 60000);
```

## 🛠️ Mantenimiento

### Limpieza Regular

```javascript
// Resetear métricas cada hora
setInterval(() => {
  const monitor = getPerformanceMonitor();
  monitor.resetMetrics();
}, 3600000);
```

### Exportación de Datos

```javascript
// Exportar para análisis
const data = monitor.exportMetrics('json');
// Guardar en archivo o enviar a sistema de monitoreo
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Métricas no se registran**
   - Verificar imports
   - Confirmar inicialización

2. **Performance degradado**
   - Revisar health score
   - Analizar métricas de tiempo

3. **Errores frecuentes**
   - Revisar logs
   - Analizar patrones

### Debugging

```javascript
// Verificar estado
const monitor = getPerformanceMonitor();
console.log('Metrics:', monitor.getCurrentMetrics());
console.log('Health:', monitor.calculateHealthScore());
```

## 📚 Referencias

### Documentación Externa

- [NotificationService](../../shared/NotificationService.js) - Sistema de logging centralizado
- [Constants.js](../utils/Constants.js) - Constantes del sistema
- [DateUtils.js](../utils/DateUtils.js) - Utilidades de fecha

### Archivos de Implementación

- [PerformanceMonitor.js](../services/PerformanceMonitor.js)
- [ValidationService.js](../services/ValidationService.js)
- [ValidationCacheService.js](../services/ValidationCacheService.js)
- [ScheduleCalculator.js](../services/ScheduleCalculator.js)

## 🤝 Contribución

### Agregar Nuevas Métricas

1. Identificar el método a instrumentar
2. Agregar medición de tiempo
3. Registrar métricas con PerformanceTracker
4. Manejar errores apropiadamente
5. Documentar en esta guía

### Mejoras al Sistema

1. Revisar métricas existentes
2. Identificar áreas de mejora
3. Implementar cambios
4. Actualizar documentación
5. Probar exhaustivamente

## 📝 Changelog

### v1.0.0 (Enero 2024)

- ✅ Sistema de métricas implementado
- ✅ Integración en ValidationService (18 métodos)
- ✅ Integración en ValidationCacheService (7 métodos)
- ✅ Integración en ScheduleCalculator (9 métodos)
- ✅ Health score y monitoreo automático
- ✅ Reportes automáticos cada 5 minutos
- ✅ Exportación de datos (JSON, CSV)
- ✅ Documentación completa

---

**Última actualización**: Enero 2024  
**Versión**: 1.0.0  
**Autor**: Sistema de Sampling Roster
