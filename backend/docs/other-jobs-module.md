# Módulo "Other Jobs" - Documentación Técnica

## 📋 **Información General**

**Módulo:** Other Jobs  
**Versión:** 1.0.0  
**Fecha de Implementación:** Diciembre 2024  
**Propósito:** Gestión de trabajos adicionales fuera de la operación principal  

---

## 🎯 **Descripción del Módulo**

El módulo "Other Jobs" permite registrar, gestionar y realizar seguimiento de trabajos adicionales que se realizan fuera de las operaciones principales del sistema (sampling roster, ship nominations, truck loading). 

### **Casos de Uso:**
- Trabajos de mantenimiento
- Tareas administrativas especiales
- Proyectos temporales
- Actividades de capacitación
- Cualquier trabajo adicional que requiera seguimiento de horas

---

## 🏗️ **Arquitectura del Sistema**

### **Stack Tecnológico:**
- **Backend:** Node.js + Express.js + MongoDB
- **Frontend:** HTML5 + CSS3 + JavaScript ES6
- **Librerías:** ExcelJS, Chart.js, Font Awesome
- **Base de Datos:** MongoDB con Mongoose ODM

### **Estructura de Archivos:**

```
backend/
├── models/
│   └── OtherJob.js                    # Modelo de datos MongoDB
├── routes/
│   └── otherjobs.js                   # API Routes CRUD
├── public/
│   ├── other-jobs.html               # Interfaz de usuario
│   └── js/otherJobs/
│       ├── index.js                  # Controlador principal
│       └── services/
│           └── OtherJobsExporter.js  # Exportación a Excel
└── docs/
    └── other-jobs-module.md          # Esta documentación
```

---

## 🗃️ **Modelo de Datos**

### **Schema: OtherJob**

```javascript
{
  jobDescription: {
    type: String,
    required: true,
    trim: true,
    description: "Descripción del trabajo a realizar"
  },
  operationDate: {
    type: Date,
    required: true,
    description: "Fecha de la operación (derivada de shiftStart)"
  },
  samplerName: {
    type: String,
    required: true,
    description: "Nombre del trabajador asignado"
  },
  samplerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sampler',
    description: "Referencia al trabajador en la base de datos"
  },
  shift: {
    startTime: {
      type: Date,
      description: "Hora de inicio del turno"
    },
    endTime: {
      type: Date,
      description: "Hora de fin del turno"
    },
    hours: {
      type: Number,
      default: 0,
      description: "Horas trabajadas (calculado automáticamente)"
    }
  },
  status: {
    type: String,
    enum: ['confirmed', 'completed'],
    default: 'confirmed',
    description: "Estado del trabajo"
  },
  terminal: {
    type: String,
    default: 'Other',
    description: "Terminal asignado (por defecto 'Other')"
  }
}
```

### **Timestamps Automáticos:**
- `createdAt`: Fecha de creación del registro
- `updatedAt`: Fecha de última modificación

---

## 🔌 **API Endpoints**

### **Base URL:** `/api/otherjobs`

| Método | Endpoint | Descripción | Parámetros |
|--------|----------|-------------|------------|
| `POST` | `/` | Crear nuevo trabajo | Body: OtherJob object |
| `GET` | `/` | Obtener todos los trabajos | Query: filters opcional |
| `GET` | `/:id` | Obtener trabajo específico | Param: id |
| `PUT` | `/:id` | Actualizar trabajo | Param: id, Body: updates |
| `DELETE` | `/:id` | Eliminar trabajo | Param: id |
| `GET` | `/stats/hours` | Estadísticas de horas | Query: dateRange opcional |

### **Ejemplos de Uso:**

#### **Crear Nuevo Trabajo:**
```javascript
POST /api/otherjobs
Content-Type: application/json

{
  "jobDescription": "Mantenimiento de equipos",
  "samplerName": "Juan Pérez",
  "samplerId": "64abc123def456789012345",
  "shift": {
    "startTime": "2024-12-01T08:00:00.000Z",
    "endTime": "2024-12-01T16:00:00.000Z",
    "hours": 8
  }
}
```

#### **Filtrar por Fecha:**
```javascript
GET /api/otherjobs?startDate=2024-12-01&endDate=2024-12-31
```

#### **Obtener Estadísticas:**
```javascript
GET /api/otherjobs/stats/hours?month=12&year=2024
```

---

## 💻 **Interfaz de Usuario**

### **Características Principales:**

#### **🏗️ Formulario CRUD:**
- **Descripción del Trabajo:** Campo de texto requerido
- **Who/Shift:** Tabla integrada con:
  - SingleSelect para selección de trabajador
  - DateTimePicker para inicio de turno
  - DateTimePicker para fin de turno
  - Cálculo automático de horas trabajadas

#### **🔍 Sistema de Búsqueda:**
- **Búsqueda en tiempo real** por descripción, persona y status
- **Filtros rápidos:**
  - "This Month" - Trabajos del mes actual
  - "This Week" - Trabajos de la semana actual
- **Filtros avanzados:**
  - Rango de fechas personalizado (From/To)
  - Filtro por trabajador asignado

#### **📊 Tabla de Datos:**
- **Columnas:** Descripción, Fecha, Trabajador, Inicio, Fin, Horas, Status
- **Acciones por fila:** View, Edit, Delete
- **Paginación:** 5, 10, 15 registros por página
- **Status automático:** confirmed → completed

#### **📤 Exportación:**
- **Formato Excel** con diseño profesional
- **Misma estructura** que truck-loading
- **Filtros aplicados** se mantienen en la exportación

---

## 🔧 **Funcionalidades Técnicas**

### **Cálculo Automático de Horas:**
```javascript
function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const diffMs = new Date(endTime) - new Date(startTime);
  return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
}
```

### **Auto-actualización de Status:**
```javascript
// Status se actualiza automáticamente a 'completed' 
// cuando endTime es anterior a la fecha actual
const autoStatus = (endTime) => {
  return new Date(endTime) < new Date() ? 'completed' : 'confirmed';
};
```

### **Enriquecimiento de Datos:**
```javascript
// Los datos se enriquecen automáticamente con información del Sampler
const enrichSampler = async (otherJob) => {
  if (otherJob.samplerId) {
    const sampler = await Sampler.findById(otherJob.samplerId);
    if (sampler) {
      otherJob.samplerName = sampler.name;
      otherJob.terminal = sampler.terminal || 'Other';
    }
  }
  return otherJob;
};
```

---

## 📈 **Integración con Dashboard**

### **Métricas Incluidas:**
- **Weekly Workload:** Horas semanales de Other Jobs
- **Monthly Workload:** Horas mensuales de Other Jobs
- **KPIs del Dashboard:** Incluye estadísticas de productividad

### **Lógica de Cálculo:**
```javascript
// Prorrateo por solapamiento con período actual
const calculateOverlapHours = (shiftStart, shiftEnd, periodStart, periodEnd) => {
  const overlapStart = new Date(Math.max(shiftStart, periodStart));
  const overlapEnd = new Date(Math.min(shiftEnd, periodEnd));
  
  if (overlapEnd <= overlapStart) return 0;
  
  const totalShiftHours = (shiftEnd - shiftStart) / (1000 * 60 * 60);
  const overlapHours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
  
  return (overlapHours / totalShiftHours) * job.shift.hours;
};
```

---

## 🎨 **Diseño y UX**

### **Principios de Diseño:**
- **Minimalista:** Interfaz limpia y enfocada
- **Consistente:** Mismo look & feel que truck-loading
- **Responsivo:** Adaptable a diferentes tamaños de pantalla
- **Accesible:** Contrastes adecuados y navegación por teclado

### **Paleta de Colores:**
```css
:root {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-muted: #b0b0b0;
  --accent-primary: #1fb5d4;
  --border-secondary: #404040;
}
```

### **Componentes Reutilizados:**
- **SingleSelect:** Para selección de trabajadores
- **DateTimePicker:** Para fechas y horas
- **Ship-form-input:** Para campos de texto
- **Ship-table:** Para tablas de datos
- **Pagination:** Para navegación de páginas

---

## 🔄 **Flujo de Trabajo**

### **Proceso Típico:**

1. **📝 Creación:**
   - Usuario selecciona "Other Jobs" en navegación
   - Completa descripción del trabajo
   - Asigna trabajador en tabla Who/Shift
   - Establece horario de inicio y fin
   - Sistema calcula horas automáticamente

2. **👀 Visualización:**
   - Lista todos los trabajos en tabla paginada
   - Permite filtrado y búsqueda en tiempo real
   - Muestra status actualizado automáticamente

3. **✏️ Edición:**
   - Click en "Edit" carga datos en formulario
   - Modificaciones se guardan con validación
   - Status se actualiza según horarios

4. **📊 Seguimiento:**
   - Dashboard incluye horas en métricas semanales/mensuales
   - Exportación Excel para reportes externos
   - Historial completo con timestamps

---

## ⚡ **Optimizaciones de Rendimiento**

### **Frontend:**
- **Lazy Loading:** Carga datos bajo demanda
- **Debounced Search:** Búsqueda optimizada (300ms delay)
- **Paginación:** Máximo 15 registros por vista
- **Cache Local:** Estados de formulario y filtros

### **Backend:**
- **Indexing:** Índices en campos de búsqueda frecuente
- **Lean Queries:** Consultas optimizadas con .lean()
- **Population Selectiva:** Solo campos necesarios
- **Validación Eficiente:** Esquemas Mongoose optimizados

### **Base de Datos:**
```javascript
// Índices recomendados
db.otherjobs.createIndex({ "operationDate": -1 });
db.otherjobs.createIndex({ "samplerName": 1 });
db.otherjobs.createIndex({ "status": 1 });
db.otherjobs.createIndex({ "createdAt": -1 });
```

---

## 🧪 **Testing y Validación**

### **Validaciones Implementadas:**
- **Required Fields:** jobDescription, samplerName
- **Date Validation:** startTime debe ser anterior a endTime
- **Hours Calculation:** Verificación de cálculos automáticos
- **Status Logic:** Validación de transiciones de estado

### **Casos de Prueba Sugeridos:**
```javascript
// Test Cases
1. Crear trabajo con datos mínimos requeridos
2. Validar cálculo automático de horas
3. Verificar filtros de búsqueda
4. Probar exportación Excel
5. Validar integración con dashboard
6. Testing de paginación
7. Verificar auto-actualización de status
```

---

## 🚀 **Despliegue y Configuración**

### **Dependencias:**
```json
{
  "mongoose": "^7.0.0",
  "express": "^4.18.0",
  "exceljs": "^4.3.0"
}
```

### **Variables de Entorno:**
```env
MONGODB_URI=mongodb://localhost:27017/ship-nomination
NODE_ENV=production
PORT=3000
```

### **Migración de Datos:**
```javascript
// Script de migración si necesario
// No hay datos legacy para migrar en implementación inicial
```

---

## 📝 **Changelog**

### **Versión 1.0.0 - Diciembre 2024**
- ✅ Implementación inicial completa
- ✅ CRUD operations
- ✅ Búsqueda y filtrado
- ✅ Exportación Excel
- ✅ Integración dashboard
- ✅ Responsive design
- ✅ Documentación completa

---

## 👥 **Equipo de Desarrollo**

**Desarrollador Principal:** AI Assistant  
**Revisión Técnica:** Usuario del Sistema  
**Testing:** Usuario Final  
**Documentación:** AI Assistant  

---

## 📞 **Soporte y Mantenimiento**

### **Archivos Críticos a Monitorear:**
- `backend/models/OtherJob.js`
- `backend/routes/otherjobs.js`
- `backend/public/js/otherJobs/index.js`
- `backend/public/other-jobs.html`

### **Logs y Monitoreo:**
- Errores de validación en API
- Performance de queries MongoDB
- Uso de memoria en exportaciones Excel
- Métricas de dashboard

### **Actualizaciones Futuras:**
- [ ] Notificaciones automáticas
- [ ] Reportes avanzados
- [ ] Integración con calendario
- [ ] API para aplicaciones móviles

---

## 🔗 **Referencias y Enlaces**

- **Código Fuente:** `/backend/public/js/otherJobs/`
- **API Documentation:** Sección API Endpoints
- **UI Components:** `/backend/public/js/shared/`
- **Styling:** `/backend/public/css/ship-nominations.css`

---

**📅 Última Actualización:** Diciembre 2024  
**📋 Estado:** ✅ Completado y Funcional  
**🔄 Próxima Revisión:** Según necesidades del usuario
