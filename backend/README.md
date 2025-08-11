# 🚢 Ship Nomination System - Enterprise Solution

[![Production](https://img.shields.io/badge/Production-Live-brightgreen)](https://monkfish-app-aej83.ondigitalocean.app)
[![Version](https://img.shields.io/badge/Version-2.1-blue)](https://github.com/cuellar1992/ship-nomination-app)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/atlas)

## 🎯 Resumen Ejecutivo

**Ship Nomination System** es una aplicación web empresarial completa para la gestión de **nominaciones de barcos** y **cronogramas de muestreo** (sampling roster) en operaciones portuarias. Permite crear, gestionar y exportar información de embarcaciones con una arquitectura modular moderna y validaciones de negocio avanzadas.

### 🌐 Enlaces del Sistema

| Ambiente | URL |
|----------|-----|
| **Producción** | https://monkfish-app-aej83.ondigitalocean.app |
| **Ship Nominations** | https://monkfish-app-aej83.ondigitalocean.app/ship-nominations.html |
| **Sampling Roster** | https://monkfish-app-aej83.ondigitalocean.app/sampling-roster.html |
| **Desarrollo Local** | http://localhost:3000 |

## ✨ Características Principales

### 🏆 **Core Business Features**
- ✅ **Ship Nominations** - CRUD completo con validaciones de negocio
- ✅ **Sampling Roster** - Auto-generación de cronogramas con validación cruzada
- ✅ **Personnel Management** - Gestión extendida de samplers, surveyors y chemists
- ✅ **24-Hour Restriction System** - Control semanal por sampler individual
- ✅ **Terminal Operations** - Coordinación de terminales y muelles
- ✅ **Client & Agent Management** - Gestión completa de entidades comerciales

### 🔧 **Technical Features**
- ✅ **Modular ES6 Architecture** - 35+ módulos especializados organizados por responsabilidad
- ✅ **Responsive Interface** - Compatible con móviles y escritorio
- ✅ **Advanced Filters** - Búsqueda potente y filtros predefinidos
- ✅ **Premium Excel Export** - Exportación profesional con detección real de descarga
- ✅ **Real-time Validations** - UX optimizada con feedback inmediato
- ✅ **Smart Auto-save** - Persistencia automática inteligente
- ✅ **Notification System v2.0** - Logger unificado profesional con 5 niveles
- ✅ **Cross-validation** - Prevención de conflictos entre rosters

## 🏗️ Arquitectura del Sistema

### **Stack Tecnológico**

```
Frontend:  HTML5 + CSS3 + JavaScript ES6 (Modular)
Backend:   Node.js + Express.js
Database:  MongoDB Atlas
Deploy:    DigitalOcean App Platform
UI:        Bootstrap 5.3.0 + Font Awesome 6.4.0
```

### **Patrón de Diseño: MVC Modular**

```
┌─────────────────┐
│ Presentation    │ ← UI Components (DateTimePicker, SingleSelect)
├─────────────────┤
│ Controllers     │ ← ShipFormController, SamplingRosterController
├─────────────────┤
│ Services        │ ← APIManager, ExcelExporter, ValidationService
├─────────────────┤
│ Handlers        │ ← FormHandler, CRUDOperations
├─────────────────┤
│ Utilities       │ ← Constants, Utils, DateUtils
└─────────────────┘
```

### **Estructura del Proyecto**

```
ship-nomination-app/
├── backend/
│   ├── server.js                    # Servidor Express principal
│   ├── models/                      # Modelos MongoDB
│   │   ├── ShipNomination.js       # Schema principal
│   │   ├── SamplingRoster.js       # Schema de cronogramas
│   │   ├── Sampler.js              # Con email/phone/weeklyRestriction
│   │   └── Client.js, Agent.js...  # Entidades de negocio
│   ├── routes/                      # APIs RESTful (25+ endpoints)
│   │   ├── shipnominations.js      # CRUD nominaciones
│   │   ├── samplingrosters.js      # CRUD rosters
│   │   └── samplers.js             # 8 endpoints extendidos
│   └── public/                      # Frontend estático
│       ├── ship-nominations.html   # Módulo principal
│       ├── sampling-roster.html    # Módulo de cronogramas
│       ├── css/
│       │   ├── styles.css          # Estilos globales
│       │   └── sampling-roster.css # Estilos específicos
│       └── js/
│           ├── shared/             # Componentes compartidos (8)
│           │   ├── NotificationService.js
│           │   ├── ApiService.js
│           │   ├── DateTimePicker.js
│           │   ├── singleselect.js
│           │   └── multiselect.js
│           ├── shipNomination/     # Módulo Ship Nomination (15)
│           │   ├── index.js
│           │   ├── controllers/
│           │   ├── services/
│           │   ├── handlers/
│           │   ├── ui/
│           │   └── utils/
│           └── samplingRoster/     # Módulo Sampling Roster (10)
│               ├── index.js
│               ├── controllers/
│               ├── services/
│               └── utils/
├── package.json
├── .env
└── README.md
```

## 🚀 Instalación y Configuración

### **Prerrequisitos**

- **Node.js** 16+ ([Descargar](https://nodejs.org/))
- **MongoDB Atlas** account ([Registrarse](https://www.mongodb.com/atlas))
- **Git** para clonar repositorio

### **Instalación Rápida**

```bash
# 1. Clonar repositorio
git clone https://github.com/cuellar1992/ship-nomination-app.git
cd ship-nomination-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales MongoDB

# 4. Iniciar servidor
npm run dev     # Desarrollo
npm start       # Producción
```

### **Variables de Entorno**

```bash
# Desarrollo Local (.env)
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Producción (DigitalOcean)
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://admin:ujLUXXvzimfd08Tm@roster.zomfkho.mongodb.net/roster
```

## 🆕 Sistema de Restricción de 24 Horas

### **Nueva Funcionalidad v2.1**

El sistema incluye control granular de restricciones semanales para samplers:

- **Toggle Individual**: Control `weeklyRestriction` por sampler
- **Validación Automática**: Detección en tiempo real
- **Persistencia MongoDB**: Campo `weeklyRestriction: Boolean`
- **Sin Hardcode**: Configuración 100% dinámica desde interfaz

### **Implementación Técnica**

```javascript
// Schema Sampler (Extendido)
{
  _id: ObjectId,
  name: String,
  email: String,                    // Campo opcional
  phone: String,                    // Campo opcional
  weeklyRestriction: Boolean,       // 🆕 Restricción de 24 horas
  createdAt: Date,
  updatedAt: Date
}

// Uso en Frontend
const isRestricted = componentFactory.isWeeklyRestrictionEnabled(samplerName);
if (isRestricted) {
    // Aplicar lógica de restricción de 24 horas
}
```

### **Estado Actual en Base de Datos**
- **Sakib**: ✅ weeklyRestriction: true
- **Ruben**: ✅ weeklyRestriction: true  
- **Laura**: ✅ weeklyRestriction: true
- **Edwind**: ✅ weeklyRestriction: false
- **Cesar**: ✅ weeklyRestriction: false

## 🔌 API Endpoints

### **Ship Nominations**
```
GET    /api/shipnominations        # Listar todas
POST   /api/shipnominations        # Crear nueva
GET    /api/shipnominations/:id    # Obtener específica
PUT    /api/shipnominations/:id    # Actualizar
DELETE /api/shipnominations/:id    # Eliminar
```

### **Sampling Rosters**
```
GET    /api/sampling-rosters                    # Listar con filtros
POST   /api/sampling-rosters                    # Crear nuevo
GET    /api/sampling-rosters/:id                # Obtener específico
PUT    /api/sampling-rosters/:id                # Actualizar completo
DELETE /api/sampling-rosters/:id                # Eliminar
GET    /api/sampling-rosters/by-nomination/:id  # Por nomination
PUT    /api/sampling-rosters/auto-save/:id      # Auto-save inteligente
POST   /api/sampling-rosters/validate-sampler   # Validar disponibilidad
```

### **Entidades de Negocio**
```
GET /api/clients       # Clientes
GET /api/agents        # Agentes  
GET /api/terminals     # Terminales
GET /api/berths        # Muelles
GET /api/surveyors     # Inspectores (con email/phone)
GET /api/samplers      # Muestreadores (con email/phone + restricción 24h)
GET /api/chemists      # Químicos (con email/phone)
GET /api/producttypes  # Tipos de productos
```

## 🧩 Módulos Principales

### **1. Ship Nomination System**

| Módulo | Responsabilidad |
|--------|----------------|
| **ShipFormController** | Orquestación completa del sistema |
| **APIManager** | Comunicación con backend + cache inteligente |
| **ComponentFactory** | Creación de componentes UI reutilizables |
| **ExcelExporter** | Exportación profesional con detección real |
| **FormHandler** | Gestión de formularios y validaciones |

### **2. Sampling Roster System**

| Módulo | Responsabilidad |
|--------|----------------|
| **SamplingRosterController** | Gestión de cronogramas de muestreo |
| **ValidationService** | Validaciones de negocio y prevención de conflictos |
| **ScheduleCalculator** | Cálculos automáticos de horarios (turnos 12h) |
| **AutoSaveService** | Persistencia automática inteligente |

### **3. Componentes Compartidos**

| Componente | Características |
|------------|----------------|
| **SingleSelect** | Búsqueda en tiempo real + gestión CRUD + modo extendido |
| **MultiSelect** | Selección múltiple con checkboxes |
| **DateTimePicker** | Modal compacto + validación temporal |
| **NotificationService** | Logger unificado con 5 niveles (v2.0) |

## 🔔 Sistema de Notificaciones v2.0

### **Logger Centralizado Profesional**

```javascript
// Ejemplo de uso
Logger.success("Ship nomination created successfully", {
    module: 'FormHandler',
    showNotification: true,
    notificationMessage: "Ship nomination saved!"
});

Logger.error("Failed to save ship nomination", {
    module: 'FormHandler', 
    error: error,
    showNotification: true,
    notificationMessage: "Unable to save. Please try again."
});
```

### **Características**
- **5 Niveles**: DEBUG, INFO, WARN, ERROR, SUCCESS
- **Toast Notifications**: Diseño premium con animaciones fluidas
- **Console Logging**: Estructurado por módulos
- **Error Boundaries**: Manejo centralizado de errores

## 📊 Modelos de Datos

### **ShipNomination Schema**
```javascript
{
  vesselName: String,
  amspecRef: String,
  clientRef: String,
  client: { id: ObjectId, name: String },
  agent: { id: ObjectId, name: String },
  terminal: { id: ObjectId, name: String },
  berth: { id: ObjectId, name: String },
  surveyor: { id: ObjectId, name: String },
  sampler: { id: ObjectId, name: String },
  chemist: { id: ObjectId, name: String },
  productTypes: [{ id: ObjectId, name: String }],
  pilotOnBoard: Date,
  etb: Date,
  etc: Date,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### **SamplingRoster Schema**
```javascript
{
  shipNomination: ObjectId,
  vesselName: String,
  amspecRef: String,
  startDischarge: Date,
  etcTime: Date,
  dischargeTimeHours: Number,
  officeSampling: {
    sampler: { id: ObjectId, name: String },
    startTime: Date,
    finishTime: Date,
    hours: Number
  },
  lineSampling: [{
    sampler: { id: ObjectId, name: String },
    startTime: Date,
    finishTime: Date,
    hours: Number,
    blockType: String,
    turnOrder: Number
  }],
  status: String,
  version: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## 📖 Guía de Uso

### **Ship Nominations**

1. **Crear Nueva Nominación**
   - Completar información básica (Vessel Name, AmSpec Ref)
   - Seleccionar entidades (Client, Agent, Terminal, Berth)
   - Asignar personal (Surveyor, Sampler, Chemist) 
   - Configurar fechas (Pilot on Board, ETB, ETC)
   - Guardar con validaciones automáticas

2. **Gestionar Nominations**
   - **Ver detalles**: 👁️ información completa
   - **Editar**: ✏️ modificar campos
   - **Eliminar**: 🗑️ con confirmación

3. **Búsqueda y Filtros**
   - Búsqueda básica en tiempo real
   - Filtros avanzados con múltiples criterios
   - Filtros predefinidos: "This Month", "This Week", "Pending"

4. **Exportación Excel**
   - Botón flotante "Export to Excel"
   - Formato profesional automático
   - Detección real de descarga

### **Sampling Roster**

1. **Crear Cronograma**
   - Seleccionar Ship Nomination existente
   - Auto-población de información del barco
   - Configurar horarios de descarga

2. **Auto-generación de Horarios**
   - Click "Auto Generate" para crear schedule automático
   - Respeta límites de 12h por sampler
   - Validación cruzada previene conflictos

3. **Gestión de Personal**
   - Editar samplers en Office/Line Sampling
   - Dropdown con disponibilidad en tiempo real
   - Auto-save inmediato

## 🚀 Deployment

### **Proceso Automático DigitalOcean**

```bash
# 1. Desarrollo local
npm run dev

# 2. Testing y validación
npm test

# 3. Commit y push
git add .
git commit -m "Feature: descripción"
git push origin main

# 4. Auto-deploy automático en DigitalOcean
```

### **Configuración Producción**

- **Source**: GitHub Repository
- **Repository**: cuellar1992/ship-nomination-app  
- **Branch**: main
- **Autodeploy**: ✅ Habilitado
- **Build Command**: (automático)
- **Run Command**: `npm start`

## 🐛 Troubleshooting

### **Comandos de Debug**

```javascript
// Verificación general del sistema
console.log('Sistema inicializado:', !!window.simpleShipForm);
window.simpleShipForm?.getApplicationState();

// Verificar APIs cargadas
const apiManager = window.simpleShipForm?.getApiManager();
console.log('APIs cargadas:', apiManager?.isDataLoaded());

// Verificar sampling roster
console.log('Sampling Controller:', !!window.samplingRosterController);
console.log('Ready:', window.samplingRosterController?.isReady());

// Test restricción 24 horas
const samplerData = window.simpleShipForm?.getComponentFactory()
    ?.getItemData('sampler', 'Sakib');
console.log('Sakib restriction:', samplerData?.weeklyRestriction);

// Verificar estado samplers
fetch('/api/samplers')
    .then(r => r.json())
    .then(data => {
        console.log('Samplers con restricción:', 
            data.data.filter(s => s.weeklyRestriction === true)
        );
    });
```

### **Problemas Comunes**

| Problema | Causa | Solución |
|----------|-------|----------|
| "Module not found" | Rutas incorrectas en imports | Verificar rutas relativas en ES6 modules |
| "Component is not defined" | Componentes no cargados | Verificar scripts en HTML y orden de carga |
| Tabla no se carga | APIs no disponibles | Usar `window.simpleShipForm.getApiManager().isDataLoaded()` |
| Filtros no funcionan | Estado de filtros corrupto | Usar `window.debugTableFilters()` |

## 📊 Métricas del Proyecto

### **Evolución del Sistema**

| Métrica | Antes (Monolítico) | Después (Modular) |
|---------|-------------------|-------------------|
| **Archivos** | 1 archivo | 35+ módulos |
| **Líneas de código** | 1,400+ líneas | ~200 líneas/módulo |
| **Mantenibilidad** | ❌ Difícil | ✅ Excelente |
| **Testing** | ❌ Complejo | ✅ Modular |
| **Escalabilidad** | ❌ Limitada | ✅ Alta |
| **Colaboración** | ❌ 1 developer | ✅ Múltiples devs |

### **Componentes Implementados**

- ✅ **Ship Nomination System**: 15 módulos especializados
- ✅ **Sampling Roster System**: 10 módulos con validación cruzada  
- ✅ **Shared Components**: 8 componentes reutilizables
- ✅ **APIs**: 25+ endpoints RESTful
- ✅ **Business Rules**: CRUD completo, filtros avanzados, auto-save

## 👨‍💻 Desarrollo

### **Agregando Nuevas Funcionalidades**

1. **Nuevo Campo en Formulario**
```javascript
// 1. Agregar en Constants.js
SINGLE_SELECT_CONFIG: {
    newField: {
        label: 'New Field',
        icon: 'fas fa-new-icon', 
        apiEndpoint: '/api/newfields'
    }
}

// 2. Agregar contenedor en HTML
<div id="newField"></div>

// 3. El sistema lo creará automáticamente
```

2. **Nueva API Endpoint**
   - Backend: Crear route y modelo
   - APIManager: Agregar método de carga  
   - Constants: Configurar endpoint

### **Mejores Prácticas**

- **Convenciones**: PascalCase para clases, camelCase para variables
- **Logging**: Usar sistema Logger unificado
- **Imports**: Named imports cuando sea posible
- **Testing**: Módulos independientes facilitan testing

### **Checklist Pre-Deploy**

- [ ] ✅ Todos los imports/exports correctos
- [ ] ✅ Scripts en HTML en orden correcto  
- [ ] ✅ Constants.js configurado
- [ ] ✅ APIs backend funcionando
- [ ] ✅ Tests básicos pasando
- [ ] ✅ Logs de debug deshabilitados

## 📞 Recursos y Soporte

### **Enlaces Importantes**

- **🔗 Repositorio**: [GitHub](https://github.com/cuellar1992/ship-nomination-app.git)
- **🌐 App Producción**: [Live Site](https://monkfish-app-aej83.ondigitalocean.app)
- **☁️ Panel DigitalOcean**: [Console](https://digitalocean.com)
- **🗄️ MongoDB Atlas**: [Database](https://cloud.mongodb.com)

### **Estado del Proyecto**

- **📅 Versión**: 2.1 - Sistema con Restricción de 24 Horas
- **✅ Estado**: Completamente Funcional
- **🔄 Última actualización**: Agosto 2025
- **🆕 Funcionalidad reciente**: Sistema de restricción de 24 horas implementado

## 🎉 Funcionalidades Completadas

1. ✅ **Ship Nomination System** - CRUD completo con filtros avanzados
2. ✅ **Sampling Roster System** - Auto-generación con validación cruzada  
3. ✅ **Sistema de Emails** - Campos extendidos para personal
4. ✅ **🆕 Restricción 24 Horas** - Control granular por sampler
5. ✅ **Auto-save Inteligente** - Persistencia automática
6. ✅ **Exportación Excel Premium** - Con detección real de descarga
7. ✅ **Sistema de Notificaciones v2.0** - Logger unificado profesional
8. ✅ **Arquitectura Modular** - ES6 modules por responsabilidad

## 🤝 Contribución

### **Cómo Contribuir**

1. Fork del proyecto
2. Crear rama para nueva funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Implementar cambios siguiendo las convenciones
4. Commit con mensajes descriptivos (`git commit -m 'Add: nueva funcionalidad'`)
5. Push a la rama (`git push origin feature/nueva-funcionalidad`)
6. Crear Pull Request con descripción detallada

### **Reportar Issues**

- Usar el sistema de issues de GitHub
- Incluir pasos para reproducir el problema
- Adjuntar logs y capturas de pantalla
- Etiquetar apropiadamente (bug, enhancement, question)

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **Bootstrap 5.3.0**: Framework CSS para interfaz responsiva
- **Font Awesome 6.4.0**: Iconografía profesional del sistema  
- **MongoDB Atlas**: Base de datos en la nube confiable
- **Express.js**: Framework robusto del backend
- **DigitalOcean**: Plataforma de deployment automático

---

**🚢 Desarrollado con ❤️ para optimizar operaciones portuarias a nivel ENTERPRISE**

*Sistema completamente funcional con todas las funcionalidades principales implementadas - Agosto 2025*