# 🚢 Sistema de Ship Nominations

## 🎯 Descripción General

El Sistema de Ship Nominations es el módulo principal que gestiona toda la información relacionada con los buques que llegan al puerto. Permite crear, editar y gestionar nominaciones de barcos con toda la información necesaria para operaciones portuarias.

## 🚢 Funcionalidades Principales

### 1. **Gestión de Nominaciones**
- Creación de nuevas nominaciones de buques
- Edición de nominaciones existentes
- Eliminación de nominaciones obsoletas
- Búsqueda y filtrado avanzado

### 2. **Información del Buque**
- **Datos Básicos**: Nombre, bandera, tipo de buque
- **Dimensiones**: Eslora, manga, calado
- **Capacidades**: Carga máxima, pasajeros
- **Documentación**: Certificados, permisos

### 3. **Información de Carga**
- **Tipo de Carga**: Productos, contenedores, granos
- **Cantidades**: Peso, volumen, unidades
- **Origen/Destino**: Puertos de carga y descarga
- **Documentación**: Manifiestos, certificados

### 4. **Programación de Operaciones**
- **Horarios de Llegada**: ETA (Estimated Time of Arrival)
- **Horarios de Salida**: ETD (Estimated Time of Departure)
- **Operaciones**: Carga, descarga, bunkering
- **Servicios**: Remolque, pilotaje, amarre

## 📊 Estructura de Datos

### Ship Nomination Object
```javascript
const shipNomination = {
  id: "SN_2024_001",
  vesselName: "MV ATLANTIC STAR",
  imoNumber: "9876543",
  callSign: "ABCD",
  flag: "Panama",
  vesselType: "Bulk Carrier",
  
  // Dimensiones
  length: 250.5,
  beam: 43.2,
  draft: 15.8,
  grossTonnage: 45000,
  
  // Carga
  cargo: {
    type: "Iron Ore",
    quantity: 35000,
    unit: "MT",
    origin: "Brazil",
    destination: "China"
  },
  
  // Horarios
  eta: "2024-01-20T08:00:00Z",
  etd: "2024-01-25T18:00:00Z",
  
  // Estado
  status: "confirmed",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
};
```

### Cargo Information
```javascript
const cargoInfo = {
  id: "CARGO_001",
  shipNominationId: "SN_2024_001",
  productType: "Iron Ore",
  quantity: 35000,
  unit: "MT",
  grade: "Fe 62%",
  origin: "Port of Tubarao, Brazil",
  destination: "Port of Qingdao, China",
  loadingPort: "Tubarao",
  dischargePort: "Qingdao",
  specialRequirements: ["Moisture control", "Temperature monitoring"]
};
```

## 🎨 Interfaz de Usuario

### Diseño Responsivo
- **Desktop**: Vista completa con todas las funcionalidades
- **Tablet**: Adaptación de formularios y tablas
- **Mobile**: Vista simplificada con navegación táctil

### Componentes Principales
- **Formulario de Nominación**: Campos organizados por secciones
- **Tabla de Nominaciones**: Vista de lista con filtros
- **Detalle de Nominación**: Vista completa de una nominación
- **Buscador Avanzado**: Filtros por múltiples criterios

### Estados Visuales
- **Draft**: Borrador en proceso
- **Submitted**: Enviado para revisión
- **Confirmed**: Confirmado y aprobado
- **Cancelled**: Cancelado o rechazado

## 🔄 Flujo de Trabajo

### 1. **Creación de Nominación**
```
Usuario inicia → Llena formulario → Valida datos → Envía → Sistema procesa
```

### 2. **Revisión y Aprobación**
```
Nominación enviada → Revisor evalúa → Aprobada/Rechazada → Notificación
```

### 3. **Gestión de Operaciones**
```
Nominación aprobada → Planificación → Ejecución → Seguimiento
```

### 4. **Cierre y Reportes**
```
Operación completada → Documentación → Reportes → Archivo
```

## 🛠️ Implementación Técnica

### Frontend
- **Framework**: HTML5 + CSS3 + JavaScript ES6+
- **Librerías**: Bootstrap 5.3, Font Awesome 6.4
- **Componentes**: FormBuilder, DataTable, SearchFilter

### Backend
- **Servidor**: Node.js con Express
- **Base de Datos**: MongoDB con Mongoose
- **API**: RESTful endpoints para CRUD operations

### Arquitectura
```
Frontend (React/Vue) ↔ API Gateway ↔ Microservices ↔ Database
```

## 📱 Componentes Reutilizables

### FormBuilder
- Generación dinámica de formularios
- Validación en tiempo real
- Manejo de campos condicionales

### DataTable
- Tabla de datos con paginación
- Filtros y búsqueda
- Ordenamiento por columnas

### SearchFilter
- Filtros avanzados de búsqueda
- Búsqueda por texto completo
- Filtros por rango de fechas

## 🔒 Seguridad y Validación

### Validaciones del Cliente
- Formato de campos obligatorios
- Validación de rangos de valores
- Verificación de formatos de fecha

### Validaciones del Servidor
- Autenticación JWT
- Autorización por roles
- Sanitización de datos de entrada

### Auditoría
- Log de todas las operaciones
- Historial de cambios
- Trazabilidad de modificaciones

## 📈 Métricas y Reportes

### KPIs del Sistema
- Número de nominaciones por período
- Tiempo promedio de aprobación
- Tasa de aprobación/rechazo
- Eficiencia de procesamiento

### Reportes Disponibles
- Nominaciones por estado
- Carga por tipo de producto
- Análisis de tráfico portuario
- Reportes de cumplimiento

## 🔗 Integraciones

### Sistemas Externos
- **Port Management System**: Sincronización de horarios
- **Customs System**: Información de aduanas
- **Weather Service**: Datos meteorológicos
- **Tide Tables**: Información de mareas

### APIs
- **Vessel Tracking**: Seguimiento en tiempo real
- **Port Information**: Datos de puertos
- **Shipping Lines**: Información de líneas navieras

## 🚀 Mejoras Futuras

### Funcionalidades Planificadas
- [ ] Integración con blockchain para trazabilidad
- [ ] IA para predicción de demoras
- [ ] Dashboard en tiempo real
- [ ] Aplicación móvil nativa

### Optimizaciones Técnicas
- [ ] Microservicios para escalabilidad
- [ ] Caché distribuido (Redis)
- [ ] Event-driven architecture
- [ ] GraphQL para consultas complejas

## 🐛 Solución de Problemas

### Problemas Comunes

#### **Formulario no se envía**
- Verificar validaciones del cliente
- Comprobar conexión con el backend
- Revisar logs del servidor

#### **Datos no se cargan**
- Verificar permisos de usuario
- Comprobar filtros aplicados
- Revisar estado de la API

#### **Validaciones fallan**
- Verificar formato de datos
- Comprobar reglas de negocio
- Revisar configuración de validación

## 📚 Referencias

- [IMO Standards](https://www.imo.org/)
- [SOLAS Convention](https://www.imo.org/en/About/Conventions/Pages/SOLAS.aspx)
- [MARPOL Convention](https://www.imo.org/en/About/Conventions/Pages/MARPOL.aspx)
- [Port Management Best Practices](https://www.worldports.org/)

---

*Documento mantenido por el equipo de desarrollo*
*Última actualización: $(Get-Date -Format "yyyy-MM-dd")*
