# 📊 Exportación por Rango de Fechas - Sampling Roster

## 🎯 Funcionalidad

La **exportación por rango de fechas** permite exportar múltiples sampling rosters en un solo archivo Excel, filtrando por período de tiempo específico.

## 🚀 Cómo Usar

### 1. Acceso a la Funcionalidad
- Ir a la página de **Sampling Roster**
- Localizar el botón **"EXPORT RANGE"** (junto al botón "EXPORT" existente)
- El botón mantiene la misma consistencia visual que "AUTO GENERATE"

### 2. Selección de Rango
- Hacer clic en **"EXPORT RANGE"**
- Se abre un modal con diseño consistente del sistema (estilo Settings)
- **Por defecto**: Se pre-selecciona el mes anterior
- **Botones rápidos**: 
  - **Last Month**: Mes anterior completo
  - **This Month**: Mes actual completo  
  - **This Week**: Semana actual (Lunes a Domingo)
- **Campos manuales**: "From Date" y "To Date" 
- **Validación**: El sistema verifica que las fechas sean válidas

### 3. Criterio de Filtrado
- **Filtro principal**: Rosters donde `shipNomination.pilotOnBoard` (POB) esté dentro del rango
- **Lógica**: Busca ship nominations con POB en el rango, luego obtiene sus rosters
- **Incluye**: Todos los rosters (completos, incompletos, draft)
- **Ejemplo**: Seleccionar septiembre 2024 (01/09 - 30/09) exporta solo vessels con POB en septiembre

## 📁 Archivo Generado

### Estructura del Excel
```
📁 Line_Sampling_Roster_2024-01-01_to_2024-01-31.xlsx
├── 📄 Summary (Hoja resumen)
├── 📄 1. Vessel_Alpha (Roster individual)
├── 📄 2. Vessel_Beta (Roster individual)
└── 📄 3. Vessel_Gamma (Roster individual)
```

### Hoja Summary
- **Contenido**: Tabla consolidada con todos los rosters
- **Columnas**: #, Vessel Name, AMSPEC Ref, Status, Start Discharge, ETC Time, Office Sampler, Line Turns
- **Colores por Status**:
  - 🟢 Verde: `completed`
  - 🟡 Amarillo: `in_progress`
  - 🟠 Naranja: `draft`

### Hojas Individuales
- **Formato**: Cada roster mantiene el formato completo original
- **Nombres**: Seguros para Excel (sin caracteres especiales)
- **Límite**: Máximo 31 caracteres por nombre de hoja

## 🔧 Especificaciones Técnicas

### Backend API
```javascript
GET /api/sampling-rosters?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=100
```

**Parámetros**:
- `from`: Fecha inicio (formato ISO)
- `to`: Fecha fin (formato ISO) 
- `limit`: Máximo 100 rosters por consulta

**Filtro MongoDB**:
```javascript
{
  $or: [
    { startDischarge: { $gte: fromDate, $lte: toDate } },
    { etcTime: { $gte: fromDate, $lte: toDate } }
  ]
}
```

### Frontend
- **Archivo**: `SamplingRosterExporter.js`
- **Métodos nuevos**:
  - `handleRangeExportClick()`
  - `showDateRangeModal()`
  - `executeRangeExport()`
  - `generateMultiSheetExcel()`

## 🛡️ Validaciones y Límites

### Validaciones de Entrada
- ✅ Ambas fechas (From/To) son requeridas
- ✅ Fecha "From" debe ser anterior a fecha "To"
- ✅ Formato de fecha válido

### Límites del Sistema
- 📊 **Máximo 100 rosters** por consulta
- 📝 **Máximo 31 caracteres** por nombre de hoja
- ⏱️ **Timeout**: 30 segundos para generación

### Manejo de Errores
- 🚫 **Sin rosters**: Notificación "No rosters found"
- ⚠️ **Error de red**: "Failed to fetch rosters"
- 💥 **Error de generación**: "Failed to export rosters"

## 🎨 Consistencia Visual

### Botón "EXPORT RANGE"
- **Clase CSS**: `btn btn-secondary-premium ship-form-btn`
- **Icono**: `fas fa-calendar-alt`
- **Posición**: Junto al botón "EXPORT" existente
- **Estado loading**: Spinner con texto "EXPORTING RANGE..."

### Modal de Selección
- **Diseño**: Mismo estilo que modal de Settings (`settings-modal`)
- **Header**: Título con gradiente y botón close consistente
- **Body**: Layout con `settings-section` y campos organizados
- **DatePickers**: Componentes reutilizados de `shared/DatePicker.js` con tema dark
- **Botones Rápidos**: Diseño `btn-preset` igual que filtros de ship nomination
- **Footer**: 
  - Botón Cancel: `btn-outline-danger` (mismo que CLEAR)
  - Botón Export: `btn-secondary-premium` (consistente)
- **Idioma**: Info en inglés, interfaz en inglés
- **Responsive**: Grid Bootstrap adaptativo
- **Efectos**: Botones rápidos con clase `active` temporal (1.5s)

## 📋 Casos de Uso Comunes

### Caso 1: Reporte Mensual
```
From: 2024-01-01
To: 2024-01-31
Resultado: Todos los rosters de enero 2024
```

### Caso 2: Reporte Semanal
```
From: 2024-01-15
To: 2024-01-21
Resultado: Rosters de esa semana específica
```

### Caso 3: Período Custom
```
From: 2024-01-10
To: 2024-02-05
Resultado: Rosters en ese período extendido
```

## 🔄 Compatibilidad

- ✅ **Mantiene**: Exportación individual existente
- ✅ **Reutiliza**: Lógica de formato Excel existente
- ✅ **Preserva**: Todas las funcionalidades actuales
- ✅ **Extiende**: Sin romper código legacy

## 🐛 Troubleshooting

### Problema: No aparece el botón "EXPORT RANGE"
**Solución**: Verificar que `exportRangeBtn` esté en el HTML

### Problema: Modal no se abre
**Solución**: Verificar consola para errores JavaScript

### Problema: No encuentra rosters
**Solución**: Verificar que las fechas coincidan con `startDischarge` o `etcTime`

### Problema: Excel muy grande
**Solución**: Reducir rango de fechas o usar filtros adicionales

---

**Versión**: 1.0.0  
**Autor**: Ship Nomination System  
**Fecha**: 2024  
**Compatibilidad**: ExcelJS, Modern Browsers
