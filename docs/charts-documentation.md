# 📊 Documentación de Gráficos y Visualizaciones

## 🎯 Descripción General

Este documento describe todos los gráficos, dashboards y visualizaciones implementados en el sistema Ship Nomination App.

## 📈 Tipos de Gráficos Implementados

### 1. **Gráficos de Estado del Roster**
- **Propósito**: Mostrar el estado actual de los rosters de muestreo
- **Tecnología**: Chart.js / HTML5 Canvas
- **Datos**: Estado de completitud, fechas, horas trabajadas

#### Características:
- Gráficos de barras para comparar horas por sampler
- Gráficos circulares para distribución de estados
- Gráficos de línea para evolución temporal

### 2. **Dashboard de Métricas de Sampling**
- **Propósito**: Visualizar KPIs y métricas de rendimiento
- **Tecnología**: D3.js / SVG
- **Datos**: Tiempo promedio, eficiencia, carga de trabajo

#### Métricas Incluidas:
- Horas totales de sampling por período
- Promedio de tiempo por muestra
- Distribución de carga entre samplers
- Tendencias temporales

### 3. **Gráficos de Programación**
- **Propósito**: Visualizar cronogramas y horarios
- **Tecnología**: Gantt charts / Timeline
- **Datos**: Horarios de sampling, turnos, disponibilidad

## 🔧 Implementación Técnica

### Dependencias
```json
{
  "chart.js": "^4.0.0",
  "d3": "^7.0.0",
  "moment": "^2.29.0"
}
```

### Estructura de Archivos
```
backend/public/js/charts/
├── ChartManager.js          # Gestor principal de gráficos
├── RosterStatusChart.js     # Gráficos de estado del roster
├── SamplingMetricsChart.js  # Métricas de sampling
├── TimelineChart.js         # Gráficos de cronograma
└── utils/
    ├── ChartConfig.js       # Configuraciones comunes
    └── DataProcessor.js     # Procesamiento de datos
```

## 📊 Configuración de Gráficos

### Configuración Base (Chart.js)
```javascript
const chartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          family: 'Inter, sans-serif',
          size: 12
        }
      }
    }
  }
};
```

### Colores del Tema
```javascript
const colorScheme = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8'
};
```

## 📱 Responsividad

### Breakpoints
- **Desktop**: > 1200px - Gráficos completos
- **Tablet**: 768px - 1200px - Gráficos adaptados
- **Mobile**: < 768px - Gráficos simplificados

### Adaptaciones Móviles
- Reducción de etiquetas en ejes
- Tooltips táctiles
- Navegación por gestos

## 🔄 Actualización de Datos

### Frecuencia de Actualización
- **Tiempo Real**: Cada 30 segundos
- **Manual**: Al cambiar selección de barcos
- **Automático**: Al guardar cambios

### Optimización de Rendimiento
- Debouncing de actualizaciones
- Lazy loading de gráficos
- Caché de datos procesados

## 🎨 Personalización

### Temas Visuales
- **Claro**: Fondo blanco, texto oscuro
- **Oscuro**: Fondo oscuro, texto claro
- **Alto Contraste**: Para accesibilidad

### Configuración de Usuario
- Tamaño de fuente ajustable
- Colores personalizables
- Mostrar/ocultar elementos

## 📊 Ejemplos de Uso

### Gráfico de Estado del Roster
```javascript
import { RosterStatusChart } from './charts/RosterStatusChart.js';

const rosterChart = new RosterStatusChart('#rosterChart');
rosterChart.render({
  data: rosterData,
  options: {
    showPercentages: true,
    animate: true
  }
});
```

### Dashboard de Métricas
```javascript
import { SamplingMetricsChart } from './charts/SamplingMetricsChart.js';

const metricsChart = new SamplingMetricsChart('#metricsChart');
metricsChart.updateMetrics({
  timeRange: 'week',
  groupBy: 'sampler'
});
```

## 🐛 Solución de Problemas

### Problemas Comunes

#### 1. **Gráficos no se renderizan**
- Verificar que Chart.js esté cargado
- Comprobar que el contenedor DOM exista
- Revisar errores en la consola del navegador

#### 2. **Datos no se actualizan**
- Verificar la fuente de datos
- Comprobar el formato de los datos
- Revisar la función de actualización

#### 3. **Problemas de rendimiento**
- Reducir la frecuencia de actualización
- Implementar virtualización para grandes datasets
- Optimizar el procesamiento de datos

### Debugging
```javascript
// Habilitar modo debug
Chart.defaults.plugins.debug = true;

// Log de datos
console.log('Chart data:', chartData);
console.log('Chart options:', chartOptions);
```

## 🚀 Mejoras Futuras

### Próximas Implementaciones
- [ ] Gráficos 3D para análisis avanzado
- [ ] Exportación a PDF/PNG
- [ ] Gráficos interactivos con drill-down
- [ ] Integración con WebGL para mejor rendimiento

### Optimizaciones Planificadas
- [ ] Web Workers para procesamiento en segundo plano
- [ ] Service Workers para caché offline
- [ ] Compresión de datos para transferencia
- [ ] Lazy loading inteligente

## 📚 Referencias

- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [D3.js Documentation](https://d3js.org/)
- [Bootstrap Charts](https://getbootstrap.com/docs/5.3/components/card/)
- [Responsive Design Patterns](https://www.smashingmagazine.com/2011/01/guidelines-for-responsive-web-design/)

---

*Documento mantenido por el equipo de desarrollo*
*Última actualización: $(Get-Date -Format "yyyy-MM-dd")*
