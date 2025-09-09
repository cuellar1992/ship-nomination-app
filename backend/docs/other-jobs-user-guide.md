# Guía de Usuario - Módulo "Other Jobs"

## 🎯 **Introducción**

El módulo "Other Jobs" te permite registrar y gestionar trabajos adicionales que se realizan fuera de las operaciones principales del sistema. Esta guía te mostrará cómo usar todas las funcionalidades paso a paso.

---

## 🚀 **Acceso al Módulo**

### **Navegación:**
1. Desde cualquier página del sistema, busca el menú de navegación
2. Haz clic en **"Other Jobs"**
3. Serás dirigido a la página principal del módulo

---

## ✏️ **Crear un Nuevo Trabajo**

### **Paso a Paso:**

#### **1. Completar Descripción:**
- En el campo **"Job Description"**, escribe una descripción clara del trabajo
- Ejemplos:
  - "Mantenimiento de equipos de laboratorio"
  - "Capacitación de personal nuevo"
  - "Auditoría de calidad mensual"

#### **2. Asignar Trabajador y Horario:**
En la sección **"Who / Shift"**:

1. **Seleccionar Trabajador:**
   - Haz clic en el dropdown de **"Sampler"**
   - Busca y selecciona al trabajador asignado
   - El sistema autocompleta el nombre

2. **Establecer Horario:**
   - **Start:** Selecciona fecha y hora de inicio
   - **End:** Selecciona fecha y hora de finalización
   - **Hours:** Se calcula automáticamente

#### **3. Guardar el Trabajo:**
- Haz clic en **"Save Other Job"**
- El sistema validará los datos
- Verás una confirmación de éxito

### **Ejemplo Práctico:**
```
✅ Job Description: "Mantenimiento preventivo de bombas"
✅ Sampler: "Juan Pérez"
✅ Start: 01/12/2024 08:00 AM
✅ End: 01/12/2024 12:00 PM
✅ Hours: 4.00 (calculado automáticamente)
```

---

## 🔍 **Buscar y Filtrar Trabajos**

### **Búsqueda Rápida:**
1. Usa la **barra de búsqueda** en la parte superior
2. Escribe cualquier palabra clave:
   - Descripción del trabajo
   - Nombre del trabajador
   - Status del trabajo
3. Los resultados se filtran **en tiempo real**

### **Filtros Rápidos:**
- **"This Month":** Muestra trabajos del mes actual
- **"This Week":** Muestra trabajos de la semana actual

### **Filtros Avanzados:**
1. Haz clic en **"Advanced"** para expandir opciones
2. **Rango de Fechas:**
   - **From:** Fecha de inicio del rango
   - **To:** Fecha de fin del rango
3. **Assigned To:** Filtra por trabajador específico

### **Ejemplos de Búsqueda:**
```
🔍 "mantenimiento" → Encuentra todos los trabajos de mantenimiento
🔍 "Juan Pérez" → Encuentra todos los trabajos asignados a Juan
🔍 "completed" → Encuentra todos los trabajos completados
```

---

## 📊 **Gestionar Trabajos Existentes**

### **Visualización en Tabla:**
La tabla muestra:
- **Description:** Descripción del trabajo
- **Date:** Fecha de operación
- **Person:** Trabajador asignado
- **Start/End:** Horarios de inicio y fin
- **Hours:** Horas trabajadas
- **Status:** Estado actual (confirmed/completed)

### **Acciones Disponibles:**

#### **👁️ Ver Detalles (View):**
- Haz clic en el icono **"👁️"** 
- Muestra información completa del trabajo
- No permite modificaciones

#### **✏️ Editar (Edit):**
- Haz clic en el icono **"✏️"**
- Carga los datos en el formulario
- Modifica los campos necesarios
- Guarda los cambios

#### **🗑️ Eliminar (Delete):**
- Haz clic en el icono **"🗑️"**
- Confirma la eliminación
- El registro se borra permanentemente

---

## 📈 **Status Automático**

### **Lógica del Sistema:**
- **Confirmed:** Trabajos programados (fecha futura o en curso)
- **Completed:** Trabajos finalizados (fecha de fin pasada)

### **Actualización Automática:**
El sistema actualiza el status automáticamente cuando:
- La fecha/hora de fin es anterior al momento actual
- Se recarga la página o se actualiza la tabla

---

## 📤 **Exportar a Excel**

### **Proceso de Exportación:**
1. Aplica los **filtros deseados** (opcional)
2. Haz clic en **"Export to Excel"**
3. El archivo se descarga automáticamente
4. **Nombre del archivo:** `other-jobs-YYYY-MM-DD.xlsx`

### **Contenido del Excel:**
- Todos los trabajos visibles según filtros aplicados
- Formato profesional con colores y estilos
- Columnas: Description, Date, Person, Start, End, Hours, Status
- Encabezados con formato destacado

---

## 📱 **Paginación y Navegación**

### **Controles de Paginación:**
- **Registros por página:** 5, 10, o 15 (seleccionable)
- **Botones de navegación:** Anterior/Siguiente
- **Números de página:** Navegación directa
- **Contador:** "Showing X to Y of Z records"

### **Uso Eficiente:**
- Usa **filtros** para reducir resultados
- Ajusta **registros por página** según tu pantalla
- Los **filtros se mantienen** al cambiar de página

---

## 💡 **Consejos y Mejores Prácticas**

### **Descripciones de Trabajo:**
✅ **Buenas prácticas:**
- "Mantenimiento preventivo de equipos Lab-A"
- "Capacitación en nuevos protocolos de seguridad"
- "Auditoría trimestral de procesos de calidad"

❌ **Evitar:**
- "Trabajo"
- "Misc"
- Descripciones muy vagas

### **Gestión de Horarios:**
✅ **Recomendaciones:**
- Establece horarios realistas
- Considera pausas en trabajos largos
- Verifica las horas calculadas automáticamente

### **Organización:**
✅ **Sugerencias:**
- Usa filtros regulares para revisar trabajos del mes
- Exporta reportes mensuales para documentación
- Mantén descripciones consistentes para facilitar búsquedas

---

## 🔧 **Resolución de Problemas**

### **Problemas Comunes:**

#### **❌ "Error al guardar trabajo"**
**Posibles causas:**
- Descripción vacía
- Trabajador no seleccionado
- Fecha de fin anterior a fecha de inicio

**Solución:**
- Verifica que todos los campos requeridos estén completos
- Asegúrate de que el horario sea lógico

#### **❌ "No se muestran resultados"**
**Posibles causas:**
- Filtros muy restrictivos
- No hay trabajos en el período seleccionado

**Solución:**
- Limpia filtros y busca nuevamente
- Verifica las fechas del filtro de rango

#### **❌ "Horas calculadas incorrectas"**
**Verificación:**
- El sistema calcula: (Hora Fin - Hora Inicio)
- Formato: Decimales (ej: 4.5 horas = 4 horas 30 minutos)

---

## 📊 **Integración con Dashboard**

### **Métricas Incluidas:**
El módulo "Other Jobs" contribuye a:
- **Weekly Workload:** Horas semanales totales
- **Monthly Workload:** Horas mensuales totales
- **Gráficos de productividad:** Tendencias de trabajo

### **Visualización:**
- Las horas de "Other Jobs" se suman a las métricas generales
- Se incluyen en reportes de productividad
- Visibles en gráficos del dashboard principal

---

## 📋 **Casos de Uso Frecuentes**

### **1. Mantenimiento Semanal:**
```
Description: "Mantenimiento semanal de equipos"
Frequency: Cada lunes
Duration: 2-4 horas
Assigned: Técnico especializado
```

### **2. Capacitación Mensual:**
```
Description: "Capacitación mensual de seguridad"
Frequency: Primer viernes del mes
Duration: 3 horas
Assigned: Supervisor de turno
```

### **3. Auditoría Trimestral:**
```
Description: "Auditoría de procesos Q1-2024"
Frequency: Cada 3 meses
Duration: 8 horas (día completo)
Assigned: Auditor externo
```

### **4. Proyecto Especial:**
```
Description: "Implementación sistema nuevo"
Frequency: Varios días
Duration: Variable
Assigned: Equipo de proyecto
```

---

## 🎯 **Objetivos del Módulo**

### **Para Supervisores:**
- **Visibilidad** completa de trabajos adicionales
- **Control** de horas y recursos
- **Reportes** para management

### **Para Trabajadores:**
- **Registro** fácil de actividades
- **Seguimiento** de horas trabajadas
- **Historial** de trabajos realizados

### **Para Administración:**
- **Métricas** de productividad
- **Costeo** de proyectos especiales
- **Planificación** de recursos

---

## 📞 **Soporte**

### **Problemas Técnicos:**
- Refresca la página (F5)
- Verifica conexión a internet
- Contacta al administrador del sistema

### **Dudas de Uso:**
- Consulta esta guía
- Pregunta a tu supervisor
- Revisa ejemplos prácticos

---

**📅 Fecha de Creación:** Diciembre 2024  
**👤 Dirigido a:** Usuarios finales del sistema  
**🔄 Versión:** 1.0.0
