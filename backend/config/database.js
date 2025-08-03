// backend/config/database.js - Configuración de MongoDB
const mongoose = require('mongoose');

class DatabaseManager {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            console.log('🔄 Conectando a MongoDB Atlas...');
            
            this.connection = await mongoose.connect(process.env.MONGODB_URI);

            console.log('✅ MongoDB Atlas conectado exitosamente');
            console.log(`📍 Database: ${this.connection.connection.name}`);
            console.log(`🌐 Host: ${this.connection.connection.host}`);
            
            return this.connection;
            
        } catch (error) {
            console.error('❌ Error conectando a MongoDB:', error.message);
            process.exit(1);
        }
    }

    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.disconnect();
                console.log('📴 Desconectado de MongoDB Atlas');
            }
        } catch (error) {
            console.error('❌ Error desconectando:', error.message);
        }
    }

    getConnectionStatus() {
        const state = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[state] || 'unknown';
    }
}

module.exports = new DatabaseManager();