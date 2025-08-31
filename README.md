# 🚢 Ship Nomination App

## 📚 Documentación

**📖 [Ver Documentación Completa](./docs/README.md)**

Toda la documentación técnica del proyecto está centralizada en la carpeta `docs/` para mejor organización y mantenimiento.

## 🎯 Descripción del Proyecto

Ship Nomination App es una aplicación web completa para la gestión de nominaciones de barcos y rosters de muestreo en operaciones portuarias.

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- MongoDB (opcional para desarrollo)

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd ship-nomination-app

# Instalar dependencias
cd backend
npm install

# Iniciar el servidor
npm start
```

### Acceso
- **Aplicación**: http://localhost:3000
- **API**: http://localhost:3000/api

## 🏗️ Estructura del Proyecto

```
ship-nomination-app/
├── backend/                 # Servidor Node.js
│   ├── public/             # Archivos estáticos (HTML, CSS, JS)
│   ├── routes/             # Rutas de la API
│   ├── services/           # Lógica de negocio
│   ├── models/             # Modelos de datos
│   └── utils/              # Utilidades y helpers
├── docs/                   # 📁 Documentación centralizada
│   ├── README.md           # Índice de documentación
│   ├── ship-nominations.md # Sistema de nominaciones
│   ├── sampling-roster.md  # Sistema de roster
│   ├── charts-documentation.md # Gráficos y visualizaciones
│   └── ...                 # Otros documentos técnicos
└── README.md               # Este archivo
```

## 🧪 Funcionalidades Principales

- **🚢 Ship Nominations**: Gestión completa de nominaciones de barcos
- **🧪 Sampling Roster**: Programación y gestión de rosters de muestreo
- **📊 Dashboard**: Visualizaciones y métricas en tiempo real
- **📱 Responsive**: Interfaz adaptada para todos los dispositivos

## 🔧 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express
- **Base de Datos**: MongoDB (previsto)
- **UI Framework**: Bootstrap 5.3
- **Iconos**: Font Awesome 6.4
- **Gráficos**: Chart.js, D3.js

## 📖 Documentación Disponible

### Funcionalidades Principales
- [**Ship Nominations**](./docs/ship-nominations.md) - Sistema completo de nominaciones
- [**Sampling Roster**](./docs/sampling-roster.md) - Gestión de rosters de muestreo
- [**Roster Status**](./docs/roster-status-implementation.md) - Implementación del estado

### Componentes Técnicos
- [**DateTimePicker Fixes**](./docs/datetimepicker-fixes.md) - Correcciones del selector
- [**Debug Sampling Roster**](./docs/debug-sampling-roster.md) - Depuración del sistema
- [**Gráficos y Visualizaciones**](./docs/charts-documentation.md) - Documentación de gráficos

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Contacto

- **Equipo de Desarrollo**: [team@company.com]
- **Proyecto**: [https://github.com/username/ship-nomination-app]

---

*Proyecto mantenido por el equipo de desarrollo*
*Última actualización: $(Get-Date -Format "yyyy-MM-dd")*
