/**
 * MultiSelect Component with Product Management - COMPACT VERSION
 * Complete modular multi-selection component for Premium System
 * Includes modal management and full functionality with compact sizing
 * FIXED: Placeholder colors standardized to var(--text-muted)
 */

class MultiSelect {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.selectedItems = [];
    this.allItems = options.items || [];
    this.filteredItems = [...this.allItems];
    this.isOpen = false;

    // Configuration options
    this.config = {
      placeholder: options.placeholder || "Select items...",
      searchPlaceholder: options.searchPlaceholder || "Search items...",
      selectAllText: options.selectAllText || "Select All",
      manageText: options.manageText || "🔧 Manage Items...",
      showSearch: options.showSearch !== false,
      showSelectAll: options.showSelectAll !== false,
      showManageOption: options.showManageOption !== false,
      maxHeight: options.maxHeight || "300px",
      allowEmpty: options.allowEmpty !== false,
      icon: options.icon || "fas fa-list",
      label: options.label || "Items",
      modalTitle: options.modalTitle || "Items Management",
      onSelectionChange: options.onSelectionChange || null,
      onManageClick: options.onManageClick || null,
      onItemAdd: options.onItemAdd || null,
      onItemEdit: options.onItemEdit || null,
      onItemRemove: options.onItemRemove || null,
    };

    this.init();
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(
        `MultiSelect: Container with id "${this.containerId}" not found`
      );
      return;
    }

    this.createHTML();
    this.createModal();
    this.setupEventListeners();
    this.renderOptions();
    this.injectStyles();
  }

  createHTML() {
    this.container.innerHTML = `
            <div style="position: relative;">
                <label class="multiselect-label" style="
                    color: var(--text-primary); 
                    font-weight: 600; 
                    margin-bottom: 0.5rem; 
                    font-size: 0.9rem; 
                    text-transform: uppercase; 
                    letter-spacing: 0.5px; 
                    display: block;
                ">
                    <i class="${
                      this.config.icon
                    } me-2" style="color: var(--accent-primary);"></i>${
      this.config.label
    }
                </label>
                
                <!-- Custom Multi-Select Container -->
                <div class="multiselect-container" id="${
                  this.containerId
                }_container" style="
                    position: relative;
                    background: var(--bg-primary); 
                    border: 2px solid var(--border-secondary); 
                    border-radius: 12px; 
                    min-height: 50px;
                    cursor: pointer;
                    transition: var(--transition-smooth);
                " tabindex="0">
                    
                    <!-- Selected Items Display -->
                    <div class="selected-items" id="${
                      this.containerId
                    }_display" style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                        padding: 0.5rem 2.5rem 0.5rem 1rem;
                        min-height: 50px;
                        align-items: center;
                    ">
                        <span class="placeholder-text" style="
                            color: var(--text-muted);
                            font-weight: 500;
                            display: block;
                            font-family: 'Inter', monospace;
                            letter-spacing: 0.5px;
                        ">${this.config.placeholder}</span>
                    </div>
                    
                    <!-- Dropdown Arrow -->
                    <i class="fas fa-chevron-down dropdown-arrow" style="
                        position: absolute; 
                        right: 1rem; 
                        top: 50%; 
                        transform: translateY(-50%); 
                        color: var(--accent-primary); 
                        pointer-events: none;
                        font-size: 1.1rem;
                        transition: var(--transition-fast);
                    "></i>
                    
                    <!-- Clear Button (shown when date is selected) -->
                    <button class="clear-datetime-btn" id="${
                      this.containerId
                    }_clear" style="
                        position: absolute;
                        right: 2.5rem;
                        top: 50%;
                        transform: translateY(-50%);
                        background: transparent;
                        border: none;
                        color: var(--text-muted);
                        cursor: pointer;
                        padding: 0.25rem;
                        border-radius: 4px;
                        font-size: 0.9rem;
                        opacity: 0;
                        visibility: hidden;
                        transition: var(--transition-fast);
                    " title="Clear selection">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <!-- Dropdown Menu -->
                    <div class="dropdown-menu-custom" id="${
                      this.containerId
                    }_menu" style="
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: var(--bg-secondary);
                        border: 2px solid var(--border-primary);
                        border-radius: 12px;
                        box-shadow: var(--shadow-xl);
                        z-index: 1000;
                        max-height: ${this.config.maxHeight};
                        overflow-y: auto;
                        display: none;
                        backdrop-filter: var(--glass-backdrop);
                    ">
                        ${
                          this.config.showSearch
                            ? `
                        <!-- Search Box -->
                        <div style="padding: 1rem; border-bottom: 1px solid var(--border-dark);">
                            <input type="text" 
                                   id="${this.containerId}_search" 
                                   placeholder="${this.config.searchPlaceholder}" 
                                   style="
                                       width: 100%;
                                       background: var(--bg-primary);
                                       border: 1px solid var(--border-secondary);
                                       color: var(--text-primary);
                                       padding: 0.5rem 0.75rem;
                                       border-radius: 8px;
                                       font-size: 0.9rem;
                                   ">
                        </div>
                        `
                            : ""
                        }
                        
                        ${
                          this.config.showSelectAll
                            ? `
                        <!-- Select All Option -->
                        <div class="dropdown-item select-all-item" id="${this.containerId}_selectAll" style="
                            padding: 0.75rem 1rem;
                            display: flex;
                            align-items: center;
                            gap: 0.75rem;
                            cursor: pointer;
                            transition: var(--transition-fast);
                            border-bottom: 1px solid var(--border-dark);
                            background: rgba(31, 181, 212, 0.05);
                        ">
                            <div class="custom-checkbox" id="${this.containerId}_selectAllCheckbox" style="
                                width: 18px;
                                height: 18px;
                                border: 2px solid var(--accent-primary);
                                border-radius: 4px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background: transparent;
                                transition: var(--transition-fast);
                            ">
                                <i class="fas fa-check" style="font-size: 12px; color: white; display: none;"></i>
                            </div>
                            <span style="
                                color: var(--accent-primary); 
                                font-weight: 600;
                                font-size: 0.9rem;
                            ">${this.config.selectAllText}</span>
                        </div>
                        `
                            : ""
                        }
                        
                        <!-- Items Options -->
                        <div class="items-options" id="${
                          this.containerId
                        }_options">
                            <!-- Options will be dynamically loaded here -->
                        </div>
                        
                        ${
                          this.config.showManageOption
                            ? `
                        <!-- Manage Items Option -->
                        <div class="dropdown-item manage-items-item" id="${this.containerId}_manage" style="
                            padding: 0.75rem 1rem;
                            display: flex;
                            align-items: center;
                            gap: 0.75rem;
                            cursor: pointer;
                            transition: var(--transition-fast);
                            border-top: 2px solid var(--border-primary);
                            background: rgba(251, 191, 36, 0.05);
                        ">
                            <i class="fas fa-cog" style="color: #fbbf24; font-size: 1rem;"></i>
                            <span style="
                                color: #fbbf24; 
                                font-weight: 600;
                                font-size: 0.9rem;
                            ">${this.config.manageText}</span>
                        </div>
                        `
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
  }

  createModal() {
    if (!this.config.showManageOption) return;

    const modalId = `${this.containerId}_modal`;
    const modalHTML = `
            <!-- COMPACT Management Modal -->
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" style="max-width: 480px;">
                    <div class="modal-content settings-modal">
                        <div class="modal-header settings-header" style="padding: 1rem 1.25rem;">
                            <h5 class="modal-title settings-title" id="${modalId}Label" style="font-size: 1rem;">
                                <i class="${this.config.icon} me-2"></i>${
      this.config.modalTitle
    }
                            </h5>
                            <button type="button" class="btn-close settings-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.8rem;"></button>
                        </div>
                        <div class="modal-body settings-body" style="padding: 1.25rem;">
                            <!-- Current Items Section - COMPACT -->
                            <div class="settings-section" style="margin-bottom: 1.25rem;">
                                <div class="settings-section-header">
                                    <h6 class="settings-section-title" style="font-size: 0.85rem; margin-bottom: 0.75rem;">
                                        <i class="fas fa-list me-2"></i>Current ${
                                          this.config.label
                                        }s
                                    </h6>
                                </div>
                                
                                <div class="items-list" id="${
                                  this.containerId
                                }_itemsList" style="max-height: 200px; overflow-y: auto;">
                                    <!-- Items will be dynamically loaded here -->
                                </div>
                            </div>

                            <!-- Add New Item Section - COMPACT -->
                            <div class="settings-section">
                                <div class="settings-section-header">
                                    <h6 class="settings-section-title" style="font-size: 0.85rem; margin-bottom: 0.75rem;">
                                        <i class="fas fa-plus me-2"></i>Add New ${
                                          this.config.label
                                        }
                                    </h6>
                                </div>
                                
                                <div style="display: flex; gap: 0.75rem; align-items: end;">
                                    <div style="flex: 1;">
                                        <input type="text" 
                                               class="form-control" 
                                               id="${
                                                 this.containerId
                                               }_newItemInput"
                                               placeholder="Enter new ${this.config.label.toLowerCase()}..."
                                               style="background: var(--bg-primary); 
                                                      border: 2px solid var(--border-secondary); 
                                                      color: var(--text-primary); 
                                                      padding: 0.6rem 0.75rem; 
                                                      border-radius: 8px; 
                                                      font-weight: 500;
                                                      font-size: 0.85rem;"
                                               onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 0.2rem rgba(31, 181, 212, 0.25)'" 
                                               onblur="this.style.borderColor='var(--border-secondary)'; this.style.boxShadow='none'">
                                    </div>
                                    <button class="btn btn-storage-select" id="${
                                      this.containerId
                                    }_addItemBtn" style="padding: 0.6rem 1rem; font-size: 0.85rem;">
                                        <i class="fas fa-plus me-1"></i>Add
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer settings-footer" style="padding: 0.75rem 1.25rem;">
                            <button type="button" class="btn btn-modal-close" data-bs-dismiss="modal" style="font-size: 0.85rem; padding: 0.5rem 1rem;">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  setupEventListeners() {
    const container = document.getElementById(`${this.containerId}_container`);
    const searchInput = document.getElementById(`${this.containerId}_search`);
    const selectAllItem = document.getElementById(
      `${this.containerId}_selectAll`
    );
    const manageItem = document.getElementById(`${this.containerId}_manage`);
    const addItemBtn = document.getElementById(
      `${this.containerId}_addItemBtn`
    );
    const newItemInput = document.getElementById(
      `${this.containerId}_newItemInput`
    );

    // Toggle dropdown
    container.addEventListener("click", (e) => {
      if (!e.target.closest(".selected-tag .remove-tag")) {
        this.toggleDropdown();
      }
    });

    // Focus/blur events
    container.addEventListener("focus", () => {
      container.style.borderColor = "var(--accent-primary)";
      container.style.boxShadow = "0 0 0 0.2rem rgba(31, 181, 212, 0.25)";
    });

    container.addEventListener("blur", () => {
      container.style.borderColor = "var(--border-secondary)";
      container.style.boxShadow = "none";
    });

    // Search functionality
    if (searchInput) {
      searchInput.addEventListener("click", (e) => e.stopPropagation());
      searchInput.addEventListener("input", (e) =>
        this.filterItems(e.target.value)
      );
    }

    // Select all functionality
    if (selectAllItem) {
      selectAllItem.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSelectAll();
      });
    }

    // Manage items functionality
    if (manageItem) {
      manageItem.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeDropdown();
        this.openManageModal();
      });
    }

    // Add item functionality
    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => this.addNewItem());
    }

    if (newItemInput) {
      newItemInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.addNewItem();
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (this.isOpen && e.key === "Escape") {
        this.closeDropdown();
      }
    });
  }

  renderOptions() {
    const container = document.getElementById(`${this.containerId}_options`);
    if (!container) return;

    container.innerHTML = "";

    this.filteredItems.forEach((item) => {
      const isSelected = this.selectedItems.includes(item);

      const itemElement = document.createElement("div");
      itemElement.className = `dropdown-item item-option ${
        isSelected ? "selected" : ""
      }`;
      itemElement.style.cssText = `
                padding: 0.75rem 1rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                cursor: pointer;
                transition: var(--transition-fast);
                ${isSelected ? "background: rgba(31, 181, 212, 0.15);" : ""}
            `;

      itemElement.innerHTML = `
                <div class="custom-checkbox ${
                  isSelected ? "checked" : ""
                }" style="
                    width: 18px;
                    height: 18px;
                    border: 2px solid var(--accent-primary);
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${
                      isSelected ? "var(--accent-primary)" : "transparent"
                    };
                    transition: var(--transition-fast);
                ">
                    <i class="fas fa-check" style="font-size: 12px; color: white; display: ${
                      isSelected ? "block" : "none"
                    };"></i>
                </div>
                <span style="color: var(--text-primary); font-weight: 500; font-size: 0.9rem;">${item}</span>
            `;

      itemElement.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleItem(item);
      });

      container.appendChild(itemElement);
    });

    if (this.config.showSelectAll) {
      this.updateSelectAllState();
    }
  }

  loadModalItems() {
    const container = document.getElementById(`${this.containerId}_itemsList`);
    if (!container) return;

    container.innerHTML = "";

    if (this.allItems.length === 0) {
      container.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                <i class="fas fa-inbox fa-2x mb-3"></i>
                <p style="margin: 0; font-size: 0.85rem;">No ${this.config.label.toLowerCase()}s available. Add some to get started!</p>
            </div>
        `;
      return;
    }

    this.allItems.forEach((item, index) => {
      const itemElement = document.createElement("div");
      itemElement.className = "storage-detail-item";
      itemElement.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.6rem 0.75rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-dark);
            border-radius: 6px;
            margin-bottom: 0.375rem;
            transition: var(--transition-smooth);
            font-size: 0.85rem;
            min-height: 45px;
        `;

      itemElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0;">
                <i class="${
                  this.config.icon
                }" style="color: var(--accent-primary); font-size: 0.8rem; flex-shrink: 0;"></i>
                <span style="
                    color: var(--text-primary); 
                    font-weight: 500;
                    flex: 1;
                    min-width: 0;
                    word-break: break-word;
                ">${item}</span>
                ${
                  this.selectedItems.includes(item)
                    ? '<span style="color: var(--accent-primary); font-size: 0.75rem; margin-left: 0.5rem; flex-shrink: 0;">(Selected)</span>'
                    : ""
                }
            </div>
            <div style="display: flex; gap: 0.375rem; flex-shrink: 0;">
                <button class="btn btn-secondary-premium btn-edit-item" data-index="${index}" title="Edit inline" style="
                    padding: 0.25rem 0.5rem;
                    font-size: 0.7rem;
                    border-radius: 4px;
                ">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline-danger btn-delete-item" data-index="${index}" title="Delete item" style="
                    padding: 0.25rem 0.5rem;
                    font-size: 0.7rem;
                    border-radius: 4px;
                ">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

      container.appendChild(itemElement);
    });

    this.setupModalEventDelegation();
  }

  setupModalEventDelegation() {
    const container = document.getElementById(`${this.containerId}_itemsList`);
    if (!container) return;

    // Remover listeners anteriores si existen
    container.removeEventListener("click", this.modalClickHandler);
    container.removeEventListener(
      "mouseenter",
      this.modalMouseEnterHandler,
      true
    );
    container.removeEventListener(
      "mouseleave",
      this.modalMouseLeaveHandler,
      true
    );

    // Crear handlers bound a esta instancia
    this.modalClickHandler = (e) => {
      const editBtn = e.target.closest(".btn-edit-item");
      const deleteBtn = e.target.closest(".btn-delete-item");

      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(editBtn.dataset.index);
        this.editItem(index);
      } else if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(deleteBtn.dataset.index);
        this.deleteItem(index);
      }
    };

    this.modalMouseEnterHandler = (e) => {
      if (e.target.classList.contains("btn-edit-item")) {
        e.target.style.background = "var(--accent-primary)";
        e.target.style.color = "white";
      } else if (e.target.classList.contains("btn-delete-item")) {
        e.target.style.background = "#dc3545";
        e.target.style.color = "white";
      }
    };

    this.modalMouseLeaveHandler = (e) => {
      if (e.target.classList.contains("btn-edit-item")) {
        e.target.style.background = "transparent";
        e.target.style.color = "var(--accent-primary)";
      } else if (e.target.classList.contains("btn-delete-item")) {
        e.target.style.background = "transparent";
        e.target.style.color = "#dc3545";
      }
    };

    // Agregar listeners usando event delegation
    container.addEventListener("click", this.modalClickHandler);
    container.addEventListener("mouseenter", this.modalMouseEnterHandler, true);
    container.addEventListener("mouseleave", this.modalMouseLeaveHandler, true);
  }

  openManageModal() {
    this.loadModalItems();
    const modalId = `${this.containerId}_modal`;
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
  }

  addNewItem() {
    const input = document.getElementById(`${this.containerId}_newItemInput`);
    const itemName = input.value.trim();

    if (!itemName) {
      this.showNotification(
        `Please enter a ${this.config.label.toLowerCase()} name`,
        "error"
      );
      return;
    }

    if (this.allItems.includes(itemName)) {
      this.showNotification(`${this.config.label} already exists`, "error");
      return;
    }

    this.allItems.push(itemName);
    this.filteredItems = [...this.allItems];
    this.loadModalItems();
    this.renderOptions();
    input.value = "";

    if (this.config.onItemAdd) {
      this.config.onItemAdd(itemName);
    }

    this.showNotification(
      `${this.config.label} added successfully!`,
      "success"
    );
  }

  editItem(index) {
    const currentName = this.allItems[index];
    const container = document.getElementById(`${this.containerId}_itemsList`);
    if (!container) return;

    // Buscar el elemento específico
    const itemElements = container.querySelectorAll(".storage-detail-item");
    const itemElement = itemElements[index];
    if (!itemElement) return;

    // Cambiar todo el contenido del elemento a modo edición
    itemElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
            <i class="${
              this.config.icon
            }" style="color: var(--accent-primary); font-size: 0.8rem;"></i>
            <input type="text" 
                   class="ship-form-input inline-edit-input-full" 
                   value="${currentName}"
                   style="flex: 1; font-size: 0.85rem;"
                   placeholder="Enter ${this.config.label.toLowerCase()} name...">
        </div>
        <div style="display: flex; gap: 0.375rem;">
            <button class="btn btn-primary-premium btn-save-edit" title="Save changes" style="
                padding: 0.3rem 0.6rem;
                font-size: 0.7rem;
                border-radius: 4px;
            ">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-outline-danger btn-cancel-edit" title="Cancel" style="
                padding: 0.3rem 0.6rem;
                font-size: 0.7rem;
                border-radius: 4px;
            ">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    const input = itemElement.querySelector(".inline-edit-input-full");
    const saveBtn = itemElement.querySelector(".btn-save-edit");
    const cancelBtn = itemElement.querySelector(".btn-cancel-edit");

    // Auto-focus y seleccionar texto
    input.focus();
    input.select();

    // Función para guardar cambios
    const saveChanges = () => {
      const newName = input.value.trim();

      if (!newName) {
        this.showNotification(
          `Please enter a valid ${this.config.label.toLowerCase()} name`,
          "error"
        );
        input.focus();
        return;
      }

      if (newName !== currentName && this.allItems.includes(newName)) {
        this.showNotification(
          `${this.config.label} name already exists`,
          "error"
        );
        input.focus();
        input.select();
        return;
      }

      if (newName !== currentName) {
        // *** LLAMAR AL CALLBACK onItemEdit ***
        if (this.config.onItemEdit) {
          Logger.debug(
            `MultiSelect calling onItemEdit: "${currentName}" → "${newName}"`,
            {
              module: "MultiSelect",
              data: { currentName: currentName, newName: newName },
              showNotification: false,
            }
          );
          this.config.onItemEdit(currentName, newName);
        } else {
          // Fallback: comportamiento anterior (solo para componentes sin API)
          this.allItems[index] = newName;
          this.filteredItems = [...this.allItems];

          // Update selected items if edited item was selected
          const selectedIndex = this.selectedItems.indexOf(currentName);
          if (selectedIndex > -1) {
            this.selectedItems[selectedIndex] = newName;
            this.updateDisplay();
          }

          if (this.config.onItemRemove) {
            this.config.onItemRemove(currentName);
          }
          if (this.config.onItemAdd) {
            this.config.onItemAdd(newName);
          }

          this.showNotification(
            `${this.config.label} updated successfully!`,
            "success"
          );
        }
      }

      // Recargar modal items
      this.loadModalItems();
      this.renderOptions();
    };

    // Función para cancelar edición
    const cancelEdit = () => {
      this.loadModalItems();
    };

    // Event listeners
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveChanges();
    });

    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit();
    });

    input.addEventListener("keydown", (e) => {
      e.stopPropagation(); // Evitar que cierre el modal

      if (e.key === "Enter") {
        e.preventDefault();
        saveChanges();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    });

    // Prevenir que el click en input cierre el modal
    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  deleteItem(index) {
    const itemName = this.allItems[index];

    // Usar modal profesional en lugar de confirm()
    DeleteConfirmationModal.show({
      itemName: itemName,
      itemType: this.config.label, // 'Product', 'Category', etc.
      componentName: `${this.config.label} Management`,
      onConfirm: () => {
        // Ejecutar eliminación
        this.allItems.splice(index, 1);
        this.filteredItems = [...this.allItems];
        this.removeItem(itemName);
        this.loadModalItems();
        this.renderOptions();

        if (this.config.onItemRemove) {
          this.config.onItemRemove(itemName);
        }

        this.showNotification(
          `${this.config.label} deleted successfully!`,
          "success"
        );
      },
      onCancel: () => {
        // Opcional: mostrar notificación de cancelación
        this.showNotification("Delete cancelled", "info");
      },
    });
  }

  toggleDropdown() {
    const container = document.getElementById(`${this.containerId}_container`);
    const dropdown = document.getElementById(`${this.containerId}_menu`);
    const searchInput = document.getElementById(`${this.containerId}_search`);

    if (this.isOpen) {
      this.closeDropdown();
    } else {
      dropdown.style.display = "block";
      container.classList.add("open");
      this.isOpen = true;

      // Focus on search input if available
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
    }
  }

  closeDropdown() {
    const dropdown = document.getElementById(`${this.containerId}_menu`);
    const container = document.getElementById(`${this.containerId}_container`);
    const searchInput = document.getElementById(`${this.containerId}_search`);

    if (dropdown && container) {
      dropdown.style.display = "none";
      container.classList.remove("open");
      this.isOpen = false;
    }

    // Clear search filter
    if (searchInput) {
      searchInput.value = "";
      this.filteredItems = [...this.allItems];
      this.renderOptions();
    }
  }

  toggleItem(item) {
    const index = this.selectedItems.indexOf(item);

    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(item);
    }

    this.updateDisplay();
    this.renderOptions();

    // Trigger callback
    if (this.config.onSelectionChange) {
      this.config.onSelectionChange(this.getSelectedItems());
    }
  }

  updateDisplay() {
    const container = document.getElementById(`${this.containerId}_display`);
    const placeholder = container.querySelector(".placeholder-text");

    // Clear existing tags
    const existingTags = container.querySelectorAll(".selected-tag");
    existingTags.forEach((tag) => tag.remove());

    if (this.selectedItems.length === 0) {
      placeholder.style.display = "block";
    } else {
      placeholder.style.display = "none";

      this.selectedItems.forEach((item) => {
        const tag = document.createElement("div");
        tag.className = "selected-tag";
        tag.style.cssText = `
                    background: var(--accent-gradient);
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    animation: slideIn 0.2s ease-out;
                `;

        tag.innerHTML = `
                    <span>${item}</span>
                    <i class="fas fa-times remove-tag" style="
                        cursor: pointer;
                        padding: 0.1rem;
                        border-radius: 3px;
                        transition: var(--transition-fast);
                    "></i>
                `;

        // Add remove functionality
        tag.querySelector(".remove-tag").addEventListener("click", (e) => {
          e.stopPropagation();
          this.removeItem(item);
        });

        tag
          .querySelector(".remove-tag")
          .addEventListener("mouseenter", function () {
            this.style.background = "rgba(255, 255, 255, 0.2)";
          });

        tag
          .querySelector(".remove-tag")
          .addEventListener("mouseleave", function () {
            this.style.background = "transparent";
          });

        container.appendChild(tag);
      });
    }
  }

  removeItem(item) {
    const index = this.selectedItems.indexOf(item);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
      this.updateDisplay();
      this.renderOptions();

      // Trigger callback
      if (this.config.onSelectionChange) {
        this.config.onSelectionChange(this.getSelectedItems());
      }
    }
  }

  toggleSelectAll() {
    const allVisible = this.filteredItems.every((item) =>
      this.selectedItems.includes(item)
    );

    if (allVisible) {
      // Deselect all visible items
      this.filteredItems.forEach((item) => {
        const index = this.selectedItems.indexOf(item);
        if (index > -1) {
          this.selectedItems.splice(index, 1);
        }
      });
    } else {
      // Select all visible items
      this.filteredItems.forEach((item) => {
        if (!this.selectedItems.includes(item)) {
          this.selectedItems.push(item);
        }
      });
    }

    this.updateDisplay();
    this.renderOptions();

    // Trigger callback
    if (this.config.onSelectionChange) {
      this.config.onSelectionChange(this.getSelectedItems());
    }
  }

  updateSelectAllState() {
    const checkbox = document.getElementById(
      `${this.containerId}_selectAllCheckbox`
    );
    if (!checkbox) return; // ← FIX: Verificar que existe

    const checkIcon = checkbox.querySelector("i");
    if (!checkIcon) return; // ← FIX: Verificar que existe

    const visibleSelected = this.filteredItems.filter((item) =>
      this.selectedItems.includes(item)
    ).length;

    const totalVisible = this.filteredItems.length;

    if (visibleSelected === 0) {
      // None selected
      checkbox.className = "custom-checkbox";
      checkbox.style.background = "transparent";
      checkIcon.style.display = "none";
    } else if (visibleSelected === totalVisible) {
      // All selected
      checkbox.className = "custom-checkbox checked";
      checkbox.style.background = "var(--accent-primary)";
      checkIcon.style.display = "block";
    } else {
      // Partially selected
      checkbox.className = "custom-checkbox indeterminate";
      checkbox.style.background = "rgba(31, 181, 212, 0.5)";
      checkbox.innerHTML =
        '<div style="width: 10px; height: 2px; background: white;"></div>';
    }
  }

  filterItems(searchTerm) {
    const term = searchTerm.toLowerCase().trim();

    if (term === "") {
      this.filteredItems = [...this.allItems];
    } else {
      this.filteredItems = this.allItems.filter((item) =>
        item.toLowerCase().includes(term)
      );
    }

    this.renderOptions();
  }

  injectStyles() {
    if (document.getElementById("multiselect-styles")) return;

    const style = document.createElement("style");
    style.id = "multiselect-styles";
    style.textContent = `
            .multiselect-container:focus {
                outline: none;
            }

            .multiselect-container.open .dropdown-arrow {
                transform: translateY(-50%) rotate(180deg);
            }

            .dropdown-menu-custom {
                scrollbar-width: thin;
                scrollbar-color: var(--accent-primary) var(--bg-tertiary);
            }

            .dropdown-menu-custom::-webkit-scrollbar {
                width: 8px;
            }

            .dropdown-menu-custom::-webkit-scrollbar-track {
                background: var(--bg-tertiary);
                border-radius: 4px;
            }

            .dropdown-menu-custom::-webkit-scrollbar-thumb {
                background: var(--accent-primary);
                border-radius: 4px;
            }

            .dropdown-menu-custom::-webkit-scrollbar-thumb:hover {
                background: var(--accent-hover);
            }

            .item-option:hover {
                background: rgba(31, 181, 212, 0.1) !important;
            }

            .select-all-item:hover {
                background: rgba(31, 181, 212, 0.1) !important;
            }

            .manage-items-item:hover {
                background: rgba(251, 191, 36, 0.1) !important;
            }

            /* Modal Scrollbar Styling - Same as dropdown */
            .items-list {
                scrollbar-width: thin;
                scrollbar-color: var(--accent-primary) var(--bg-tertiary);
            }

            .items-list::-webkit-scrollbar {
                width: 8px;
            }

            .items-list::-webkit-scrollbar-track {
                background: var(--bg-tertiary);
                border-radius: 4px;
            }

            .items-list::-webkit-scrollbar-thumb {
                background: var(--accent-primary);
                border-radius: 4px;
            }

            .items-list::-webkit-scrollbar-thumb:hover {
                background: var(--accent-hover);
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            /* Compact Modal Responsive Design */
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
                    padding: 0.5rem 1rem !important;
                }
                
                .storage-detail-item {
                    padding: 0.375rem 0.5rem !important;
                    font-size: 0.8rem !important;
                }
                
                .btn-edit-item, .btn-delete-item {
                    padding: 0.2rem 0.375rem !important;
                    font-size: 0.65rem !important;
                }
            }
        `;

    document.head.appendChild(style);
  }

  showNotification(message, type = "info") {
    // Mapear tipos del sistema viejo al nuevo
    const levelMap = {
      info: "info",
      success: "success",
      error: "error",
      warning: "warn",
      warn: "warn",
    };

    const level = levelMap[type.toLowerCase()] || "info";

    Logger[level](message, {
      module: "MultiSelect",
      showNotification: true,
      notificationMessage: message,
    });
  }

  // Public API Methods
  getSelectedItems() {
    return [...this.selectedItems];
  }

  setSelectedItems(items) {
    this.selectedItems = items.filter((item) => this.allItems.includes(item));
    this.updateDisplay();
    this.renderOptions();
  }

  addItem(item) {
    if (!this.allItems.includes(item)) {
      this.allItems.push(item);
      this.filteredItems = [...this.allItems];
      this.renderOptions();

      if (this.config.onItemAdd) {
        this.config.onItemAdd(item);
      }
    }
  }

  removeItemFromList(item) {
    const index = this.allItems.indexOf(item);
    if (index > -1) {
      this.allItems.splice(index, 1);
      this.removeItem(item);
      this.filteredItems = [...this.allItems];
      this.renderOptions();

      if (this.config.onItemRemove) {
        this.config.onItemRemove(item);
      }
    }
  }

  updateItems(items) {
    this.allItems = [...items];
    this.filteredItems = [...this.allItems];
    // Keep only selected items that still exist
    this.selectedItems = this.selectedItems.filter((item) =>
      this.allItems.includes(item)
    );
    this.updateDisplay();
    this.renderOptions();
  }

  clearSelection() {
    this.selectedItems = [];
    this.updateDisplay();

    // Solo renderizar si el contenedor existe y está visible
    const optionsContainer = document.getElementById(
      `${this.containerId}_options`
    );
    if (optionsContainer && this.isOpen) {
      this.renderOptions();
    }

    if (this.config.onSelectionChange) {
      this.config.onSelectionChange([]);
    }
  }

  destroy() {
    this.closeDropdown();

    // Remove modal event listeners
    const container = document.getElementById(`${this.containerId}_itemsList`);
    if (container && this.modalClickHandler) {
      container.removeEventListener("click", this.modalClickHandler);
      container.removeEventListener(
        "mouseenter",
        this.modalMouseEnterHandler,
        true
      );
      container.removeEventListener(
        "mouseleave",
        this.modalMouseLeaveHandler,
        true
      );
    }

    // Remove modal if it exists
    const modalId = `${this.containerId}_modal`;
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }

    if (this.container) {
      this.container.innerHTML = "";
    }

    // Clear references
    this.modalClickHandler = null;
    this.modalMouseEnterHandler = null;
    this.modalMouseLeaveHandler = null;
  }
}

// Utility class for easy integration
class MultiSelectUtils {
  // Setup datetime fields (moved from ship-nominations.html)
  static setupDateTimeField(displayId, hiddenId) {
    const displayInput = document.getElementById(displayId);
    const hiddenInput = document.getElementById(hiddenId);

    if (!displayInput || !hiddenInput) return;

    hiddenInput.addEventListener("change", function () {
      if (this.value) {
        const date = new Date(this.value);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");

          const formatted = `${day}-${month}-${year} ${hours}:${minutes}`;
          displayInput.value = formatted;
          displayInput.style.color = "var(--text-primary)";
        }
      }
    });

    hiddenInput.addEventListener("input", function () {
      if (!this.value) {
        displayInput.value = "";
        displayInput.style.color = "var(--text-secondary)";
      }
    });

    displayInput.getISOValue = function () {
      return hiddenInput.value;
    };
  }

  // Setup search functionality for tables
  static setupTableSearch(searchInputId, tableBodyId) {
    const searchInput = document.getElementById(searchInputId);
    const tableBody = document.getElementById(tableBodyId);

    if (searchInput && tableBody) {
      searchInput.addEventListener("input", function () {
        const searchTerm = this.value.toLowerCase();
        const rows = tableBody.querySelectorAll("tr");

        rows.forEach((row) => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(searchTerm) ? "" : "none";
        });
      });
    }
  }

  // Collect form data utility
  static collectFormData(formId, multiSelectInstances = {}) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const data = {};

    // Get regular form inputs
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (input.id) {
        if (input.type === "checkbox" || input.type === "radio") {
          data[input.id] = input.checked;
        } else {
          data[input.id] = input.value;
        }
      }
    });

    // Get multiselect data
    Object.keys(multiSelectInstances).forEach((key) => {
      const instance = multiSelectInstances[key];
      if (instance && typeof instance.getSelectedItems === "function") {
        data[key] = instance.getSelectedItems();
      }
    });

    // Get datetime display values if they have getISOValue method
    const datetimeDisplays = form.querySelectorAll(".datetime-display");
    datetimeDisplays.forEach((display) => {
      if (display.id && typeof display.getISOValue === "function") {
        data[display.id] = display.getISOValue();
      }
    });

    return data;
  }

  // Clear form utility
  static clearForm(formId, multiSelectInstances = {}) {
    const form = document.getElementById(formId);
    if (!form) return;

    // Clear regular inputs
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (
        input.type === "text" ||
        input.type === "datetime-local" ||
        input.type === "email" ||
        input.type === "tel"
      ) {
        input.value = "";
      } else if (input.tagName === "SELECT") {
        input.selectedIndex = 0;
      } else if (input.type === "checkbox" || input.type === "radio") {
        input.checked = false;
      }
    });

    // Clear multiselects
    Object.values(multiSelectInstances).forEach((instance) => {
      if (instance && typeof instance.clearSelection === "function") {
        instance.clearSelection();
      }
    });
  }

  // Validate form utility
  static validateForm(formData, rules = {}) {
    const errors = [];

    Object.keys(rules).forEach((field) => {
      const rule = rules[field];
      const value = formData[field];

      if (rule.required) {
        if (
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === "string" && !value.trim())
        ) {
          errors.push(rule.message || `${field} is required`);
        }
      }

      if (
        rule.minLength &&
        typeof value === "string" &&
        value.length < rule.minLength
      ) {
        errors.push(
          rule.message ||
            `${field} must be at least ${rule.minLength} characters`
        );
      }

      if (
        rule.maxLength &&
        typeof value === "string" &&
        value.length > rule.maxLength
      ) {
        errors.push(
          rule.message ||
            `${field} must be less than ${rule.maxLength} characters`
        );
      }

      if (rule.min && Array.isArray(value) && value.length < rule.min) {
        errors.push(
          rule.message || `${field} must have at least ${rule.min} items`
        );
      }
    });

    return errors;
  }

  // Edit vessel utility for tables
  static editVessel(button, multiSelectInstance, formId = "nominationForm") {
    const row = button.closest("tr");
    const vesselName = row.cells[0].textContent;

    // Populate form with vessel data for editing
    document.getElementById("vesselName").value = vesselName;
    if (row.cells[1])
      document.getElementById("clientRef").value = row.cells[1].textContent;
    if (row.cells[2])
      document.getElementById("clientName").value = row.cells[2].textContent;

    // Get product types from the row and set them in MultiSelect
    if (row.cells[3] && multiSelectInstance) {
      const productCell = row.cells[3];
      const productTags = productCell.querySelectorAll("span");
      const products = Array.from(productTags).map((tag) => tag.textContent);
      multiSelectInstance.setSelectedItems(products);
    }

    // Scroll to form
    const form = document.getElementById(formId);
    if (form) {
      form.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    Logger.info(`Editing vessel: ${vesselName}`, {
      module: "MultiSelect",
      showNotification: true,
      notificationMessage: `Editing vessel: ${vesselName}`,
    });
  }

  // Delete vessel utility for tables
  static deleteVessel(button) {
    const row = button.closest("tr");
    const vesselName = row.cells[0].textContent;

    if (confirm(`Are you sure you want to delete vessel "${vesselName}"?`)) {
      row.remove();

      Logger.success(`Vessel "${vesselName}" deleted successfully`, {
        module: "MultiSelect",
        showNotification: true,
        notificationMessage: `Vessel "${vesselName}" deleted successfully`,
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  window.MultiSelect = MultiSelect;
  window.MultiSelectUtils = MultiSelectUtils;
  // Asegurar que DeleteConfirmationModal esté disponible
  if (typeof DeleteConfirmationModal !== "undefined") {
    window.DeleteConfirmationModal = DeleteConfirmationModal;
  }
});
