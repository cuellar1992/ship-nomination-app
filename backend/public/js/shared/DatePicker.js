/**
 * DatePicker Component - COMPACT VERSION
 * Date-only picker usando el mismo diseño elegante que DateTimePicker
 * Optimizado para filtros y escenarios date-only
 * Integrado con el sistema modular existente
 */

class DatePicker {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.selectedDate = null;
    this.modalInstance = null;
    this.currentDate = new Date();

    // Configuration options
    this.config = {
      placeholder: options.placeholder || "Select date...",
      label: options.label || "Date",
      icon: options.icon || "fas fa-calendar",
      format: options.format || "DD-MM-YYYY",
      modalTitle: options.modalTitle || "Select Date",
      minDate: options.minDate || null,
      maxDate: options.maxDate || null,
      allowEmpty: options.allowEmpty !== false,
      onDateChange: options.onDateChange || null,
      onDateSelect: options.onDateSelect || null,
      theme: options.theme || "dark",
      clearable: options.clearable !== false,
    };

    this.init();
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(
        `DatePicker: Container with id "${this.containerId}" not found`
      );
      return;
    }

    this.createHTML();
    this.createModal();
    this.setupEventListeners();
    this.injectStyles();
  }

  createHTML() {
    this.container.innerHTML = `
            <div style="position: relative;">
                ${
                  this.config.label
                    ? `
                <label class="datepicker-label" style="
                    color: var(--text-primary); 
                    font-weight: 600; 
                    margin-bottom: 0.5rem; 
                    font-size: 0.8rem; 
                    text-transform: uppercase; 
                    letter-spacing: 0.5px; 
                    display: block;
                ">
                    <i class="${this.config.icon} me-2" style="color: var(--accent-primary);"></i>${this.config.label}
                </label>
                `
                    : ""
                }
                
                <!-- Date Display Container -->
                <div class="datepicker-container" id="${
                  this.containerId
                }_container" style="
                    position: relative;
                    background: var(--bg-secondary); 
                    border: 1px solid var(--border-secondary); 
                    border-radius: 6px; 
                    min-height: 40px;
                    cursor: pointer;
                    transition: var(--transition-smooth);
                    font-size: 0.85rem;
                " tabindex="0">
                    
                    <!-- Selected Date Display -->
                    <div class="selected-date-display" id="${
                      this.containerId
                    }_display" style="
                        display: flex;
                        align-items: center;
                        padding: 0.5rem ${
                          this.config.clearable ? "2.5rem" : "1.5rem"
                        } 0.5rem 0.5rem;
                        min-height: 40px;
                    ">
                        <span class="placeholder-text" style="
                            color: var(--text-muted);
                            font-weight: 500;
                            display: block;
                            font-size: 0.85rem;
                        ">${this.config.placeholder}</span>
                        <span class="selected-text" style="
                            color: var(--text-primary);
                            font-weight: 500;
                            display: none;
                            font-size: 0.85rem;
                        "></span>
                    </div>
                    
                    <!-- Calendar Icon -->
                    <i class="fas fa-calendar date-icon" style="
                        position: absolute; 
                        right: 0.5rem; 
                        top: 50%; 
                        transform: translateY(-50%); 
                        color: var(--accent-primary); 
                        pointer-events: none;
                        font-size: 0.9rem;
                        transition: var(--transition-fast);
                    "></i>
                    
                    ${
                      this.config.clearable
                        ? `
                    <!-- Clear Button -->
                    <button class="clear-date-btn" id="${this.containerId}_clear" style="
                        position: absolute;
                        right: 1.8rem;
                        top: 50%;
                        transform: translateY(-50%);
                        background: transparent;
                        border: none;
                        color: var(--text-muted);
                        cursor: pointer;
                        padding: 0.2rem;
                        border-radius: 3px;
                        font-size: 0.8rem;
                        opacity: 0;
                        visibility: hidden;
                        transition: var(--transition-fast);
                    " title="Clear date">
                        <i class="fas fa-times"></i>
                    </button>
                    `
                        : ""
                    }
                </div>
            </div>
        `;
  }

  createModal() {
    const modalId = `${this.containerId}_modal`;
    const modalHTML = `
            <!-- Date Picker Modal - COMPACT VERSION -->
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" style="max-width: 400px;">
                    <div class="modal-content settings-modal">
                        <div class="modal-header settings-header" style="padding: 0.875rem 1.25rem;">
                            <h5 class="modal-title settings-title" id="${modalId}Label" style="font-size: 0.95rem;">
                                <i class="${this.config.icon} me-2"></i>${this.config.modalTitle}
                            </h5>
                            <button type="button" class="btn-close settings-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.75rem;"></button>
                        </div>
                        <div class="modal-body settings-body" style="padding: 1.25rem;">
                            <!-- Date Selection Section - COMPACT -->
                            <div class="settings-section">
                                <!-- Calendar Navigation - COMPACT -->
                                <div class="calendar-navigation" style="
                                    display: flex; 
                                    justify-content: space-between; 
                                    align-items: center; 
                                    margin-bottom: 1rem;
                                    background: var(--bg-secondary);
                                    padding: 0.6rem;
                                    border-radius: 6px;
                                    border: 1px solid var(--border-dark);
                                ">
                                    <button class="btn-nav-month" id="${this.containerId}_prevMonth" style="
                                        background: transparent;
                                        border: 1px solid var(--accent-primary);
                                        color: var(--accent-primary);
                                        padding: 0.3rem 0.5rem;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        transition: var(--transition-fast);
                                        font-size: 0.75rem;
                                    ">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    
                                    <div class="current-month-year" id="${this.containerId}_monthYear" style="
                                        color: var(--text-primary);
                                        font-weight: 600;
                                        font-size: 0.9rem;
                                        text-align: center;
                                        flex: 1;
                                    ">
                                        <!-- Month Year will be inserted here -->
                                    </div>
                                    
                                    <button class="btn-nav-month" id="${this.containerId}_nextMonth" style="
                                        background: transparent;
                                        border: 1px solid var(--accent-primary);
                                        color: var(--accent-primary);
                                        padding: 0.3rem 0.5rem;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        transition: var(--transition-fast);
                                        font-size: 0.75rem;
                                    ">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                                
                                <!-- Calendar Grid - COMPACT -->
                                <div class="calendar-grid" id="${this.containerId}_calendar" style="
                                    display: grid;
                                    grid-template-columns: repeat(7, 1fr);
                                    gap: 0.1rem;
                                    background: var(--bg-secondary);
                                    padding: 0.6rem;
                                    border-radius: 6px;
                                    border: 1px solid var(--border-dark);
                                ">
                                    <!-- Calendar will be generated here -->
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer settings-footer" style="padding: 0.875rem 1.25rem;">
                            <button type="button" class="btn btn-modal-close" data-bs-dismiss="modal" style="font-size: 0.8rem; padding: 0.5rem 0.875rem;">Cancel</button>
                            <button type="button" class="btn btn-storage-select" id="${this.containerId}_confirmDate" style="font-size: 0.8rem; padding: 0.5rem 1rem;">
                                <i class="fas fa-check me-2"></i>Select Date
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  setupEventListeners() {
    const container = document.getElementById(`${this.containerId}_container`);
    const clearBtn = document.getElementById(`${this.containerId}_clear`);

    // Open modal on click
    container.addEventListener("click", (e) => {
      if (!e.target.closest(".clear-date-btn")) {
        this.openModal();
      }
    });

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearDate();
      });
    }

    // Focus/blur events
    container.addEventListener("focus", () => {
      container.style.borderColor = "var(--accent-primary)";
      container.style.boxShadow = "0 0 0 0.15rem rgba(31, 181, 212, 0.2)";
    });

    container.addEventListener("blur", () => {
      container.style.borderColor = "var(--border-secondary)";
      container.style.boxShadow = "none";
    });

    // Setup modal event listeners
    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    const prevMonthBtn = document.getElementById(
      `${this.containerId}_prevMonth`
    );
    const nextMonthBtn = document.getElementById(
      `${this.containerId}_nextMonth`
    );
    const confirmBtn = document.getElementById(
      `${this.containerId}_confirmDate`
    );

    // Month navigation
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener("click", () => this.navigateMonth(-1));
    }
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener("click", () => this.navigateMonth(1));
    }

    // Confirm selection
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => this.confirmSelection());
    }

    // Button hover effects
    this.setupButtonHoverEffects();
  }

  setupButtonHoverEffects() {
    const modalElement = document.getElementById(`${this.containerId}_modal`);

    // Month navigation buttons
    const navButtons = modalElement.querySelectorAll(".btn-nav-month");
    navButtons.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        button.style.background = "var(--accent-primary)";
        button.style.color = "white";
      });
      button.addEventListener("mouseleave", () => {
        button.style.background = "transparent";
        button.style.color = "var(--accent-primary)";
      });
    });
  }

  openModal() {
    this.initializeModal();
    this.renderCalendar();

    const modalId = `${this.containerId}_modal`;
    this.modalInstance = new bootstrap.Modal(document.getElementById(modalId));
    this.modalInstance.show();
  }

  initializeModal() {
    // Set current date if no date selected
    if (!this.selectedDate) {
      this.currentDate = new Date();
    } else {
      this.currentDate = new Date(this.selectedDate);
    }
  }

  renderCalendar() {
    const calendar = document.getElementById(`${this.containerId}_calendar`);
    const monthYear = document.getElementById(`${this.containerId}_monthYear`);

    // Update month/year display
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    monthYear.textContent = `${
      monthNames[this.currentDate.getMonth()]
    } ${this.currentDate.getFullYear()}`;

    // Clear calendar
    calendar.innerHTML = "";

    // Add day headers - COMPACT
    const dayHeaders = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    dayHeaders.forEach((day) => {
      const dayHeader = document.createElement("div");
      dayHeader.style.cssText = `
                padding: 0.3rem 0.15rem;
                text-align: center;
                font-weight: 600;
                color: var(--text-secondary);
                font-size: 0.65rem;
                text-transform: uppercase;
            `;
      dayHeader.textContent = day;
      calendar.appendChild(dayHeader);
    });

    // Generate calendar days - COMPACT
    const firstDay = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1
    );
    const lastDay = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      0
    );
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dayElement = document.createElement("div");
      const isCurrentMonth = date.getMonth() === this.currentDate.getMonth();
      const isToday = date.getTime() === today.getTime();
      const isSelected =
        this.selectedDate && date.getTime() === this.selectedDate.getTime();

      dayElement.style.cssText = `
                padding: 0.4rem 0.15rem;
                text-align: center;
                cursor: pointer;
                border-radius: 4px;
                transition: var(--transition-fast);
                font-weight: 500;
                font-size: 0.75rem;
                position: relative;
                ${
                  !isCurrentMonth
                    ? "color: var(--text-dim); opacity: 0.3;"
                    : "color: var(--text-primary);"
                }
                ${
                  isToday
                    ? "background: rgba(31, 181, 212, 0.15); border: 1px solid var(--accent-primary);"
                    : ""
                }
                ${
                  isSelected
                    ? "background: var(--accent-primary) !important; color: white !important;"
                    : ""
                }
            `;

      dayElement.textContent = date.getDate();

      // Add click handler
      dayElement.addEventListener("click", () => {
        this.selectDate(new Date(date));
      });

      // Hover effects
      if (isCurrentMonth) {
        dayElement.addEventListener("mouseenter", () => {
          if (!isSelected) {
            dayElement.style.background = "rgba(31, 181, 212, 0.1)";
          }
        });
        dayElement.addEventListener("mouseleave", () => {
          if (!isSelected) {
            dayElement.style.background = isToday
              ? "rgba(31, 181, 212, 0.15)"
              : "transparent";
          }
        });
      }

      calendar.appendChild(dayElement);
    }
  }

  navigateMonth(direction) {
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.renderCalendar();
  }

  selectDate(date) {
    this.selectedDate = new Date(date);
    this.renderCalendar();
  }

  confirmSelection() {
    if (!this.selectedDate) {
      this.showNotification("Please select a date", "error");
      return;
    }

    this.updateDisplay();

    // Trigger callbacks
    if (this.config.onDateSelect) {
      this.config.onDateSelect(this.selectedDate);
    }
    if (this.config.onDateChange) {
      this.config.onDateChange(this.selectedDate);
    }

    // Close modal
    if (this.modalInstance) {
      this.modalInstance.hide();
    }

    this.showNotification("Date selected successfully!", "success");
  }

  updateDisplay() {
    const placeholderText = document
      .getElementById(`${this.containerId}_display`)
      .querySelector(".placeholder-text");
    const selectedText = document
      .getElementById(`${this.containerId}_display`)
      .querySelector(".selected-text");
    const clearBtn = document.getElementById(`${this.containerId}_clear`);

    if (!this.selectedDate) {
      placeholderText.style.display = "block";
      selectedText.style.display = "none";
      if (clearBtn) {
        clearBtn.style.opacity = "0";
        clearBtn.style.visibility = "hidden";
      }
    } else {
      placeholderText.style.display = "none";
      selectedText.style.display = "block";
      selectedText.textContent = this.formatDate(this.selectedDate);
      if (clearBtn) {
        clearBtn.style.opacity = "1";
        clearBtn.style.visibility = "visible";
      }
    }
  }

  formatDate(date) {
    if (!date) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  clearDate(showNotification = true) {
    this.selectedDate = null;
    this.updateDisplay();

    if (this.config.onDateChange) {
      this.config.onDateChange(null);
    }

    // Solo mostrar notificación si se solicita
    if (showNotification) {
      this.showNotification("Date cleared", "info");
    }
  }

  injectStyles() {
    if (document.getElementById("datepicker-styles")) return;

    const style = document.createElement("style");
    style.id = "datepicker-styles";
    style.textContent = `
            .datepicker-container:focus {
                outline: none;
            }

            .datepicker-container:hover .date-icon {
                transform: translateY(-50%) scale(1.1);
                color: var(--accent-hover);
            }

            .clear-date-btn:hover {
                background: rgba(220, 53, 69, 0.1) !important;
                color: #dc3545 !important;
            }

            .datepicker-container.has-value .date-icon {
                color: var(--accent-primary);
            }

            .datepicker-container.has-value:hover .clear-date-btn {
                opacity: 1 !important;
                visibility: visible !important;
            }

            /* Calendar Grid Styles */
            .calendar-grid > div:nth-child(n+8) {
                border-top: 1px solid var(--border-dark);
                margin-top: 0.1rem;
                padding-top: 0.4rem;
            }

            /* Animation for modal */
            @keyframes calendarFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .calendar-grid {
                animation: calendarFadeIn 0.2s ease-out;
            }

            /* Calendar Day Hover Effects */
            .calendar-grid > div:nth-child(n+8):hover {
                transform: scale(1.05);
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .modal-dialog {
                    max-width: 95% !important;
                    margin: 0.5rem;
                }
                
                .calendar-grid {
                    font-size: 0.7rem;
                    gap: 0.05rem;
                }
                
                .calendar-grid > div {
                    padding: 0.35rem 0.1rem !important;
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
            }

            /* Placeholder color standardization */
            .datepicker-container input::placeholder {
                color: var(--text-muted) !important;
            }

            .datepicker-container input::-webkit-input-placeholder {
                color: var(--text-muted) !important;
            }

            .datepicker-container input::-moz-placeholder {
                color: var(--text-muted) !important;
            }

            .datepicker-container input:-ms-input-placeholder {
                color: var(--text-muted) !important;
            }
        `;

    document.head.appendChild(style);
  }

  showNotification(message, type = "info") {
    const levelMap = {
      info: "info",
      success: "success",
      error: "error",
      warning: "warn",
      warn: "warn",
    };

    const level = levelMap[type.toLowerCase()] || "info";

    Logger[level](message, {
      module: "DatePicker",
      showNotification: true,
      notificationMessage: message,
    });
  }

  // Public API Methods
  getDate() {
    return this.selectedDate;
  }

  setDate(date) {
    if (date) {
      this.selectedDate = new Date(date);
    } else {
      this.selectedDate = null;
    }
    this.updateDisplay();
  }

  getISOString() {
    return this.selectedDate ? this.selectedDate.toISOString() : null;
  }

  getFormattedDate(format) {
    if (!this.selectedDate) return "";

    const date = this.selectedDate;
    const formatMap = {
      DD: String(date.getDate()).padStart(2, "0"),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      YYYY: String(date.getFullYear()),
      YY: String(date.getFullYear()).slice(-2),
    };

    let formattedDate = format || this.config.format;
    Object.keys(formatMap).forEach((key) => {
      formattedDate = formattedDate.replace(
        new RegExp(key, "g"),
        formatMap[key]
      );
    });

    return formattedDate;
  }

  // Get date in YYYY-MM-DD format (for HTML date inputs)
  getDateValue() {
    if (!this.selectedDate) return "";
    const date = this.selectedDate;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  clearSelection(showNotification = true) {
    this.clearDate(showNotification); // Pasar el parámetro
  }

  setMinDate(date) {
    this.config.minDate = date;
  }

  setMaxDate(date) {
    this.config.maxDate = date;
  }

  isValid() {
    return this.selectedDate !== null;
  }

  destroy() {
    // Remove modal
    const modalId = `${this.containerId}_modal`;
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = "";
    }

    // Clean up references
    this.modalInstance = null;
    this.selectedDate = null;
  }
}

// Initialize DatePicker when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.DatePicker = DatePicker;
  Logger.success("DatePicker component loaded", {
    module: "DatePicker",
    showNotification: false,
  });
});
