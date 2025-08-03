/**
 * SingleSelect Component Fixed with Overlay System and Scroll Handling - COMPACT MODAL VERSION
 * Simple dropdown with proper overlay positioning that follows scroll and compact modals
 */

/**
 * Clase utilitaria para mostrar modales de eliminación profesionales
 */
class DeleteConfirmationModal {
    
    static async show(options) {
        const {
            itemName,
            itemType = 'Item',
            componentName = 'Component',
            onConfirm,
            onCancel
        } = options;

        return new Promise((resolve) => {
            // HTML del modal adaptado para componentes
            const modalHtml = `
                <div class="modal fade" id="deleteItemConfirmModal" tabindex="-1" data-bs-backdrop="static" aria-labelledby="deleteItemModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered" style="max-width: 480px;">
                        <div class="modal-content settings-modal">
                            <div class="modal-header settings-header" style="padding: 1rem 1.25rem; border-bottom: 2px solid #dc3545;">
                                <h5 class="modal-title settings-title" id="deleteItemModalLabel" style="font-size: 1rem; color: #dc3545;">
                                    <i class="fas fa-exclamation-triangle me-2"></i>Confirm Delete
                                </h5>
                                <button type="button" class="btn-close settings-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.8rem;"></button>
                            </div>
                            <div class="modal-body settings-body" style="padding: 1.25rem; text-align: center;">
                                <div style="margin-bottom: 1rem;">
                                    <i class="fas fa-trash-alt" style="font-size: 3rem; color: #dc3545; opacity: 0.8;"></i>
                                </div>
                                
                                <p style="color: var(--text-primary); font-size: 1rem; margin-bottom: 1rem;">
                                    Are you sure you want to delete this ${itemType.toLowerCase()}?
                                </p>
                                
                                <div style="
                                    background: var(--bg-secondary);
                                    border: 2px solid #dc3545;
                                    border-radius: 8px;
                                    padding: 1rem;
                                    margin-bottom: 1rem;
                                ">
                                    <div style="display: flex; align-items: center; gap: 0.75rem; justify-content: center;">
                                        <i class="fas fa-tag" style="color: var(--accent-primary); font-size: 1.1rem;"></i>
                                        <div>
                                            <div style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; font-weight: 600;">
                                                ${itemType}
                                            </div>
                                            <div style="color: var(--text-primary); font-weight: 600; font-size: 1.1rem;">
                                                "${itemName}"
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="
                                    background: rgba(255, 193, 7, 0.1);
                                    border: 1px solid #ffc107;
                                    border-radius: 6px;
                                    padding: 0.75rem;
                                    margin-bottom: 0.5rem;
                                ">
                                    <p style="color: #ffc107; font-size: 0.85rem; margin: 0; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <span>This action cannot be undone</span>
                                    </p>
                                </div>
                                
                                <p style="color: var(--text-secondary); font-size: 0.8rem; margin: 0;">
                                    From: ${componentName}
                                </p>
                            </div>
                            <div class="modal-footer settings-footer" style="padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-secondary); gap: 0.75rem;">
                                <button type="button" class="btn btn-secondary-premium" id="cancelDeleteItemBtn" style="
                                    padding: 0.5rem 1rem;
                                    font-size: 0.85rem;
                                    min-width: 100px;
                                ">
                                    <i class="fas fa-times me-1"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-outline-danger" id="confirmDeleteItemBtn" style="
                                    padding: 0.5rem 1rem;
                                    font-size: 0.85rem;
                                    min-width: 100px;
                                ">
                                    <i class="fas fa-trash me-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const existingModal = document.getElementById('deleteItemConfirmModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modal = document.getElementById('deleteItemConfirmModal');
            const cancelBtn = document.getElementById('cancelDeleteItemBtn');
            const confirmBtn = document.getElementById('confirmDeleteItemBtn');
            
            const bootstrapModal = new bootstrap.Modal(modal);
            
            const cleanup = (confirmed) => {
                bootstrapModal.hide();
                
                if (confirmed && onConfirm) {
                    onConfirm();
                } else if (!confirmed && onCancel) {
                    onCancel();
                }
                
                resolve(confirmed);
            };
            
            cancelBtn.addEventListener('click', () => cleanup(false));
            confirmBtn.addEventListener('click', () => cleanup(true));
            
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
            });
            
            modal.querySelector('.btn-close').addEventListener('click', () => cleanup(false));
            
            bootstrapModal.show();
            
            setTimeout(() => {
                cancelBtn.focus();
            }, 300);
        });
    }
}

class SingleSelect {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.selectedItem = null;
    this.allItems = options.items || [];
    this.filteredItems = [...this.allItems];
    this.isOpen = false;
    this.overlayDropdown = null;
    this.scrollListeners = [];
    this.resizeListener = null;

    // Configuration options
    this.config = {
      placeholder: options.placeholder || "Select item...",
      searchPlaceholder: options.searchPlaceholder || "Search items...",
      manageText: options.manageText || "🔧 Edit Items...",
      showSearch: options.showSearch !== false,
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
      closeOnScroll: options.closeOnScroll !== false, // Default true
    };

    this.init();
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(
        `SingleSelect: Container with id "${this.containerId}" not found`
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
                <label class="singleselect-label" style="
                    color: var(--text-primary); 
                    font-weight: 600; 
                    margin-bottom: 0.5rem; 
                    font-size: 0.9rem; 
                    text-transform: uppercase; 
                    letter-spacing: 0.5px; 
                    display: block;
                ">
                    <i class="${this.config.icon} me-2" style="color: var(--accent-primary);"></i>${this.config.label}
                </label>
                
                <!-- Custom Single-Select Container -->
                <div class="singleselect-container" id="${this.containerId}_container" style="
                    position: relative;
                    background: var(--bg-primary); 
                    border: 2px solid var(--border-secondary); 
                    border-radius: 12px; 
                    min-height: 50px;
                    cursor: pointer;
                    transition: var(--transition-smooth);
                " tabindex="0">
                    
                    <!-- Selected Item Display -->
                    <div class="selected-item-display" id="${this.containerId}_display" style="
                        display: flex;
                        align-items: center;
                        padding: 0.875rem 2.5rem 0.875rem 1rem;
                        min-height: 50px;
                    ">
                        <span class="placeholder-text" style="
                            color: var(--text-muted);
                            font-weight: 500;
                            display: block;
                        ">${this.config.placeholder}</span>
                        <span class="selected-text" style="
                            color: var(--text-primary);
                            font-weight: 500;
                            display: none;
                        "></span>
                    </div>
                    
                    <!-- Dropdown Arrow -->
                    <i class="fas fa-chevron-down dropdown-arrow" style="
                        position: absolute; 
                        right: 1rem; 
                        top: 50%; 
                        transform: translateY(-50%); 
                        color: var(--accent-primary); 
                        pointer-events: none;
                        transition: transform 0.3s ease;
                    "></i>
                </div>
            </div>
        `;
  }

  createOverlayDropdown() {
    if (this.overlayDropdown) {
      this.removeOverlayDropdown();
    }

    // Create overlay dropdown that will be positioned absolutely on the page
    this.overlayDropdown = document.createElement("div");
    this.overlayDropdown.id = `${this.containerId}_overlay`;
    this.overlayDropdown.className = "singleselect-overlay-dropdown";

    this.overlayDropdown.innerHTML = `
            <div class="dropdown-menu-overlay" id="${
              this.containerId
            }_menu" style="
                background: var(--bg-secondary);
                border: 2px solid var(--border-primary);
                border-radius: 12px;
                box-shadow: var(--shadow-xl);
                max-height: ${this.config.maxHeight};
                overflow-y: auto;
                backdrop-filter: var(--glass-backdrop);
                animation: dropdownFadeIn 0.2s ease-out;
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
                               outline: none;
                           ">
                </div>
                `
                    : ""
                }
                
                <!-- Items Options -->
                <div class="items-options" id="${this.containerId}_options">
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
        `;

    // Style the overlay to be positioned absolutely
    this.overlayDropdown.style.cssText = `
            position: fixed;
            z-index: 999999;
            display: none;
            min-width: 200px;
            pointer-events: auto;
            transition: opacity 0.1s ease-out;
        `;

    document.body.appendChild(this.overlayDropdown);
  }

  removeOverlayDropdown() {
    if (this.overlayDropdown && this.overlayDropdown.parentNode) {
      this.overlayDropdown.parentNode.removeChild(this.overlayDropdown);
      this.overlayDropdown = null;
    }
  }

  positionOverlayDropdown() {
    if (!this.overlayDropdown) return;

    const container = document.getElementById(`${this.containerId}_container`);
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Check if container is still visible
    if (
      rect.bottom < 0 ||
      rect.top > viewportHeight ||
      rect.right < 0 ||
      rect.left > viewportWidth
    ) {
      if (this.config.closeOnScroll) {
        this.closeDropdown();
        return;
      }
    }

    // Calculate preferred position (below the container)
    let top = rect.bottom + 4;
    let left = rect.left;
    let width = rect.width;

    // Ensure minimum width
    if (width < 200) {
      width = 200;
    }

    // Adjust if dropdown would go outside viewport horizontally
    if (left + width > viewportWidth) {
      left = viewportWidth - width - 20;
    }
    if (left < 10) {
      left = 10;
      width = Math.min(width, viewportWidth - 20);
    }

    // Check if dropdown fits below the container
    const dropdownHeight = parseInt(this.config.maxHeight) || 300;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If not enough space below and more space above, show above
    if (
      spaceBelow < Math.min(dropdownHeight, 150) &&
      spaceAbove > spaceBelow &&
      spaceAbove > 100
    ) {
      top = rect.top - 4;
      this.overlayDropdown.style.transform = "translateY(-100%)";
    } else {
      this.overlayDropdown.style.transform = "translateY(0)";
    }

    // Apply positioning
    this.overlayDropdown.style.top = `${top}px`;
    this.overlayDropdown.style.left = `${left}px`;
    this.overlayDropdown.style.width = `${width}px`;
  }

  setupScrollListeners() {
    // Clear existing listeners
    this.removeScrollListeners();

    // Create throttled position update function
    const throttledPosition = this.throttle(() => {
      if (this.isOpen) {
        this.positionOverlayDropdown();
      }
    }, 16); // ~60fps

    // Listen to scroll on window and all scrollable parents
    const addScrollListener = (element) => {
      element.addEventListener("scroll", throttledPosition, { passive: true });
      this.scrollListeners.push({ element, listener: throttledPosition });
    };

    // Add listener to window
    addScrollListener(window);

    // Find and add listeners to all scrollable parent elements
    let parent = this.container.parentElement;
    while (parent && parent !== document.body) {
      const overflow = window.getComputedStyle(parent).overflow;
      if (
        overflow === "auto" ||
        overflow === "scroll" ||
        overflow === "hidden"
      ) {
        addScrollListener(parent);
      }
      parent = parent.parentElement;
    }

    // Setup resize listener
    this.resizeListener = this.throttle(() => {
      if (this.isOpen) {
        this.positionOverlayDropdown();
      }
    }, 100);

    window.addEventListener("resize", this.resizeListener);
  }

  removeScrollListeners() {
    this.scrollListeners.forEach(({ element, listener }) => {
      element.removeEventListener("scroll", listener);
    });
    this.scrollListeners = [];

    if (this.resizeListener) {
      window.removeEventListener("resize", this.resizeListener);
      this.resizeListener = null;
    }
  }

  // Throttle function to limit how often scroll handler runs
  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
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

    // Toggle dropdown
    container.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Focus/blur events
    container.addEventListener("focus", () => {
      container.style.borderColor = "var(--accent-primary)";
      container.style.boxShadow = "0 0 0 0.2rem rgba(31, 181, 212, 0.25)";
    });

    container.addEventListener("blur", () => {
      // Don't close immediately to allow clicking on dropdown items
      setTimeout(() => {
        if (!this.isOpen) {
          container.style.borderColor = "var(--border-secondary)";
          container.style.boxShadow = "none";
        }
      }, 100);
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !container.contains(e.target) &&
        (!this.overlayDropdown || !this.overlayDropdown.contains(e.target))
      ) {
        this.closeDropdown();
      }
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (this.isOpen && e.key === "Escape") {
        this.closeDropdown();
      }
    });

    // Setup modal event listeners
    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    const addItemBtn = document.getElementById(
      `${this.containerId}_addItemBtn`
    );
    const newItemInput = document.getElementById(
      `${this.containerId}_newItemInput`
    );

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
  }

  setupOverlayEventListeners() {
    if (!this.overlayDropdown) return;

    const searchInput = document.getElementById(`${this.containerId}_search`);
    const manageItem = document.getElementById(`${this.containerId}_manage`);

    // Search functionality
    if (searchInput) {
      searchInput.addEventListener("click", (e) => e.stopPropagation());
      searchInput.addEventListener("input", (e) =>
        this.filterItems(e.target.value)
      );
      // Auto-focus search when dropdown opens
      setTimeout(() => searchInput.focus(), 100);
    }

    // Manage items functionality
    if (manageItem) {
      manageItem.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeDropdown();
        this.openManageModal();
      });
    }

    // Prevent dropdown from closing when clicking inside
    this.overlayDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  renderOptions() {
    if (!this.overlayDropdown) return;

    const container = document.getElementById(`${this.containerId}_options`);
    if (!container) return;

    container.innerHTML = "";

    if (this.filteredItems.length === 0) {
      container.innerHTML = `
                <div style="
                    padding: 1rem; 
                    text-align: center; 
                    color: var(--text-muted);
                    font-size: 0.9rem;
                ">
                    No items found
                </div>
            `;
      return;
    }

    this.filteredItems.forEach((item) => {
      const isSelected = this.selectedItem === item;

      const itemElement = document.createElement("div");
      itemElement.className = `dropdown-item item-option ${
        isSelected ? "selected" : ""
      }`;
      itemElement.style.cssText = `
                padding: 0.75rem 1rem;
                cursor: pointer;
                transition: var(--transition-fast);
                color: var(--text-primary);
                font-weight: 500;
                font-size: 0.9rem;
                ${isSelected ? "background: rgba(31, 181, 212, 0.15);" : ""}
            `;

      itemElement.textContent = item;

      itemElement.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectItem(item);
      });

      itemElement.addEventListener("mouseenter", () => {
        if (!isSelected) {
          itemElement.style.background = "rgba(31, 181, 212, 0.1)";
        }
      });

      itemElement.addEventListener("mouseleave", () => {
        if (!isSelected) {
          itemElement.style.background = "transparent";
        }
      });

      container.appendChild(itemElement);
    });
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
                  this.selectedItem === item
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

    // Remove existing listeners
    if (this.modalClickHandler) {
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

    // Create bound handlers
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

    // Add event listeners
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
      Logger.info(
        `SingleSelect calling onItemEdit: "${currentName}" → "${newName}"`, {
        module: 'ShipForm',
        showNotification: false
      });
          this.config.onItemEdit(currentName, newName);
        } else {
          // Fallback: comportamiento anterior (solo para componentes sin API)
          this.allItems[index] = newName;
          this.filteredItems = [...this.allItems];

          if (this.selectedItem === currentName) {
            this.selectedItem = newName;
            this.updateDisplay();
          }

          this.showNotification(
            `${this.config.label} updated successfully!`,
            "success"
          );
        }
      }

      // Recargar modal items
      this.loadModalItems();
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
        itemType: this.config.label, // 'Client', 'Agent', etc.
        componentName: `${this.config.label} Management`,
        onConfirm: () => {
            // Ejecutar eliminación
            this.allItems.splice(index, 1);
            this.filteredItems = [...this.allItems];
            
            // Clear selection if deleted item was selected
            if (this.selectedItem === itemName) {
                this.selectedItem = null;
                this.updateDisplay();
            }
            
            this.loadModalItems();
            
            if (this.config.onItemRemove) {
                this.config.onItemRemove(itemName);
            }
            
            this.showNotification(`${this.config.label} deleted successfully!`, 'success');
        },
        onCancel: () => {
            // Opcional: mostrar notificación de cancelación
            this.showNotification('Delete cancelled', 'info');
        }
    });
}

  toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    const container = document.getElementById(`${this.containerId}_container`);

    this.createOverlayDropdown();
    this.renderOptions();
    this.setupOverlayEventListeners();
    this.setupScrollListeners();

    this.positionOverlayDropdown();

    this.overlayDropdown.style.display = "block";
    container.classList.add("open");
    this.isOpen = true;

    // Update arrow
    const arrow = container.querySelector(".dropdown-arrow");
    if (arrow) {
      arrow.style.transform = "translateY(-50%) rotate(180deg)";
    }
  }

  closeDropdown() {
    const container = document.getElementById(`${this.containerId}_container`);

    // Remove scroll listeners
    this.removeScrollListeners();

    if (this.overlayDropdown) {
      this.overlayDropdown.style.display = "none";
      this.removeOverlayDropdown();
    }

    if (container) {
      container.classList.remove("open");
      container.style.borderColor = "var(--border-secondary)";
      container.style.boxShadow = "none";

      // Reset arrow
      const arrow = container.querySelector(".dropdown-arrow");
      if (arrow) {
        arrow.style.transform = "translateY(-50%) rotate(0deg)";
      }
    }

    this.isOpen = false;
  }

  selectItem(item) {
    this.selectedItem = item;
    this.updateDisplay();
    this.closeDropdown();

    if (this.config.onSelectionChange) {
      this.config.onSelectionChange(this.selectedItem);
    }
  }

  updateDisplay() {
    const placeholderText = document
      .getElementById(`${this.containerId}_display`)
      .querySelector(".placeholder-text");
    const selectedText = document
      .getElementById(`${this.containerId}_display`)
      .querySelector(".selected-text");

    if (!this.selectedItem) {
      placeholderText.style.display = "block";
      selectedText.style.display = "none";
    } else {
      placeholderText.style.display = "none";
      selectedText.style.display = "block";
      selectedText.textContent = this.selectedItem;
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
        if (document.getElementById('singleselect-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'singleselect-styles';
        style.textContent = `
            .singleselect-container:focus {
                outline: none;
            }

            .singleselect-overlay-dropdown {
                position: fixed !important;
                z-index: 999999 !important;
                pointer-events: auto !important;
                will-change: transform, top, left;
            }

            .dropdown-menu-overlay {
                scrollbar-width: thin;
                scrollbar-color: var(--accent-primary) var(--bg-tertiary);
                will-change: transform;
            }

            .dropdown-menu-overlay::-webkit-scrollbar {
                width: 8px;
            }

            .dropdown-menu-overlay::-webkit-scrollbar-track {
                background: var(--bg-tertiary);
                border-radius: 4px;
            }

            .dropdown-menu-overlay::-webkit-scrollbar-thumb {
                background: var(--accent-primary);
                border-radius: 4px;
            }

            .dropdown-menu-overlay::-webkit-scrollbar-thumb:hover {
                background: var(--accent-hover);
            }

            .manage-items-item:hover {
                background: rgba(251, 191, 36, 0.1) !important;
            }

            @keyframes dropdownFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            /* Override any parent overflow hidden */
            body.singleselect-active {
                overflow: visible !important;
            }

            /* Ensure dropdown is always visible */
            .singleselect-overlay-dropdown * {
                pointer-events: auto !important;
            }

            /* Improve performance during scroll */
            .singleselect-overlay-dropdown.scrolling {
                pointer-events: none;
            }

            .singleselect-overlay-dropdown.scrolling * {
                pointer-events: none !important;
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

            /* COMPACT Modal Responsive Design */
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
    'info': 'info',
    'success': 'success', 
    'error': 'error',
    'warning': 'warn',
    'warn': 'warn'
  };

  const level = levelMap[type.toLowerCase()] || 'info';
  
  Logger[level](message, {
    module: 'SingleSelect',
    showNotification: true,
    notificationMessage: message
  });
}

  // Public API Methods
  getSelectedItem() {
    return this.selectedItem;
  }

  setSelectedItem(item) {
    if (this.allItems.includes(item)) {
      this.selectedItem = item;
      this.updateDisplay();
    }
  }

  clearSelection() {
    this.selectedItem = null;
    this.updateDisplay();

    if (this.config.onSelectionChange) {
      this.config.onSelectionChange(null);
    }
  }

  addItem(item) {
    if (!this.allItems.includes(item)) {
      this.allItems.push(item);
      this.filteredItems = [...this.allItems];

      if (this.config.onItemAdd) {
        this.config.onItemAdd(item);
      }
    }
  }

  removeItemFromList(item) {
    const index = this.allItems.indexOf(item);
    if (index > -1) {
      this.allItems.splice(index, 1);
      this.filteredItems = [...this.allItems];

      if (this.selectedItem === item) {
        this.selectedItem = null;
        this.updateDisplay();
      }

      if (this.config.onItemRemove) {
        this.config.onItemRemove(item);
      }
    }
  }

  updateItems(items) {
    this.allItems = [...items];
    this.filteredItems = [...this.allItems];

    if (this.selectedItem && !this.allItems.includes(this.selectedItem)) {
      this.selectedItem = null;
    }

    this.updateDisplay();

    // Re-render if dropdown is open
    if (this.isOpen) {
      this.renderOptions();
    }
  }

  // Configuration methods
  setCloseOnScroll(closeOnScroll) {
    this.config.closeOnScroll = closeOnScroll;
  }

  setMaxHeight(maxHeight) {
    this.config.maxHeight = maxHeight;
    if (this.overlayDropdown) {
      const menu = this.overlayDropdown.querySelector(".dropdown-menu-overlay");
      if (menu) {
        menu.style.maxHeight = maxHeight;
      }
    }
  }

  destroy() {
    this.closeDropdown();
    this.removeScrollListeners();
    this.removeOverlayDropdown();

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

    const modalId = `${this.containerId}_modal`;
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }

    if (this.container) {
      this.container.innerHTML = "";
    }

    // Clean up references
    this.modalClickHandler = null;
    this.modalMouseEnterHandler = null;
    this.modalMouseLeaveHandler = null;
    this.overlayDropdown = null;
    this.scrollListeners = [];
    this.resizeListener = null;
  }
}

// Utility class for SingleSelect management
class SingleSelectUtils {
  // Create a SingleSelect with common configuration
  static create(containerId, options = {}) {
    return new SingleSelect(containerId, {
      showSearch: true,
      showManageOption: true,
      maxHeight: "300px",
      closeOnScroll: true, // Default behavior
      ...options,
    });
  }

  // Create a SingleSelect that stays open during scroll (for special cases)
  static createSticky(containerId, options = {}) {
    return new SingleSelect(containerId, {
      showSearch: true,
      showManageOption: true,
      maxHeight: "300px",
      closeOnScroll: false, // Stays open and follows scroll
      ...options,
    });
  }

  // Collect all SingleSelect values from a form
  static collectFormData(formId, singleSelectInstances = {}) {
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

    // Get SingleSelect data
    Object.keys(singleSelectInstances).forEach((key) => {
      const instance = singleSelectInstances[key];
      if (instance && typeof instance.getSelectedItem === "function") {
        data[key] = instance.getSelectedItem();
      }
    });

    return data;
  }

  // Clear all SingleSelect instances in a form
  static clearForm(formId, singleSelectInstances = {}) {
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

    // Clear SingleSelect instances
    Object.values(singleSelectInstances).forEach((instance) => {
      if (instance && typeof instance.clearSelection === "function") {
        instance.clearSelection();
      }
    });
  }

  // Validate SingleSelect values
  static validateForm(formData, rules = {}) {
    const errors = [];

    Object.keys(rules).forEach((field) => {
      const rule = rules[field];
      const value = formData[field];

      if (rule.required) {
        if (!value || (typeof value === "string" && !value.trim())) {
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
    });

    return errors;
  }

  // Setup synchronized SingleSelect instances (e.g., for filtering)
  static setupSyncedSelects(instances, syncConfig = {}) {
    Object.keys(instances).forEach((key) => {
      const instance = instances[key];
      if (instance && syncConfig[key]) {
        const originalOnChange = instance.config.onSelectionChange;

        instance.config.onSelectionChange = function (selectedItem) {
          // Call original handler if exists
          if (originalOnChange) {
            originalOnChange(selectedItem);
          }

          // Execute sync logic
          if (syncConfig[key].onSync) {
            syncConfig[key].onSync(selectedItem, instances);
          }
        };
      }
    });
  }

  // Close all open SingleSelect dropdowns
  static closeAllDropdowns() {
    // Find all open SingleSelect instances
    const openDropdowns = document.querySelectorAll(
      '.singleselect-overlay-dropdown[style*="display: block"]'
    );
    openDropdowns.forEach((dropdown) => {
      const containerId = dropdown.id.replace("_overlay", "");
      // Trigger a click outside to close
      document.dispatchEvent(new Event("click"));
    });
  }

  // Check if any SingleSelect is open
  static hasOpenDropdown() {
    const openDropdowns = document.querySelectorAll(
      '.singleselect-overlay-dropdown[style*="display: block"]'
    );
    return openDropdowns.length > 0;
  }
}

// Initialize SingleSelect when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.SingleSelect = SingleSelect;
  window.SingleSelectUtils = SingleSelectUtils;
  window.DeleteConfirmationModal = DeleteConfirmationModal;

  // Enhanced body class management
  const originalOpenDropdown = SingleSelect.prototype.openDropdown;
  const originalCloseDropdown = SingleSelect.prototype.closeDropdown;

  SingleSelect.prototype.openDropdown = function () {
    document.body.classList.add("singleselect-active");
    return originalOpenDropdown.call(this);
  };

  SingleSelect.prototype.closeDropdown = function () {
    // Only remove class if no other dropdowns are open
    setTimeout(() => {
      if (!SingleSelectUtils.hasOpenDropdown()) {
        document.body.classList.remove("singleselect-active");
      }
    }, 10);
    return originalCloseDropdown.call(this);
  };

  // Global keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    // Close all dropdowns on Escape
    if (e.key === "Escape") {
      SingleSelectUtils.closeAllDropdowns();
    }
  });
});
