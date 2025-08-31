# 🧪 Sistema de Sampling Roster

## 🎯 Descripción General

El Sistema de Sampling Roster es una funcionalidad central que permite gestionar y programar las actividades de muestreo para barcos en el puerto. Proporciona una interfaz completa para crear, editar y gestionar rosters de sampling tanto para muestreo de oficina como de línea.

## 🚢 Funcionalidades Principales

### 1. **Selección de Ship Nomination**
- Selector de barcos desde nominaciones existentes
- Carga automática de información del buque
- Validación de datos de entrada

### 2. **Información del Buque (Vessel Information)**
- Datos básicos del buque (nombre, muelle, referencia AmSpec)
- Horarios (POB, ETB, ETC, Start Discharge)
- Información de carga y personal asignado
- Indicador de estado de guardado

### 3. **Office Sampling**
- Tabla de programación de muestreo de oficina
- Asignación de personal (WHO)
- Horarios de inicio y fin
- Cálculo automático de horas
- Acciones por fila

### 4. **Line Sampling Schedule**
- Programación de muestreo de línea
- Cronograma de actividades
- Asignación de recursos
- Gestión de turnos

## 🔧 Botones de Acción

### Ubicación
Los botones de acción están posicionados **debajo de la tabla de Office Sampling**, alineados a la derecha.

### Funcionalidades

#### **CLEAR** 🗑️
- **Propósito**: Limpiar todo el roster de sampling
- **Acción**: Elimina todos los datos ingresados
- **Confirmación**: Requiere confirmación del usuario

#### **AUTO GENERATE** ✨
- **Propósito**: Generar automáticamente el roster
- **Lógica**: Algoritmo inteligente de asignación
- **Parámetros**: Basado en disponibilidad y experiencia

#### **EXPORT** 📊
- **Propósito**: Exportar roster a Excel
- **Formato**: Archivo .xlsx con formato profesional
- **Contenido**: Todas las tablas y datos del roster

#### **SAVE** 💾
- **Propósito**: Guardar cambios en la base de datos
- **Estado**: Se muestra solo cuando hay cambios pendientes
- **Validación**: Verifica integridad de datos antes de guardar

## 📊 Estructura de Datos

### Office Sampling Table
```javascript
const officeSamplingRow = {
  who: "Nombre del Sampler",
  startOffice: "2024-01-15T08:00:00",
  finishSampling: "2024-01-15T16:00:00",
  hours: 8,
  actions: ["edit", "delete"]
};
```

### Line Sampling Table
```javascript
const lineSamplingRow = {
  who: "Nombre del Sampler",
  startLineSampling: "2024-01-15T09:00:00",
  finishLineSampling: "2024-01-15T17:00:00",
  hours: 8,
  actions: ["edit", "delete"]
};
```

## 🎨 Interfaz de Usuario

### Diseño Responsivo
- **Desktop**: Vista completa con todas las funcionalidades
- **Tablet**: Adaptación de tablas y botones
- **Mobile**: Vista simplificada con navegación táctil

### Estilos Visuales
- **Tema**: Premium System con colores corporativos
- **Tipografía**: Inter font family para mejor legibilidad
- **Iconos**: Font Awesome para acciones y estados

### Estados Visuales
- **Empty State**: Mensaje informativo cuando no hay datos
- **Loading State**: Indicadores de carga durante operaciones
- **Success/Error**: Notificaciones de estado de operaciones

## 🔄 Flujo de Trabajo

### 1. **Selección de Buque**
```
Usuario selecciona buque → Sistema carga datos → Interfaz se actualiza
```

### 2. **Creación de Roster**
```
Usuario configura horarios → Sistema valida datos → Roster se genera
```

### 3. **Edición y Gestión**
```
Usuario edita entradas → Sistema calcula horas → Cambios se guardan
```

### 4. **Exportación**
```
Usuario solicita exportar → Sistema procesa datos → Archivo Excel se descarga
```

## 🛠️ Implementación Técnica

### Frontend
- **Framework**: HTML5 + CSS3 + JavaScript ES6+
- **Librerías**: Bootstrap 5.3, Font Awesome 6.4
- **Componentes**: SingleSelect, DateTimePicker, MultiSelect

### Backend
- **Servidor**: Node.js con Express
- **Base de Datos**: MongoDB (previsto)
- **API**: RESTful endpoints para CRUD operations

### Arquitectura
```
Frontend (HTML/CSS/JS) ↔ API REST ↔ Backend (Node.js) ↔ Database
```

## 📱 Componentes Reutilizables

### SingleSelect
- Selector de buques con búsqueda
- Carga asíncrona de datos
- Validación de selección

### DateTimePicker
- Selector de fecha y hora
- Formato internacional
- Validación de rangos

### MultiSelect
- Selección múltiple de opciones
- Filtrado y búsqueda
- Gestión de estado

## 🔒 Seguridad y Validación

### Validaciones del Cliente
- Formato de fechas y horas
- Rangos de valores permitidos
- Campos obligatorios

### Validaciones del Servidor
- Autenticación de usuario
- Autorización de operaciones
- Sanitización de datos

## 📈 Métricas y Reportes

### KPIs del Sistema
- Tiempo promedio de creación de roster
- Número de rosters por período
- Eficiencia de asignación de personal

### Reportes Disponibles
- Roster por buque
- Roster por período
- Análisis de carga de trabajo

## 🚀 Mejoras Futuras

### Funcionalidades Planificadas
- [ ] Drag & Drop para reordenar entradas
- [ ] Templates de roster reutilizables
- [ ] Integración con calendario externo
- [ ] Notificaciones automáticas

### Optimizaciones Técnicas
- [ ] Caché de datos del buque
- [ ] Lazy loading de componentes
- [ ] Service Workers para offline
- [ ] PWA capabilities

## 🐛 Solución de Problemas

### Problemas Comunes

#### **DateTimePicker no funciona**
- Verificar que el componente esté cargado
- Comprobar formato de fecha en la base de datos
- Revisar zona horaria del navegador

#### **Botones no responden**
- Verificar que los event listeners estén registrados
- Comprobar que los IDs coincidan
- Revisar errores en la consola

#### **Datos no se guardan**
- Verificar conexión con el backend
- Comprobar permisos de usuario
- Revisar logs del servidor

## 📚 Referencias

- [Bootstrap Documentation](https://getbootstrap.com/docs/)
- [Font Awesome Icons](https://fontawesome.com/icons)
- [JavaScript ES6+ Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [HTML5 Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTML)

---

*Documento mantenido por el equipo de desarrollo*
*Última actualización: $(Get-Date -Format "yyyy-MM-dd")*
