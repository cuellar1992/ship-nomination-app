/**
 * 🚢 Dashboard Index - Inicialización del Dashboard Premium
 * Script principal que inicializa el dashboard cuando la página está lista
 */

// Variables globales para los managers
let dashboardManager = null;

/**
 * Inicializar el dashboard cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Initializing Premium Dashboard...');
        
        // Mostrar estado de carga
        showLoadingState();
        
        // Esperar a que Chart.js esté disponible
        await waitForChartJS();
        
        // Inicializar el dashboard manager
        dashboardManager = new DashboardManager();
        
        // Esperar a que se inicialice completamente
        await waitForDashboardReady();
        

        
        // Ocultar estado de carga
        hideLoadingState();
        
        // Actualizar KPIs con datos reales
        updateKPIs();
        
        console.log('✅ Premium Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing Premium Dashboard:', error);
        showErrorState('Error initializing dashboard', error.message);
    }
});

/**
 * Esperar a que Chart.js esté disponible
 */
function waitForChartJS() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 50; // 5 segundos máximo
        let attempts = 0;
        
        const checkChartJS = () => {
            attempts++;
            
            if (typeof Chart !== 'undefined') {
                console.log('✅ Chart.js loaded successfully');
                resolve();
                return;
            }
            
            if (attempts >= maxAttempts) {
                reject(new Error('Chart.js did not load in expected time'));
                return;
            }
            
            setTimeout(checkChartJS, 100);
        };
        
        checkChartJS();
    });
}



/**
 * Esperar a que el dashboard esté listo
 */
function waitForDashboardReady() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 100; // 10 segundos máximo
        let attempts = 0;
        
        const checkReady = () => {
            attempts++;
            
            if (dashboardManager && dashboardManager.isInitialized) {
                console.log('✅ Dashboard Manager listo');
                resolve();
                return;
            }
            
            if (attempts >= maxAttempts) {
                reject(new Error('Dashboard Manager did not initialize in expected time'));
                return;
            }
            
            setTimeout(checkReady, 100);
        };
        
        checkReady();
    });
}

/**
 * Mostrar estado de carga
 */
function showLoadingState() {
    const loadingElement = document.getElementById('dashboardLoading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}

/**
 * Ocultar estado de carga
 */
function hideLoadingState() {
    const loadingElement = document.getElementById('dashboardLoading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

/**
 * Mostrar estado de error
 */
function showErrorState(title, message) {
    hideLoadingState();
    
    const errorElement = document.getElementById('dashboardError');
    if (errorElement) {
        errorElement.querySelector('.error-message').textContent = title;
        errorElement.style.display = 'block';
    }
    
    console.error('❌ Dashboard Error:', title, message);
}

/**
 * Actualizar KPIs con datos reales
 * Esta función ahora delega al DashboardManager para evitar duplicación
 */
function updateKPIs() {
    try {
        if (!dashboardManager) {
            console.warn('⚠️ Dashboard Manager not available to update KPIs');
            return;
        }
        
        // Delegar la actualización al DashboardManager
        dashboardManager.updateKPIs();
        
    } catch (error) {
        console.error('❌ Error actualizando KPIs:', error);
    }
}

/**
 * Función global para refrescar el dashboard
 */
window.refreshDashboard = async function() {
    try {
        if (!dashboardManager) {
            console.warn('⚠️ Dashboard Manager not available');
            return;
        }
        
        console.log('🔄 Refreshing dashboard...');
        
        // Mostrar indicador de refresco
        const refreshButtons = document.querySelectorAll('.chart-action-btn');
        refreshButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-spinner fa-spin';
            }
        });
        
        // Refrescar datos y gráficos
        await dashboardManager.loadDashboardData();
        dashboardManager.refreshCharts();
        updateKPIs();
        
        // Restaurar iconos
        refreshButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-sync-alt';
            }
        });
        
        console.log('✅ Dashboard refreshed successfully');
        
    } catch (error) {
        console.error('❌ Error refrescando dashboard:', error);
        
        // Restaurar iconos en caso de error
        const refreshButtons = document.querySelectorAll('.chart-action-btn');
        refreshButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-sync-alt';
            }
        });
    }
};

/**
 * Función global para obtener estado del dashboard
 */
window.getDashboardStatus = function() {
    if (!dashboardManager) {
        return { error: 'Dashboard Manager not available' };
    }
    
    return dashboardManager.getStatus();
};

/**
 * Función global para obtener estado del scheduler
 */
window.getSchedulerStatus = function() {
    if (!schedulerManager) {
        return { error: 'Scheduler Manager not available' };
    }
    
    return schedulerManager.getStatus();
};

/**
 * Función global para controlar el scheduler
 */
window.controlScheduler = async function(action, jobName = null) {
    if (!schedulerManager) {
        return { error: 'Scheduler Manager not available' };
    }
    
    try {
        switch (action) {
            case 'start':
                await schedulerManager.startScheduler();
                break;
            case 'stop':
                await schedulerManager.stopScheduler();
                break;
            case 'restart':
                await schedulerManager.restartScheduler();
                break;
            case 'runJob':
                if (jobName) {
                    await schedulerManager.runJobManually(jobName);
                } else {
                    return { error: 'Job name required for runJob action' };
                }
                break;
            default:
                return { error: 'Invalid action. Use: start, stop, restart, or runJob' };
        }
        
        return { success: true, action };
    } catch (error) {
        return { error: error.message };
    }
};

/**
 * Función global para destruir el dashboard
 */
window.destroyDashboard = function() {
    if (dashboardManager) {
        dashboardManager.destroy();
        dashboardManager = null;
        console.log('✅ Dashboard destroyed successfully');
    }
    
    if (schedulerManager) {
        schedulerManager.destroy();
        schedulerManager = null;
        console.log('✅ Scheduler destroyed successfully');
    }
};

// Event listeners para mejor UX
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && dashboardManager) {
        // Page became visible, refresh data
        console.log('🔄 Page visible, refreshing dashboard...');
        setTimeout(() => {
            refreshDashboard();
        }, 1000);
    }
});

// Manejo de errores global
window.addEventListener('error', function(event) {
    console.error('❌ Error global detectado:', event.error);
    
    if (event.error && event.error.message && 
        event.error.message.includes('Chart')) {
        showErrorState('Chart Error', 'Problem with Chart.js');
    }
});

// Manejo de promesas rechazadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
    
    if (event.reason && event.reason.message && 
        event.reason.message.includes('fetch')) {
        showErrorState('Connection Error', 'Problem with system APIs');
    }
});

console.log('🚀 Dashboard Index loaded and ready to initialize');

