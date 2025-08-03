// server.js - Servidor con MongoDB Atlas
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const path = require('path');

// Importar módulos
const databaseManager = require('./config/database');
const apiRoutes = require('./routes/api');

// Crear la aplicación Express
const app = express();

// Puerto donde correrá el servidor
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(express.json()); // Para parsear JSON
app.use(express.urlencoded({ extended: true })); // Para parsear formularios

// Servir archivos estáticos desde la carpeta raíz del proyecto
app.use(express.static(path.join(__dirname, '..')));

// Usar las rutas API organizadas
app.use('/api', apiRoutes);

// Ruta raíz que redirige al index.html
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// Función para iniciar el servidor
async function startServer() {
    try {
        // Conectar a MongoDB Atlas
        await databaseManager.connect();
        
        // Iniciar el servidor HTTP
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`📁 Frontend disponible en http://localhost:${PORT}`);
            console.log(`📊 Estado de MongoDB: ${databaseManager.getConnectionStatus()}`);
            console.log(`📡 API endpoints disponibles:`);
            console.log(`   • http://localhost:${PORT}/api/test`);
            console.log(`   • http://localhost:${PORT}/api/info`);
            console.log(`   • http://localhost:${PORT}/api/health`);
            console.log(`   • http://localhost:${PORT}/api/ships`);
            console.log(`   • http://localhost:${PORT}/api/roster`);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando el servidor:', error);
        process.exit(1);
    }
}

// Manejar cierre graceful del servidor
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando servidor...');
    await databaseManager.disconnect();
    process.exit(0);
});

// Iniciar servidor
startServer();