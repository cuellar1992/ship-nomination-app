/**
 * DateTimePicker Modal Component - COMPACT VERSION
 * Reusable modal datetime picker with reduced size for Premium System
 * Same functionality, smaller visual footprint
 * FIXED: Placeholder colors standardized to var(--text-muted)
 */

class DateTimePicker {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.selectedDateTime = null;
    this.modalInstance = null;
    this.currentDate = new Date();
    this.selectedDate = null;
    this.selectedTime = { hour: 12, minute: 0 };

    // 🔧 NUEVO: Estado interno para validación mejorada
    this._hasValidDate = false;
    this._isDateSelected = false;

    // Configuration options
    this.config = {
      placeholder: options.placeholder || "Select date and time...",
      label: options.label || "Date & Time",
      icon: options.icon || "fas fa-calendar-alt",
      format: options.format || "DD-MM-YYYY HH:MM",
      modalTitle: options.modalTitle || "Select Date & Time",
      minDate: options.minDate || null,
      maxDate: options.maxDate || null,
      defaultTime: options.defaultTime || { hour: 12, minute: 0 },
      minuteStep: options.minuteStep || 15,
      allowEmpty: options.allowEmpty !== false,
      showSeconds: options.showSeconds || false,
      is24Hour: options.is24Hour !== false,
      onDateTimeChange: options.onDateTimeChange || null,
      onDateTimeSelect: options.onDateTimeSelect || null,
      theme: options.theme || "dark",
    };

    this.init();
  }

  init() {
    Logger.debug("DateTimePicker init started", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        config: this.config,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(
        `DateTimePicker: Container with id "${this.containerId}" not found`
      );
      return;
    }

    this.createHTML();
    this.createModal();
    this.setupEventListeners();
    this.injectStyles();

    Logger.debug("DateTimePicker init completed", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });
  }

  createHTML() {
    Logger.debug("createHTML called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    this.container.innerHTML = `
            <div style="position: relative;">
                <label class="datetime-picker-label" style="
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
                
                <!-- DateTime Display Container -->
                <div class="datetime-picker-container" id="${this.containerId}_container" style="
                    position: relative;
                    background: var(--bg-primary); 
                    border: 2px solid var(--border-secondary); 
                    border-radius: 12px; 
                    min-height: 50px;
                    cursor: pointer;
                    transition: var(--transition-smooth);
                " tabindex="0">
                    
                    <!-- Selected DateTime Display -->
                    <div class="selected-datetime-display" id="${this.containerId}_display" style="
                        display: flex;
                        align-items: center;
                        padding: 0.875rem 3rem 0.875rem 1rem;
                        min-height: 50px;
                    ">
                        <span class="placeholder-text" style="
                            color: var(--text-muted);
                            font-weight: 500;
                            display: block;
                            font-family: 'Inter', monospace;
                            letter-spacing: 0.5px;
                        ">${this.config.placeholder}</span>
                        <span class="selected-text" style="
                            color: var(--text-primary);
                            font-weight: 500;
                            display: none;
                            font-family: 'Inter', monospace;
                            letter-spacing: 0.5px;
                        "></span>
                    </div>
                    
                    <!-- Calendar Icon -->
                    <i class="fas fa-calendar-alt datetime-icon" style="
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
                    <button class="clear-datetime-btn" id="${this.containerId}_clear" style="
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
                </div>
            </div>
        `;
  }

  createModal() {
    Logger.debug("createModal called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    const modalId = `${this.containerId}_modal`;
    const modalHTML = `
            <!-- DateTime Picker Modal - COMPACT VERSION -->
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" style="max-width: 480px;">
                    <div class="modal-content settings-modal">
                        <div class="modal-header settings-header" style="padding: 1rem 1.5rem;">
                            <h5 class="modal-title settings-title" id="${modalId}Label" style="font-size: 1rem;">
                                <i class="${this.config.icon} me-2"></i>${this.config.modalTitle}
                            </h5>
                            <button type="button" class="btn-close settings-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.8rem;"></button>
                        </div>
                        <div class="modal-body settings-body" style="padding: 1.5rem;">
                            <!-- DateTime Picker Content - COMPACT -->
                            <div class="datetime-picker-content">
                                
                                <!-- Date Selection Section - COMPACT -->
                                <div class="settings-section" style="margin-bottom: 1.5rem;">
                                    <div class="settings-section-header">
                                        <h6 class="settings-section-title" style="font-size: 0.85rem; margin-bottom: 1rem;">
                                            <i class="fas fa-calendar me-2"></i>Select Date
                                        </h6>
                                    </div>
                                    
                                    <!-- Calendar Navigation - COMPACT -->
                                    <div class="calendar-navigation" style="
                                        display: flex; 
                                        justify-content: space-between; 
                                        align-items: center; 
                                        margin-bottom: 1rem;
                                        background: var(--bg-secondary);
                                        padding: 0.75rem;
                                        border-radius: 8px;
                                        border: 1px solid var(--border-dark);
                                    ">
                                        <button class="btn-nav-month" id="${this.containerId}_prevMonth" style="
                                            background: transparent;
                                            border: 1px solid var(--accent-primary);
                                            color: var(--accent-primary);
                                            padding: 0.35rem 0.6rem;
                                            border-radius: 6px;
                                            cursor: pointer;
                                            transition: var(--transition-fast);
                                            font-size: 0.8rem;
                                        ">
                                            <i class="fas fa-chevron-left"></i>
                                        </button>
                                        
                                        <div class="current-month-year" id="${this.containerId}_monthYear" style="
                                            color: var(--text-primary);
                                            font-weight: 600;
                                            font-size: 0.95rem;
                                            text-align: center;
                                            flex: 1;
                                        ">
                                            <!-- Month Year will be inserted here -->
                                        </div>
                                        
                                        <button class="btn-nav-month" id="${this.containerId}_nextMonth" style="
                                            background: transparent;
                                            border: 1px solid var(--accent-primary);
                                            color: var(--accent-primary);
                                            padding: 0.35rem 0.6rem;
                                            border-radius: 6px;
                                            cursor: pointer;
                                            transition: var(--transition-fast);
                                            font-size: 0.8rem;
                                        ">
                                            <i class="fas fa-chevron-right"></i>
                                        </button>
                                    </div>
                                    
                                    <!-- Calendar Grid - COMPACT -->
                                    <div class="calendar-grid" id="${this.containerId}_calendar" style="
                                        display: grid;
                                        grid-template-columns: repeat(7, 1fr);
                                        gap: 0.15rem;
                                        background: var(--bg-secondary);
                                        padding: 0.75rem;
                                        border-radius: 8px;
                                        border: 1px solid var(--border-dark);
                                    ">
                                        <!-- Calendar will be generated here -->
                                    </div>
                                </div>

                                <!-- Time Selection Section - COMPACT -->
                                <div class="settings-section">
                                    <div class="settings-section-header">
                                        <h6 class="settings-section-title" style="font-size: 0.85rem; margin-bottom: 1rem;">
                                            <i class="fas fa-clock me-2"></i>Select Time
                                        </h6>
                                    </div>
                                    
                                    <div class="time-picker-container" style="
                                        background: var(--bg-secondary);
                                        padding: 1rem;
                                        border-radius: 8px;
                                        border: 1px solid var(--border-dark);
                                    ">
                                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.75rem; align-items: center;">
                                            <!-- Hour Picker - COMPACT -->
                                            <div class="time-component">
                                                <label style="
                                                    color: var(--text-secondary); 
                                                    font-size: 0.8rem; 
                                                    font-weight: 600; 
                                                    margin-bottom: 0.4rem; 
                                                    display: block;
                                                    text-align: center;
                                                ">Hour</label>
                                                <select class="time-select" id="${this.containerId}_hour" style="
                                                    width: 100%;
                                                    background: var(--bg-primary);
                                                    border: 2px solid var(--border-secondary);
                                                    color: var(--text-primary);
                                                    padding: 0.6rem;
                                                    border-radius: 6px;
                                                    font-weight: 500;
                                                    text-align: center;
                                                    font-size: 0.95rem;
                                                    appearance: none;
                                                ">
                                                    <!-- Hours will be populated here -->
                                                </select>
                                            </div>
                                            
                                            <!-- Separator - COMPACT -->
                                            <div style="
                                                color: var(--accent-primary); 
                                                font-size: 1.2rem; 
                                                font-weight: bold;
                                                text-align: center;
                                                margin-top: 1.2rem;
                                            ">:</div>
                                            
                                            <!-- Minute Picker - COMPACT -->
                                            <div class="time-component">
                                                <label style="
                                                    color: var(--text-secondary); 
                                                    font-size: 0.8rem; 
                                                    font-weight: 600; 
                                                    margin-bottom: 0.4rem; 
                                                    display: block;
                                                    text-align: center;
                                                ">Minute</label>
                                                <select class="time-select" id="${this.containerId}_minute" style="
                                                    width: 100%;
                                                    background: var(--bg-primary);
                                                    border: 2px solid var(--border-secondary);
                                                    color: var(--text-primary);
                                                    padding: 0.6rem;
                                                    border-radius: 6px;
                                                    font-weight: 500;
                                                    text-align: center;
                                                    font-size: 0.95rem;
                                                    appearance: none;
                                                ">
                                                    <!-- Minutes will be populated here -->
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <!-- Quick Time Buttons - COMPACT -->
                                        <div class="quick-time-buttons" style="
                                            margin-top: 1rem;
                                            display: flex;
                                            gap: 0.4rem;
                                            flex-wrap: wrap;
                                            justify-content: center;
                                        ">
                                            <button class="btn-quick-time" data-time="09:00" style="
                                                background: transparent;
                                                border: 1px solid var(--border-secondary);
                                                color: var(--text-secondary);
                                                padding: 0.3rem 0.6rem;
                                                border-radius: 4px;
                                                font-size: 0.75rem;
                                                cursor: pointer;
                                                transition: var(--transition-fast);
                                            ">09:00</button>
                                            <button class="btn-quick-time" data-time="12:00" style="
                                                background: transparent;
                                                border: 1px solid var(--border-secondary);
                                                color: var(--text-secondary);
                                                padding: 0.3rem 0.6rem;
                                                border-radius: 4px;
                                                font-size: 0.75rem;
                                                cursor: pointer;
                                                transition: var(--transition-fast);
                                            ">12:00</button>
                                            <button class="btn-quick-time" data-time="14:00" style="
                                                background: transparent;
                                                border: 1px solid var(--border-secondary);
                                                color: var(--text-secondary);
                                                padding: 0.3rem 0.6rem;
                                                border-radius: 4px;
                                                font-size: 0.75rem;
                                                cursor: pointer;
                                                transition: var(--transition-fast);
                                            ">14:00</button>
                                            <button class="btn-quick-time" data-time="18:00" style="
                                                background: transparent;
                                                border: 1px solid var(--border-secondary);
                                                color: var(--text-secondary);
                                                padding: 0.3rem 0.6rem;
                                                border-radius: 4px;
                                                font-size: 0.75rem;
                                                cursor: pointer;
                                                transition: var(--transition-fast);
                                            ">18:00</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer settings-footer" style="padding: 1rem 1.5rem;">
                            <button type="button" class="btn btn-modal-close" data-bs-dismiss="modal" style="font-size: 0.85rem; padding: 0.6rem 1rem;">Cancel</button>
                            <button type="button" class="btn btn-storage-select" id="${this.containerId}_confirmDateTime" style="font-size: 0.85rem; padding: 0.6rem 1.2rem;">
                                <i class="fas fa-check me-2"></i>Select DateTime
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  setupEventListeners() {
    Logger.debug("setupEventListeners started", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    const container = document.getElementById(`${this.containerId}_container`);
    const clearBtn = document.getElementById(`${this.containerId}_clear`);

    // Open modal on click
    container.addEventListener("click", (e) => {
      if (!e.target.closest(".clear-datetime-btn")) {
        this.openModal();
      }
    });

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearDateTime();
      });
    }

    // Focus/blur events
    container.addEventListener("click", () => {
      container.style.borderColor = "var(--accent-primary)";
      container.style.boxShadow = "0 0 0 0.2rem rgba(31, 181, 212, 0.25)";
    });

    container.addEventListener("blur", () => {
      container.style.borderColor = "var(--border-secondary)";
      container.style.boxShadow = "none";
    });

    // Setup modal event listeners
    this.setupModalEventListeners();

    Logger.debug("setupEventListeners completed", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });
  }

  setupModalEventListeners() {
    Logger.debug("setupModalEventListeners called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    const prevMonthBtn = document.getElementById(
      `${this.containerId}_nextMonth`
    );
    const nextMonthBtn = document.getElementById(
      `${this.containerId}_nextMonth`
    );
    const confirmBtn = document.getElementById(
      `${this.containerId}_confirmDateTime`
    );
    const hourSelect = document.getElementById(`${this.containerId}_hour`);
    const minuteSelect = document.getElementById(`${this.containerId}_minute`);

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

    // Time selection
    if (hourSelect) {
      hourSelect.addEventListener("change", () => this.updateSelectedTime());
    }
    if (minuteSelect) {
      minuteSelect.addEventListener("change", () => this.updateSelectedTime());
    }

    // Quick time buttons
    this.setupQuickTimeButtons();

    // Button hover effects
    this.setupButtonHoverEffects();

    Logger.debug("setupModalEventListeners completed", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });
  }

  setupQuickTimeButtons() {
    Logger.debug("setupQuickTimeButtons called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    const quickTimeButtons = document.querySelectorAll(
      `#${this.containerId}_modal .btn-quick-time`
    );
    quickTimeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const time = button.dataset.time;
        const [hour, minute] = time.split(":");
        this.selectedTime = { hour: parseInt(hour), minute: parseInt(minute) };
        this.updateTimeSelects();
      });
    });
  }

  setupButtonHoverEffects() {
    Logger.debug("setupButtonHoverEffects called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

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

    // Quick time buttons
    const quickButtons = modalElement.querySelectorAll(".btn-quick-time");
    quickButtons.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        button.style.background = "var(--accent-primary)";
        button.style.color = "white";
        button.style.borderColor = "var(--accent-primary)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.background = "transparent";
        button.style.color = "var(--text-secondary)";
        button.style.borderColor = "var(--border-secondary)";
      });
    });

    // Time selects focus effects
    const timeSelects = modalElement.querySelectorAll(".time-select");
    timeSelects.forEach((select) => {
      select.addEventListener("focus", () => {
        select.style.borderColor = "var(--accent-primary)";
        select.style.boxShadow = "0 0 0 0.2rem rgba(31, 181, 212, 0.25)";
      });
      select.addEventListener("blur", () => {
        select.style.borderColor = "var(--border-secondary)";
        select.style.boxShadow = "none";
      });
    });
  }

  openModal() {
    Logger.debug("openModal called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedDate: this.selectedDate,
        selectedDateTime: this.selectedDateTime,
        selectedTime: this.selectedTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    this.initializeModal();
    this.renderCalendar();
    this.populateTimeSelects();

    const modalId = `${this.containerId}_modal`;
    this.modalInstance = new bootstrap.Modal(document.getElementById(modalId));
    this.modalInstance.show();

    Logger.debug("Modal opened successfully", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        modalId: modalId,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });
  }

    initializeModal() {
    Logger.debug('initializeModal called', {
      module: 'DateTimePicker',
      containerId: this.containerId,
      data: {
        selectedDate: this.selectedDate,
        selectedDateTime: this.selectedDateTime,
        selectedTime: this.selectedTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    if (!this.selectedDate) {
      if (this.selectedDateTime) {
        this.selectedDate = new Date(this.selectedDateTime);
        
        // 🔧 CORREGIDO: Sincronizar estado interno cuando se restaura selectedDate
        this._hasValidDate = true;
        this._isDateSelected = true;

        Logger.debug("Selected date restored from selectedDateTime - State synchronized", {
          module: "DateTimePicker",
          containerId: this.containerId,
          showNotification: false,
          data: { 
            selectedDate: this.selectedDate,
            hasValidDate: this._hasValidDate,
            isDateSelected: this._isDateSelected
          },
        });
      } else {
        this.currentDate = new Date();
        this.selectedDate = null;
        
        // 🔧 CORREGIDO: Asegurar que el estado interno esté limpio
        this._hasValidDate = false;
        this._isDateSelected = false;

        Logger.info("No previous date found; initialized with current date", {
          module: "DateTimePicker",
          containerId: this.containerId,
          showNotification: false,
        });
      }
    } else {
      this.currentDate = new Date(this.selectedDate);
      
      // 🔧 CORREGIDO: Asegurar que el estado interno esté sincronizado
      if (this.selectedDate instanceof Date && !isNaN(this.selectedDate.getTime())) {
        this._hasValidDate = true;
        this._isDateSelected = true;
      }
      
      Logger.debug("Selected date already exists, using it - State synchronized", {
        module: "DateTimePicker",
        containerId: this.containerId,
        showNotification: false,
        data: { 
          selectedDate: this.selectedDate, 
          currentDate: this.currentDate,
          hasValidDate: this._hasValidDate,
          isDateSelected: this._isDateSelected
        },
      });
    }

    if (!this.selectedTime) {
      this.selectedTime = { ...this.config.defaultTime };
    }

    Logger.debug('initializeModal completed', {
      module: 'DateTimePicker',
      containerId: this.containerId,
      data: {
        finalSelectedDate: this.selectedDate,
        finalCurrentDate: this.currentDate,
        finalSelectedTime: this.selectedTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });
  }

  renderCalendar() {
    Logger.debug("renderCalendar called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        currentDate: this.currentDate,
        selectedDate: this.selectedDate,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

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
                padding: 0.4rem 0.2rem;
                text-align: center;
                font-weight: 600;
                color: var(--text-secondary);
                font-size: 0.7rem;
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
      // 🔧 CORREGIDO: Comparar solo día, mes y año (no hora/minutos)
      const isSelected = this.selectedDate && 
        date.getDate() === this.selectedDate.getDate() &&
        date.getMonth() === this.selectedDate.getMonth() &&
        date.getFullYear() === this.selectedDate.getFullYear();
      
      // 🔧 DEBUG: Log para verificar si algún día está siendo marcado como seleccionado
      if (this.selectedDate && (date.getDate() === this.selectedDate.getDate() && date.getMonth() === this.selectedDate.getMonth())) {
        Logger.debug('Checking selected day for highlight', {
          module: 'DateTimePicker',
          containerId: this.containerId,
          data: {
            date: date,
            selectedDate: this.selectedDate,
            isSelected: isSelected,
            dateTime: date.getTime(),
            selectedDateTime: this.selectedDate.getTime(),
            dayMatch: date.getDate() === this.selectedDate.getDate(),
            monthMatch: date.getMonth() === this.selectedDate.getMonth(),
            yearMatch: date.getFullYear() === this.selectedDate.getFullYear(),
            timeComparison: `${date.getTime()} === ${this.selectedDate.getTime()}`
          }
        });
      }

      dayElement.style.cssText = `
                padding: 0.5rem 0.2rem;
                text-align: center;
                cursor: pointer;
                border-radius: 6px;
                transition: var(--transition-fast);
                font-weight: 500;
                font-size: 0.8rem;
                position: relative;
                ${
                  !isCurrentMonth
                    ? "color: var(--text-dim); opacity: 0.4;"
                    : "color: var(--text-primary);"
                }
                ${
                  isToday
                    ? "background: rgba(31, 181, 212, 0.2); border: 1px solid var(--accent-primary);"
                    : ""
                }
                ${
                  isSelected
                    ? "background: var(--accent-primary) !important; color: white !important;"
                    : ""
                }
            `;

      dayElement.textContent = date.getDate();

      // 🔧 NUEVO: Verificar restricciones de fecha antes de permitir selección
      const isDateDisabled = this.isDateDisabled(date);
      
      if (isDateDisabled) {
        // Deshabilitar días que no cumplen las restricciones
        dayElement.style.cssText += `
          opacity: 0.3;
          cursor: not-allowed;
          background: var(--bg-secondary);
          color: var(--text-dim);
        `;
        dayElement.title = 'Date not available';
      } else {
        // Agregar click handler solo para fechas válidas
        dayElement.addEventListener("click", () => {
          this.selectDate(new Date(date));
        });
      }

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
              ? "rgba(31, 181, 212, 0.2)"
              : "transparent";
          }
        });
      }

      calendar.appendChild(dayElement);
    }
  }

  populateTimeSelects() {
    const hourSelect = document.getElementById(`${this.containerId}_hour`);
    const minuteSelect = document.getElementById(`${this.containerId}_minute`);

    // 🔧 NUEVO: Limpiar selects antes de poblar
    hourSelect.innerHTML = "";
    minuteSelect.innerHTML = "";

    // 🔧 NUEVO: Obtener fecha seleccionada para validación
    const selectedDate = this.selectedDate || new Date();

    Logger.debug("populateTimeSelects called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedDate: selectedDate,
        selectedTime: this.selectedTime,
        minuteStep: this.config.minuteStep,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    // Populate hours con validación de restricciones
    for (let i = 0; i < 24; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = String(i).padStart(2, "0");
      
      // 🔧 NUEVO: Verificar si la hora está deshabilitada
      // Para horas, verificamos si TODA la hora está deshabilitada
      const isHourDisabled = this.isHourCompletelyDisabled(selectedDate, i);
      if (isHourDisabled) {
        option.disabled = true;
        option.style.color = "var(--text-dim)";
        option.textContent += " (not available)";
      }
      
      if (i === this.selectedTime.hour) {
        option.selected = true;
      }
      hourSelect.appendChild(option);
    }

    // Populate minutes con validación de restricciones
    for (let i = 0; i < 60; i += this.config.minuteStep) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = String(i).padStart(2, "0");
      
      // 🔧 CORREGIDO: Verificar si el minuto está deshabilitado
      const isMinuteDisabled = this.isTimeDisabled(selectedDate, this.selectedTime.hour, i);
      if (isMinuteDisabled) {
        option.disabled = true;
        option.style.color = "var(--text-dim)";
        option.textContent += " (not available)";
      }
      
      // 🔧 CORREGIDO: Seleccionar el minuto correcto basado en minuteStep
      if (i === this.selectedTime.minute) {
        option.selected = true;
        Logger.debug("Minute option selected", {
          module: "DateTimePicker",
          containerId: this.containerId,
          data: {
            minute: i,
            selectedTime: this.selectedTime.minute,
            minuteStep: this.config.minuteStep
          }
        });
      }
      minuteSelect.appendChild(option);
    }

    Logger.debug("Time selects populated", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hourSelectValue: hourSelect.value,
        minuteSelectValue: minuteSelect.value,
        hourOptionsCount: hourSelect.options.length,
        minuteOptionsCount: minuteSelect.options.length
      }
    });
  }

  updateTimeSelects() {
    const hourSelect = document.getElementById(`${this.containerId}_hour`);
    const minuteSelect = document.getElementById(`${this.containerId}_minute`);

    Logger.debug("updateTimeSelects called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedTime: this.selectedTime,
        hourSelectValue: hourSelect?.value,
        minuteSelectValue: minuteSelect?.value,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    if (hourSelect && minuteSelect) {
      hourSelect.value = this.selectedTime.hour;
      minuteSelect.value = this.selectedTime.minute;

      Logger.debug("Time selects updated", {
        module: "DateTimePicker",
        containerId: this.containerId,
        data: {
          newHourSelectValue: hourSelect.value,
          newMinuteSelectValue: minuteSelect.value
        }
      });
    }
  }

  /**
   * 🔧 NUEVO: Re-poblar solo los minutos cuando cambia la hora
   * Esto es necesario para aplicar las restricciones de minutos basadas en la nueva hora
   */
  repopulateMinutes() {
    const minuteSelect = document.getElementById(`${this.containerId}_minute`);
    if (!minuteSelect || !this.selectedDate) return;

    Logger.debug("repopulateMinutes called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedDate: this.selectedDate,
        selectedTime: this.selectedTime,
        minuteStep: this.config.minuteStep,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    // Limpiar minutos existentes
    minuteSelect.innerHTML = "";

    // Re-poblar minutos con validación actualizada
    for (let i = 0; i < 60; i += this.config.minuteStep) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = String(i).padStart(2, "0");
      
      // 🔧 CORREGIDO: Verificar si el minuto está deshabilitado para la hora actual
      const isMinuteDisabled = this.isTimeDisabled(this.selectedDate, this.selectedTime.hour, i);
      if (isMinuteDisabled) {
        option.disabled = true;
        option.style.color = "var(--text-dim)";
        option.textContent += " (not available)";
      }
      
      // 🔧 CORREGIDO: Seleccionar el minuto correcto basado en minuteStep
      if (i === this.selectedTime.minute) {
        option.selected = true;
        Logger.debug("Minute option selected in repopulate", {
          module: "DateTimePicker",
          containerId: this.containerId,
          data: {
            minute: i,
            selectedTime: this.selectedTime.minute,
            minuteStep: this.config.minuteStep
          }
        });
      }
      minuteSelect.appendChild(option);
    }

    Logger.debug("Minutes repopulated", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        minuteSelectValue: minuteSelect.value,
        minuteOptionsCount: minuteSelect.options.length,
        selectedMinute: this.selectedTime.minute
      }
    });
  }

  navigateMonth(direction) {
    Logger.debug("navigateMonth called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        direction: direction,
        currentDate: this.currentDate,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.renderCalendar();
  }

  selectDate(date) {
    if (date instanceof Date && !isNaN(date.getTime())) {
      // 🔧 NUEVO: Validar que la fecha seleccionada cumpla las restricciones
      if (this.isDateDisabled(date)) {
        Logger.warn("Attempted to select disabled date", {
          module: "DateTimePicker",
          containerId: this.containerId,
          showNotification: true,
          notificationMessage: "This date is not available",
          data: { 
            selectedDate: date,
            minDate: this.config.minDate,
            maxDate: this.config.maxDate
          },
        });
        return;
      }

      this.selectedDate = new Date(date);
      
      // 🔧 CORREGIDO: Actualizar estado interno cuando se selecciona fecha
      this._hasValidDate = true;
      this._isDateSelected = true;
      
      Logger.debug("Date selected via calendar - State updated", {
        module: "DateTimePicker",
        containerId: this.containerId,
        showNotification: false,
        data: { 
          selectedDate: this.selectedDate,
          hasValidDate: this._hasValidDate,
          isDateSelected: this._isDateSelected,
          previousState: {
            selectedDateTime: this.selectedDateTime,
            selectedTime: this.selectedTime
          }
        },
      });
      
      this.renderCalendar();
      
      // 🔧 NUEVO: Re-poblar selects de tiempo con restricciones actualizadas
      this.populateTimeSelects();
    } else {
      Logger.warn("Attempted to select invalid date", {
        module: "DateTimePicker",
        containerId: this.containerId,
        showNotification: true,
        notificationMessage: "Invalid date selected",
        data: { date },
      });
    }
  }

  updateSelectedTime() {
    const hourSelect = document.getElementById(`${this.containerId}_hour`);
    const minuteSelect = document.getElementById(`${this.containerId}_minute`);

    const newHour = parseInt(hourSelect.value);
    const newMinute = parseInt(minuteSelect.value);

    Logger.debug("updateSelectedTime called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        newHour: newHour,
        newMinute: newMinute,
        currentSelectedTime: this.selectedTime,
        selectedDate: this.selectedDate,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected,
        minuteStep: this.config.minuteStep
      }
    });

    // 🔧 CORREGIDO: Si cambió la hora, re-poblar los minutos con restricciones actualizadas
    if (newHour !== this.selectedTime.hour) {
      this.selectedTime.hour = newHour;
      this.repopulateMinutes();
      
      // 🔧 CORREGIDO: Mantener el minuto seleccionado si es válido para la nueva hora
      const validMinute = this.selectedTime.minute;
      if (validMinute % this.config.minuteStep === 0) {
        // El minuto actual es válido, mantenerlo
        minuteSelect.value = validMinute;
      } else {
        // El minuto actual no es válido, resetear al minuto válido más cercano
        const adjustedMinute = Math.floor(validMinute / this.config.minuteStep) * this.config.minuteStep;
        this.selectedTime.minute = adjustedMinute;
        minuteSelect.value = adjustedMinute;
        
        Logger.debug("Minute adjusted to valid step", {
          module: "DateTimePicker",
          containerId: this.containerId,
          data: {
            originalMinute: validMinute,
            adjustedMinute: adjustedMinute,
            minuteStep: this.config.minuteStep
          }
        });
      }
    }

    // 🔧 CORREGIDO: Validar que la nueva hora/minuto cumpla las restricciones
    if (this.selectedDate && this.config.minDate) {
      const newDateTime = new Date(this.selectedDate);
      newDateTime.setHours(newHour, newMinute, 0, 0);
      
      if (newDateTime < this.config.minDate) {
        Logger.warn("Selected time is before minimum allowed", {
          module: "DateTimePicker",
          containerId: this.containerId,
          showNotification: true,
          notificationMessage: `Time must be after ${this.config.minDate.toLocaleTimeString()}`,
          data: { 
            newDateTime: newDateTime,
            minDateTime: this.config.minDate
          },
        });
        
        // Restaurar valores anteriores
        hourSelect.value = this.selectedTime.hour;
        minuteSelect.value = this.selectedTime.minute;
        return;
      }
    }

    // 🔧 CORREGIDO: Actualizar tiempo seleccionado con los valores reales del select
    this.selectedTime = {
      hour: newHour,
      minute: newMinute,
    };

    Logger.debug("Time updated successfully", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        newSelectedTime: this.selectedTime,
        selectedDate: this.selectedDate,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected,
        minuteStep: this.config.minuteStep
      }
    });
  }

  confirmSelection() {
    if (this._isConfirming) return; // Evita múltiples ejecuciones
    this._isConfirming = true;

    // Reinicia el flag tras 300ms
    setTimeout(() => {
      this._isConfirming = false;
    }, 300);

    // 🔧 NUEVO: Logging detallado del estado antes de la validación
    Logger.debug("confirmSelection - State before validation", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedDate: this.selectedDate,
        selectedDateTime: this.selectedDateTime,
        selectedTime: this.selectedTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected,
        isValidDate: this.selectedDate instanceof Date && !isNaN(this.selectedDate?.getTime()),
        currentDate: this.currentDate
      }
    });

    // 🔧 CORREGIDO: Validación mejorada usando estado interno
    if (
      !this._hasValidDate ||
      !this._isDateSelected ||
      !this.selectedDate ||
      !(this.selectedDate instanceof Date) ||
      isNaN(this.selectedDate.getTime())
    ) {
      Logger.error("Validation failed: Date not selected or invalid", {
        module: "DateTimePicker",
        containerId: this.containerId,
        showNotification: true,
        notificationMessage: "Please select a date",
        data: {
          selectedDate: this.selectedDate,
          hasValidDate: this._hasValidDate,
          isDateSelected: this._isDateSelected,
          isValidDate:
            this.selectedDate instanceof Date &&
            !isNaN(this.selectedDate?.getTime()),
        },
      });
      return;
    }

    const finalDateTime = new Date(this.selectedDate);
    finalDateTime.setHours(
      this.selectedTime.hour,
      this.selectedTime.minute,
      0,
      0
    );

    // 🔧 NUEVO: Validar que la fecha/hora final cumpla las restricciones
    if (this.config.minDate && finalDateTime < this.config.minDate) {
              Logger.warn("Selected date/time is before minimum allowed", {
          module: "DateTimePicker",
          showNotification: true,
          notificationMessage: `Date/time must be after ${this.config.minDate.toLocaleString()}`,
          data: { 
            selectedDateTime: finalDateTime,
            minDateTime: this.config.minDate
          },
        });
      return;
    }

    // 🔧 NUEVO: Validación adicional usando isTimeDisabled
    if (this.config.minDate && this.isTimeDisabled(this.selectedDate, this.selectedTime.hour, this.selectedTime.minute)) {
      Logger.warn("Selected time is disabled by restrictions", {
        module: "DateTimePicker",
        showNotification: true,
        notificationMessage: "Selected time is not available due to restrictions",
        data: { 
          selectedDateTime: finalDateTime,
          minDateTime: this.config.minDate,
          hour: this.selectedTime.hour,
          minute: this.selectedTime.minute
        },
      });
      return;
    }

    if (this.config.maxDate && finalDateTime > this.config.maxDate) {
              Logger.warn("Selected date/time is after maximum allowed", {
          module: "DateTimePicker",
          showNotification: true,
          notificationMessage: `Date/time must be before ${this.config.maxDate.toLocaleString()}`,
          data: { 
            selectedDateTime: finalDateTime,
            maxDateTime: this.config.maxDate
          },
        });
      return;
    }

    this.selectedDateTime = finalDateTime;
    this.updateDisplay();

    Logger.success("Date and time selected successfully", {
      module: "DateTimePicker",
      showNotification: true,
      notificationMessage: "Date and time selected successfully",
      data: { selectedDateTime: this.selectedDateTime },
    });

    if (this.config.onDateTimeSelect)
      this.config.onDateTimeSelect(this.selectedDateTime);
    if (this.config.onDateTimeChange)
      this.config.onDateTimeChange(this.selectedDateTime, this.containerId);

    if (this.modalInstance) this.modalInstance.hide();
  }

  updateDisplay() {
    const placeholderText = document
      .getElementById(`${this.containerId}_display`)
      .querySelector(".placeholder-text");
    const selectedText = document
      .getElementById(`${this.containerId}_display`)
      .querySelector(".selected-text");
    const clearBtn = document.getElementById(`${this.containerId}_clear`);

    Logger.debug("updateDisplay called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedDateTime: this.selectedDateTime,
        selectedDate: this.selectedDate,
        selectedTime: this.selectedTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    if (!this.selectedDateTime) {
      placeholderText.style.display = "block";
      selectedText.style.display = "none";
      clearBtn.style.opacity = "0";
      clearBtn.style.visibility = "hidden";
    } else {
      placeholderText.style.display = "none";
      selectedText.style.display = "block";
      selectedText.textContent = this.formatDateTime(this.selectedDateTime);
      clearBtn.style.opacity = "1";
      clearBtn.style.visibility = "visible";
    }
  }

  formatDateTime(date) {
    Logger.debug("formatDateTime called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        inputDate: date,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    if (!date) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    const formatted = `${day}-${month}-${year} ${hours}:${minutes}`;

    Logger.debug("formatDateTime result", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        formatted: formatted
      }
    });

    return formatted;
  }

  clearDateTime(showNotification = true) {
    Logger.debug("clearDateTime called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        previousSelectedDateTime: this.selectedDateTime,
        previousSelectedDate: this.selectedDate,
        previousSelectedTime: this.selectedTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    this.selectedDateTime = null;
    this.selectedDate = null;
    this.selectedTime = { ...this.config.defaultTime };
    this._hasValidDate = false;
    this._isDateSelected = false;
    
    this.updateDisplay();

    if (this.config.onDateTimeChange) {
      this.config.onDateTimeChange(null, this.containerId);
    }

    // Solo mostrar notificación si se solicita
    if (showNotification) {
      this.showNotification("Date and time cleared", "info");
    }
  }

  injectStyles() {
    Logger.debug("injectStyles called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    if (document.getElementById("datetime-picker-styles")) {
      Logger.debug("Styles already injected, skipping", {
        module: "DateTimePicker",
        containerId: this.containerId
      });
      return;
    }

    const style = document.createElement("style");
    style.id = "datetime-picker-styles";
    style.textContent = `
            .datetime-picker-container:focus {
                outline: none;
            }

            .datetime-picker-container:hover .datetime-icon {
                transform: translateY(-50%) scale(1.1);
                color: var(--accent-hover);
            }

            .clear-datetime-btn:hover {
                background: rgba(220, 53, 69, 0.1) !important;
                color: #dc3545 !important;
            }

            /* COMPACT Calendar Grid Styles */
            .calendar-grid > div:nth-child(n+8) {
                border-top: 1px solid var(--border-dark);
                margin-top: 0.15rem;
                padding-top: 0.5rem;
            }

            .time-select option {
                background: var(--bg-primary);
                color: var(--text-primary);
                padding: 0.4rem;
            }

            .datetime-picker-container.has-value .datetime-icon {
                color: var(--accent-primary);
            }

            .datetime-picker-container.has-value:hover .clear-datetime-btn {
                opacity: 1 !important;
                visibility: visible !important;
            }

            /* Animation for modal - COMPACT */
            @keyframes calendarFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(-15px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .calendar-grid {
                animation: calendarFadeIn 0.25s ease-out;
            }

            /* COMPACT Modal Adjustments */
            .modal-dialog {
                margin: 1rem auto;
            }

            /* COMPACT Calendar Day Hover Effects */
            .calendar-grid > div:nth-child(n+8):hover {
                transform: scale(1.05);
            }

            /* COMPACT Time Picker Styling */
            .time-select {
                transition: all 0.2s ease;
            }

            .time-select:hover {
                border-color: var(--accent-primary);
            }

            /* COMPACT Quick Time Buttons */
            .btn-quick-time {
                min-width: 50px;
                white-space: nowrap;
            }

            /* Responsive adjustments - COMPACT */
            @media (max-width: 768px) {
                .modal-dialog {
                    max-width: 95% !important;
                    margin: 0.5rem;
                }
                
                .datetime-picker-content {
                    padding: 0;
                }
                
                .time-picker-container {
                    padding: 0.75rem !important;
                }
                
                .calendar-grid {
                    font-size: 0.75rem;
                    gap: 0.1rem;
                }
                
                .calendar-grid > div {
                    padding: 0.4rem 0.15rem !important;
                }

                .quick-time-buttons {
                    gap: 0.3rem !important;
                }

                .btn-quick-time {
                    padding: 0.25rem 0.5rem !important;
                    font-size: 0.7rem !important;
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

            /* Extra Small Screens */
            @media (max-width: 480px) {
                .calendar-grid {
                    gap: 0.05rem;
                }
                
                .calendar-grid > div {
                    padding: 0.3rem 0.1rem !important;
                    font-size: 0.7rem !important;
                }

                .time-component {
                    font-size: 0.8rem;
                }

                .time-select {
                    padding: 0.5rem !important;
                    font-size: 0.85rem !important;
                }
            }

            /* Placeholder color standardization */
            .datetime-picker-container input::placeholder {
                color: var(--text-muted) !important;
            }

            .datetime-picker-container input::-webkit-input-placeholder {
                color: var(--text-muted) !important;
            }

            .datetime-picker-container input::-moz-placeholder {
                color: var(--text-muted) !important;
            }

            .datetime-picker-container input:-ms-input-placeholder {
                color: var(--text-muted) !important;
            }
        `;

    document.head.appendChild(style);
  }

  showNotification(message, type = "info") {
    Logger.debug("showNotification called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        message: message,
        type: type,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

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
      module: "DateTimePicker",
      containerId: this.containerId,
      showNotification: true,
      notificationMessage: message,
    });
  }

  // Public API Methods
  getDateTime() {
    Logger.debug("getDateTime called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedDateTime: this.selectedDateTime,
        selectedDate: this.selectedDate,
        selectedTime: this.selectedTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    return this.selectedDateTime;
  }

  setDateTime(dateTime) {
    Logger.debug('setDateTime called', {
      module: 'DateTimePicker',
      containerId: this.containerId,
      data: { 
        inputDateTime: dateTime,
        inputType: typeof dateTime,
        isDate: dateTime instanceof Date,
        isValid: dateTime instanceof Date && !isNaN(dateTime.getTime()),
        previousState: {
          selectedDateTime: this.selectedDateTime,
          selectedDate: this.selectedDate,
          hasValidDate: this._hasValidDate,
          isDateSelected: this._isDateSelected
        }
      }
    });

    if (dateTime && dateTime instanceof Date && !isNaN(dateTime.getTime())) {
      // 🔧 CORREGIDO: Sincronización completa de fechas
      this.selectedDateTime = new Date(dateTime);
      this.selectedDate = new Date(dateTime);
      this.selectedTime = {
        hour: dateTime.getHours(),
        minute: dateTime.getMinutes(),
      };
      
      // 🔧 CORREGIDO: Actualizar el calendario para mostrar la fecha seleccionada
      this.currentDate = new Date(dateTime);
      
      // 🔧 NUEVO: Marcar como fecha válida y seleccionada
      this._hasValidDate = true;
      this._isDateSelected = true;
      
      Logger.debug('DateTime set successfully', {
        module: 'DateTimePicker',
        containerId: this.containerId,
        data: { 
          selectedDateTime: this.selectedDateTime,
          selectedDate: this.selectedDate,
          selectedTime: this.selectedTime,
          currentDate: this.currentDate,
          hasValidDate: this._hasValidDate,
          isDateSelected: this._isDateSelected
        }
      });
      
      // Solo renderizar si el modal ya está inicializado
      if (document.getElementById(`${this.containerId}_calendar`)) {
        this.renderCalendar();
        this.populateTimeSelects();
      }
    } else {
      this.selectedDateTime = null;
      this.selectedDate = null;
      this.selectedTime = { ...this.config.defaultTime };
      this._hasValidDate = false;
      this._isDateSelected = false;
      
      Logger.debug('DateTime cleared', {
        module: 'DateTimePicker',
        containerId: this.containerId
      });
    }
    this.updateDisplay();
  }

  getISOString() {
    Logger.debug("getISOString called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedDateTime: this.selectedDateTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    return this.selectedDateTime ? this.selectedDateTime.toISOString() : null;
  }

  getFormattedDateTime(format) {
    Logger.debug("getFormattedDateTime called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        format: format,
        selectedDateTime: this.selectedDateTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    if (!this.selectedDateTime) return "";

    const date = this.selectedDateTime;
    const formatMap = {
      DD: String(date.getDate()).padStart(2, "0"),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      YYYY: String(date.getFullYear()),
      HH: String(date.getHours()).padStart(2, "0"),
      mm: String(date.getMinutes()).padStart(2, "0"),
      ss: String(date.getSeconds()).padStart(2, "0"),
    };

    let formattedDate = format || this.config.format;
    Object.keys(formatMap).forEach((key) => {
      formattedDate = formattedDate.replace(
        new RegExp(key, "g"),
        formatMap[key]
      );
    });

    Logger.debug("getFormattedDateTime result", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        formattedDate: formattedDate
      }
    });

    return formattedDate;
  }

  clearSelection(showNotification = true) {
    Logger.debug("clearSelection called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        showNotification: showNotification,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    this.clearDateTime(showNotification); // Pasar el parámetro
  }

  setMinDate(date) {
    Logger.debug("setMinDate called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        newMinDate: date,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    if (date && date instanceof Date && !isNaN(date.getTime())) {
      this.config.minDate = new Date(date);
      Logger.debug('MinDate restriction set', {
        module: 'DateTimePicker',
        containerId: this.containerId,
        minDate: this.config.minDate,
        showNotification: false
      });
      // 🔧 NUEVO: Re-renderizar calendario y re-poblar selects cuando cambian las restricciones
      this.renderCalendar();
      if (this.selectedDate) {
        this.populateTimeSelects();
      }
    } else if (date === null) {
      this.config.minDate = null;
      Logger.debug('MinDate restriction cleared', {
        module: 'DateTimePicker',
        containerId: this.containerId,
        showNotification: false
      });
      this.renderCalendar();
      if (this.selectedDate) {
        this.populateTimeSelects();
      }
    }
  }

  setMaxDate(date) {
    Logger.debug("setMaxDate called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        newMaxDate: date,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    if (date && date instanceof Date && !isNaN(date.getTime())) {
      this.config.maxDate = new Date(date);
      Logger.debug('MaxDate restriction set', {
        module: 'DateTimePicker',
        containerId: this.containerId,
        maxDate: this.config.maxDate,
        showNotification: false
      });
      this.renderCalendar();
    } else if (date === null) {
      this.config.maxDate = null;
      Logger.debug('MaxDate restriction cleared', {
        module: 'DateTimePicker',
        containerId: this.containerId,
        showNotification: false
      });
      this.renderCalendar();
    }
  }

  /**
   * 🔧 NUEVO: Limpiar todas las restricciones de fecha
   */
  clearDateRestrictions() {
    Logger.debug("clearDateRestrictions called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    this.config.minDate = null;
    this.config.maxDate = null;
    Logger.debug('All date restrictions cleared', {
      module: 'DateTimePicker',
      containerId: this.containerId,
      showNotification: false
    });
    this.renderCalendar();
    if (this.selectedDate) {
      this.populateTimeSelects();
    }
  }

  /**
   * 🔧 NUEVO: Verificar si una fecha está deshabilitada por restricciones
   * @param {Date} date - Fecha a verificar
   * @returns {boolean} True si la fecha está deshabilitada
   */
  isDateDisabled(date) {
    Logger.debug("isDateDisabled called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        inputDate: date,
        minDate: this.config.minDate,
        maxDate: this.config.maxDate,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    // Normalizar la fecha para comparación (solo fecha, sin hora)
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Verificar restricción de fecha mínima
    if (this.config.minDate) {
      const minDate = new Date(this.config.minDate);
      minDate.setHours(0, 0, 0, 0);
      
      if (normalizedDate < minDate) {
        Logger.debug("Date is disabled by minDate restriction", {
          module: "DateTimePicker",
          containerId: this.containerId,
          data: {
            normalizedDate: normalizedDate,
            minDate: minDate
          }
        });
        return true;
      }
    }

    // Verificar restricción de fecha máxima
    if (this.config.maxDate) {
      const maxDate = new Date(this.config.maxDate);
      maxDate.setHours(0, 0, 0, 0);
      
      if (normalizedDate > maxDate) {
        Logger.debug("Date is disabled by maxDate restriction", {
          module: "DateTimePicker",
          containerId: this.containerId,
          data: {
            normalizedDate: normalizedDate,
            maxDate: maxDate
          }
        });
        return true;
      }
    }

    return false;
  }

  /**
   * 🔧 NUEVO: Verificar si una hora específica está deshabilitada para una fecha
   * @param {Date} date - Fecha a verificar
   * @param {number} hour - Hora a verificar
   * @param {number} minute - Minuto a verificar
   * @returns {boolean} True si la hora está deshabilitada
   */
  isTimeDisabled(date, hour, minute) {
    Logger.debug("isTimeDisabled called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        inputDate: date,
        inputHour: hour,
        inputMinute: minute,
        minDate: this.config.minDate,
        maxDate: this.config.maxDate,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    // Verificar restricción de fecha/hora mínima
    if (this.config.minDate) {
      const minDate = new Date(this.config.minDate);
      const selectedDateTime = new Date(date);
      selectedDateTime.setHours(hour, minute, 0, 0);
      
      // 🔧 CORREGIDO: Verificar si es el mismo día o un día diferente
      const isSameDay = selectedDateTime.toDateString() === minDate.toDateString();
      
      // Si es un día DIFERENTE, todos los minutos están disponibles
      if (!isSameDay) {
        Logger.debug("Different day, time is available", {
          module: "DateTimePicker",
          containerId: this.containerId,
          data: { 
            selectedDateTime: selectedDateTime.toDateString(),
            minDate: minDate.toDateString(),
            hour: hour,
            minute: minute
          }
        });
        return false;
      }
      
      // Si es el MISMO día, aplicar restricciones de minuto
      // Solo deshabilitar si es estrictamente menor (no igual)
      if (selectedDateTime < minDate) {
        Logger.debug("Time is before minDate, disabled", {
          module: "DateTimePicker",
          containerId: this.containerId,
          data: { 
            selectedDateTime: selectedDateTime,
            minDate: minDate,
            hour: hour,
            minute: minute
          }
        });
        return true;
      }
    }

    // Verificar restricción de fecha/hora máxima
    if (this.config.maxDate) {
      const maxDate = new Date(this.config.maxDate);
      const selectedDateTime = new Date(date);
      selectedDateTime.setHours(hour, minute, 0, 0);
      
      // 🔧 CORREGIDO: Permitir exactamente la hora máxima
      if (selectedDateTime > maxDate) {
        Logger.debug("Time is after maxDate, disabled", {
          module: "DateTimePicker",
          containerId: this.containerId,
          data: { 
            selectedDateTime: selectedDateTime,
            maxDate: maxDate,
            hour: hour,
            minute: minute
          }
        });
        return true;
      }
    }

    Logger.debug("Time is available", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: { 
        hour: hour,
        minute: minute
      }
    });

    return false;
  }

  /**
   * 🔧 NUEVO: Verificar si una hora completa está deshabilitada para una fecha
   * Una hora está deshabilitada si está ANTES de la hora mínima permitida
   * @param {Date} date - Fecha a verificar
   * @param {number} hour - Hora a verificar
   * @returns {boolean} True si toda la hora está deshabilitada
   */
  isHourCompletelyDisabled(date, hour) {
    Logger.debug("isHourCompletelyDisabled called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        inputDate: date,
        inputHour: hour,
        minDate: this.config.minDate,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    // Si no hay restricciones, la hora está disponible
    if (!this.config.minDate) {
      Logger.debug("No minDate restriction, hour is available", {
        module: "DateTimePicker",
        containerId: this.containerId,
        data: { hour: hour }
      });
      return false;
    }

    const minDate = new Date(this.config.minDate);
    
    // 🔧 CORREGIDO: Verificar si es el mismo día o un día diferente
    const selectedDate = new Date(date);
    const isSameDay = selectedDate.toDateString() === minDate.toDateString();
    
    // Si es un día DIFERENTE, todas las horas están disponibles
    if (!isSameDay) {
      Logger.debug("Different day, hour is available", {
        module: "DateTimePicker",
        containerId: this.containerId,
        data: { 
          selectedDate: selectedDate.toDateString(),
          minDate: minDate.toDateString(),
          hour: hour
        }
      });
      return false;
    }
    
    // Si es el MISMO día, aplicar restricciones de hora
    const minHour = minDate.getHours();
    
    // Si la hora está ANTES de la hora mínima, está completamente deshabilitada
    if (hour < minHour) {
      Logger.debug("Hour is before minHour, completely disabled", {
        module: "DateTimePicker",
        containerId: this.containerId,
        data: { 
          hour: hour,
          minHour: minHour
        }
      });
      return true;
    }
    
    // Si la hora es IGUAL a la hora mínima, está activa (pero con restricciones de minutos)
    if (hour === minHour) {
      Logger.debug("Hour equals minHour, active with minute restrictions", {
        module: "DateTimePicker",
        containerId: this.containerId,
        data: { 
          hour: hour,
          minHour: minHour
        }
      });
      return false;
    }
    
    // Si la hora es DESPUÉS de la hora mínima, está completamente activa
    Logger.debug("Hour is after minHour, completely available", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: { 
        hour: hour,
        minHour: minHour
      }
    });
    return false;
  }

  setDefaultTime(time) {
    Logger.debug("setDefaultTime called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        newDefaultTime: time,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    this.config.defaultTime = time;
  }

  isValid() {
    Logger.debug("isValid called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        selectedDateTime: this.selectedDateTime,
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

    return this.selectedDateTime !== null;
  }

  destroy() {
    Logger.debug("destroy called", {
      module: "DateTimePicker",
      containerId: this.containerId,
      data: {
        hasValidDate: this._hasValidDate,
        isDateSelected: this._isDateSelected
      }
    });

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
    this.selectedDateTime = null;
    this.selectedDate = null;
    this.selectedTime = null;
    this._hasValidDate = false;
    this._isDateSelected = false;
  }
}

// Utility class for DateTimePicker management
class DateTimePickerUtils {
  // Create a DateTimePicker with common configuration
  static create(containerId, options = {}) {
    return new DateTimePicker(containerId, {
      minuteStep: 15,
      is24Hour: true,
      theme: "dark",
      ...options,
    });
  }

  // Create multiple DateTimePickers with synchronized configuration
  static createMultiple(configurations) {
    const instances = {};

    configurations.forEach((config) => {
      instances[config.id] = new DateTimePicker(config.id, {
        minuteStep: 15,
        is24Hour: true,
        theme: "dark",
        ...config.options,
      });
    });

    return instances;
  }

  // Collect all DateTimePicker values from a form
  static collectFormData(formId, dateTimeInstances = {}) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const data = {};

    // Get regular form inputs
    const inputs = form.querySelectorAll(
      "input:not(.datetime-hidden), select, textarea"
    );
    inputs.forEach((input) => {
      if (input.id && !input.classList.contains("datetime-hidden")) {
        if (input.type === "checkbox" || input.type === "radio") {
          data[input.id] = input.checked;
        } else {
          data[input.id] = input.value;
        }
      }
    });

    // Get DateTimePicker data
    Object.keys(dateTimeInstances).forEach((key) => {
      const instance = dateTimeInstances[key];
      if (instance && typeof instance.getDateTime === "function") {
        data[key] = instance.getDateTime();
        data[key + "_formatted"] = instance.getFormattedDateTime();
        data[key + "_iso"] = instance.getISOString();
      }
    });

    return data;
  }

  // Clear all DateTimePicker instances in a form
  static clearForm(formId, dateTimeInstances = {}) {
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

    // Clear DateTimePicker instances
    Object.values(dateTimeInstances).forEach((instance) => {
      if (instance && typeof instance.clearSelection === "function") {
        instance.clearSelection();
      }
    });
  }

  // Validate DateTimePicker values
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

      if (rule.minDate && value && new Date(value) < new Date(rule.minDate)) {
        errors.push(rule.message || `${field} must be after ${rule.minDate}`);
      }

      if (rule.maxDate && value && new Date(value) > new Date(rule.maxDate)) {
        errors.push(rule.message || `${field} must be before ${rule.maxDate}`);
      }
    });

    return errors;
  }

  // Setup time range validation (ensure end time is after start time)
  static setupTimeRangeValidation(startInstance, endInstance, options = {}) {
    const { minGapMinutes = 0, onValidationError = null } = options;

    const validateRange = () => {
      const startTime = startInstance.getDateTime();
      const endTime = endInstance.getDateTime();

      if (startTime && endTime) {
        const timeDiff = endTime.getTime() - startTime.getTime();
        const minGap = minGapMinutes * 60 * 1000; // Convert to milliseconds

        if (timeDiff < minGap) {
          const errorMessage =
            minGapMinutes > 0
              ? `End time must be at least ${minGapMinutes} minutes after start time`
              : "End time must be after start time";

          if (onValidationError) {
            onValidationError(errorMessage);
          }
          return false;
        }
      }
      return true;
    };

    // Add validation to both instances
    const originalStartCallback = startInstance.config.onDateTimeChange;
    const originalEndCallback = endInstance.config.onDateTimeChange;

    startInstance.config.onDateTimeChange = function (dateTime) {
      if (originalStartCallback) originalStartCallback(dateTime);
      setTimeout(validateRange, 100);
    };

    endInstance.config.onDateTimeChange = function (dateTime) {
      if (originalEndCallback) originalEndCallback(dateTime);
      setTimeout(validateRange, 100);
    };

    return validateRange;
  }

  // Convert between different datetime formats
  static formatDateTime(date, format = "DD-MM-YYYY HH:mm") {
    if (!date) return "";

    const d = new Date(date);
    const formatMap = {
      DD: String(d.getDate()).padStart(2, "0"),
      MM: String(d.getMonth() + 1).padStart(2, "0"),
      YYYY: String(d.getFullYear()),
      YY: String(d.getFullYear()).slice(-2),
      HH: String(d.getHours()).padStart(2, "0"),
      mm: String(d.getMinutes()).padStart(2, "0"),
      ss: String(d.getSeconds()).padStart(2, "0"),
    };

    let formattedDate = format;
    Object.keys(formatMap).forEach((key) => {
      formattedDate = formattedDate.replace(
        new RegExp(key, "g"),
        formatMap[key]
      );
    });

    return formattedDate;
  }

  // Parse datetime string back to Date object
  static parseDateTime(dateTimeString, format = "DD-MM-YYYY HH:mm") {
    if (!dateTimeString) return null;

    try {
      // Simple parser for DD-MM-YYYY HH:mm format
      if (format === "DD-MM-YYYY HH:mm") {
        const match = dateTimeString.match(
          /(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/
        );
        if (match) {
          const [, day, month, year, hour, minute] = match;
          return new Date(year, month - 1, day, hour, minute);
        }
      }

      // Fallback to native parsing
      return new Date(dateTimeString);
    } catch (error) {
      console.error("Error parsing datetime:", error);
      return null;
    }
  }

  // Get current datetime formatted
  static getCurrentDateTime(format) {
    return this.formatDateTime(new Date(), format);
  }

  // Add time to a date
  static addTime(date, amount, unit = "hours") {
    const newDate = new Date(date);

    switch (unit) {
      case "minutes":
        newDate.setMinutes(newDate.getMinutes() + amount);
        break;
      case "hours":
        newDate.setHours(newDate.getHours() + amount);
        break;
      case "days":
        newDate.setDate(newDate.getDate() + amount);
        break;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }

    return newDate;
  }
}

// Initialize DateTimePicker when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.DateTimePicker = DateTimePicker;
  window.DateTimePickerUtils = DateTimePickerUtils;

  // Global keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    // Close all datetime modals on Escape
    if (e.key === "Escape") {
      const openModals = document.querySelectorAll('.modal.show[id*="_modal"]');
      openModals.forEach((modal) => {
        if (modal.id.includes("_modal")) {
          const modalInstance = bootstrap.Modal.getInstance(modal);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      });
    }
  });
});
