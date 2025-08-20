/**
 * CRUD Operations Module - MIGRADO AL SISTEMA UNIFICADO
 */

import { Utils } from '../utils/Utils.js';

class CRUDOperations {
    constructor(tableManager, apiManager) {
        this.tableManager = tableManager;
        this.apiManager = apiManager;
        
        // Log de inicialización
        Logger.info("CRUD Operations module initialized", {
            module: 'CRUDOperations',
            showNotification: false
        });
    }

    /**
     * Ver detalles completos de una ship nomination
     * @param {string} nominationId - ID de la nomination
     */
    async viewNomination(nominationId) {
        Logger.info("View nomination requested", {
            module: 'CRUDOperations',
            nominationId: nominationId,
            showNotification: false
        });
        
        try {
            // Buscar la ship nomination en los datos cargados
            const nomination = this.tableManager.findNominationById(nominationId);
            
            if (!nomination) {
                Logger.error("Ship nomination not found", {
                    module: 'CRUDOperations',
                    nominationId: nominationId,
                    showNotification: true,
                    notificationMessage: 'Ship nomination not found. Please refresh the page and try again.'
                });
                return;
            }
            
            Logger.debug("Displaying nomination details", {
                module: 'CRUDOperations',
                vesselName: nomination.vesselName,
                amspecRef: nomination.amspecRef,
                showNotification: false
            });
            
            // Mostrar modal con detalles completos
            this.showNominationDetailsModal(nomination);
            
        } catch (error) {
            Logger.error("Error viewing ship nomination", {
                module: 'CRUDOperations',
                nominationId: nominationId,
                error: error,
                showNotification: true,
                notificationMessage: 'Error viewing ship nomination details. Please try again.'
            });
        }
    }

    /**
     * Editar una ship nomination - CON LOGGING MEJORADO
     * @param {string} nominationId - ID de la nomination
     */
    async editNomination(nominationId) {
        Logger.info("Edit nomination requested", {
            module: 'CRUDOperations',
            nominationId: nominationId,
            showNotification: false
        });
        
        try {
            // 1. Buscar la nomination en los datos locales
            const nomination = this.tableManager.findNominationById(nominationId);
            
            if (!nomination) {
                Logger.error("Ship nomination not found for editing", {
                    module: 'CRUDOperations',
                    nominationId: nominationId,
                    showNotification: true,
                    notificationMessage: 'Ship nomination not found. Please refresh the page and try again.'
                });
                return;
            }
            
            Logger.debug("Loading nomination for editing", {
                module: 'CRUDOperations',
                vesselName: nomination.vesselName,
                amspecRef: nomination.amspecRef,
                showNotification: false
            });
            
            // 2. Verificar que tenemos acceso al FormHandler
            if (!window.simpleShipForm || !window.simpleShipForm.getFormHandler()) {
                Logger.error("FormHandler not available", {
                    module: 'CRUDOperations',
                    showNotification: true,
                    notificationMessage: 'Form handler not available. Please refresh the page and try again.'
                });
                return;
            }
            
            const formHandler = window.simpleShipForm.getFormHandler();
            
            // 3. Cerrar modal actual si está abierto
            const currentModal = document.getElementById('viewNominationModal');
            if (currentModal) {
                const bootstrapModal = bootstrap.Modal.getInstance(currentModal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            }
            
            // 4. Scroll al formulario para mejor UX
            const formContainer = document.querySelector('.ship-form-container');
            if (formContainer) {
                formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // 5. Preparar datos para cargar en el formulario
            const formData = this.prepareDataForForm(nomination);
            
            Logger.debug("Form data prepared", {
                module: 'CRUDOperations',
                fields: Object.keys(formData).length,
                showNotification: false
            });
            
            // 6. Cambiar a modo edición
            this.setEditMode(nominationId, nomination.vesselName);
            
            // 7. Cargar datos en el formulario
            formHandler.loadFormData(formData);
            
            // 8. Mostrar notificación de éxito al usuario
            Logger.success("Edit mode activated", {
                module: 'CRUDOperations',
                vesselName: nomination.vesselName,
                amspecRef: nomination.amspecRef,
                showNotification: true,
                notificationMessage: `Editing: ${nomination.vesselName} (${nomination.amspecRef})`
            });
            
        } catch (error) {
            Logger.error("Error loading nomination for editing", {
                module: 'CRUDOperations',
                nominationId: nominationId,
                error: error,
                showNotification: true,
                notificationMessage: 'Error loading nomination for editing. Please try again.'
            });
        }
    }

    /**
     * Eliminar una ship nomination - CON FEEDBACK MEJORADO
     * @param {string} nominationId - ID de la nomination
     */
    async deleteNomination(nominationId) {
        Logger.info("Delete nomination requested", {
            module: 'CRUDOperations',
            nominationId: nominationId,
            showNotification: false
        });
        
        try {
            // Buscar la ship nomination para obtener información para la confirmación
            const nomination = this.tableManager.findNominationById(nominationId);
            const vesselName = nomination?.vesselName || 'Unknown Vessel';
            const amspecRef = nomination?.amspecRef || 'N/A';
            
            // Confirmación elegante - ya no usamos confirm()
            const confirmed = await this.showDeleteConfirmation(vesselName, amspecRef);
            
            if (!confirmed) {
                Logger.info("Delete operation cancelled by user", {
                    module: 'CRUDOperations',
                    vesselName: vesselName,
                    showNotification: false
                });
                return;
            }
            
            Logger.info("Proceeding with deletion", {
                module: 'CRUDOperations',
                vesselName: vesselName,
                amspecRef: amspecRef,
                showNotification: false
            });
            
            // Mostrar loading en el botón
            this.setDeleteButtonLoading(nominationId, true);
            
            // Llamada DELETE al backend
            const response = await fetch(`/api/shipnominations/${nominationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            Logger.debug("Delete API response received", {
                module: 'CRUDOperations',
                success: result.success,
                showNotification: false
            });
            
            if (result.success) {
                Logger.success("Ship nomination deleted successfully", {
                    module: 'CRUDOperations',
                    vesselName: vesselName,
                    amspecRef: amspecRef,
                    showNotification: true,
                    notificationMessage: `Ship nomination "${vesselName}" deleted successfully!`
                });
                
                // Recargar tabla automáticamente
                Logger.debug("Refreshing table after deletion", {
                    module: 'CRUDOperations',
                    showNotification: false
                });
                await this.tableManager.loadShipNominations();
                
            } else {
                Logger.error("Error deleting ship nomination", {
                    module: 'CRUDOperations',
                    vesselName: vesselName,
                    error: result.error,
                    showNotification: true,
                    notificationMessage: `Error: ${result.error || 'Failed to delete ship nomination'}`
                });
            }
            
        } catch (error) {
            Logger.error("Network error deleting ship nomination", {
                module: 'CRUDOperations',
                nominationId: nominationId,
                error: error,
                showNotification: true,
                notificationMessage: 'Network error. Please check your connection and try again.'
            });
        } finally {
            // Restaurar botón (por si la tabla no se recarga)
            this.setDeleteButtonLoading(nominationId, false);
        }
    }

    /**
     * Activar modo edición en la interfaz - CON LOGGING DETALLADO
     */
    setEditMode(nominationId, vesselName) {
        Logger.debug("Activating edit mode", {
            module: 'CRUDOperations',
            nominationId: nominationId,
            vesselName: vesselName,
            showNotification: false
        });

        // 1. Cambiar título del formulario
        const formTitle = document.querySelector('.ship-form-container h2, .ship-form-container .card-title');
        if (formTitle) {
            formTitle.innerHTML = `
                <i class="fas fa-edit me-2"></i>
                Edit Ship Nomination: ${vesselName}
            `;
            formTitle.classList.add('text-warning');
        }
        
        // 2. Transformar Save en Update
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            if (!submitBtn.dataset.originalContent) {
                submitBtn.dataset.originalContent = submitBtn.innerHTML;
                submitBtn.dataset.originalClass = submitBtn.className;
            }
            
            submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i>UPDATE';
            submitBtn.className = 'btn btn-secondary-premium ship-form-btn';
            
            Logger.debug("SAVE button transformed to UPDATE", {
                module: 'CRUDOperations',
                showNotification: false
            });
        }
        
        // 3. Transformar Clear en Cancel Edit
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            if (!clearBtn.dataset.originalContent) {
                clearBtn.dataset.originalContent = clearBtn.innerHTML;
                clearBtn.dataset.originalClass = clearBtn.className;
            }
            
            clearBtn.innerHTML = '<i class="fas fa-times"></i>Cancel Edit';
            clearBtn.className = 'btn btn-outline-danger ship-form-btn';
                          
            // Remover event listeners previos
            const newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
            
            // Nuevo evento: Cancel Edit
            newClearBtn.addEventListener('click', () => {
                Logger.debug("Cancel Edit clicked", {
                    module: 'CRUDOperations',
                    showNotification: false
                });
                this.cancelEdit();
            });
            
            Logger.debug("Clear button transformed to Cancel Edit", {
                module: 'CRUDOperations',
                showNotification: false
            });
        }
        
        // 4. Marcar formulario como en modo edición
        const form = document.getElementById('shipNominationForm');
        if (form) {
            form.dataset.editMode = 'true';
            form.dataset.editId = nominationId;
        }
        
        // 5. Mostrar indicador visual de modo edición
        this.showEditModeIndicator(vesselName);
        
        Logger.debug("Edit mode activated successfully", {
            module: 'CRUDOperations',
            showNotification: false
        });
    }

    /**
     * Cancelar modo edición y volver al modo crear - CON FEEDBACK
     */
    cancelEdit() {
        Logger.info("Canceling edit mode", {
            module: 'CRUDOperations',
            showNotification: false
        });
        
        // 1. Limpiar formulario
        if (window.simpleShipForm && window.simpleShipForm.getFormHandler()) {
            window.simpleShipForm.getFormHandler().clearForm();
        }
        
        // 2. Restaurar modo crear
        this.setCreateMode();
        
        // 3. Mostrar notificación al usuario
        Logger.info("Edit mode cancelled", {
            module: 'CRUDOperations',
            showNotification: true,
            notificationMessage: 'Edit cancelled'
        });
    }

    /**
     * Restaurar modo crear (normal) - CON LOGGING DETALLADO
     */
    setCreateMode() {
        Logger.debug("Restoring create mode", {
            module: 'CRUDOperations',
            showNotification: false
        });

        // 1. Restaurar título del formulario
        const formTitle = document.querySelector('.ship-form-container h2, .ship-form-container .card-title');
        if (formTitle) {
            formTitle.innerHTML = '<i class="fas fa-ship me-2"></i>Ship Nomination Form';
            formTitle.classList.remove('text-warning');
        }
        
        // 2. Restaurar Update a Save
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn && submitBtn.dataset.originalContent) {
            submitBtn.innerHTML = submitBtn.dataset.originalContent;
            submitBtn.className = submitBtn.dataset.originalClass;
            submitBtn.style.cssText = '';
            submitBtn.removeAttribute('style');
            
            delete submitBtn.dataset.originalContent;
            delete submitBtn.dataset.originalClass;
            
            Logger.debug("UPDATE button restored to SAVE", {
                module: 'CRUDOperations',
                showNotification: false
            });
        }
        
        // 3. Restaurar Cancel Edit a Clear
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn && clearBtn.dataset.originalContent) {
            clearBtn.innerHTML = clearBtn.dataset.originalContent;
            clearBtn.className = clearBtn.dataset.originalClass;
            clearBtn.style.cssText = '';
            clearBtn.removeAttribute('style');
            
            delete clearBtn.dataset.originalContent;
            delete clearBtn.dataset.originalClass;
            
            // Remover event listeners de Cancel Edit
            const newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
            
            // Restaurar funcionalidad original de Clear
            newClearBtn.addEventListener('click', () => {
                Logger.debug("Clear button clicked", {
                    module: 'CRUDOperations',
                    showNotification: false
                });
                if (window.simpleShipForm && window.simpleShipForm.getFormHandler()) {
                    window.simpleShipForm.getFormHandler().clearForm();
                }
            });
            
            Logger.debug("Cancel Edit button restored to Clear", {
                module: 'CRUDOperations',
                showNotification: false
            });
        }
        
        // 4. Remover banner de edición
        const editBanner = document.getElementById('editModeBanner');
        if (editBanner) {
            editBanner.remove();
        }
        
        // 5. Limpiar marcadores de modo edición
        const form = document.getElementById('shipNominationForm');
        if (form) {
            delete form.dataset.editMode;
            delete form.dataset.editId;
        }
        
        Logger.debug("Create mode restored successfully", {
            module: 'CRUDOperations',
            showNotification: false
        });
    }

    /**
     * Mostrar confirmación de eliminación elegante - MEJORADO SIN ALERT
     * @param {string} vesselName - Nombre del vessel
     * @param {string} amspecRef - Referencia AmSpec
     * @returns {Promise<boolean>} True si se confirma
     */
    async showDeleteConfirmation(vesselName, amspecRef) {
        return new Promise((resolve) => {
            Logger.debug("Showing delete confirmation modal", {
                module: 'CRUDOperations',
                vesselName: vesselName,
                amspecRef: amspecRef,
                showNotification: false
            });

            // Crear modal de confirmación personalizado
            const modalHtml = `
                <div class="modal fade" id="deleteConfirmModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content bg-dark text-light border-danger">
                            <div class="modal-header border-danger">
                                <h5 class="modal-title">
                                    <i class="fas fa-exclamation-triangle text-danger me-2"></i>
                                    Confirm Delete
                                </h5>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <i class="fas fa-ship text-danger" style="font-size: 3rem;"></i>
                                </div>
                                <p class="text-center mb-3">
                                    Are you sure you want to delete this ship nomination?
                                </p>
                                <div class="alert alert-danger">
                                    <strong>Vessel:</strong> ${vesselName}<br>
                                    <strong>AmSpec Ref:</strong> ${amspecRef}
                                </div>
                                <p class="text-warning small text-center">
                                    <i class="fas fa-warning me-1"></i>
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div class="modal-footer border-danger">
                                <button type="button" class="btn btn-secondary" id="cancelDeleteBtn">
                                    <i class="fas fa-times me-1"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                                    <i class="fas fa-trash me-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remover modal existente si hay uno
            const existingModal = document.getElementById('deleteConfirmModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Agregar modal al DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Configurar event listeners
            const modal = document.getElementById('deleteConfirmModal');
            const cancelBtn = document.getElementById('cancelDeleteBtn');
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            
            const bootstrapModal = new bootstrap.Modal(modal);
            
            // Cancelar
            cancelBtn.addEventListener('click', () => {
                Logger.debug("Delete confirmation cancelled", {
                    module: 'CRUDOperations',
                    showNotification: false
                });
                bootstrapModal.hide();
                resolve(false);
            });
            
            // Confirmar
            confirmBtn.addEventListener('click', () => {
                Logger.debug("Delete confirmation accepted", {
                    module: 'CRUDOperations',
                    showNotification: false
                });
                bootstrapModal.hide();
                resolve(true);
            });
            
            // Limpiar modal cuando se cierre
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
            });
            
            // Mostrar modal
            bootstrapModal.show();
        });
    }

    /**
     * Cambiar estado del botón delete durante carga - CON LOGGING
     * @param {string} nominationId - ID de la nomination
     * @param {boolean} isLoading - Si está cargando
     */
    setDeleteButtonLoading(nominationId, isLoading) {
        const row = document.querySelector(`tr[data-nomination-id="${nominationId}"]`);
        if (row) {
            const deleteBtn = row.querySelector('button[onclick*="deleteNomination"]');
            if (deleteBtn) {
                if (isLoading) {
                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    deleteBtn.classList.add('btn-secondary');
                    deleteBtn.classList.remove('btn-outline-danger');
                    
                    Logger.debug("Delete button set to loading state", {
                        module: 'CRUDOperations',
                        nominationId: nominationId,
                        showNotification: false
                    });
                } else {
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteBtn.classList.remove('btn-secondary');
                    deleteBtn.classList.add('btn-outline-danger');
                    
                    Logger.debug("Delete button restored from loading state", {
                        module: 'CRUDOperations',
                        nominationId: nominationId,
                        showNotification: false
                    });
                }
            }
        }
    }

    /**
     * Mostrar indicador visual de modo edición - CON LOGGING
     * @param {string} vesselName - Nombre del vessel
     */
    showEditModeIndicator(vesselName) {
        // Crear banner de modo edición si no existe
        let editBanner = document.getElementById('editModeBanner');
        
        if (!editBanner) {
            editBanner = document.createElement('div');
            editBanner.id = 'editModeBanner';
            editBanner.className = 'alert alert-warning d-flex align-items-center mb-3';
            editBanner.innerHTML = `
                <i class="fas fa-edit me-2"></i>
                <strong>Edit Mode:</strong>&nbsp;You are editing "${vesselName}"
                <button type="button" class="btn-close ms-auto" onclick="window.simpleShipForm.getCRUDOperations().cancelEdit()"></button>
            `;
            
            // Insertar al inicio del formulario
            const formContainer = document.querySelector('.ship-form-container .card-body');
            if (formContainer && formContainer.firstChild) {
                formContainer.insertBefore(editBanner, formContainer.firstChild);
            }
            
            Logger.debug("Edit mode banner created", {
                module: 'CRUDOperations',
                vesselName: vesselName,
                showNotification: false
            });
        } else {
            // Actualizar texto si ya existe
            editBanner.querySelector('strong').nextSibling.textContent = ` You are editing "${vesselName}"`;
            
            Logger.debug("Edit mode banner updated", {
                module: 'CRUDOperations',
                vesselName: vesselName,
                showNotification: false
            });
        }
    }

    /**
     * Preparar datos de la nomination para cargar en el formulario - CON LOGGING
     * @param {Object} nomination - Datos de la nomination
     * @returns {Object} Datos preparados para el formulario
     */
    prepareDataForForm(nomination) {
        Logger.debug("Preparing nomination data for form", {
            module: 'CRUDOperations',
            vesselName: nomination.vesselName,
            hasProductTypes: !!nomination.productTypes?.length,
            showNotification: false
        });

        const formData = {
            // Campos básicos
            vesselName: nomination.vesselName || '',
            amspecRef: nomination.amspecRef || '',
            clientRef: nomination.clientRef || '',
            notes: nomination.notes || '',
            
            // SingleSelects - mapear correctamente a los IDs de los campos del formulario            
            agent: nomination.agent?.name || '',
            terminal: nomination.terminal?.name || '',
            berth: nomination.berth?.name || '',
            surveyor: nomination.surveyor?.name || '',
            sampler: nomination.sampler?.name || '',
            chemist: nomination.chemist?.name || '',
            
            // MultiSelect - array de nombres
            clientName: nomination.clientName?.map(c => c.name) || [],
            productTypes: nomination.productTypes?.map(pt => pt.name) || [],
            
            // DateTimes - convertir a formato ISO si es necesario
            pilotOnBoard: nomination.pilotOnBoard,
            etb: nomination.etb,
            etc: nomination.etc,
            
            // Status
            status: nomination.status || 'pending'
        };

        Logger.debug("Form data prepared successfully", {
            module: 'CRUDOperations',
            fieldsCount: Object.keys(formData).length,
            productTypesCount: formData.productTypes.length,
            showNotification: false
        });

        return formData;
    }

    /**
     * Mostrar modal con detalles completos - MÉTODO EXISTENTE MEJORADO
     * @param {Object} nomination - Datos de la nomination
     */
    showNominationDetailsModal(nomination) {
    Logger.debug("Showing nomination details modal", {
        module: 'CRUDOperations',
        vesselName: nomination.vesselName,
        showNotification: false
    });

    const details = this.formatNominationDetails(nomination);
    
    // Generar secciones con el mismo estilo que SingleSelect
    const sectionsHtml = [
        {
            title: 'Vessel Information',
            icon: 'fas fa-ship',
            items: [
                { label: 'Vessel Name', value: details.vesselName, isHighlight: true },
                { label: 'Status', value: details.statusBadge, isHtml: true }
            ]
        },
        {
            title: 'Reference Numbers',
            icon: 'fas fa-barcode',
            items: [
                { label: 'AmSpec Reference', value: details.amspecRef }, // Removido isAccent
                { label: 'Client Reference', value: details.clientRef || '<span class="text-muted fst-italic">Not specified</span>', isHtml: true }
            ]
        },
        {
            title: 'Client & Products',
            icon: 'fas fa-building',
            items: [
                { label: 'Client', value: details.client, isAccent: true },
                { label: 'Product Types', value: details.productTypes, isHtml: true }
            ]
        },
        {
            title: 'Location & Schedule',
            icon: 'fas fa-map-marker-alt',
            items: [
                { label: 'Terminal', value: details.terminal }, // Removido isAccent
                { label: 'Berth', value: details.berth }, // Removido isAccent
                { label: 'Pilot on Board', value: details.pilotOnBoard },
                { label: 'ETB', value: details.etb },
                { label: 'ETC', value: details.etc }
            ]
        },
        {
            title: 'Personnel',
            icon: 'fas fa-users',
            items: [
                { label: 'Agent', value: details.agent },
                { label: 'Surveyor', value: details.surveyor },
                { label: 'Sampler', value: details.sampler },
                { label: 'Chemist', value: details.chemist }
            ]
        }
    ].map(section => this.generateUnifiedSection(section)).join('');

    // HTML del modal con estilo unificado
    const modalHtml = `
        <div class="modal fade" id="viewNominationModal" tabindex="-1" data-bs-backdrop="static" aria-labelledby="viewNominationLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 680px;">
                <div class="modal-content settings-modal">
                    <div class="modal-header settings-header" style="padding: 1rem 1.25rem;">
                        <h5 class="modal-title settings-title" id="viewNominationLabel" style="font-size: 1rem;">
                            <i class="fas fa-ship me-2"></i>Ship Nomination Details
                        </h5>
                        <button type="button" class="btn-close settings-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.8rem;"></button>
                    </div>
                    <div class="modal-body settings-body" style="padding: 1.25rem; max-height: 65vh; overflow-y: auto;">
                        ${sectionsHtml}
                        
                        <!-- Record Information Section -->
                        <div class="settings-section" style="margin-top: 1rem;">
                            <div class="settings-section-header" style="padding: 0.75rem 1rem;">
                                <h6 class="settings-section-title" style="font-size: 0.8rem;">
                                    <i class="fas fa-history me-2"></i>Record Information
                                </h6>
                            </div>
                            <div class="settings-section-content" style="padding: 1rem;">
                                <div class="row">
                                    <div class="col-6">
                                        <div class="unified-info-item-compact">
                                            <span class="unified-label-compact">Created:</span>
                                            <span class="unified-value-compact text-muted">${details.createdAt}</span>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="unified-info-item-compact">
                                            <span class="unified-label-compact">Updated:</span>
                                            <span class="unified-value-compact text-muted">${details.updatedAt}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer settings-footer" style="padding: 0.75rem 1.25rem;">
                        <button type="button" class="btn btn-secondary-premium ship-form-btn me-2" 
							onclick="window.simpleShipForm.editNomination('${nomination._id}')">
							<i class="fas fa-edit me-1"></i>Edit
						</button>
                        <button type="button" class="btn btn-outline-danger ship-form-btn" 
							data-bs-dismiss="modal">
								<i class="fas fa-times me-1"></i>Close
						</button>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
        /* Unified Modal Styles - COMPACT VERSION */
        .unified-info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: var(--transition-smooth);
        }
        
        .unified-info-item:last-child {
            border-bottom: none;
        }
        
        .unified-info-item:hover {
            background: rgba(31, 181, 212, 0.05);
            margin: 0 -0.5rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            border-radius: 6px;
        }
        
        .unified-label {
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 0.85rem;
            min-width: 100px;
            text-align: left;
        }
        
        .unified-value {
            color: var(--text-primary) !important;
            font-weight: 500;
            text-align: right;
            flex: 1;
            margin-left: 0.75rem;
            font-size: 0.9rem;
        }
        
        .unified-value.highlight {
            color: var(--accent-primary) !important;
            font-weight: 700 !important;
            font-size: 1rem;
        }
        
        .unified-value.accent {
            color: var(--accent-primary) !important;
            font-weight: 600 !important;
        }
        
        /* Force white color for dates and all standard values */
        .unified-value:not(.highlight):not(.accent) {
            color: var(--text-primary) !important;
        }
        
        /* Compact version for record info - WHITE TEXT */
        .unified-info-item-compact {
            margin-bottom: 0.5rem;
        }
        
        .unified-label-compact {
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            display: block;
            margin-bottom: 0.25rem;
        }
        
        .unified-value-compact {
            color: var(--text-primary) !important;
            font-weight: 500;
            font-size: 0.85rem;
            display: block;
        }
        
        /* Settings Section Styling - COMPACT */
        .settings-section {
            background: var(--bg-secondary);
            border: 1px solid var(--border-dark);
            border-radius: 10px;
            margin-bottom: 1rem;
            overflow: hidden;
            transition: var(--transition-smooth);
        }
        
        .settings-section:hover {
            border-color: var(--border-secondary);
            box-shadow: 0 2px 8px rgba(31, 181, 212, 0.1);
        }
        
        .settings-section-header {
            background: rgba(31, 181, 212, 0.05);
            border-bottom: 1px solid var(--border-dark);
            padding: 0.75rem 1rem;
        }
        
        .settings-section-title {
            color: var(--accent-primary);
            font-weight: 600;
            margin: 0;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .settings-section-content {
            padding: 1rem;
        }
        
        /* Modal Scrollbar - Same as SingleSelect */
        .modal-body::-webkit-scrollbar {
            width: 8px;
        }
        
        .modal-body::-webkit-scrollbar-track {
            background: var(--bg-tertiary);
            border-radius: 4px;
        }
        
        .modal-body::-webkit-scrollbar-thumb {
            background: var(--accent-primary);
            border-radius: 4px;
        }
        
        .modal-body::-webkit-scrollbar-thumb:hover {
            background: var(--accent-hover);
        }
        
        /* Responsive Design - Match SingleSelect */
        @media (max-width: 768px) {
            .modal-dialog {
                max-width: 95% !important;
                margin: 0.5rem;
            }
            
            .modal-header {
                padding: 0.75rem 1rem !important;
            }
            
            .modal-body {
                padding: 1rem !important;
            }
            
            .modal-footer {
                padding: 0.75rem 1rem !important;
            }
            
            .unified-info-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25rem;
            }
            
            .unified-label {
                min-width: auto;
                font-size: 0.8rem;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            
            .unified-value {
                text-align: left;
                margin-left: 0;
                font-size: 0.95rem;
            }
        }
        </style>
    `;
    
    // Remover modal existente si hay uno
    const existingModal = document.getElementById('viewNominationModal');
    if (existingModal) existingModal.remove();
    
    // Agregar modal al DOM y mostrarlo
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('viewNominationModal');
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Limpiar modal cuando se cierre
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
    
    Logger.debug("Nomination details modal displayed", {
        module: 'CRUDOperations',
        showNotification: false
    });
}

    /**
     * Generar sección unificada con el estilo SingleSelect
     * @param {Object} section - Datos de la sección
     * @returns {string} HTML de la sección
     */
    generateUnifiedSection(section) {
        const itemsHtml = section.items.map(item => `
            <div class="unified-info-item">
                <span class="unified-label">${item.label}:</span>
                <span class="unified-value ${item.isHighlight ? 'highlight' : ''} ${item.isAccent ? 'accent' : ''}">
                    ${item.isHtml ? item.value : item.value}
                </span>
            </div>
        `).join('');
        
        return `
            <div class="settings-section">
                <div class="settings-section-header">
                    <h6 class="settings-section-title">
                        <i class="${section.icon} me-2"></i>${section.title}
                    </h6>
                </div>
                <div class="settings-section-content">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Formatear datos de nomination para mostrar en el modal - MÉTODO EXISTENTE
     * @param {Object} nomination - Datos de la nomination
     * @returns {Object} Datos formateados
     */
    formatNominationDetails(nomination) {
        // Implementación existente sin cambios
        return {
            vesselName: nomination.vesselName || 'N/A',
            amspecRef: nomination.amspecRef || 'N/A',
            clientRef: nomination.clientRef || 'Not specified',
            client: nomination.clientName?.map(c => c.name).join(', ') || 'N/A',
            agent: nomination.agent?.name || 'N/A',
            terminal: nomination.terminal?.name || 'N/A',
            berth: nomination.berth?.name || 'N/A',
            surveyor: nomination.surveyor?.name || 'N/A',
            sampler: nomination.sampler?.name || 'N/A',
            chemist: nomination.chemist?.name || 'N/A',
            productTypes: Utils.formatProductTypes(nomination.productTypes, 'modal'),
            statusBadge: Utils.createStatusBadge(nomination.status),
            pilotOnBoard: Utils.formatDate(nomination.pilotOnBoard, 'modal'),
            etb: Utils.formatDate(nomination.etb, 'modal'),
            etc: Utils.formatDate(nomination.etc, 'modal'),
            createdAt: Utils.formatDate(nomination.createdAt, 'modal'),
            updatedAt: Utils.formatDate(nomination.updatedAt, 'modal')
        };
    }

    /**
     * Encontrar nomination por ID (proxy al TableManager) - CON LOGGING
     * @param {string} nominationId - ID de la nomination
     * @returns {Object|null} Nomination encontrada
     */
    getNominationById(nominationId) {
        const nomination = this.tableManager.findNominationById(nominationId);
        
        Logger.debug("Nomination lookup by ID", {
            module: 'CRUDOperations',
            nominationId: nominationId,
            found: !!nomination,
            showNotification: false
        });
        
        return nomination;
    }

    /**
     * Refrescar datos después de operaciones CRUD - CON LOGGING
     */
    async refreshData() {
        Logger.info("Refreshing data after CRUD operation", {
            module: 'CRUDOperations',
            showNotification: false
        });
        
        try {
            await this.tableManager.loadShipNominations();
            
            Logger.success("Data refreshed successfully", {
                module: 'CRUDOperations',
                showNotification: false
            });
        } catch (error) {
            Logger.error("Error refreshing data", {
                module: 'CRUDOperations',
                error: error,
                showNotification: true,
                notificationMessage: 'Error refreshing data. Please refresh the page manually.'
            });
        }
    }
}

// Exportar para uso en otros módulos
export { CRUDOperations };