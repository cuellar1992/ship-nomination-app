/**
 * 🔔📝 UNIFIED NOTIFICATION & LOGGING SYSTEM PREMIUM v2.0
 * Sistema centralizado ultra-limpio, flexible y seguro
 * 
 * ✨ MEJORAS v2.0:
 * - Arquitectura modular con clases separadas
 * - Validación robusta de datos
 * - Memory leak prevention 
 * - Performance optimizations
 * - Type safety mejorado
 * - Error boundaries
 * - Sanitización XSS
 * - Configuración inmutable
 * - Event system mejorado
 */

/**
 * 🛡️ UTILIDADES DE SEGURIDAD Y VALIDACIÓN
 */
class SecurityUtils {
    /**
     * Sanitizar HTML para prevenir XSS
     */
    static sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Validar configuración de entrada
     */
    static validateConfig(config) {
        const errors = [];
        
        if (config.notifications?.maxVisible && 
            (!Number.isInteger(config.notifications.maxVisible) || config.notifications.maxVisible < 1)) {
            errors.push('maxVisible must be a positive integer');
        }
        
        if (config.notifications?.defaultDuration && 
            (!Number.isInteger(config.notifications.defaultDuration) || config.notifications.defaultDuration < 100)) {
            errors.push('defaultDuration must be at least 100ms');
        }

        if (config.logging?.level && 
            !['DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS'].includes(config.logging.level)) {
            errors.push('Invalid logging level');
        }

        return errors;
    }

    /**
     * Deep freeze para configuración inmutable
     */
    static deepFreeze(obj) {
        Object.getOwnPropertyNames(obj).forEach(prop => {
            if (obj[prop] !== null && typeof obj[prop] === 'object') {
                SecurityUtils.deepFreeze(obj[prop]);
            }
        });
        return Object.freeze(obj);
    }
}

/**
 * ⚡ GESTOR DE PERFORMANCE Y MEMORIA
 */
class PerformanceManager {
    constructor() {
        this.metrics = {
            notificationsCreated: 0,
            notificationsRemoved: 0,
            averageRenderTime: 0,
            memoryUsage: 0
        };
        this.renderTimes = [];
        this.maxRenderTimes = 100; // Mantener últimas 100 mediciones
    }

    /**
     * Medir tiempo de renderizado
     */
    measureRender(renderFn) {
        const start = performance.now();
        const result = renderFn();
        const end = performance.now();
        
        this.recordRenderTime(end - start);
        return result;
    }

    /**
     * Registrar tiempo de renderizado
     */
    recordRenderTime(time) {
        this.renderTimes.push(time);
        if (this.renderTimes.length > this.maxRenderTimes) {
            this.renderTimes.shift();
        }
        
        this.averageRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    }

    /**
     * Cleanup automático de referencias
     */
    cleanup(activeNotifications) {
        // Remover notificaciones huérfanas del DOM
        const orphanedElements = document.querySelectorAll('.unified-notification:not([data-active])');
        orphanedElements.forEach(el => el.remove());

        // Garbage collection hint
        if (activeNotifications.size === 0 && this.renderTimes.length > 10) {
            this.renderTimes = this.renderTimes.slice(-10);
        }
    }

    /**
     * Obtener métricas
     */
    getMetrics() {
        return {
            ...this.metrics,
            averageRenderTime: Math.round(this.averageRenderTime * 100) / 100,
            memoryEstimate: this.renderTimes.length * 8 // bytes aproximados
        };
    }
}

/**
 * 🎨 GESTOR DE TEMAS Y ESTILOS
 */
class ThemeManager {
    constructor() {
        this.themes = {
            default: {
                colors: {
                    DEBUG: { bg: '#6c757d', text: '#ffffff', icon: 'fas fa-bug' },
                    INFO: { bg: '#1fb5d4', text: '#ffffff', icon: 'fas fa-info-circle' },
                    WARN: { bg: '#ffc107', text: '#000000', icon: 'fas fa-exclamation-triangle' },
                    ERROR: { bg: '#dc3545', text: '#ffffff', icon: 'fas fa-times-circle' },
                    SUCCESS: { bg: '#28a745', text: '#ffffff', icon: 'fas fa-check-circle' }
                },
                animations: {
                    duration: '0.4s',
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    hover: 'translateX(-5px) scale(1.02)'
                }
            }
        };
        this.currentTheme = 'default';
    }

    /**
     * Registrar tema personalizado
     */
    registerTheme(name, theme) {
        if (typeof name !== 'string' || !theme) {
            throw new Error('Invalid theme registration parameters');
        }
        this.themes[name] = { ...this.themes.default, ...theme };
    }

    /**
     * Cambiar tema activo
     */
    setTheme(name) {
        if (!this.themes[name]) {
            throw new Error(`Theme '${name}' not found`);
        }
        this.currentTheme = name;
        this.updateCSS();
    }

    /**
     * Obtener colores del tema actual
     */
    getColors() {
        return this.themes[this.currentTheme].colors;
    }

    /**
     * Actualizar CSS dinámicamente
     */
    updateCSS() {
        const theme = this.themes[this.currentTheme];
        const style = document.getElementById('unified-notification-styles');
        if (style && theme.animations) {
            // Actualizar variables CSS personalizadas
            document.documentElement.style.setProperty('--notification-duration', theme.animations.duration);
            document.documentElement.style.setProperty('--notification-easing', theme.animations.easing);
        }
    }
}

/**
 * 📋 GESTOR DE COLA INTELIGENTE
 */
class QueueManager {
    constructor(maxVisible = 5) {
        this.queue = [];
        this.maxVisible = maxVisible;
        this.processing = false;
    }

    /**
     * Agregar notificación a la cola
     */
    enqueue(notification) {
        // Validar entrada
        if (!notification || typeof notification !== 'object') {
            throw new Error('Invalid notification object');
        }

        notification.id = notification.id || `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        notification.createdAt = Date.now();
        
        this.queue.push(notification);
        return notification.id;
    }

    /**
     * Obtener siguiente notificación
     */
    dequeue() {
        return this.queue.shift();
    }

    /**
     * Verificar si puede mostrar más notificaciones
     */
    canShow(activeCount) {
        return activeCount < this.maxVisible;
    }

    /**
     * Procesar cola
     */
    async processQueue(activeCount, renderCallback) {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0 && this.canShow(activeCount)) {
            const notification = this.dequeue();
            if (notification) {
                await renderCallback(notification);
                activeCount++;
            }
        }
        
        this.processing = false;
    }

    /**
     * Limpiar cola
     */
    clear() {
        this.queue = [];
        this.processing = false;
    }

    /**
     * Estadísticas de cola
     */
    getStats() {
        return {
            queueLength: this.queue.length,
            maxVisible: this.maxVisible,
            processing: this.processing,
            oldestInQueue: this.queue.length > 0 ? Date.now() - this.queue[0].createdAt : 0
        };
    }
}

/**
 * 🔔 SISTEMA PRINCIPAL MEJORADO
 */
class UnifiedNotificationSystem {
    constructor(userConfig = {}) {
        // Configuración por defecto inmutable
        this.defaultConfig = SecurityUtils.deepFreeze({
            logging: {
                enabled: true,
                level: 'DEBUG',
                showTimestamp: true,
                showModule: true,
                colorConsole: true,
                maxLogHistory: 1000
            },
            notifications: {
                enabled: true,
                position: 'top-right',
                maxVisible: 5,
                defaultDuration: 4000,
                animations: true,
                pauseOnHover: true,
                showProgress: true,
                theme: 'default'
            },
            integration: {
                replaceNavigationManager: true,
                replaceConsoleLog: false,
                globalExpose: true,
                errorBoundary: true
            },
            security: {
                sanitizeInput: true,
                maxMessageLength: 1000,
                allowHTML: false
            }
        });

        // Validar configuración de usuario
        const configErrors = SecurityUtils.validateConfig(userConfig);
        if (configErrors.length > 0) {
            console.warn('Configuration validation errors:', configErrors);
        }

        // Merger configuración de forma segura
        this.config = this.mergeConfig(this.defaultConfig, userConfig);
        
        // Inicializar managers
        this.performanceManager = new PerformanceManager();
        this.themeManager = new ThemeManager();
        this.queueManager = new QueueManager(this.config.notifications.maxVisible);
        
        // Estado interno
        this.activeNotifications = new Map();
        this.logHistory = [];
        this.container = null;
        this.isInitialized = false;
        this.errorBoundary = null;

        // Niveles de log con orden de prioridad
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            SUCCESS: 4
        };

        // Colores para console (migrados a themeManager)
        this.consoleColors = {
            DEBUG: '#6c757d',
            INFO: '#1fb5d4', 
            WARN: '#ffc107',
            ERROR: '#dc3545',
            SUCCESS: '#28a745'
        };

        // Cleanup automático cada 5 minutos
        this.cleanupInterval = setInterval(() => {
            this.performanceManager.cleanup(this.activeNotifications);
        }, 5 * 60 * 1000);

        this.init();
    }

    /**
     * 🔧 Merger seguro de configuraciones
     */
    mergeConfig(defaultConfig, userConfig) {
        const merged = JSON.parse(JSON.stringify(defaultConfig));
        
        Object.keys(userConfig).forEach(key => {
            if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                merged[key] = { ...merged[key], ...userConfig[key] };
            } else {
                merged[key] = userConfig[key];
            }
        });

        return SecurityUtils.deepFreeze(merged);
    }

    /**
     * 🚀 Inicialización con error boundary
     */
    init() {
        try {
            if (this.isInitialized) {
                console.warn('UnifiedNotificationSystem already initialized');
                return;
            }

            if (this.config.integration.errorBoundary) {
                this.setupErrorBoundary();
            }

            if (this.config.notifications.enabled) {
                this.createNotificationContainer();
                this.injectStyles();
            }

            if (this.config.integration.globalExpose) {
                this.exposeGlobalMethods();
            }

            if (this.config.integration.replaceNavigationManager) {
                this.integrateWithNavigationManager();
            }

            this.isInitialized = true;

            this.log('SUCCESS', 'Unified Notification System v2.0 initialized', {
                module: 'NotificationSystem',
                showNotification: false,
                data: { 
                    version: '2.0',
                    features: ['Security', 'Performance', 'Flexibility', 'Error Boundaries']
                }
            });

        } catch (error) {
            console.error('Failed to initialize UnifiedNotificationSystem:', error);
            this.handleError(error, 'Initialization failed');
        }
    }

    /**
     * 🛡️ Configurar error boundary
     */
    setupErrorBoundary() {
        this.errorBoundary = (error, context = 'Unknown') => {
            console.error(`[NotificationSystem Error Boundary] ${context}:`, error);
            
            // Log del error
            this.log('ERROR', `System error in ${context}`, {
                module: 'ErrorBoundary',
                showNotification: false,
                data: { error: error.message, stack: error.stack }
            });
            
            // Mostrar notificación de error al usuario (si es seguro)
            if (this.config.notifications.enabled && this.container) {
                this.showNotification(
                    'A system error occurred. Please refresh the page if issues persist.',
                    'ERROR',
                    { duration: 8000, persistent: false }
                );
            }
        };

        // Capturar errores no manejados
        window.addEventListener('error', (event) => {
            this.errorBoundary(event.error, 'Unhandled Error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.errorBoundary(event.reason, 'Unhandled Promise Rejection');
        });
    }

    /**
     * 📦 Crear contenedor con validación mejorada
     */
    createNotificationContainer() {
        if (this.container) return;

        try {
            this.container = document.createElement('div');
            this.container.id = 'unified-notifications-container';
            this.container.className = `notifications-container notifications-${this.config.notifications.position}`;
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-label', 'Notifications');
            this.container.setAttribute('aria-live', 'polite');
            
            document.body.appendChild(this.container);

        } catch (error) {
            this.handleError(error, 'Failed to create notification container');
        }
    }

    /**
     * 📝 Método principal de logging mejorado
     */
    log(level, message, data = {}) {
        try {
            level = level.toUpperCase();
            
            // Validar entrada
            if (!this.isValidLogLevel(level)) {
                console.warn(`Invalid log level: ${level}`);
                level = 'INFO';
            }

            if (typeof message !== 'string') {
                message = String(message);
            }

            // Sanitizar mensaje si está habilitado
            if (this.config.security.sanitizeInput) {
                message = SecurityUtils.sanitizeHTML(message);
                if (message.length > this.config.security.maxMessageLength) {
                    message = message.substring(0, this.config.security.maxMessageLength) + '...';
                }
            }

            // Verificar si el nivel está habilitado
            if (!this.isLevelEnabled(level)) return;

            // Extraer configuración segura de data
            const {
                module = 'System',
                showNotification = false,
                notificationMessage = null,
                notificationDuration = null,
                ...logData
            } = data;

            // Crear entrada de log
            const logEntry = {
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                level,
                message,
                module,
                data: logData
            };

            // Almacenar en historial (con límite)
            this.addToLogHistory(logEntry);

            // Console logging
            if (this.config.logging.enabled) {
                this.logToConsole(level, message, module, logData);
            }

            // Toast notification si está solicitado
            if (showNotification && this.config.notifications.enabled) {
                const notifMessage = notificationMessage || message;
                const options = {};
                if (notificationDuration) options.duration = notificationDuration;
                
                this.showNotification(notifMessage, level, options);
            }

            // Analytics/telemetría
            this.logToAnalytics(logEntry);

        } catch (error) {
            this.handleError(error, 'Log method failed');
        }
    }

    /**
     * 📚 Agregar al historial con límite
     */
    addToLogHistory(logEntry) {
        this.logHistory.push(logEntry);
        
        // Mantener límite de historial
        if (this.logHistory.length > this.config.logging.maxLogHistory) {
            this.logHistory.shift();
        }
    }

    /**
     * 🔍 Validar nivel de log
     */
    isValidLogLevel(level) {
        return Object.prototype.hasOwnProperty.call(this.logLevels, level);
    }

    /**
     * 🔢 Verificar si un nivel de log está habilitado
     */
    isLevelEnabled(level) {
        const currentLevelValue = this.logLevels[this.config.logging.level] || 0;
        const messageLevelValue = this.logLevels[level] || 0;
        return messageLevelValue >= currentLevelValue;
    }

    /**
     * 🔔 Mostrar notificación con validación robusta
     */
    async showNotification(message, type = 'INFO', options = {}) {
        try {
            if (!this.config.notifications.enabled || !this.container) return null;

            type = type.toUpperCase();
            
            // Validar tipo
            if (!this.isValidLogLevel(type)) {
                console.warn(`Invalid notification type: ${type}`);
                type = 'INFO';
            }

            // Sanitizar mensaje
            if (this.config.security.sanitizeInput) {
                message = SecurityUtils.sanitizeHTML(message);
                if (message.length > this.config.security.maxMessageLength) {
                    message = message.substring(0, this.config.security.maxMessageLength) + '...';
                }
            }
            
            const notification = {
                message,
                type,
                title: options.title || this.getDefaultTitle(type),
                duration: options.duration || this.config.notifications.defaultDuration,
                onClick: options.onClick || null,
                persistent: options.persistent || false,
                showProgress: options.showProgress !== false && this.config.notifications.showProgress
            };

            // Agregar a cola
            const id = this.queueManager.enqueue(notification);
            
            // Procesar cola
            await this.queueManager.processQueue(
                this.activeNotifications.size,
                (notif) => this.renderNotification(notif)
            );

            return id;

        } catch (error) {
            this.handleError(error, 'Show notification failed');
            return null;
        }
    }

    /**
     * 🎨 Renderizar notificación con medición de performance
     */
    async renderNotification(notification) {
        return this.performanceManager.measureRender(() => {
            if (!this.container) return;

            const colors = this.themeManager.getColors()[notification.type] || 
                          this.themeManager.getColors().INFO;
            
            const notificationElement = document.createElement('div');
            notificationElement.className = `unified-notification type-${notification.type.toLowerCase()}`;
            notificationElement.id = notification.id;
            notificationElement.setAttribute('role', 'alert');
            notificationElement.setAttribute('data-active', 'true');
            
            // Crear contenido de forma segura
            notificationElement.innerHTML = this.createNotificationHTML(notification, colors);

            // Event listeners con error handling
            this.attachNotificationListeners(notificationElement, notification);

            // Agregar al contenedor
            this.container.appendChild(notificationElement);
            this.activeNotifications.set(notification.id, notification);

            // Animación de entrada
            requestAnimationFrame(() => {
                notificationElement.classList.add('show');
            });

            // Auto-dismiss
            if (!notification.persistent && notification.duration > 0) {
                this.scheduleRemoval(notification.id, notification.duration);
            }

            // Progress bar
            if (notification.showProgress && !notification.persistent) {
                this.animateProgressBar(notification.id, notification.duration);
            }

            // Métricas
            this.performanceManager.metrics.notificationsCreated++;
        });
    }

    /**
     * 🏗️ Crear HTML de notificación de forma segura
     */
    createNotificationHTML(notification, colors) {
        const title = SecurityUtils.sanitizeHTML(notification.title);
        const message = SecurityUtils.sanitizeHTML(notification.message);
        
        return `
            <div class="notification-header">
                <i class="notification-icon ${colors.icon}" style="color: ${colors.bg};" aria-hidden="true"></i>
                <div class="notification-content">
                    <div class="notification-title" style="color: var(--text-primary);">
                        ${title}
                    </div>
                    <div class="notification-message">
                        ${message}
                    </div>
                </div>
                <button class="notification-close" aria-label="Close notification" type="button">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            ${notification.showProgress && !notification.persistent ? `
                <div class="notification-progress" style="background: ${colors.bg};" role="progressbar" aria-label="Time remaining"></div>
            ` : ''}
        `;
    }

    /**
     * 🎯 Adjuntar event listeners con error handling
     */
    attachNotificationListeners(element, notification) {
        try {
            const closeButton = element.querySelector('.notification-close');
            if (closeButton) {
                closeButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.removeNotification(notification.id);
                });
            }

            if (notification.onClick && typeof notification.onClick === 'function') {
                element.style.cursor = 'pointer';
                element.addEventListener('click', (e) => {
                    if (e.target === closeButton || closeButton.contains(e.target)) return;
                    try {
                        notification.onClick(notification);
                    } catch (error) {
                        this.handleError(error, 'Notification onClick handler failed');
                    }
                });
            }

            // Hover effects con error handling
            if (this.config.notifications.pauseOnHover && !notification.persistent) {
                element.addEventListener('mouseenter', () => {
                    try {
                        this.pauseNotificationTimer(notification.id);
                    } catch (error) {
                        this.handleError(error, 'Pause notification timer failed');
                    }
                });
                
                element.addEventListener('mouseleave', () => {
                    try {
                        this.resumeNotificationTimer(notification.id);
                    } catch (error) {
                        this.handleError(error, 'Resume notification timer failed');
                    }
                });
            }

        } catch (error) {
            this.handleError(error, 'Failed to attach notification listeners');
        }
    }

    /**
     * 🗑️ Remover notificación con cleanup
     */
    removeNotification(notificationId) {
        try {
            const notification = this.activeNotifications.get(notificationId);
            if (!notification) return;

            const element = document.getElementById(notificationId);
            if (element) {
                element.classList.add('hide');
                element.removeAttribute('data-active');
                
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }, 400);
            }

            // Limpiar timeout
            if (notification.timeout) {
                clearTimeout(notification.timeout);
            }

            this.activeNotifications.delete(notificationId);
            this.performanceManager.metrics.notificationsRemoved++;

            // Procesar cola después de un delay
            setTimeout(async () => {
                await this.queueManager.processQueue(
                    this.activeNotifications.size,
                    (notif) => this.renderNotification(notif)
                );
            }, 200);

        } catch (error) {
            this.handleError(error, 'Remove notification failed');
        }
    }

    /**
     * 🛠️ Manejo centralizado de errores
     */
    handleError(error, context = 'Unknown') {
        console.error(`[UnifiedNotificationSystem] ${context}:`, error);
        
        // Si tenemos error boundary, usarlo
        if (this.errorBoundary) {
            this.errorBoundary(error, context);
        }
    }

    /**
     * 🧹 Cleanup y destructor
     */
    destroy() {
        try {
            // Limpiar intervalos
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }

            // Remover todas las notificaciones
            this.clearAllNotifications();

            // Limpiar contenedor
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }

            // Limpiar referencias globales
            if (this.config.integration.globalExpose) {
                delete window.Logger;
                delete window.notify;
                delete window.NotificationSystem;
            }

            // Limpiar managers
            this.queueManager.clear();
            this.logHistory = [];
            this.activeNotifications.clear();

            this.isInitialized = false;

            console.log('UnifiedNotificationSystem destroyed');

        } catch (error) {
            console.error('Error during system destruction:', error);
        }
    }

    /**
     * 🌐 Exponer métodos globales mejorados
     */
    exposeGlobalMethods() {
        try {
            // Logger methods con error handling
            window.Logger = {
                debug: (message, data = {}) => this.safeLog('DEBUG', message, data),
                info: (message, data = {}) => this.safeLog('INFO', message, data),
                warn: (message, data = {}) => this.safeLog('WARN', message, data),
                error: (message, data = {}) => this.safeLog('ERROR', message, data),
                success: (message, data = {}) => this.safeLog('SUCCESS', message, data)
            };

            // Notification methods
            window.notify = (message, type = 'INFO', options = {}) => {
                return this.showNotification(message, type, options);
            };

            // Quick access methods
            window.notifySuccess = (message, options = {}) => this.showNotification(message, 'SUCCESS', options);
            window.notifyError = (message, options = {}) => this.showNotification(message, 'ERROR', options);
            window.notifyWarning = (message, options = {}) => this.showNotification(message, 'WARN', options);
            window.notifyInfo = (message, options = {}) => this.showNotification(message, 'INFO', options);

            // System access
            window.NotificationSystem = this;

        } catch (error) {
            this.handleError(error, 'Failed to expose global methods');
        }
    }

    /**
     * 🛡️ Log wrapper con error handling
     */
    safeLog(level, message, data) {
        try {
            return this.log(level, message, data);
        } catch (error) {
            console.error(`SafeLog failed for ${level}:`, error);
            // Fallback a console nativo
            console.log(`[${level}] ${message}`, data);
        }
    }

    /**
     * 📊 Obtener estadísticas completas
     */
    getStats() {
        return {
            system: {
                initialized: this.isInitialized,
                version: '2.0',
                uptime: Date.now() - (this.initTime || Date.now())
            },
            notifications: {
                active: this.activeNotifications.size,
                ...this.queueManager.getStats()
            },
            performance: this.performanceManager.getMetrics(),
            logging: {
                historySize: this.logHistory.length,
                maxHistory: this.config.logging.maxLogHistory,
                currentLevel: this.config.logging.level
            },
            memory: {
                activeNotifications: this.activeNotifications.size,
                logHistory: this.logHistory.length,
                estimatedUsage: this.estimateMemoryUsage()
            }
        };
    }

    /**
     * 💾 Estimar uso de memoria
     */
    estimateMemoryUsage() {
        const notificationSize = 200; // bytes promedio por notificación
        const logEntrySize = 150; // bytes promedio por entrada de log
        
        return {
            notifications: this.activeNotifications.size * notificationSize,
            logs: this.logHistory.length * logEntrySize,
            total: (this.activeNotifications.size * notificationSize) + (this.logHistory.length * logEntrySize)
        };
    }

    // ... [resto de métodos mantienen la misma funcionalidad pero con validación mejorada]
    
    /**
     * 🧪 Testing mejorado con error handling
     */
    testAllTypes() {
        if (!this.config.notifications.enabled) {
            this.log('WARN', 'Cannot test: Notifications are disabled', {
                module: 'TestSuite',
                showNotification: true
            });
            return;
        }

        const messages = [
            { type: 'DEBUG', message: 'Debug test - System diagnostics running', delay: 0 },
            { type: 'INFO', message: 'Information test - Data loaded successfully', delay: 1000 },
            { type: 'WARN', message: 'Warning test - Performance threshold exceeded', delay: 2000 },
            { type: 'ERROR', message: 'Error test - Connection failed (this is just a test)', delay: 3000 },
            { type: 'SUCCESS', message: 'Success test - All systems operational', delay: 4000 }
        ];

        this.log('INFO', 'Starting notification system tests', {
            module: 'TestSuite',
            showNotification: true,
            notificationMessage: 'Running system tests...'
        });

        messages.forEach(({ type, message, delay }) => {
            setTimeout(() => {
                try {
                    this.showNotification(message, type, {
                        title: `${type} Test`,
                        duration: 3000
                    });
                } catch (error) {
                    this.handleError(error, `Test notification failed for type: ${type}`);
                }
            }, delay);
        });

        // Test de limpieza después de las pruebas
        setTimeout(() => {
            this.log('SUCCESS', 'All notification tests completed', {
                module: 'TestSuite',
                showNotification: true,
                notificationMessage: 'Test suite completed successfully!'
            });
        }, 6000);
    }

    /**
     * 🔍 Métodos adicionales para debugging y administración
     */
    
    /**
     * Obtener historial de logs filtrado
     */
    getLogHistory(filter = {}) {
        let filtered = [...this.logHistory];

        if (filter.level) {
            filtered = filtered.filter(log => log.level === filter.level.toUpperCase());
        }

        if (filter.module) {
            filtered = filtered.filter(log => log.module === filter.module);
        }

        if (filter.since) {
            const since = new Date(filter.since);
            filtered = filtered.filter(log => new Date(log.timestamp) >= since);
        }

        if (filter.limit) {
            filtered = filtered.slice(-filter.limit);
        }

        return filtered;
    }

    /**
     * Exportar logs para debugging
     */
    exportLogs(format = 'json') {
        try {
            const data = {
                exportedAt: new Date().toISOString(),
                system: this.getStats().system,
                logs: this.logHistory
            };

            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            } else if (format === 'csv') {
                const headers = ['timestamp', 'level', 'module', 'message'];
                const rows = this.logHistory.map(log => [
                    log.timestamp,
                    log.level,
                    log.module,
                    log.message.replace(/"/g, '""') // Escape comillas
                ]);
                
                return [headers, ...rows]
                    .map(row => row.map(cell => `"${cell}"`).join(','))
                    .join('\n');
            }

            return data;

        } catch (error) {
            this.handleError(error, 'Export logs failed');
            return null;
        }
    }

    /**
     * Configuración dinámica segura
     */
    updateConfig(newConfig) {
        try {
            // Validar nueva configuración
            const errors = SecurityUtils.validateConfig(newConfig);
            if (errors.length > 0) {
                this.log('ERROR', 'Configuration update failed', {
                    module: 'ConfigManager',
                    showNotification: true,
                    notificationMessage: 'Invalid configuration provided',
                    data: { errors }
                });
                return false;
            }

            // Crear nueva configuración
            const updatedConfig = this.mergeConfig(this.config, newConfig);
            
            // Aplicar cambios
            this.config = updatedConfig;
            
            // Actualizar managers si es necesario
            if (newConfig.notifications?.maxVisible) {
                this.queueManager.maxVisible = newConfig.notifications.maxVisible;
            }

            if (newConfig.notifications?.theme) {
                this.themeManager.setTheme(newConfig.notifications.theme);
            }

            this.log('SUCCESS', 'Configuration updated successfully', {
                module: 'ConfigManager',
                showNotification: false,
                data: { updatedKeys: Object.keys(newConfig) }
            });

            return true;

        } catch (error) {
            this.handleError(error, 'Update configuration failed');
            return false;
        }
    }

    /**
     * Health check del sistema
     */
    healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {}
        };

        try {
            // Check inicialización
            health.checks.initialized = {
                status: this.isInitialized ? 'pass' : 'fail',
                message: this.isInitialized ? 'System initialized' : 'System not initialized'
            };

            // Check contenedor DOM
            health.checks.container = {
                status: this.container && document.contains(this.container) ? 'pass' : 'fail',
                message: this.container ? 'Container exists in DOM' : 'Container missing'
            };

            // Check memory usage
            const memoryUsage = this.estimateMemoryUsage();
            const memoryLimit = 10 * 1024 * 1024; // 10MB limit
            health.checks.memory = {
                status: memoryUsage.total < memoryLimit ? 'pass' : 'warn',
                message: `Memory usage: ${Math.round(memoryUsage.total / 1024)}KB`,
                details: memoryUsage
            };

            // Check performance
            const avgRender = this.performanceManager.getMetrics().averageRenderTime;
            health.checks.performance = {
                status: avgRender < 16 ? 'pass' : 'warn', // 16ms = 60fps
                message: `Average render time: ${avgRender}ms`
            };

            // Check queue health
            const queueStats = this.queueManager.getStats();
            health.checks.queue = {
                status: queueStats.queueLength < 50 ? 'pass' : 'warn',
                message: `Queue length: ${queueStats.queueLength}`,
                details: queueStats
            };

            // Determinar status general
            const failedChecks = Object.values(health.checks).filter(check => check.status === 'fail');
            const warnChecks = Object.values(health.checks).filter(check => check.status === 'warn');

            if (failedChecks.length > 0) {
                health.status = 'unhealthy';
            } else if (warnChecks.length > 0) {
                health.status = 'degraded';
            }

            return health;

        } catch (error) {
            this.handleError(error, 'Health check failed');
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Limpiar recursos y optimizar memoria
     */
    optimize() {
        try {
            let optimized = 0;

            // Limpiar log history si está muy grande
            if (this.logHistory.length > this.config.logging.maxLogHistory * 0.8) {
                const keepLogs = Math.floor(this.config.logging.maxLogHistory * 0.5);
                this.logHistory = this.logHistory.slice(-keepLogs);
                optimized++;
            }

            // Limpiar notificaciones huérfanas
            const orphaned = document.querySelectorAll('.unified-notification:not([data-active])');
            orphaned.forEach(el => el.remove());
            optimized += orphaned.length;

            // Limpiar render times
            if (this.performanceManager.renderTimes.length > 50) {
                this.performanceManager.renderTimes = this.performanceManager.renderTimes.slice(-25);
                optimized++;
            }

            this.log('INFO', `System optimization completed`, {
                module: 'Optimizer',
                showNotification: false,
                data: { itemsOptimized: optimized }
            });

            return optimized;

        } catch (error) {
            this.handleError(error, 'System optimization failed');
            return 0;
        }
    }

    /**
     * 🎨 Métodos para personalización de temas
     */
    registerCustomTheme(name, theme) {
        try {
            this.themeManager.registerTheme(name, theme);
            this.log('SUCCESS', `Custom theme '${name}' registered`, {
                module: 'ThemeManager',
                showNotification: false
            });
            return true;
        } catch (error) {
            this.handleError(error, `Failed to register theme: ${name}`);
            return false;
        }
    }

    setTheme(themeName) {
        try {
            this.themeManager.setTheme(themeName);
            this.log('INFO', `Theme changed to '${themeName}'`, {
                module: 'ThemeManager',
                showNotification: true,
                notificationMessage: `Theme updated to ${themeName}`
            });
            return true;
        } catch (error) {
            this.handleError(error, `Failed to set theme: ${themeName}`);
            return false;
        }
    }

    // Métodos heredados optimizados (mantienen funcionalidad original pero con validación)
    
    scheduleRemoval(notificationId, duration) {
        try {
            const timeout = setTimeout(() => {
                this.removeNotification(notificationId);
            }, duration);

            const notification = this.activeNotifications.get(notificationId);
            if (notification) {
                notification.timeout = timeout;
            }
        } catch (error) {
            this.handleError(error, 'Schedule removal failed');
        }
    }

    animateProgressBar(notificationId, duration) {
        try {
            const element = document.getElementById(notificationId);
            if (!element) return;

            const progressBar = element.querySelector('.notification-progress');
            if (!progressBar) return;

            progressBar.style.width = '100%';
            progressBar.style.transition = `width ${duration}ms linear`;
            
            requestAnimationFrame(() => {
                progressBar.style.width = '0%';
            });
        } catch (error) {
            this.handleError(error, 'Progress bar animation failed');
        }
    }

    pauseNotificationTimer(notificationId) {
        try {
            const notification = this.activeNotifications.get(notificationId);
            if (!notification || !notification.timeout) return;

            clearTimeout(notification.timeout);
            notification.pausedAt = Date.now();
            
            const element = document.getElementById(notificationId);
            const progressBar = element?.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.animationPlayState = 'paused';
            }
        } catch (error) {
            this.handleError(error, 'Pause notification timer failed');
        }
    }

    resumeNotificationTimer(notificationId) {
        try {
            const notification = this.activeNotifications.get(notificationId);
            if (!notification || !notification.pausedAt) return;

            const elapsed = notification.pausedAt - notification.createdAt;
            const remaining = Math.max(0, notification.duration - elapsed);
            
            if (remaining > 0) {
                this.scheduleRemoval(notificationId, remaining);
            } else {
                this.removeNotification(notificationId);
            }

            delete notification.pausedAt;
            
            const element = document.getElementById(notificationId);
            const progressBar = element?.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }
        } catch (error) {
            this.handleError(error, 'Resume notification timer failed');
        }
    }

    getDefaultTitle(type) {
        const titles = {
            DEBUG: 'Debug',
            INFO: 'Information', 
            WARN: 'Warning',
            ERROR: 'Error',
            SUCCESS: 'Success'
        };
        return titles[type] || 'Notification';
    }

    clearAllNotifications() {
        try {
            this.activeNotifications.forEach((notification) => {
                this.removeNotification(notification.id);
            });
            this.queueManager.clear();
            
            this.log('INFO', 'All notifications cleared', {
                module: 'NotificationManager',
                showNotification: false
            });
        } catch (error) {
            this.handleError(error, 'Clear all notifications failed');
        }
    }

    logToConsole(level, message, module, data) {
        try {
            const timestamp = this.config.logging.showTimestamp ? 
                new Date().toLocaleTimeString() : '';
            
            const moduleText = this.config.logging.showModule ? 
                `[${module}]` : '';
            
            const emoji = this.getLevelEmoji(level);
            const color = this.consoleColors[level];

            if (this.config.logging.colorConsole && color) {
                console.log(
                    `%c${emoji} ${timestamp} ${moduleText} ${message}`,
                    `color: ${color}; font-weight: bold;`,
                    Object.keys(data).length > 0 ? data : ''
                );
            } else {
                console.log(`${emoji} ${timestamp} ${moduleText} ${message}`, 
                    Object.keys(data).length > 0 ? data : '');
            }
        } catch (error) {
            // Fallback silencioso para evitar loops
            console.log(`[${level}] ${module}: ${message}`, data);
        }
    }

    logToAnalytics(logEntry) {
        // Placeholder mejorado para analytics
        try {
            if (logEntry.level === 'ERROR' && 
                window.location.hostname !== 'localhost' && 
                typeof window.gtag === 'function') {
                
                window.gtag('event', 'exception', {
                    description: `${logEntry.module}: ${logEntry.message}`,
                    fatal: false
                });
            }
        } catch (error) {
            // Silenciar errores de analytics
        }
    }

    getLevelEmoji(level) {
        const emojis = {
            DEBUG: '🐛',
            INFO: 'ℹ️', 
            WARN: '⚠️',
            ERROR: '❌',
            SUCCESS: '✅'
        };
        return emojis[level] || 'ℹ️';
    }

    integrateWithNavigationManager() {
        try {
            if (typeof window.NavigationManager === 'undefined') {
                window.NavigationManager = {};
            }

            const originalMethod = window.NavigationManager.showNotification;
            
            window.NavigationManager.showNotification = (message, type = 'info', options = {}) => {
                try {
                    const typeMap = {
                        'info': 'INFO',
                        'success': 'SUCCESS',
                        'error': 'ERROR', 
                        'warning': 'WARN',
                        'warn': 'WARN'
                    };

                    const mappedType = typeMap[type.toLowerCase()] || 'INFO';
                    return this.showNotification(message, mappedType, options);
                } catch (error) {
                    // Fallback al método original si existe
                    if (originalMethod && typeof originalMethod === 'function') {
                        return originalMethod.call(window.NavigationManager, message, type, options);
                    }
                    this.handleError(error, 'NavigationManager integration failed');
                }
            };

            this.log('INFO', 'NavigationManager integration completed', {
                module: 'Integration',
                showNotification: false
            });

        } catch (error) {
            this.handleError(error, 'NavigationManager integration failed');
        }
    }

    injectStyles() {
        if (document.getElementById('unified-notification-styles')) return;

        try {
            const style = document.createElement('style');
            style.id = 'unified-notification-styles';
            style.textContent = `
                /* 🎨 UNIFIED NOTIFICATION SYSTEM PREMIUM STYLES v2.0 */
                
                :root {
                    --notification-duration: 0.4s;
                    --notification-easing: cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                /* Container positioning */
                .notifications-container {
                    position: fixed;
                    z-index: 10000;
                    max-width: 420px;
                    pointer-events: none;
                    will-change: transform;
                }
                
                .notifications-container.notifications-top-right {
                    top: 20px;
                    right: 20px;
                }
                
                .notifications-container.notifications-top-left {
                    top: 20px;
                    left: 20px;
                }
                
                .notifications-container.notifications-bottom-right {
                    bottom: 20px;
                    right: 20px;
                }
                
                .notifications-container.notifications-bottom-left {
                    bottom: 20px;
                    left: 20px;
                }

                /* Individual notification styles */
                .unified-notification {
                    background: var(--bg-secondary, #ffffff);
                    border: 1px solid var(--border-secondary, #e1e5e9);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                    margin-bottom: 12px;
                    overflow: hidden;
                    pointer-events: auto;
                    transform: translateX(100%);
                    opacity: 0;
                    transition: all var(--notification-duration) var(--notification-easing);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    min-width: 320px;
                    max-width: 420px;
                    position: relative;
                    will-change: transform, opacity;
                }

                .unified-notification.show {
                    transform: translateX(0);
                    opacity: 1;
                }

                .unified-notification.hide {
                    transform: translateX(100%);
                    opacity: 0;
                    margin-bottom: 0;
                    max-height: 0;
                    transition: all 0.3s ease-out;
                }

                /* Notification header */
                .notification-header {
                    display: flex;
                    align-items: flex-start;
                    padding: 18px 22px 14px 22px;
                    gap: 14px;
                }

                .notification-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                    margin-top: 2px;
                }

                .notification-content {
                    flex: 1;
                    min-width: 0;
                }

                .notification-title {
                    font-weight: 600;
                    font-size: 14px;
                    margin: 0 0 6px 0;
                    line-height: 1.4;
                    color: var(--text-primary, #1a202c);
                }

                .notification-message {
                    font-size: 13px;
                    margin: 0;
                    line-height: 1.5;
                    color: var(--text-secondary, #4a5568);
                    word-wrap: break-word;
                    hyphens: auto;
                }

                .notification-close {
                    background: none;
                    border: none;
                    color: var(--text-tertiary, #718096);
                    cursor: pointer;
                    font-size: 14px;
                    padding: 6px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                    opacity: 0.7;
                    margin-top: -2px;
                }

                .notification-close:hover {
                    opacity: 1;
                    background: rgba(0, 0, 0, 0.05);
                    transform: scale(1.1);
                }

                .notification-close:focus {
                    outline: 2px solid var(--focus-color, #4299e1);
                    outline-offset: 2px;
                }

                /* Progress bar */
                .notification-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: currentColor;
                    opacity: 0.6;
                    transition: width linear;
                    will-change: width;
                }

                /* Type-specific styles */
                .unified-notification.type-success {
                    border-left: 4px solid #28a745;
                }

                .unified-notification.type-error {
                    border-left: 4px solid #dc3545;
                }

                .unified-notification.type-warning {
                    border-left: 4px solid #ffc107;
                }

                .unified-notification.type-info {
                    border-left: 4px solid #1fb5d4;
                }

                .unified-notification.type-debug {
                    border-left: 4px solid #6c757d;
                }

                /* Hover effects */
                .unified-notification:hover {
                    transform: translateX(-6px) scale(1.02);
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
                    transition: all 0.2s ease;
                }

                .unified-notification:hover .notification-progress {
                    animation-play-state: paused;
                }

                /* Stack effect for multiple notifications */
                .unified-notification:nth-child(n+2) {
                    margin-top: -6px;
                    transform: scale(0.98) translateX(100%);
                    z-index: -1;
                }

                .unified-notification:nth-child(n+2).show {
                    transform: scale(0.98) translateX(0);
                }

                .unified-notification:nth-child(n+3) {
                    transform: scale(0.96) translateX(100%);
                    z-index: -2;
                }

                .unified-notification:nth-child(n+3).show {
                    transform: scale(0.96) translateX(0);
                }

                .unified-notification:nth-child(n+4) {
                    opacity: 0.8;
                    transform: scale(0.94) translateX(100%);
                    z-index: -3;
                }

                .unified-notification:nth-child(n+4).show {
                    transform: scale(0.94) translateX(0);
                }

                /* Mobile responsive */
                @media (max-width: 768px) {
                    .notifications-container {
                        left: 12px !important;
                        right: 12px !important;
                        max-width: none;
                    }
                    
                    .unified-notification {
                        min-width: auto;
                        max-width: none;
                        margin-bottom: 8px;
                    }
                    
                    .notification-header {
                        padding: 14px 18px 10px 18px;
                        gap: 12px;
                    }
                    
                    .notification-title {
                        font-size: 13px;
                    }
                    
                    .notification-message {
                        font-size: 12px;
                    }

                    .unified-notification:hover {
                        transform: translateX(0) scale(1);
                    }
                }

                /* Dark theme compatibility */
                @media (prefers-color-scheme: dark) {
                    .unified-notification {
                        background: var(--bg-tertiary, #2d3748);
                        border-color: var(--border-primary, #4a5568);
                    }
                    
                    .notification-close:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                }

                /* High contrast mode */
                @media (prefers-contrast: high) {
                    .unified-notification {
                        border-width: 2px;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
                    }
                }

                /* Reduced motion */
                @media (prefers-reduced-motion: reduce) {
                    .unified-notification {
                        transition: opacity 0.2s ease;
                    }
                    
                    .unified-notification:hover {
                        transform: none;
                    }
                    
                    .notification-progress {
                        transition: none;
                    }
                }

                /* Focus management */
                .unified-notification:focus-within {
                    outline: 2px solid var(--focus-color, #4299e1);
                    outline-offset: 2px;
                }
            `;
            
            document.head.appendChild(style);

        } catch (error) {
            this.handleError(error, 'Failed to inject styles');
        }
    }
}

/**
 * 🚀 AUTO-INICIALIZACIÓN CON MEJORAS
 */
(function() {
    'use strict';
    
    let initializationAttempts = 0;
    const maxAttempts = 3;
    
    function initializeSystem() {
        try {
            if (window.NotificationSystem) {
                console.log('🔔 Unified Notification System already exists');
                return;
            }

            window.UnifiedNotificationSystem = new UnifiedNotificationSystem();
            
            // Debug info solo en desarrollo
            if (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.search.includes('debug=true')) {
                
                console.log('🔔 Unified Notification System v2.0 loaded successfully!');
                console.log('📖 Quick start:');
                console.log('  • Logger.success("Message", { showNotification: true })');
                console.log('  • notify("Hello", "SUCCESS")');
                console.log('  • NotificationSystem.testAllTypes()');
                console.log('  • NotificationSystem.getStats()');
                console.log('  • NotificationSystem.healthCheck()');
            }

        } catch (error) {
            initializationAttempts++;
            console.error(`Failed to initialize UnifiedNotificationSystem (attempt ${initializationAttempts}):`, error);
            
            if (initializationAttempts < maxAttempts) {
                setTimeout(initializeSystem, 1000 * initializationAttempts);
            } else {
                console.error('Max initialization attempts reached. System not loaded.');
            }
        }
    }

    // Múltiples puntos de inicialización para máxima compatibilidad
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSystem);
    } else {
        // DOM ya está listo
        setTimeout(initializeSystem, 0);
    }

    // Fallback adicional
    if (document.readyState === 'complete') {
        setTimeout(initializeSystem, 100);
    }
})();

/**
 * 📦 EXPORT PARA MÓDULOS
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedNotificationSystem;
}

if (typeof define === 'function' && define.amd) {
    define('UnifiedNotificationSystem', [], function() {
        return UnifiedNotificationSystem;
    });
}