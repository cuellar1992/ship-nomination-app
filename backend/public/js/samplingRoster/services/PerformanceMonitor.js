/**
 * 📊 Performance Monitor for Sampling Roster System
 * Sistema centralizado de métricas y monitoreo de performance
 */

// Importar NotificationService para asegurar que Logger esté disponible
import "../../shared/NotificationService.js";

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      validationService: {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        averageValidationTime: 0,
        weeklyLimitValidations: 0,
        dayRestrictionValidations: 0,
        pobConflictValidations: 0,
        restValidationValidations: 0
      },
      cacheService: {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        cleanupOperations: 0
      },
      scheduleCalculator: {
        totalCalculations: 0,
        successfulCalculations: 0,
        failedCalculations: 0,
        averageCalculationTime: 0,
        turnsGenerated: 0,
        fallbackAssignments: 0
      },
      system: {
        uptime: Date.now(),
        lastActivity: Date.now(),
        errors: 0,
        warnings: 0,
        totalApiCalls: 0,
        successfulApiCalls: 0,
        failedApiCalls: 0,
        averageApiCallTime: 0
      }
    };

    this.performanceHistory = [];
    this.maxHistorySize = 100;
    this.reportingInterval = null;
    this.isMonitoring = false;

    this.startMonitoring();
  }

  /**
   * 🚀 Iniciar monitoreo automático
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.reportingInterval = setInterval(() => {
      this.generatePerformanceReport();
    }, 5 * 60 * 1000); // Cada 5 minutos

    if (window.Logger) {
      window.Logger.info("Performance monitoring started", {
        module: "PerformanceMonitor",
        data: {
          reportingInterval: "5 minutes",
          maxHistorySize: this.maxHistorySize
        },
        showNotification: false,
      });
    }
  }

  /**
   * 🛑 Detener monitoreo
   */
  stopMonitoring() {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    this.isMonitoring = false;

    if (window.Logger) {
      window.Logger.info("Performance monitoring stopped", {
        module: "PerformanceMonitor",
        showNotification: false,
      });
    }
  }

  /**
   * 📈 Registrar métrica de validación
   */
  recordValidation(service, operation, success, duration, details = {}) {
    try {
      this.metrics.validationService.totalValidations++;
      this.metrics.validationService[success ? 'successfulValidations' : 'failedValidations']++;
      
      // Actualizar tiempo promedio
      this.updateAverageTime('validationService', 'averageValidationTime', duration);

      // Registrar operaciones específicas
      if (operation === 'weeklyLimit') this.metrics.validationService.weeklyLimitValidations++;
      if (operation === 'dayRestriction') this.metrics.validationService.dayRestrictionValidations++;
      if (operation === 'pobConflict') this.metrics.validationService.pobConflictValidations++;
      if (operation === 'restValidation') this.metrics.validationService.restValidationValidations++;

      this.updateLastActivity();

      if (window.Logger && !success) {
        window.Logger.warn("Validation failed", {
          module: "PerformanceMonitor",
          data: {
            service,
            operation,
            duration,
            details
          },
          showNotification: false,
        });
      }
    } catch (error) {
      this.recordError('PerformanceMonitor', 'recordValidation', error);
    }
  }

  /**
   * 🗄️ Registrar métrica de cache
   */
  recordCacheOperation(operation, hit, duration, memoryUsage = 0) {
    try {
      this.metrics.cacheService.totalRequests++;
      this.metrics.cacheService[hit ? 'cacheHits' : 'cacheMisses']++;
      
      this.updateAverageTime('cacheService', 'averageResponseTime', duration);
      this.metrics.cacheService.memoryUsage = memoryUsage;

      if (operation === 'cleanup') {
        this.metrics.cacheService.cleanupOperations++;
      }

      this.updateLastActivity();
    } catch (error) {
      this.recordError('PerformanceMonitor', 'recordCacheOperation', error);
    }
  }

  /**
   * 🧮 Registrar métrica de cálculo de turnos
   */
  recordScheduleCalculation(success, duration, turnsGenerated = 0, fallbackUsed = false) {
    try {
      this.metrics.scheduleCalculator.totalCalculations++;
      this.metrics.scheduleCalculator[success ? 'successfulCalculations' : 'failedCalculations']++;
      
      this.updateAverageTime('scheduleCalculator', 'averageCalculationTime', duration);
      this.metrics.scheduleCalculator.turnsGenerated += turnsGenerated;

      if (fallbackUsed) {
        this.metrics.scheduleCalculator.fallbackAssignments++;
      }

      this.updateLastActivity();
    } catch (error) {
      this.recordError('PerformanceMonitor', 'recordScheduleCalculation', error);
    }
  }

  /**
   * ⚠️ Registrar error del sistema
   */
  recordError(module, operation, error) {
    this.metrics.system.errors++;
    this.updateLastActivity();

    if (window.Logger) {
      window.Logger.error("System error recorded", {
        module: "PerformanceMonitor",
        data: {
          errorModule: module,
          operation,
          errorMessage: error.message,
          totalErrors: this.metrics.system.errors
        },
        showNotification: false,
      });
    }
  }

  /**
   * ⚠️ Registrar warning del sistema
   */
  recordWarning(module, operation, message) {
    this.metrics.system.warnings++;
    this.updateLastActivity();

    if (window.Logger) {
      window.Logger.warn("System warning recorded", {
        module: "PerformanceMonitor",
        data: {
          warningModule: module,
          operation,
          message,
          totalWarnings: this.metrics.system.warnings
        },
        showNotification: false,
      });
    }
  }

  /**
   * 🌐 Registrar llamada a API
   */
  recordApiCall(operation, success, duration, details = {}) {
    try {
      // Incrementar contadores generales
      this.metrics.system.totalApiCalls = (this.metrics.system.totalApiCalls || 0) + 1;
      this.metrics.system.successfulApiCalls = (this.metrics.system.successfulApiCalls || 0) + (success ? 1 : 0);
      this.metrics.system.failedApiCalls = (this.metrics.system.failedApiCalls || 0) + (success ? 0 : 1);
      
      // Actualizar tiempo promedio de API
      this.updateAverageTime('system', 'averageApiCallTime', duration);

      this.updateLastActivity();

      if (window.Logger && !success) {
        window.Logger.warn("API call failed", {
          module: "PerformanceMonitor",
          data: {
            operation,
            duration,
            details
          },
          showNotification: false,
        });
      }
    } catch (error) {
      this.recordError('PerformanceMonitor', 'recordApiCall', error);
    }
  }

  /**
   * ⏱️ Actualizar tiempo promedio
   */
  updateAverageTime(service, metric, newTime) {
    const current = this.metrics[service][metric];
    const count = this.metrics[service].totalValidations || this.metrics[service].totalRequests || this.metrics[service].totalCalculations;
    
    if (count > 0) {
      this.metrics[service][metric] = (current * (count - 1) + newTime) / count;
    } else {
      this.metrics[service][metric] = newTime;
    }
  }

  /**
   * 🕐 Actualizar última actividad
   */
  updateLastActivity() {
    this.metrics.system.lastActivity = Date.now();
  }

  /**
   * 📊 Generar reporte de performance
   */
  generatePerformanceReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.metrics.system.uptime,
        metrics: this.getCurrentMetrics(),
        health: this.calculateHealthScore()
      };

      // Agregar al historial
      this.performanceHistory.push(report);
      if (this.performanceHistory.length > this.maxHistorySize) {
        this.performanceHistory.shift();
      }

      // Log del reporte
      if (window.Logger) {
        window.Logger.info("Performance report generated", {
          module: "PerformanceMonitor",
          data: {
            uptime: this.formatDuration(report.uptime),
            healthScore: report.health.score,
            status: report.health.status,
            totalValidations: report.metrics.validationService.totalValidations,
            cacheHitRate: report.metrics.cacheService.cacheHitRate,
            averageCalculationTime: report.metrics.scheduleCalculator.averageCalculationTime.toFixed(2) + 'ms'
          },
          showNotification: false,
        });
      }

      return report;
    } catch (error) {
      this.recordError('PerformanceMonitor', 'generatePerformanceReport', error);
      return null;
    }
  }

  /**
   * 📈 Obtener métricas actuales
   */
  getCurrentMetrics() {
    const validationService = { ...this.metrics.validationService };
    const cacheService = { ...this.metrics.cacheService };
    const scheduleCalculator = { ...this.metrics.scheduleCalculator };
    const system = { ...this.metrics.system };

    // Calcular tasas de éxito
    validationService.successRate = validationService.totalValidations > 0 
      ? (validationService.successfulValidations / validationService.totalValidations * 100).toFixed(2) + '%'
      : '0%';

    cacheService.cacheHitRate = cacheService.totalRequests > 0
      ? (cacheService.cacheHits / cacheService.totalRequests * 100).toFixed(2) + '%'
      : '0%';

    scheduleCalculator.successRate = scheduleCalculator.totalCalculations > 0
      ? (scheduleCalculator.successfulCalculations / scheduleCalculator.totalCalculations * 100).toFixed(2) + '%'
      : '0%';

    // Formatear memoria
    cacheService.memoryUsageMB = (cacheService.memoryUsage / 1024 / 1024).toFixed(2) + 'MB';

    // Calcular uptime
    system.uptimeFormatted = this.formatDuration(Date.now() - system.uptime);
    system.lastActivityFormatted = this.formatDuration(Date.now() - system.lastActivity);

    // Calcular tasa de éxito de API
    system.apiSuccessRate = system.totalApiCalls > 0 
      ? (system.successfulApiCalls / system.totalApiCalls * 100).toFixed(2) + '%'
      : '0%';

    return {
      validationService,
      cacheService,
      scheduleCalculator,
      system
    };
  }

  /**
   * 🏥 Calcular score de salud del sistema
   */
  calculateHealthScore() {
    let score = 100;
    const issues = [];

    // Validar tasa de éxito de validaciones
    const validationSuccessRate = this.metrics.validationService.totalValidations > 0
      ? this.metrics.validationService.successfulValidations / this.metrics.validationService.totalValidations
      : 1;

    if (validationSuccessRate < 0.9) {
      score -= 20;
      issues.push('Low validation success rate');
    }

    // Validar tasa de hit del cache
    const cacheHitRate = this.metrics.cacheService.totalRequests > 0
      ? this.metrics.cacheService.cacheHits / this.metrics.cacheService.totalRequests
      : 1;

    if (cacheHitRate < 0.7) {
      score -= 15;
      issues.push('Low cache hit rate');
    }

    // Validar tasa de éxito de cálculos
    const calculationSuccessRate = this.metrics.scheduleCalculator.totalCalculations > 0
      ? this.metrics.scheduleCalculator.successfulCalculations / this.metrics.scheduleCalculator.totalCalculations
      : 1;

    if (calculationSuccessRate < 0.8) {
      score -= 25;
      issues.push('Low calculation success rate');
    }

    // Validar errores del sistema
    if (this.metrics.system.errors > 10) {
      score -= 30;
      issues.push('High error count');
    }

    // Validar tiempo de respuesta
    if (this.metrics.validationService.averageValidationTime > 1000) {
      score -= 10;
      issues.push('Slow validation response');
    }

    if (this.metrics.cacheService.averageResponseTime > 500) {
      score -= 10;
      issues.push('Slow cache response');
    }

    // Determinar status
    let status = 'excellent';
    if (score < 90) status = 'good';
    if (score < 80) status = 'fair';
    if (score < 70) status = 'poor';
    if (score < 50) status = 'critical';

    return {
      score: Math.max(0, Math.min(100, score)),
      status,
      issues
    };
  }

  /**
   * ⏰ Formatear duración
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * 📊 Obtener historial de performance
   */
  getPerformanceHistory(limit = 10) {
    return this.performanceHistory.slice(-limit);
  }

  /**
   * 🔄 Resetear métricas
   */
  resetMetrics() {
    this.metrics = {
      validationService: {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        averageValidationTime: 0,
        weeklyLimitValidations: 0,
        dayRestrictionValidations: 0,
        pobConflictValidations: 0,
        restValidationValidations: 0
      },
      cacheService: {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        cleanupOperations: 0
      },
      scheduleCalculator: {
        totalCalculations: 0,
        successfulCalculations: 0,
        failedCalculations: 0,
        averageCalculationTime: 0,
        turnsGenerated: 0,
        fallbackAssignments: 0
      },
      system: {
        uptime: Date.now(),
        lastActivity: Date.now(),
        errors: 0,
        warnings: 0,
        totalApiCalls: 0,
        successfulApiCalls: 0,
        failedApiCalls: 0,
        averageApiCallTime: 0
      }
    };

    this.performanceHistory = [];

    if (window.Logger) {
      window.Logger.info("Performance metrics reset", {
        module: "PerformanceMonitor",
        showNotification: true,
        notificationMessage: "Performance metrics have been reset"
      });
    }
  }

  /**
   * 📤 Exportar métricas para análisis
   */
  exportMetrics(format = 'json') {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        currentMetrics: this.getCurrentMetrics(),
        performanceHistory: this.performanceHistory,
        health: this.calculateHealthScore()
      };

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(data);
      }

      return data;
    } catch (error) {
      this.recordError('PerformanceMonitor', 'exportMetrics', error);
      return null;
    }
  }

  /**
   * 📄 Convertir a CSV
   */
  convertToCSV(data) {
    const headers = ['timestamp', 'uptime', 'healthScore', 'validationSuccessRate', 'cacheHitRate', 'calculationSuccessRate'];
    const rows = this.performanceHistory.map(report => [
      report.timestamp,
      report.uptime,
      report.health.score,
      report.metrics.validationService.successRate,
      report.metrics.cacheService.cacheHitRate,
      report.metrics.scheduleCalculator.successRate
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * 🗑️ Destructor
   */
  destroy() {
    this.stopMonitoring();
    
    if (window.Logger) {
      window.Logger.info("PerformanceMonitor destroyed", {
        module: "PerformanceMonitor",
        showNotification: false,
      });
    }
  }
}

// Instancia global del monitor
let globalPerformanceMonitor = null;

/**
 * 🚀 Obtener instancia global del monitor
 */
export function getPerformanceMonitor() {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PerformanceMonitor();
  }
  return globalPerformanceMonitor;
}

/**
 * 📊 Helper para registrar métricas fácilmente
 */
export const PerformanceTracker = {
  validation: (operation, success, duration, details) => {
    getPerformanceMonitor().recordValidation('ValidationService', operation, success, duration, details);
  },
  
  cache: (operation, hit, duration, memoryUsage) => {
    getPerformanceMonitor().recordCacheOperation(operation, hit, duration, memoryUsage);
  },
  
  calculation: (success, duration, turnsGenerated, fallbackUsed) => {
    getPerformanceMonitor().recordScheduleCalculation(success, duration, turnsGenerated, fallbackUsed);
  },
  
  apiCall: (operation, success, duration, details) => {
    getPerformanceMonitor().recordApiCall(operation, success, duration, details);
  },
  
  error: (module, operation, error) => {
    getPerformanceMonitor().recordError(module, operation, error);
  },
  
  warning: (module, operation, message) => {
    getPerformanceMonitor().recordWarning(module, operation, message);
  }
};

export default PerformanceMonitor;
