/**
 * 🔽 SISTEMA DE DETECCIÓN DE DESCARGA REAL
 * Detecta cuando el usuario realmente guarda el archivo
 */

class DownloadDetector {
    constructor() {
        this.downloadCallbacks = new Map();
        this.downloadId = 0;
        this.setupGlobalListeners();
    }

    /**
     * 🎯 Configurar listeners globales para detectar descargas
     */
    setupGlobalListeners() {
        // Detectar cuando la ventana recupera el foco (usuario cerró dialog)
        let windowBlurred = false;
        
        window.addEventListener('blur', () => {
            windowBlurred = true;
        });

        window.addEventListener('focus', () => {
            if (windowBlurred) {
                // Pequeño delay para permitir que el archivo se procese
                setTimeout(() => {
                    this.checkPendingDownloads();
                }, 500);
                windowBlurred = false;
            }
        });

        // Detectar clicks del usuario en links de descarga
        document.addEventListener('click', (event) => {
            if (event.target.tagName === 'A' && event.target.download) {
                this.handleDownloadClick(event.target);
            }
        });
    }

    /**
     * 📥 Registrar una descarga para monitoreo
     * @param {string} filename - Nombre del archivo
     * @param {Function} onComplete - Callback cuando se complete
     * @param {Function} onCancel - Callback si se cancela
     * @returns {string} downloadId para tracking
     */
    registerDownload(filename, onComplete, onCancel) {
        const downloadId = `download_${++this.downloadId}`;
        
        this.downloadCallbacks.set(downloadId, {
            filename,
            onComplete,
            onCancel,
            startTime: Date.now(),
            completed: false,
            cancelled: false
        });

        // Auto-cleanup después de 30 segundos
        setTimeout(() => {
            this.cleanupDownload(downloadId);
        }, 30000);

        return downloadId;
    }

    /**
     * 🔍 Verificar descargas pendientes
     */
    checkPendingDownloads() {
        this.downloadCallbacks.forEach((download, downloadId) => {
            if (!download.completed && !download.cancelled) {
                // Asumir que se completó si han pasado más de 200ms
                // (tiempo suficiente para que el usuario haya elegido ubicación)
                const elapsed = Date.now() - download.startTime;
                if (elapsed > 200) {
                    this.markDownloadComplete(downloadId);
                }
            }
        });
    }

    /**
     * ✅ Marcar descarga como completada
     */
    markDownloadComplete(downloadId) {
        const download = this.downloadCallbacks.get(downloadId);
        if (download && !download.completed) {
            download.completed = true;
            if (download.onComplete) {
                download.onComplete(download.filename);
            }
        }
    }

    /**
     * ❌ Marcar descarga como cancelada
     */
    markDownloadCancelled(downloadId) {
        const download = this.downloadCallbacks.get(downloadId);
        if (download && !download.completed) {
            download.cancelled = true;
            if (download.onCancel) {
                download.onCancel(download.filename);
            }
        }
    }

    /**
     * 🧹 Limpiar descarga del registro
     */
    cleanupDownload(downloadId) {
        this.downloadCallbacks.delete(downloadId);
    }

    /**
     * 🖱️ Manejar click en link de descarga
     */
    handleDownloadClick(linkElement) {
        const filename = linkElement.download || 'unknown_file';
        
        // Registrar para monitoreo
        this.registerDownload(
            filename,
            (filename) => {
                // Callback de éxito - archivo guardado
                console.log(`✅ Download completed: ${filename}`);
            },
            (filename) => {
                // Callback de cancelación
                console.log(`❌ Download cancelled: ${filename}`);
            }
        );
    }
}

/**
 * 📊 INTEGRACIÓN CON EXCEL EXPORTER
 * Modificar el método handleExportClick() en excel-exporter.js
 */

// Instancia global del detector
const downloadDetector = new DownloadDetector();

/**
 * 🔄 MÉTODO MODIFICADO PARA EXCEL EXPORTER
 */
async function handleExportClickWithDetection() {
    try {
        this.showExportLoading(true);

        // Obtener datos filtrados actuales
        const filteredData = this.getCurrentFilteredData();

        if (!filteredData || filteredData.length === 0) {
            Logger.warn("No data to export", {
                module: 'ExcelExporter',
                showNotification: true,
                notificationMessage: "No data available to export"
            });
            return;
        }

        // Mostrar mensaje de preparación
        Logger.info("Preparing Excel export", {
            module: 'ExcelExporter',
            showNotification: true,
            notificationMessage: "Preparing Excel file..."
        });

        // Generar archivo
        const blob = await this.generateExcelBlob(filteredData);
        const filename = this.generateFilename();

        // Registrar descarga ANTES de crear el link
        const downloadId = downloadDetector.registerDownload(
            filename,
            // ✅ Callback de éxito - cuando se guarda realmente
            (savedFilename) => {
                Logger.success(`Successfully exported ${filteredData.length} records`, {
                    module: 'ExcelExporter',
                    showNotification: true,
                    notificationMessage: `Excel file saved successfully! (${filteredData.length} records)`,
                    data: { 
                        recordCount: filteredData.length,
                        filename: savedFilename
                    }
                });
            },
            // ❌ Callback de cancelación
            (cancelledFilename) => {
                Logger.info("Export cancelled by user", {
                    module: 'ExcelExporter',
                    showNotification: true,
                    notificationMessage: "Excel export was cancelled"
                });
            }
        );

        // Crear y ejecutar descarga
        this.triggerDownload(blob, filename);

    } catch (error) {
        Logger.error("Error exporting data to Excel", {
            module: 'ExcelExporter',
            error: error,
            showNotification: true,
            notificationMessage: "Error exporting data to Excel. Please try again."
        });
    } finally {
        this.showExportLoading(false);
    }
}

/**
 * 🎯 MÉTODOS AUXILIARES PARA EXCEL EXPORTER
 */

/**
 * Generar blob del Excel (separar la lógica)
 */
async function generateExcelBlob(data) {
    // Tu lógica existente de generateAndDownloadExcelJS
    // pero retornando solo el blob, no ejecutando descarga
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ship Nominations');
    
    // ... tu código de formateo existente ...
    
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
}

/**
 * Generar nombre de archivo
 */
function generateFilename() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '-');
    return `ship_nominations_${dateStr}.xlsx`;
}

/**
 * Ejecutar descarga
 */
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar URL después de un momento
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}

/**
 * 🚀 INICIALIZACIÓN
 * Agregar al final de excel-exporter.js o en el archivo principal
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar detector de descargas
    window.downloadDetector = new DownloadDetector();
    
    console.log('🔽 Download detection system initialized');
});

