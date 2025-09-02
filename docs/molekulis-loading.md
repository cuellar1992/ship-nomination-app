# 🚛 Sistema de Molekulis Loading (Truck Loading)

## 🎯 Descripción General

El Sistema de Molekulis Loading es un módulo especializado para gestionar las operaciones de carga de camiones. Este sistema maneja un flujo más simple que las nominaciones de buques, enfocándose en 1-3 cargas diarias sin requerir POB/ETB/ETC, optimizado para operaciones de carga terrestre eficientes.

## 🚛 Funcionalidades Principales

### 1. **Gestión de Días de Trabajo**
- Creación de registros de trabajo diario para carga de camiones
- Edición de registros existentes
- Eliminación de registros obsoletos
- Búsqueda y filtrado avanzado por fecha y surveyor

### 2. **Información de Operación**
- **Fecha de Operación**: Día específico de trabajo
- **Terminal**: Ubicación de la operación
- **Surveyor**: Responsable de la supervisión
- **Turno**: Horario de inicio, fin y cálculo automático de horas

### 3. **Gestión de Cargas**
- **Múltiples Cargas**: Hasta 3 cargas por día (L1, L2, L3)
- **Productos**: Selección de productos (Hyvolt I, Hyvolt III)
- **Horarios**: Tiempo específico para cada carga
- **Flexibilidad**: Cargas opcionales según demanda

### 4. **Estados y Seguimiento**
- **Estados Disponibles**: `confirmed`, `completed`
- **Auto-completado**: Cambio automático a completado cuando todas las cargas finalizan
- **Seguimiento**: Historial completo de operaciones

## 📊 Estructura de Datos

### Truck Work Day Object
```javascript
const truckWorkDay = {
  _id: "672f8a1b2c3d4e5f6789abcd",
  operationDate: "2024-11-09T00:00:00.000Z",
  terminal: "Terminal A",
  samplerName: "Juan Pérez",
  samplerId: "672f8a1b2c3d4e5f6789abce", // Opcional
  
  // Información de turno
  shift: {
    startTime: "2024-11-09T08:00:00.000Z",
    endTime: "2024-11-09T17:00:00.000Z",
    hours: 9
  },
  
  // Cargas del día (1-3 cargas)
  loads: [
    {
      loadNo: 1,
      startTime: "2024-11-09T09:00:00.000Z",
      product: "Hyvolt I"
    },
    {
      loadNo: 2,
      startTime: "2024-11-09T13:00:00.000Z",
      product: "Hyvolt III"
    }
  ],
  
  status: "confirmed", // "confirmed" | "completed"
  createdAt: "2024-11-09T06:30:00.000Z",
  updatedAt: "2024-11-09T06:30:00.000Z"
}
```

## 🔧 Arquitectura Técnica

### Frontend (HTML/CSS/JS)
```
📁 public/
├── 📄 truck-loading.html          # Página principal
├── 📁 js/truckLoading/
│   ├── 📄 index.js                # Lógica principal
│   └── 📁 services/
│       └── 📄 TruckWorkDaysExporter.js  # Exportación Excel
└── 📁 css/
    └── 📄 ship-nominations.css    # Estilos reutilizados
```

### Backend (Node.js/Express)
```
📁 backend/
├── 📁 models/
│   └── 📄 TruckWorkDay.js         # Modelo MongoDB
└── 📁 routes/
    └── 📄 truckworkdays.js        # API endpoints
```

### Base de Datos (MongoDB)
```javascript
// Colección: truckworkdays
{
  operationDate: Date,
  terminal: String,
  samplerName: String,
  samplerId: ObjectId, // Opcional, referencia a Sampler
  shift: {
    startTime: Date,
    endTime: Date,
    hours: Number
  },
  loads: [{
    loadNo: Number,
    startTime: Date,
    product: String
  }],
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Endpoints

### Base URL: `/api/truckworkdays`

#### **GET** `/api/truckworkdays`
Obtener lista de días de trabajo con filtros opcionales.

**Query Parameters:**
- `from` (Date): Fecha inicio para filtrar
- `to` (Date): Fecha fin para filtrar  
- `surveyor` (String): Nombre del surveyor (búsqueda parcial)

**Response:**
```javascript
{
  "success": true,
  "data": [TruckWorkDay, ...],
  "count": 25
}
```

#### **POST** `/api/truckworkdays`
Crear un nuevo día de trabajo.

**Body:**
```javascript
{
  "operationDate": "2024-11-09",
  "terminal": "Terminal A",
  "samplerName": "Juan Pérez",
  "shift": {
    "startTime": "2024-11-09T08:00:00.000Z",
    "endTime": "2024-11-09T17:00:00.000Z",
    "hours": 9
  },
  "loads": [
    {
      "loadNo": 1,
      "startTime": "2024-11-09T09:00:00.000Z",
      "product": "Hyvolt I"
    }
  ],
  "status": "confirmed"
}
```

#### **GET** `/api/truckworkdays/:id`
Obtener un día de trabajo específico.

#### **PUT** `/api/truckworkdays/:id`
Actualizar un día de trabajo existente.

#### **DELETE** `/api/truckworkdays/:id`
Eliminar un día de trabajo (eliminación física).

## 🎨 Interfaz de Usuario

### 📋 Formulario Principal
- **Fecha de Operación**: DatePicker para seleccionar día
- **Terminal**: Dropdown con terminales disponibles
- **Cargas**: Hasta 3 secciones de carga con producto y hora
- **Who/Shift**: Surveyor, horario de inicio/fin, cálculo automático de horas

### 🔍 Sistema de Búsqueda y Filtros
- **Barra de Búsqueda**: Búsqueda por fecha, terminal, surveyor
- **Filtros Avanzados**:
  - Filtros rápidos: "This Month", "This Week"
  - Filtro por rango de fechas (From/To)
  - Filtro por surveyor
  - Botones Clear y Export

### 📊 Tabla de Registros
**Columnas:**
- Date
- Terminal  
- Loads (formato: "L1 09:30 Hyvolt I | L2 13:00 Hyvolt III")
- Surveyor
- Status
- Actions (View/Edit/Delete)

### 🎛️ Acciones Disponibles
- **View**: Modal de solo lectura con todos los detalles
- **Edit**: Formulario pre-llenado para modificación
- **Delete**: Confirmación antes de eliminar
- **Export Excel**: Exportación completa a Excel

## 📤 Sistema de Exportación

### Excel Export (ExcelJS)
**Archivo**: `TruckWorkDaysExporter.js`

**Características:**
- Título: "Molekulis Loading"
- Headers azules consistentes con otros módulos
- Columnas auto-ajustadas para legibilidad
- Formato de loads optimizado: "L1 09:30 Hyvolt I"
- Sin errores de reparación XML

**Columnas exportadas:**
1. Date (DD/MM/YYYY)
2. Terminal
3. Surveyor  
4. Shift Start (HH:MM)
5. Shift End (HH:MM)
6. Hours
7. Loads (formato compacto)
8. Status

## ⚙️ Configuración y Setup

### 1. **Instalación**
El módulo está integrado automáticamente con el sistema existente.

### 2. **Navegación**
Agregado a `NavigationManager.js` como "Molekulis Loading".

### 3. **Dependencias**
- ExcelJS (para exportación)
- DatePicker/DateTimePicker (componentes de fecha)
- SingleSelect (dropdowns elegantes)
- Logger (notificaciones unificadas)

### 4. **Base de Datos**
La colección `truckworkdays` se crea automáticamente al primer uso.

## 🔧 Configuraciones Específicas

### Auto-cálculo de Horas
```javascript
// Escucha cambios en shift start/end
function updateShiftHours() {
  const start = getDateTimeValue('shiftStart');
  const end = getDateTimeValue('shiftEnd');
  
  if (start && end && end > start) {
    const diffMs = end - start;
    const hours = Math.round(diffMs / (1000 * 60 * 60) * 100) / 100;
    document.getElementById('shiftHours').value = hours;
  }
}
```

### Auto-completado de Status
```javascript
// Cambia a "completed" cuando todas las cargas terminan
function shouldBeCompleted(doc) {
  if (doc.status === 'completed') return false;
  
  const now = new Date();
  const shiftEnd = doc.shift?.endTime ? new Date(doc.shift.endTime) : null;
  
  return shiftEnd && now > shiftEnd;
}
```

### Filtros Rápidos
```javascript
// This Week: Lunes a Domingo actual
// This Month: 1º al último día del mes actual
function setQuickDateFilter(period) {
  const now = new Date();
  // Lógica para calcular rangos de fecha...
}
```

## 🚀 Características Avanzadas

### 1. **Debounce en Filtros**
Los filtros se aplican con retraso de 200ms para evitar requests excesivos.

### 2. **Validación de Datos**
- Fechas válidas requeridas
- Horarios lógicos (fin > inicio)
- Productos válidos seleccionados

### 3. **Caché del Navegador**
Manejo de versiones con timestamp para evitar cache de archivos JS.

### 4. **Responsive Design**
Adaptación automática a diferentes tamaños de pantalla.

## 🎯 Métricas y KPIs

### Posibles integraciones futuras con Dashboard:
- **Cargas por día/semana/mes**
- **Horas trabajadas por surveyor**
- **Productos más cargados**
- **Utilización por terminal**
- **Efficiency metrics** (cargas/hora)

## 🔍 Troubleshooting

### Problemas Comunes

**1. Export Excel no funciona**
- Verificar que ExcelJS esté cargado
- Revisar consola del navegador
- Fallback automático a CSV

**2. Auto-cálculo no funciona**
- Verificar que ambos campos de tiempo tengan valores
- Comprobar formato de fecha válido

**3. Filtros no aplicando**
- Verificar conexión de red
- Revisar formato de parámetros de API

**4. Datos no guardando**
- Validar todos los campos requeridos
- Verificar formato de datos enviados

## 📝 Changelog

### v1.0.0 (Noviembre 2024)
- ✅ Implementación inicial del módulo
- ✅ CRUD completo de truck work days
- ✅ Sistema de filtros avanzados
- ✅ Exportación Excel sin errores
- ✅ Auto-cálculo de horas y auto-completado
- ✅ Integración con navegación y estilos existentes

---

## 👥 Contribución

Para contribuir al módulo:

1. **Seguir patrones existentes** del codebase
2. **Mantener consistencia visual** con otros módulos
3. **Documentar cambios** en este archivo
4. **Probar thoroughly** antes de deploy

---

*Documentación generada para Molekulis Loading System v1.0.0*
