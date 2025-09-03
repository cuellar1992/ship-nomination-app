/**
 * 🚢 Dashboard Manager - Premium Ship Nomination System
 * Gestor principal del dashboard con gráficos premium
 * Compatible con el sistema existente de APIs y componentes
 */

class DashboardManager {
    constructor() {
        this.charts = {};
        this.data = {};
        this.isInitialized = false;
        this.chartColors = [
            '#1fb5d4', // Accent primary (cyan)
            '#0ea5e9', // Accent secondary (blue)
            '#22c55e', // Success (green)
            '#fbbf24', // Warning (amber)
            '#ef4444', // Error (red)
            '#8b5cf6', // Purple
            '#06b6d4', // Cyan
            '#f97316', // Orange
            '#ec4899', // Pink
            '#84cc16', // Lime
            '#06b6d4', // Sky
            '#8b5cf6', // Violet
            '#f59e0b', // Yellow
            '#10b981', // Emerald
            '#6366f1', // Indigo
            '#d946ef', // Fuchsia
            '#14b8a6', // Teal
            '#f43f5e', // Rose
            '#a855f7', // Purple variant
            '#059669'  // Green variant
        ];
        
        this.init();
    }

    /**
     * Inicializar el dashboard
     */
    async init() {
        try {
            // Evitar múltiples inicializaciones
            if (this.isInitialized) {
                console.log('🔄 Dashboard ya inicializado, saltando...');
                return;
            }
            
            console.log('🚀 Initializing Dashboard Manager...');
            
            // Verificar dependencias
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js no está cargado');
            }

            // Configurar Chart.js global
            this.configureChartJS();
            
            // Cargar datos iniciales
            await this.loadDashboardData();
            
            // Inicializar gráficos
            this.initializeCharts();
            
            // Configurar actualizaciones automáticas
            this.setupAutoRefresh();
            
            this.isInitialized = true;
            console.log('✅ Dashboard Manager inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Dashboard Manager:', error);
            this.showError('Error inicializando dashboard', error.message);
        }
    }

    /**
     * Configurar Chart.js con tema premium
     */
    configureChartJS() {
        // Verificar si el plugin de datalabels está disponible
        if (typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
            console.log('✅ Plugin DataLabels registrado');
        } else {
            console.warn('⚠️ Plugin DataLabels no disponible');
        }
        
        // Configuración global de Chart.js
        Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#9ca3af'; // text-secondary
        
        // Configuración de tooltips
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(11, 15, 21, 0.95)';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.05)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.cornerRadius = 12;
        Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
        Chart.defaults.plugins.tooltip.bodyColor = '#9ca3af';
        
        // Configuración de legendas
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.padding = 20;
        Chart.defaults.plugins.legend.labels.color = '#9ca3af';
        
        // Configuración de animaciones
        Chart.defaults.animation.duration = 1000;
        Chart.defaults.animation.easing = 'easeOutQuart';
    }

    /**
     * Cargar datos del dashboard desde las APIs existentes
     */
    async loadDashboardData() {
        try {
            console.log('📊 Cargando datos del dashboard...');
            
            // Cargar datos en paralelo para mejor performance
            const [nominations, rosters, samplers, terminals, truckWorkDays] = await Promise.all([
                this.fetchShipNominations(),
                this.fetchSamplingRosters(),
                this.fetchSamplers(),
                this.fetchTerminals(),
                this.fetchTruckWorkDays()
            ]);

            this.data = {
                nominations,
                rosters,
                samplers,
                terminals,
                truckWorkDays,
                lastUpdated: new Date()
            };

            console.log('✅ Datos del dashboard cargados:', this.data);
            
            // DEBUG: Log para verificar que los datos estén completos
            console.log('🔍 DEBUG loadDashboardData - Antes de updateKPIs:', {
                nominationsCount: this.data.nominations?.length || 0,
                rostersCount: this.data.rosters?.length || 0,
                samplersCount: this.data.samplers?.length || 0,
                terminalsCount: this.data.terminals?.length || 0,
                truckWorkDaysCount: this.data.truckWorkDays?.length || 0
            });
            
            // Actualizar KPIs con los nuevos datos
            this.updateKPIs();
            
        } catch (error) {
            console.error('❌ Error cargando datos del dashboard:', error);
            throw error;
        }
    }

    /**
     * Obtener nominaciones de barcos
     */
    async fetchShipNominations() {
        try {
            const response = await fetch('/api/shipnominations');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('🚢 Nominaciones cargadas:', data.data || []);
            
            // Log adicional para debugging de estados
            if (data.data && data.data.length > 0) {
                const statusCounts = {};
                data.data.forEach(nomination => {
                    const status = nomination.status || 'Pending';
                    statusCounts[status] = (statusCounts[status] || 0) + 1;
                });
                console.log('📊 Distribución de estados en nominaciones:', statusCounts);
            }
            
            return data.data || [];
        } catch (error) {
            console.error('Error fetching ship nominations:', error);
            return [];
        }
    }

    /**
     * Obtener cronogramas de muestreo
     */
    async fetchSamplingRosters() {
        try {
            const response = await fetch('/api/sampling-rosters');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching sampling rosters:', error);
            return [];
        }
    }

    /**
     * Obtener datos de samplers
     */
    async fetchSamplers() {
        try {
            const response = await fetch('/api/samplers');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            // DEBUG: Log para diagnosticar cuántos samplers se cargan
            console.log('🔍 DEBUG fetchSamplers:', {
                responseStatus: response.status,
                responseData: data,
                samplersCount: data.data?.length || 0,
                samplers: data.data?.map(s => ({ name: s.name, id: s._id })) || []
            });
            
            return data.data || [];
        } catch (error) {
            console.error('Error fetching samplers:', error);
            return [];
        }
    }

    /**
     * Obtener datos de terminales
     */
    async fetchTerminals() {
        try {
            const response = await fetch('/api/terminals');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('🏭 Terminales cargados:', data.data || []);
            return data.data || [];
        } catch (error) {
            console.error('Error fetching terminals:', error);
            return [];
        }
    }

    /**
     * Obtener datos de truck work days (Molekulis Loading)
     */
    async fetchTruckWorkDays() {
        try {
            const response = await fetch('/api/truckworkdays');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('🚛 Truck Work Days cargados:', data.data || []);
            return data.data || [];
        } catch (error) {
            console.error('Error fetching truck work days:', error);
            return [];
        }
    }

    /**
     * Inicializar todos los gráficos
     */
    initializeCharts() {
        try {
            console.log('📈 Inicializando gráficos del dashboard...');
            
            // Gráfico 1: Tendencias Mensuales
            this.initializeTrendsChart();
            
            // Gráfico 2: Distribución por Terminal
            this.initializeTerminalDistributionChart();
            
            // Gráfico 3: Carga de Trabajo General
            this.initializeWorkloadChart();
            
            // Gráfico 4: Disponibilidad Semanal
            this.initializeWeeklyAvailabilityChart();
            
            // Gráfico 5: Estado de Rosters
            this.initializeNominationsStatusChart();
            
            // Gráfico 6: Horas Semanales por Sampler
            this.initializeWeeklyHoursChart();
            
            // ✅ Gráfico 7: Estados de Rosters (NUEVO)
            this.initializeRosterStatusChart();
            
            // ✅ Inicializar sistema de tarjetas giratorias
            this.initializeFlipCards();
            
            console.log('✅ Todos los gráficos inicializados correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando gráficos:', error);
            throw error;
        }
    }

    /**
     * Gráfico 1: Tendencias Mensuales (Line Chart)
     */
    initializeTrendsChart() {
        const ctx = document.getElementById('trendsChart');
        if (!ctx) return;

        const monthlyData = this.calculateMonthlyTrends();
        console.log('📈 Inicializando gráfico de tendencias mensuales con datos reales:', monthlyData);
        
        // Validar que hay datos para mostrar
        const hasData = monthlyData.nominations.some(count => count > 0) || monthlyData.rosters.some(count => count > 0);
        if (!hasData) {
            console.warn('⚠️ No hay datos reales para mostrar en el gráfico de tendencias');
            // Mostrar mensaje de "Sin datos" en el canvas
            ctx.style.display = 'none';
            const noDataDiv = document.createElement('div');
            noDataDiv.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <div>No hay datos disponibles para mostrar tendencias</div>
                    <div style="font-size: 0.875rem; margin-top: 0.5rem;">Los datos aparecerán cuando se creen nominaciones y rosters</div>
                </div>
            `;
            ctx.parentElement.appendChild(noDataDiv);
            return;
        }
        
        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Nominations',
                        data: monthlyData.nominations,
                        borderColor: this.chartColors[0],
                        backgroundColor: this.chartColors[0] + '20',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: this.chartColors[0],
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Generated Rosters',
                        data: monthlyData.rosters,
                        borderColor: this.chartColors[1],
                        backgroundColor: this.chartColors[1] + '20',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: this.chartColors[1],
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                                         tooltip: {
                         mode: 'index',
                         intersect: false,
                         backgroundColor: 'rgba(11, 15, 21, 0.95)',
                         borderColor: 'rgba(255, 255, 255, 0.05)',
                         borderWidth: 1,
                         cornerRadius: 12,
                         callbacks: {
                             title: function(context) {
                                 const monthIndex = context[0].dataIndex;
                                 const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                                   'July', 'August', 'September', 'October', 'November', 'December'];
                                 return monthNames[monthIndex] || context[0].label;
                             },
                             label: function(context) {
                                 const label = context.dataset.label || '';
                                 const value = context.parsed.y;
                                 return `${label}: ${value}`;
                             }
                         }
                     }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            beginAtZero: true
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    /**
     * Gráfico 2: Distribución por Terminal (Bar Chart 3D)
     */
    initializeTerminalDistributionChart() {
        const ctx = document.getElementById('terminalDistributionChart');
        if (!ctx) return;

        const terminalData = this.calculateTerminalDistribution();
        console.log('🏭 Inicializando gráfico de distribución por terminal con datos reales:', terminalData);
        
        // Validar que hay datos para mostrar
        if (!terminalData.labels.length || !terminalData.values.length) {
            console.warn('⚠️ No hay datos reales para mostrar en el gráfico de distribución por terminal');
            // Mostrar mensaje de "Sin datos" en el canvas
            ctx.style.display = 'none';
            const noDataDiv = document.createElement('div');
            noDataDiv.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-industry" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <div>No hay nominaciones asignadas a terminales</div>
                    <div style="font-size: 0.875rem; margin-top: 0.5rem;">Los datos aparecerán cuando se creen nominaciones con terminales asignados</div>
                </div>
            `;
            ctx.parentElement.appendChild(noDataDiv);
            return;
        }

        // Restaurar el canvas si estaba oculto
        ctx.style.display = 'block';
        
        this.charts.terminalDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: terminalData.labels,
                datasets: [{
                    label: 'Nominations per Terminal',
                    data: terminalData.values,
                    backgroundColor: this.chartColors.map(color => color + 'CC'),
                    borderColor: this.chartColors,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    hoverBackgroundColor: this.chartColors.map(color => color + 'FF')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(11, 15, 21, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            title: function(context) {
                                return `Terminal: ${context[0].label}`;
                            },
                            label: function(context) {
                                const value = context.parsed.y;
                                const total = terminalData.totalNominations;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `Nominations: ${value} (${percentage}%)`;
                            }
                        }
                    },
                    datalabels: {
                        color: '#ffffff',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        anchor: 'end',
                        align: 'top',
                        offset: 4,
                        formatter: function(value) {
                            return value;
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: {
                                size: 11,
                                weight: '600'
                            },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            beginAtZero: true,
                            font: {
                                size: 11,
                                weight: '600'
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20
                    }
                }
            }
        });
    }

    /**
     * Gráfico 3: Carga de Trabajo General (Dual View: Monthly/Weekly)
     */
    initializeWorkloadChart() {
        const ctx = document.getElementById('workloadChart');
        if (!ctx) return;

        // Crear contenedor para controles de vista
        const chartContainer = ctx.parentElement;
        this.createWorkloadViewControls(chartContainer);

        // Inicializar con vista mensual por defecto
        this.currentWorkloadView = 'monthly';
        
        // Crear el primer gráfico (mensual)
        this.createWorkloadChart();
    }

    /**
     * Crear controles para cambiar entre vista mensual y semanal
     */
    createWorkloadViewControls(container) {
        // Obtener fechas de la semana actual
        const weekStart = this.getWeekStart();
        const weekEnd = this.getWeekEnd();
        
        // Formatear fechas para mostrar
        const formatDate = (date) => {
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
        };
        
        const weekRangeText = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
        
        const controlsHtml = `
            <div class="workload-view-controls">
                <div class="view-toggle">
                    <button class="view-btn active" data-view="monthly">
                        <i class="fas fa-calendar-alt"></i> Monthly
                    </button>
                    <button class="view-btn" data-view="weekly">
                        <i class="fas fa-calendar-week"></i> Weekly
                    </button>
                </div>
                <div class="week-dates" id="weekDates" style="display: none;">
                    <span class="week-range">
                        <i class="fas fa-calendar-day"></i>
                        ${weekRangeText}
                    </span>
                </div>
            </div>
        `;
        
        // Crear contenedor estructurado para el gráfico
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'workload-chart-container';
        
        // Insertar controles
        chartWrapper.innerHTML = controlsHtml;
        
        // Agregar wrapper para el canvas
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'workload-chart-wrapper';
        
        // Mover el canvas al wrapper
        const canvas = container.querySelector('canvas');
        if (canvas) {
            canvasWrapper.appendChild(canvas);
        }
        
        // Agregar wrapper al contenedor principal
        chartWrapper.appendChild(canvasWrapper);
        
        // Reemplazar el contenido del contenedor
        container.innerHTML = '';
        container.appendChild(chartWrapper);

        // Agregar event listeners
        const viewButtons = container.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchWorkloadView(view);
            });
        });
    }

    /**
     * Cambiar entre vista mensual y semanal
     */
    switchWorkloadView(view) {
        if (this.currentWorkloadView === view) return;
        
        this.currentWorkloadView = view;
        
        // Actualizar botones activos
        const viewButtons = document.querySelectorAll('.workload-view-controls .view-btn');
        viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Mostrar/ocultar fechas de la semana según la vista
        const weekDatesElement = document.getElementById('weekDates');
        if (weekDatesElement) {
            weekDatesElement.style.display = view === 'weekly' ? 'block' : 'none';
        }

        // Actualizar gráfico
        this.updateWorkloadChart();
        
        console.log(`🔄 Cambiando vista de carga de trabajo a: ${view}`);
    }

    /**
     * Crear el gráfico de carga de trabajo inicial
     */
    createWorkloadChart() {
        const ctx = document.getElementById('workloadChart');
        if (!ctx) return;

        let workloadData = this.calculateMonthlyWorkload();
        console.log('📊 Datos de carga de trabajo mensual:', workloadData);

        // Detectar estado vacío (todos los valores en 0 o sin labels)
        const values = (workloadData?.datasets?.[0]?.data) || [];
        const isEmpty = workloadData.labels.length === 0 || values.every(v => v === 0);

        // Si está vacío, renderizar donut gris de "sin datos"
        if (isEmpty) {
            workloadData = {
                labels: ['No data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#4b5563'],
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 2
                }]
            };
        }
        
        this.charts.workload = new Chart(ctx, {
            type: 'doughnut',
            data: workloadData,
            options: this.getMonthlyWorkloadOptions(isEmpty)
        });
        
        console.log('✅ Gráfico de carga de trabajo mensual creado');
    }

    /**
     * Actualizar gráfico de carga de trabajo según la vista actual
     */
    updateWorkloadChart() {
        const ctx = document.getElementById('workloadChart');
        if (!ctx) return;

        let workloadData;
        let chartType;
        let chartOptions;

        if (this.currentWorkloadView === 'monthly') {
            workloadData = this.calculateMonthlyWorkload();
            chartType = 'doughnut';
            const values = (workloadData?.datasets?.[0]?.data) || [];
            const isEmpty = workloadData.labels.length === 0 || values.every(v => v === 0);
            if (isEmpty) {
                workloadData = {
                    labels: ['No data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#4b5563'],
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 2
                    }]
                };
            }
            chartOptions = this.getMonthlyWorkloadOptions(isEmpty);
        } else {
            workloadData = this.calculateWeeklyWorkload();
            chartType = 'bar';
            chartOptions = this.getWeeklyWorkloadOptions();
        }

        // Destruir gráfico anterior si existe
        if (this.charts.workload) {
            this.charts.workload.destroy();
        }

        // Crear nuevo gráfico
        this.charts.workload = new Chart(ctx, {
            type: chartType,
            data: workloadData,
            options: chartOptions
        });
    }

    /**
     * Calcular carga de trabajo mensual (datos reales)
     */
    calculateMonthlyWorkload() {
        const samplerNames = (this.data?.samplers || []).map(s => s.name);

        // Si no hay lista de samplers aún, devolver dataset vacío (evita errores)
        if (!this.data?.samplers) {
            return { labels: [], datasets: [{ data: [] }] };
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Calcular inicio y fin del mes actual
        const monthStart = new Date(currentYear, currentMonth, 1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        console.log('📅 Calculando carga mensual para:', {
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString(),
            totalRosters: (this.data?.rosters || []).length,
            totalTruckWorkDays: (this.data?.truckWorkDays || []).length
        });
        
        const monthlyHours = {};
        
        // Procesar todos los rosters y calcular solapamiento con el mes actual
        (this.data?.rosters || []).forEach(roster => {
            // Office Sampling: calcular solapamiento con el mes
            if (roster.officeSampling && roster.officeSampling.sampler && roster.officeSampling.startTime && roster.officeSampling.finishTime) {
                const samplerName = roster.officeSampling.sampler.name;
                const overlap = this.getOverlapHours(roster.officeSampling.startTime, roster.officeSampling.finishTime, monthStart, monthEnd);
                if (overlap > 0) {
                    monthlyHours[samplerName] = (monthlyHours[samplerName] || 0) + overlap;
                    console.log(`📊 Monthly - ${samplerName}: +${overlap}h (Office overlap - ${roster.vesselName})`);
                }
            }
            
            // Line Sampling: calcular solapamiento por cada turno
            if (roster.lineSampling) {
                roster.lineSampling.forEach(line => {
                    if (line.sampler && line.startTime && line.finishTime) {
                        const samplerName = line.sampler.name;
                        const overlap = this.getOverlapHours(line.startTime, line.finishTime, monthStart, monthEnd);
                        if (overlap > 0) {
                            monthlyHours[samplerName] = (monthlyHours[samplerName] || 0) + overlap;
                            console.log(`📊 Monthly - ${samplerName}: +${overlap}h (Line overlap - ${roster.vesselName})`);
                        }
                    }
                });
            }
        });

        // 🚛 Procesar truck work days (Molekulis Loading) y calcular solapamiento con el mes actual
        (this.data?.truckWorkDays || []).forEach(truckDay => {
            if (truckDay.shift && truckDay.shift.startTime && truckDay.shift.endTime && truckDay.samplerName) {
                const samplerName = truckDay.samplerName;
                const overlap = this.getOverlapHours(truckDay.shift.startTime, truckDay.shift.endTime, monthStart, monthEnd);
                if (overlap > 0) {
                    monthlyHours[samplerName] = (monthlyHours[samplerName] || 0) + overlap;
                    console.log(`📊 Monthly - ${samplerName}: +${overlap}h (Truck overlap - ${truckDay.terminal})`);
                }
            }
        });

        let labels = Object.keys(monthlyHours);
        let values = Object.values(monthlyHours);

        // Fallback: si no hay horas registradas en el mes, mostrar todos los samplers con 0
        if (labels.length === 0) {
            labels = samplerNames;
            values = labels.map(() => 0);
        }

        console.log('📊 Horas mensuales calculadas:', { labels, values, monthlyHours });

        return {
            labels,
            datasets: [{
                data: values,
                backgroundColor: this.chartColors.slice(0, labels.length),
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
                hoverOffset: 4
            }]
        };
    }

    /**
     * Calcular carga de trabajo semanal (datos reales)
     * Ahora incluye separación entre horas normales y exceso para samplers con restricción
     */
    calculateWeeklyWorkload() {
        const samplerNames = (this.data?.samplers || []).map(s => s.name);

        // Si no hay lista de samplers aún, devolver datasets vacíos
        if (!this.data?.samplers) {
            return { labels: [], datasets: [] };
        }

        const weekStart = this.getWeekStart();
        const weekEnd = this.getWeekEnd();
        
        console.log('📅 Calculando carga semanal para:', {
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            totalRosters: (this.data?.rosters || []).length,
            totalTruckWorkDays: (this.data?.truckWorkDays || []).length
        });
        
        const weeklyHours = {};
        
        // Procesar rosters de la semana actual (si existen)
        (this.data?.rosters || []).forEach(roster => {
            // Debug selectivo
            const involvesCesar = roster.officeSampling?.sampler?.name === 'Cesar' || roster.lineSampling?.some(line => line.sampler?.name === 'Cesar');

            // Office Sampling: prorratear por traslape con la semana
            if (roster.officeSampling && roster.officeSampling.sampler) {
                    const samplerName = roster.officeSampling.sampler.name;
                const overlap = this.getOverlapHours(roster.officeSampling.startTime, roster.officeSampling.finishTime, weekStart, weekEnd);
                if (overlap > 0) {
                    weeklyHours[samplerName] = (weeklyHours[samplerName] || 0) + overlap;
                }
                if (involvesCesar) {
                    console.log('🔍 Office overlap', { samplerName, overlap, start: roster.officeSampling.startTime, end: roster.officeSampling.finishTime });
                }
            }

            // Line Sampling: prorratear cada turno por traslape
                if (roster.lineSampling) {
                    roster.lineSampling.forEach(line => {
                    if (line.sampler) {
                            const samplerName = line.sampler.name;
                        const overlap = this.getOverlapHours(line.startTime, line.finishTime, weekStart, weekEnd);
                        if (overlap > 0) {
                            weeklyHours[samplerName] = (weeklyHours[samplerName] || 0) + overlap;
                        }
                        if (involvesCesar) {
                            console.log('🔍 Line overlap', { samplerName, overlap, start: line.startTime, end: line.finishTime });
                }
                    }
                });
            }
        });

        // 🚛 Procesar truck work days (Molekulis Loading) y calcular solapamiento con la semana actual
        (this.data?.truckWorkDays || []).forEach(truckDay => {
            if (truckDay.shift && truckDay.shift.startTime && truckDay.shift.endTime && truckDay.samplerName) {
                const samplerName = truckDay.samplerName;
                const overlap = this.getOverlapHours(truckDay.shift.startTime, truckDay.shift.endTime, weekStart, weekEnd);
                if (overlap > 0) {
                    weeklyHours[samplerName] = (weeklyHours[samplerName] || 0) + overlap;
                    console.log(`📊 Weekly - ${samplerName}: +${overlap}h (Truck overlap - ${truckDay.terminal})`);
                }
            }
        });

        let labels = Object.keys(weeklyHours);
        
        // Crear dos datasets: uno para horas normales y otro para exceso
        let normalHours = [];
        let excessHours = [];
        
        // Fallback: si no hay horas registradas en la semana, usar todos los samplers con 0
        if (labels.length === 0) {
            labels = samplerNames;
            normalHours = labels.map(() => 0);
            excessHours = labels.map(() => 0);
        } else {
        labels.forEach(samplerName => {
            // Round total to nearest hour to avoid 12.999999 artifacts
            const totalHours = Math.round(weeklyHours[samplerName]);
            const sampler = this.data.samplers.find(s => s.name === samplerName);
            const weeklyLimit = sampler?.weeklyRestriction ? 24 : 38; // ✅ Límite australiano estándar
            
            if (totalHours <= weeklyLimit) {
                // Dentro del límite: solo horas normales
                normalHours.push(totalHours);
                excessHours.push(0);
            } else {
                // Excede el límite: separar en normales y exceso
                normalHours.push(weeklyLimit);
                excessHours.push(totalHours - weeklyLimit);
            }
        });
        }

        return {
            labels,
            datasets: [
                {
                    label: 'Normal Hours',
                    data: normalHours,
                    backgroundColor: this.chartColors[2] + 'CC',
                    borderColor: this.chartColors[2],
                    borderWidth: 2,
                    borderRadius: 8,
                    stack: 'stack1'
                },
                {
                    label: 'Excess Hours',
                    data: excessHours,
                    backgroundColor: this.chartColors[4] + 'CC',
                    borderColor: this.chartColors[4],
                    borderWidth: 2,
                    borderRadius: 8,
                    stack: 'stack1'
                }
            ]
        };
    }

    /**
     * Opciones para gráfico mensual (doughnut)
     */
    getMonthlyWorkloadOptions(isEmpty = false) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    display: !isEmpty,
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        color: '#9ca3af',
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(11, 15, 21, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${label}: ${value}h (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    color: '#ffffff',
                    display: !isEmpty,
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    formatter: function(value, context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                        return `${percentage}%`;
                    }
                }
            },
            cutout: '50%',
            layout: {
                padding: {
                    top: 20,
                    bottom: 20
                }
            }
        };
    }

    /**
     * Opciones para gráfico semanal (bar)
     * ✅ VERSIÓN ACTUALIZADA - Labels con mejor separación
     */
    getWeeklyWorkloadOptions() {
        console.log('🔧 Cargando configuración semanal con labels separados');
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,          // Espaciado compacto entre elementos de leyenda
                        color: '#9ca3af',
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    },
                    // Separar la leyenda del gráfico
                    align: 'center',
                    fullSize: true,
                    maxHeight: 40,           // Altura compacta para la leyenda
                    plugins: {
                        padding: {
                            bottom: 8        // Espacio mínimo entre leyenda y gráfico
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(11, 15, 21, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    borderWidth: 1,
                    cornerRadius: 12,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (value > 0) {
                                return `${label}: ${value}h`;
                            }
                            return null; // No mostrar labels con valor 0
                        },
                        afterBody: function(context) {
                            const totalHours = context.reduce((sum, item) => sum + item.parsed.y, 0);
                            const samplerName = context[0].label;
                            const sampler = window.dashboardManager?.data?.samplers?.find(s => s.name === samplerName);
                            const weeklyLimit = sampler?.weeklyRestriction ? 24 : 38; // ✅ Límite australiano estándar
                            
                            if (totalHours > weeklyLimit) {
                                return [
                                    '',
                                    `Total: ${totalHours}h`, 
                                    `Limit: ${weeklyLimit}h`, 
                                    `Excess: ${totalHours - weeklyLimit}h` 
                                ];
                            } else {
                                return [
                                    '',
                                    `Total: ${totalHours}h`, 
                                    `Limit: ${weeklyLimit}h` 
                                ];
                            }
                        }
                    }
                },
                datalabels: {
                    color: '#ffffff',
                    font: {
                        size: 11,
                        weight: 'bold'
                    },
                    anchor: 'center',     // Centrar en la barra
                    align: 'center',      // Alinear al centro
                    offset: 0,            // Sin offset, perfectamente centrado
                    formatter: function(value, context) {
                        if (value > 0) {
                            return `${value}h`;
                        }
                        return ''; // No mostrar labels con valor 0
                    },
                    // Agregar fondo semi-transparente para mejor legibilidad
                    backgroundColor: function(context) {
                        return 'rgba(0, 0, 0, 0.4)';
                    },
                    borderRadius: 4,
                    padding: {
                        top: 2,
                        bottom: 2,
                        left: 6,
                        right: 6
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            size: 11,
                            weight: '600'
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        beginAtZero: true,
                        font: {
                            size: 11,
                            weight: '600'
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 15,   // Menos espacio ya que labels están dentro de barras
                    bottom: 15,
                    left: 8,
                    right: 8
                }
            },
            // Mejorar separación entre barras para evitar que se monten los números
            datasets: {
                bar: {
                    barPercentage: 0.7,      // Ancho de cada barra (70% del espacio disponible)
                    categoryPercentage: 0.8   // Separación entre grupos de barras (80% del espacio)
                }
            }
        };
    }

    /**
     * Gráfico 4: Disponibilidad Semanal (Heatmap)
     */
    initializeWeeklyAvailabilityChart() {
        const container = document.getElementById('weeklyAvailabilityChart');
        if (!container) return;

        const availabilityData = this.calculateWeeklyAvailability();
        console.log('📅 Datos de disponibilidad semanal REALES:', availabilityData);
        this.renderWeeklyAvailabilityHeatmap(container, availabilityData);
    }

    /**
     * Gráfico 5: Estado de Rosters (Funnel)
     */
    initializeNominationsStatusChart() {
        const container = document.getElementById('nominationsStatusChart');
        if (!container) return;

        const statusData = this.calculateNominationsStatus();
        console.log('📊 Inicializando gráfico de estado de rosters con datos reales:', statusData);
        this.renderNominationsStatusFunnel(container, statusData);
    }

    /**
     * Gráfico 6: Horas Semanales por Sampler (Horizontal Bar)
     */
    initializeWeeklyHoursChart() {
        const container = document.getElementById('weeklyHoursChart');
        if (!container) {
            console.error('❌ Container weeklyHoursChart no encontrado');
            return;
        }

        console.log('🚀 Inicializando gráfico de horas semanales...');
        const weeklyHoursData = this.calculateWeeklyHours();
        console.log('📊 Datos de horas semanales calculados:', weeklyHoursData);
        
        this.renderWeeklyHoursBars(container, weeklyHoursData);
        console.log('✅ Gráfico de horas semanales inicializado');
    }

    /**
     * ✅ Gráfico 7: Estados de Rosters (NUEVO)
     */
    initializeRosterStatusChart() {
        const container = document.getElementById('rosterStatusChart');
        if (!container) return;

        const rosterStatusData = this.calculateRosterStatusDistribution();
        console.log('📊 Inicializando gráfico de estados de rosters con lógica inteligente:', rosterStatusData);
        this.renderRosterStatusChart(container, rosterStatusData);
    }

    /**
     * Calcular tendencias mensuales REALES desde la base de datos
     */
    calculateMonthlyTrends() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        
        // Inicializar contadores mensuales
        const monthlyData = {};
        months.forEach((month, index) => {
            monthlyData[index] = {
                nominations: 0,
                rosters: 0
            };
        });
        
        // Procesar nominaciones reales
        if (this.data.nominations) {
            this.data.nominations.forEach(nomination => {
                try {
                    const nominationDate = new Date(nomination.createdAt || nomination.date || nomination.arrivalDate || new Date());
                    if (!isNaN(nominationDate.getTime()) && nominationDate.getFullYear() === currentYear) {
                        const monthIndex = nominationDate.getMonth();
                        monthlyData[monthIndex].nominations++;
                    }
                } catch (error) {
                    console.warn('⚠️ Error procesando fecha de nominación:', nomination, error);
                }
            });
        }
        
        // Procesar rosters reales
        if (this.data.rosters) {
            this.data.rosters.forEach(roster => {
                try {
                    const rosterDate = new Date(roster.createdAt || roster.date || roster.samplingDate || new Date());
                    if (!isNaN(rosterDate.getTime()) && rosterDate.getFullYear() === currentYear) {
                        const monthIndex = rosterDate.getMonth();
                        monthlyData[monthIndex].rosters++;
                    }
                } catch (error) {
                    console.warn('⚠️ Error procesando fecha de roster:', roster, error);
                }
            });
        }
        
        // Preparar datos para el gráfico
        const labels = months;
        const nominations = months.map((_, index) => monthlyData[index].nominations);
        const rosters = months.map((_, index) => monthlyData[index].rosters);
        
        console.log('📊 Datos de tendencias mensuales REALES:', {
            labels,
            nominations,
            rosters,
            totalNominations: nominations.reduce((a, b) => a + b, 0),
            totalRosters: rosters.reduce((a, b) => a + b, 0)
        });
        
        return { labels, nominations, rosters };
    }

    /**
     * Calcular distribución por terminal REAL desde la base de datos
     */
    calculateTerminalDistribution() {
        if (!this.data.terminals || !this.data.nominations) {
            console.warn('⚠️ No hay datos de terminales o nominaciones para calcular distribución');
            return { labels: [], values: [] };
        }

        const terminalCounts = {};
        let totalNominations = 0;
        
        // Procesar nominaciones reales y contar por terminal
        this.data.nominations.forEach(nomination => {
            try {
                // Verificar si la nominación tiene terminal asignado
                if (nomination.terminal && nomination.terminal.name) {
                    const terminalName = nomination.terminal.name;
                    terminalCounts[terminalName] = (terminalCounts[terminalName] || 0) + 1;
                    totalNominations++;
                } else if (nomination.terminalId) {
                    // Si solo tenemos el ID, buscar el nombre del terminal
                    const terminal = this.data.terminals.find(t => t._id === nomination.terminalId);
                    if (terminal && terminal.name) {
                        terminalCounts[terminal.name] = (terminalCounts[terminal.name] || 0) + 1;
                        totalNominations++;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Error procesando nominación para distribución por terminal:', nomination, error);
            }
        });

        // Ordenar por cantidad de nominaciones (descendente)
        const sortedTerminals = Object.entries(terminalCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([name, count]) => ({ name, count }));

        const labels = sortedTerminals.map(t => t.name);
        const values = sortedTerminals.map(t => t.count);

        console.log('🏭 Datos de distribución por terminal REALES:', {
            labels,
            values,
            totalNominations,
            terminalCounts,
            totalTerminals: this.data.terminals.length
        });

        return { labels, values, totalNominations };
    }



    /**
     * Calcular disponibilidad semanal REAL desde la base de datos
     */
    calculateWeeklyAvailability() {
        if (!this.data.samplers) {
            return [];
        }

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return this.data.samplers.map(sampler => {
            const availability = days.map(day => {
                // Verificar restricciones reales de la base de datos
                if (sampler.weekDayRestrictions && sampler.weekDayRestrictions[this.getDayKey(day)]) {
                    return 'restricted';
                }
                
                // Si no hay restricciones, está disponible
                return 'available';
            });
            
            return {
                name: sampler.name,
                availability,
                restrictions: sampler.weekDayRestrictions || {}
            };
        });
    }

    /**
     * Calcular estado de rosters REAL desde la base de datos
     * Ahora muestra solo datos de rosters, no nominaciones
     */
    calculateNominationsStatus() {
        if (!this.data.rosters || this.data.rosters.length === 0) {
            console.warn('⚠️ No hay rosters para calcular estados');
            return [];
        }

        // ✅ Estados REALES del sistema según los modelos de base de datos
        const statuses = ['confirmed', 'in_progress', 'completed'];
        
        // Contar nominaciones por estado
        const statusCounts = {};
        statuses.forEach(status => {
            statusCounts[status] = 0;
        });
        
        // Procesar nominaciones reales
        this.data.nominations.forEach(nomination => {
            try {
                const status = nomination.status || 'draft';
                if (statusCounts.hasOwnProperty(status)) {
                    statusCounts[status]++;
                } else {
                    // Si el estado no está en la lista, contarlo como 'confirmed' (estado por defecto)
                    statusCounts['confirmed']++;
                }
            } catch (error) {
                console.warn('⚠️ Error procesando estado de nominación:', nomination, error);
                statusCounts['confirmed']++;
            }
        });

        // ✅ Información adicional para el gráfico
        let additionalInfo = '';
        if (this.data.rosters && this.data.rosters.length > 0) {
            const rosterStatusCounts = {};
            this.data.rosters.forEach(roster => {
                const rosterStatus = roster.status || 'draft';
                rosterStatusCounts[rosterStatus] = (rosterStatusCounts[rosterStatus] || 0) + 1;
            });
            
            console.log('📋 Estados de rosters en BD:', rosterStatusCounts);
            
            // Crear información adicional para mostrar en el gráfico
            const totalRosters = this.data.rosters.length;
            const completedRosters = rosterStatusCounts['completed'] || 0;
            const inProgressRosters = rosterStatusCounts['in_progress'] || 0;
            const confirmedRosters = rosterStatusCounts['confirmed'] || 0;
            
            additionalInfo = {
                totalRosters,
                completedRosters,
                inProgressRosters,
                confirmedRosters,
                rosterStatusCounts
            };
        }

        const totalNominations = this.data.nominations.length;
        
        // ✅ Crear array de resultados SOLO para rosters (no nominaciones)
        const results = statuses.map(status => {
            const rosterCount = additionalInfo ? (additionalInfo.rosterStatusCounts[status] || 0) : 0;
            
            // ✅ Calcular porcentaje basado en total de rosters
            let percentage = 0;
            if (rosterCount > 0 && additionalInfo && additionalInfo.totalRosters > 0) {
                percentage = ((rosterCount / additionalInfo.totalRosters) * 100).toFixed(1);
            }
            
            return {
                label: this.getStatusDisplayName(status), // ✅ Usar nombre legible
                value: rosterCount, // ✅ Solo rosters
                rosterValue: rosterCount, // ✅ Valor solo de rosters
                percentage: percentage,
                color: this.getStatusColor(status),
                originalStatus: status, // ✅ Mantener estado original para debugging
                additionalInfo: additionalInfo // ✅ Información adicional de rosters
            };
        });

        console.log('📊 Datos de estado de nominaciones REALES:', {
            results,
            totalNominations,
            statusCounts,
            additionalInfo,
            statusMapping: statuses.map(status => ({
                original: status,
                display: this.getStatusDisplayName(status),
                color: this.getStatusColor(status)
            }))
        });

        return results;
    }

    /**
     * Obtener color para cada estado de nominación
     */
    getStatusColor(status) {
        const colorMap = {
            'confirmed': '#0ea5e9',    // Info - Azul
            'in_progress': '#f59e0b',  // Warning - Naranja elegante
            'completed': '#22c55e'     // Success - Verde
        };
        return colorMap[status] || '#9ca3af';
    }

    /**
     * Obtener nombre legible para cada estado de nominación
     */
    getStatusDisplayName(status) {
        const displayNames = {
            'confirmed': 'Confirmed',
            'in_progress': 'In Progress',
            'completed': 'Completed'
        };
        return displayNames[status] || status;
    }

    /**
     * ✅ Calcular estado automático de roster basado en fechas (FLUJO INTELIGENTE)
     */
    calculateAutomaticRosterStatus(roster) {
        try {
            const now = new Date();
            
            // ✅ PASO 1: Validar fechas básicas
            if (!roster.startDischarge || !roster.etcTime) {
                return 'draft';
            }
            
            const startDischarge = new Date(roster.startDischarge);
            const etcTime = new Date(roster.etcTime);
            
            // Validar que las fechas sean válidas
            if (isNaN(startDischarge.getTime()) || isNaN(etcTime.getTime())) {
                return 'draft';
            }
            
            // ✅ PASO 2: Validar secuencia lógica de fechas
            if (startDischarge >= etcTime) {
                console.warn('⚠️ Roster con fechas inválidas: startDischarge >= etcTime');
                return 'draft';
            }
            
            // ✅ PASO 3: Aplicar flujo inteligente de estados
            if (now < startDischarge) {
                return 'confirmed';        // ✅ Confirmado: fechas válidas, esperando inicio
            } else if (now >= startDischarge && now <= etcTime) {
                return 'in_progress';      // ✅ En progreso: operación realmente en curso
            } else if (now > etcTime) {
                return 'completed';        // ✅ Completado: operación terminada
            }
            
            return 'draft';
            
        } catch (error) {
            console.warn('⚠️ Error calculando estado automático de roster:', error);
            return 'draft';
        }
    }

    /**
     * ✅ Obtener estado inteligente (automático o manual)
     */
    getIntelligentRosterStatus(roster) {
        // Si el roster tiene estado manual diferente a 'draft', respetarlo
        if (roster.status && roster.status !== 'draft') {
            return roster.status;
        }
        
        // Si es 'draft' o no tiene estado, calcular automáticamente
        return this.calculateAutomaticRosterStatus(roster);
    }

    /**
     * ✅ Analizar y mostrar estadísticas de estados de rosters (CON VALIDACIONES)
     */
    analyzeRosterStatuses() {
        if (!this.data.rosters || this.data.rosters.length === 0) {
            return;
        }

        console.log('🔍 === ANÁLISIS COMPLETO DE ESTADOS DE ROSTERS ===');
        
        this.data.rosters.forEach((roster, index) => {
            const originalStatus = roster.status || 'draft';
            const automaticStatus = this.calculateAutomaticRosterStatus(roster);
            const intelligentStatus = this.getIntelligentRosterStatus(roster);
            
            const startDischarge = roster.startDischarge ? new Date(roster.startDischarge) : null;
            const etcTime = roster.etcTime ? new Date(roster.etcTime) : null;
            const now = new Date();
            
            console.log(`📋 Roster ${index + 1}: ${roster.vesselName}`);
            console.log(`   🚢 Vessel: ${roster.vesselName}`);
            console.log(`   📅 Start: ${startDischarge ? startDischarge.toLocaleDateString() : 'N/A'}`);
            console.log(`   📅 ETC: ${etcTime ? etcTime.toLocaleDateString() : 'N/A'}`);
            console.log(`   📊 Status BD: ${originalStatus}`);
            console.log(`   📊 Status Auto: ${automaticStatus}`);
            console.log(`   📊 Status Final: ${intelligentStatus}`);
            
            // ✅ Validaciones de secuencia lógica
            const logicalValidation = this.validateRosterLogicalSequence(roster);
            if (logicalValidation.errors.length > 0) {
                console.log(`   ❌ ERRORES LÓGICOS: ${logicalValidation.errors.length}`);
                logicalValidation.errors.forEach(error => {
                    console.log(`      • ${error}`);
                });
            }
            
            if (logicalValidation.warnings.length > 0) {
                console.log(`   ⚠️ ADVERTENCIAS: ${logicalValidation.warnings.length}`);
                logicalValidation.warnings.forEach(warning => {
                    console.log(`      • ${warning}`);
                });
            }
            
            // ✅ Mostrar transiciones válidas
            const validTransitions = this.getValidStatusTransitions(intelligentStatus);
            if (validTransitions.length > 0) {
                console.log(`   🔄 Transiciones válidas: ${validTransitions.join(', ')}`);
            } else {
                console.log(`   🔒 Estado final: no se pueden hacer transiciones`);
            }
            
            // ✅ Mostrar recomendaciones
            if (originalStatus === 'draft' && automaticStatus !== 'draft') {
                console.log(`   💡 RECOMENDACIÓN: Cambiar de 'draft' a '${automaticStatus}' automáticamente`);
            }
            
            // ✅ Mostrar estado de validación
            if (logicalValidation.errors.length === 0 && logicalValidation.warnings.length === 0) {
                console.log(`   ✅ VALIDACIÓN: Roster válido sin errores ni advertencias`);
            } else if (logicalValidation.errors.length === 0) {
                console.log(`   ⚠️ VALIDACIÓN: Roster válido con advertencias`);
            } else {
                console.log(`   ❌ VALIDACIÓN: Roster con errores que requieren corrección`);
            }
            
            console.log('   ---');
        });
        
        console.log('🔍 === FIN DEL ANÁLISIS ===');
    }

    /**
     * ✅ Generar reporte completo de validación de rosters
     */
    generateRosterValidationReport() {
        if (!this.data.rosters || this.data.rosters.length === 0) {
            return {
                summary: 'No hay rosters para validar',
                details: []
            };
        }

        const report = {
            summary: {
                totalRosters: this.data.rosters.length,
                validRosters: 0,
                rostersWithWarnings: 0,
                rostersWithErrors: 0,
                statusDistribution: {}
            },
            details: []
        };

        this.data.rosters.forEach((roster, index) => {
            const originalStatus = roster.status || 'draft';
            const automaticStatus = this.calculateAutomaticRosterStatus(roster);
            const intelligentStatus = this.getIntelligentRosterStatus(roster);
            const logicalValidation = this.validateRosterLogicalSequence(roster);
            
            // Contar estados
            report.summary.statusDistribution[intelligentStatus] = 
                (report.summary.statusDistribution[intelligentStatus] || 0) + 1;
            
            // Contar validaciones
            if (logicalValidation.errors.length === 0 && logicalValidation.warnings.length === 0) {
                report.summary.validRosters++;
            } else if (logicalValidation.errors.length === 0) {
                report.summary.rostersWithWarnings++;
            } else {
                report.summary.rostersWithErrors++;
            }
            
            // Detalles del roster
            report.details.push({
                index: index + 1,
                vesselName: roster.vesselName,
                amspecRef: roster.amspecRef,
                originalStatus,
                automaticStatus,
                intelligentStatus,
                validation: logicalValidation,
                recommendations: this.generateRosterRecommendations(roster, automaticStatus, logicalValidation)
            });
        });

        console.log('📊 === REPORTE DE VALIDACIÓN DE ROSTERS ===');
        console.log('📈 Resumen:', report.summary);
        console.log('📋 Detalles:', report.details.length, 'rosters analizados');
        console.log('🔍 === FIN DEL REPORTE ===');

        return report;
    }

    /**
     * ✅ Generar recomendaciones específicas para un roster
     */
    generateRosterRecommendations(roster, automaticStatus, validation) {
        const recommendations = [];
        
        // ✅ Recomendaciones de estado
        if (roster.status === 'draft' && automaticStatus !== 'draft') {
            recommendations.push({
                type: 'status',
                priority: 'high',
                message: `Cambiar estado de 'draft' a '${automaticStatus}' automáticamente`,
                action: 'automatic_update'
            });
        }
        
        // ✅ Recomendaciones de validación
        if (validation.errors.length > 0) {
            recommendations.push({
                type: 'validation',
                priority: 'critical',
                message: `Corregir ${validation.errors.length} error(es) lógico(s) antes de confirmar`,
                action: 'fix_errors',
                errors: validation.errors
            });
        }
        
        if (validation.warnings.length > 0) {
            recommendations.push({
                type: 'validation',
                priority: 'medium',
                message: `Revisar ${validation.warnings.length} advertencia(s) para optimizar operación`,
                action: 'review_warnings',
                warnings: validation.warnings
            });
        }
        
        // ✅ Recomendaciones de secuencia
        if (roster.lineSampling?.length > 1) {
            const hasGaps = this.checkForTimeGaps(roster.lineSampling);
            if (hasGaps) {
                recommendations.push({
                    type: 'efficiency',
                    priority: 'low',
                    message: 'Considerar optimizar turnos para reducir gaps de tiempo',
                    action: 'optimize_schedule'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * ✅ Verificar gaps de tiempo entre turnos de sampling
     */
    checkForTimeGaps(lineSampling) {
        if (!lineSampling || lineSampling.length < 2) return false;
        
        for (let i = 0; i < lineSampling.length - 1; i++) {
            const currentEnd = new Date(lineSampling[i].finishTime);
            const nextStart = new Date(lineSampling[i + 1].startTime);
            const gapHours = (nextStart - currentEnd) / (1000 * 60 * 60);
            
            if (gapHours > 2) { // Gap mayor a 2 horas
                return true;
            }
        }
        return false;
    }

    /**
     * ✅ Validar secuencia lógica de fechas del roster
     */
    validateRosterLogicalSequence(roster) {
        const errors = [];
        const warnings = [];
        
        try {
            // ✅ Validar que office sampling esté antes de line sampling
            if (roster.officeSampling && roster.lineSampling?.length > 0) {
                const officeStart = new Date(roster.officeSampling.startTime);
                const firstLineStart = new Date(roster.lineSampling[0].startTime);
                
                if (officeStart >= firstLineStart) {
                    errors.push('Office sampling must start before line sampling');
                }
            }
            
            // ✅ Validar secuencia de line sampling
            if (roster.lineSampling?.length > 1) {
                for (let i = 0; i < roster.lineSampling.length - 1; i++) {
                    const currentEnd = new Date(roster.lineSampling[i].finishTime);
                    const nextStart = new Date(roster.lineSampling[i + 1].startTime);
                    
                    // Los turnos deben ser continuos: uno debe terminar cuando empieza el siguiente
                    if (currentEnd > nextStart) {
                        errors.push(`Line sampling ${i + 1} must end before ${i + 2} starts`);
                    }
                }
            }
            
            // ✅ Validar que las fechas de sampling estén dentro del rango de descarga
            if (roster.startDischarge && roster.etcTime) {
                const dischargeStart = new Date(roster.startDischarge);
                const dischargeEnd = new Date(roster.etcTime);
                
                if (roster.officeSampling) {
                    const officeStart = new Date(roster.officeSampling.startTime);
                    const officeEnd = new Date(roster.officeSampling.finishTime);
                    
                    if (officeStart < dischargeStart || officeEnd > dischargeEnd) {
                        warnings.push('Office sampling extends beyond discharge time range');
                    }
                }
                
                if (roster.lineSampling?.length > 0) {
                    roster.lineSampling.forEach((line, index) => {
                        const lineStart = new Date(line.startTime);
                        const lineEnd = new Date(line.finishTime);
                        
                        if (lineStart < dischargeStart || lineEnd > dischargeEnd) {
                            warnings.push(`Line sampling ${index + 1} extends beyond discharge time range`);
                        }
                    });
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Error validando secuencia lógica del roster:', error);
            errors.push('Error validating logical sequence');
        }
        
        return { errors, warnings };
    }

    /**
     * ✅ Validar si se puede transicionar a un nuevo estado
     */
    canTransitionToStatus(currentStatus, newStatus) {
        const validTransitions = {
            'draft': ['confirmed', 'cancelled'],
            'confirmed': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [], // Estado final
            'cancelled': []  // Estado final
        };
        
        const allowedTransitions = validTransitions[currentStatus] || [];
        const canTransition = allowedTransitions.includes(newStatus);
        
        console.log(`🔄 Transición de estado: ${currentStatus} → ${newStatus} = ${canTransition ? '✅ Permitida' : '❌ No permitida'}`);
        
        return canTransition;
    }

    /**
     * ✅ Obtener transiciones válidas para un estado actual
     */
    getValidStatusTransitions(currentStatus) {
        const validTransitions = {
            'draft': ['confirmed', 'cancelled'],
            'confirmed': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': []
        };
        
        return validTransitions[currentStatus] || [];
    }

    /**
     * ✅ Calcular distribución de estados de rosters con lógica inteligente
     */
    calculateRosterStatusDistribution() {
        if (!this.data.rosters || this.data.rosters.length === 0) {
            return { labels: [], values: [], totalRosters: 0 };
        }

        const statusCounts = {};
        const statuses = ['confirmed', 'in_progress', 'completed'];
        
        // Inicializar contadores
        statuses.forEach(status => {
            statusCounts[status] = 0;
        });

        // Contar estados inteligentes
        this.data.rosters.forEach(roster => {
            const intelligentStatus = this.getIntelligentRosterStatus(roster);
            if (statusCounts.hasOwnProperty(intelligentStatus)) {
                statusCounts[intelligentStatus]++;
            }
        });

        const totalRosters = this.data.rosters.length;
        
        // Crear array de resultados
        const results = statuses.map(status => ({
            label: this.getStatusDisplayName(status),
            value: statusCounts[status],
            percentage: totalRosters > 0 ? 
                ((statusCounts[status] / totalRosters) * 100).toFixed(1) : 0,
            color: this.getStatusColor(status),
            originalStatus: status
        }));

        console.log('📊 Distribución de estados de rosters inteligente:', {
            results,
            totalRosters,
            statusCounts
        });

        return { labels: results.map(r => r.label), values: results.map(r => r.value), totalRosters };
    }

    /**
     * ✅ Renderizar gráfico de estados de rosters
     */
    renderRosterStatusChart(container, data) {
        if (!data || data.labels.length === 0) {
            container.innerHTML = `
                <div class="roster-status-empty">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; color: var(--text-secondary);"></i>
                    <div style="color: var(--text-secondary); text-align: center;">
                        <div>No hay rosters para mostrar</div>
                        <div style="font-size: 0.875rem; margin-top: 0.5rem;">Los estados aparecerán cuando se creen rosters</div>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="roster-status-container">';
        
        // Header con total
        html += `
            <div class="roster-status-header">
                <div class="roster-total">
                    <i class="fas fa-ship"></i>
                    <span>Total Rosters: ${data.totalRosters}</span>
                </div>
                <div class="roster-subtitle">
                    <i class="fas fa-brain"></i>
                    <span>Estados calculados inteligentemente</span>
                </div>
            </div>
        `;
        
        // Renderizar cada estado
        data.labels.forEach((label, index) => {
            const value = data.values[index];
            const percentage = data.totalRosters > 0 ? ((value / data.totalRosters) * 100).toFixed(1) : 0;
            const color = this.getStatusColor(this.getStatusFromDisplayName(label));
            
            html += `
                <div class="status-row even" style="border-left: 4px solid ${color}">
                    <div class="status-info">
                        <div class="status-label">
                            <i class="fas ${this.getStatusIcon(this.getStatusFromDisplayName(label))}"></i>
                            <span>${label}</span>
                        </div>
                        <div class="status-stats">
                            <div class="status-count">${value}</div>
                            <div class="status-percentage">${percentage}%</div>
                        </div>
                    </div>
                    <div class="status-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%; background-color: ${color}"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * ✅ Obtener estado original desde nombre de display
     */
    getStatusFromDisplayName(displayName) {
        const statusMap = {
            'Draft': 'draft',
            'Confirmed': 'confirmed',
            'In Progress': 'in_progress',
            'Completed': 'completed',
            'Cancelled': 'cancelled'
        };
        return statusMap[displayName] || 'draft';
    }

    /**
     * Calcular horas semanales por sampler
     */
    calculateWeeklyHours() {
        if (!this.data.samplers || !this.data.rosters) {
            return [];
        }

        const weekStart = this.getWeekStart();
        const weekEnd = this.getWeekEnd();
        
        console.log('📅 Calculando horas para semana:', {
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            totalRosters: this.data.rosters.length
        });

        return this.data.samplers.map(sampler => {
            let totalHours = 0;
            let rosterCount = 0;
            
            this.data.rosters.forEach(roster => {
                let hasContribution = false;
                
                // Office Sampling: sumar solo el traslape dentro de la semana
                if (roster.officeSampling && roster.officeSampling.sampler && roster.officeSampling.sampler.name === sampler.name) {
                    const overlap = this.getOverlapHours(roster.officeSampling.startTime, roster.officeSampling.finishTime, weekStart, weekEnd);
                    if (overlap > 0) {
                        totalHours += overlap;
                        hasContribution = true;
                        console.log(`📊 ${sampler.name}: +${overlap}h (Office overlap - ${roster.vesselName})`);
                    }
                }
                
                // Line Sampling: sumar traslape por cada turno
                    if (roster.lineSampling) {
                        roster.lineSampling.forEach(line => {
                            if (line.sampler && line.sampler.name === sampler.name) {
                            const overlap = this.getOverlapHours(line.startTime, line.finishTime, weekStart, weekEnd);
                            if (overlap > 0) {
                                totalHours += overlap;
                                hasContribution = true;
                                console.log(`📊 ${sampler.name}: +${overlap}h (Line overlap - ${roster.vesselName})`);
                            }
                            }
                        });
                    }
                
                if (hasContribution) {
                    rosterCount++;
                }
            });

            // 🚛 Truck Work Days: sumar traslape por cada día de trabajo
            let truckWorkCount = 0;
            (this.data.truckWorkDays || []).forEach(truckDay => {
                if (truckDay.shift && truckDay.shift.startTime && truckDay.shift.endTime && truckDay.samplerName === sampler.name) {
                    const overlap = this.getOverlapHours(truckDay.shift.startTime, truckDay.shift.endTime, weekStart, weekEnd);
                    if (overlap > 0) {
                        totalHours += overlap;
                        truckWorkCount++;
                        console.log(`📊 ${sampler.name}: +${overlap}h (Truck overlap - ${truckDay.terminal})`);
                    }
                }
            });

            const weeklyLimit = sampler.weeklyRestriction ? 24 : 38; // ✅ Límite australiano estándar
            // Normalize to avoid floating artifacts in UI; hours are whole-hour based in business rules
            totalHours = Math.round(totalHours);
            
            const result = {
                name: sampler.name,
                hours: totalHours,
                limit: weeklyLimit,
                percentage: (totalHours / weeklyLimit) * 100,
                rosterCount: rosterCount,
                truckWorkCount: truckWorkCount
            };
            
            console.log(`📊 ${sampler.name}: ${totalHours}h/${weeklyLimit}h (${result.percentage.toFixed(1)}%) - ${rosterCount} rosters + ${truckWorkCount} truck work days`);
            
            return result;
        });
    }

    /**
     * Renderizar heatmap de disponibilidad semanal
     */
    renderWeeklyAvailabilityHeatmap(container, data) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        let html = `
            <div class="heatmap-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th></th>
                            ${days.map(day => `<th>${day}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach(sampler => {
            html += `
                <tr>
                    <td style="text-align: right; padding-right: 10px; color: var(--text-primary); font-weight: 600;">
                        ${sampler.name}
                    </td>
            `;
            
            sampler.availability.forEach((status, dayIndex) => {
                const dayKey = this.getDayKey(days[dayIndex]);
                const cellClass = `heatmap-cell ${status}`;
                const tooltip = this.getAvailabilityTooltip(status, days[dayIndex], sampler.name, dayKey, sampler.restrictions);
                html += `<td class="${cellClass}" title="${tooltip}"></td>`;
            });
            
            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Renderizar estado de nominaciones en formato de filas organizadas
     * Ahora incluye información adicional de rosters y mejor visualización
     */
    renderNominationsStatusFunnel(container, data) {
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="nominations-status-empty">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; color: var(--text-secondary);"></i>
                    <div style="color: var(--text-secondary); text-align: center;">
                        <div>No hay rosters para mostrar</div>
                        <div style="font-size: 0.875rem; margin-top: 0.5rem;">Los estados aparecerán cuando se creen rosters</div>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="nominations-status-container">';
        
        // Agregar header simplificado solo con total de rosters
        const totalRosters = data.reduce((sum, item) => sum + (item.rosterValue || 0), 0);
        
        html += `
            <div class="nominations-status-header">
                <div class="rosters-total" style="font-size: 1.1rem; font-weight: bold; color: var(--accent-color);">
                    <i class="fas fa-calendar-check"></i>
                    <span>Total Rosters: ${totalRosters}</span>
                </div>
            </div>
        `;
        

        
        // Renderizar cada estado en su propia fila
        data.forEach((item, index) => {
            const isEven = index % 2 === 0;
            const rowClass = isEven ? 'status-row even' : 'status-row odd';
            
            html += `
                <div class="${rowClass}" style="border-left: 4px solid ${item.color}">
                    <div class="status-info">
                        <div class="status-label">
                            <i class="fas ${this.getStatusIcon(item.label)}"></i>
                            <span>${item.label}</span>
                        </div>
                        <div class="status-stats">
                            <div class="status-count">${item.value}</div>
                            <div class="status-percentage">${item.percentage}%</div>
                        </div>
                    </div>
                    <div class="status-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${item.percentage}%; background-color: ${item.color}"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Obtener icono para cada estado de nominación
     */
    getStatusIcon(status) {
        const iconMap = {
            'Confirmed': 'fa-check',
            'In Progress': 'fa-spinner fa-spin',
            'Completed': 'fa-check-circle'
        };
        return iconMap[status] || 'fa-circle';
    }

    /**
     * Renderizar barras de horas semanales
     */
    renderWeeklyHoursBars(container, data) {
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="weekly-hours-empty">
                    <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; color: var(--text-secondary);"></i>
                    <div style="color: var(--text-secondary); text-align: center;">
                        <div>No hay datos de horas para esta semana</div>
                        <div style="font-size: 0.875rem; margin-top: 0.5rem;">Las horas aparecerán cuando se programen rosters</div>
                    </div>
                </div>
            `;
            return;
        }

        // Ordenar por porcentaje de horas (más alto primero)
        const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);
        
        let html = '<div class="weekly-hours-container">';
        
        // Agregar header con información de la semana
        const weekStart = this.getWeekStart();
        const weekEnd = this.getWeekEnd();
        html += `
            <div class="weekly-hours-header">
                <div class="week-info">
                    <i class="fas fa-calendar-week"></i>
                    ${weekStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div class="total-samplers">${data.length} samplers</div>
            </div>
        `;
        
        sortedData.forEach(item => {
            let statusClass = 'success';
            let statusIcon = 'fas fa-check-circle';
            let barWidth = Math.min(100, item.percentage); // Bar width capped at 100% for visual consistency

            if (item.percentage > 100) {
                statusClass = 'over-limit';
                statusIcon = 'fas fa-exclamation-triangle';
            } else if (item.percentage > 90) {
                statusClass = 'warning';
                statusIcon = 'fas fa-exclamation-triangle';
            } else if (item.percentage > 70) {
                statusClass = 'info';
                statusIcon = 'fas fa-info-circle';
            }
            
            html += `
                <div class="weekly-hours-item ${statusClass}">
                    <div class="sampler-header">
                        <div class="sampler-name">${item.name}</div>
                        <div class="sampler-meta">
                            <span class="roster-count">${item.rosterCount} rosters</span>
                            <span class="hours-display">
                                <span class="hours-current">${item.hours}h</span>
                                <span class="hours-separator">/</span>
                                <span class="hours-limit">${item.limit}h</span>
                            </span>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar ${statusClass}" style="width: ${barWidth}%"></div>
                        <div class="progress-label">${item.percentage.toFixed(1)}%</div>
                    </div>
                    <div class="status-indicator">
                        <i class="${statusIcon} ${statusClass === 'over-limit' ? 'over-limit' : ''}"></i>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Obtener tooltip de disponibilidad con información real
     */
    getAvailabilityTooltip(status, day, samplerName, dayKey, restrictions) {
        const dayNames = {
            'Mon': 'Monday',
            'Tue': 'Tuesday', 
            'Wed': 'Wednesday',
            'Thu': 'Thursday',
            'Fri': 'Friday',
            'Sat': 'Saturday',
            'Sun': 'Sunday'
        };
        
        const dayName = dayNames[day] || day;
        
        switch (status) {
            case 'available':
                return `${samplerName}: ${dayName} - Available`;
            case 'restricted':
                const restrictionReason = restrictions[dayKey] || 'Restricted';
                return `${samplerName}: ${dayName} - Not Available (${restrictionReason})`;
            default:
                return `${samplerName}: ${dayName} - Unknown`;
        }
    }

    /**
     * Obtener clave del día para restricciones
     */
    getDayKey(day) {
        const dayMap = {
            'Mon': 'monday',
            'Tue': 'tuesday', 
            'Wed': 'wednesday',
            'Thu': 'thursday',
            'Fri': 'friday',
            'Sat': 'saturday',
            'Sun': 'sunday'
        };
        return dayMap[day] || 'monday';
    }

    /**
     * Obtener inicio de la semana (lunes)
     */
    getWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - daysToMonday);
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    /**
     * Obtener fin de la semana (domingo)
     */
    getWeekEnd() {
        const monday = this.getWeekStart();
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return sunday;
    }

    /**
     * Calcular horas de traslape entre un intervalo [start, end] y un rango [rangeStart, rangeEnd]
     */
    getOverlapHours(start, end, rangeStart, rangeEnd) {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s) || isNaN(e)) return 0;
        const effectiveStart = s < rangeStart ? rangeStart : s;
        const effectiveEnd = e > rangeEnd ? rangeEnd : e;
        const ms = effectiveEnd - effectiveStart;
        if (ms <= 0) return 0;
        const hours = ms / (1000 * 60 * 60);
        // Round to 3 decimals to avoid floating precision artifacts (e.g., 12.9999997)
        return Math.round((hours + 1e-9) * 1000) / 1000;
    }

    /**
     * Configurar actualizaciones automáticas
     */
    setupAutoRefresh() {
        // Actualizar datos cada 5 minutos
        setInterval(async () => {
            try {
                await this.loadDashboardData();
                this.refreshCharts();
            } catch (error) {
                console.error('Error en actualización automática:', error);
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Actualizar gráficos con nuevos datos
     */
    refreshCharts() {
        try {
            // Actualizar datos de gráficos
            if (this.charts.trends) {
                const monthlyData = this.calculateMonthlyTrends();
                console.log('🔄 Actualizando gráfico de tendencias con datos reales:', monthlyData);
                
                // Validar que hay datos antes de actualizar
                const hasData = monthlyData.nominations.some(count => count > 0) || monthlyData.rosters.some(count => count > 0);
                if (hasData) {
                    this.charts.trends.data.datasets[0].data = monthlyData.nominations;
                    this.charts.trends.data.datasets[1].data = monthlyData.rosters;
                    this.charts.trends.update('none');
                } else {
                    console.warn('⚠️ No hay datos reales para actualizar el gráfico de tendencias');
                }
            }

            if (this.charts.terminalDistribution) {
                const terminalData = this.calculateTerminalDistribution();
                console.log('🔄 Actualizando gráfico de distribución por terminal con datos reales:', terminalData);
                
                // Validar que hay datos antes de actualizar
                if (terminalData.labels.length > 0 && terminalData.values.length > 0) {
                    this.charts.terminalDistribution.data.labels = terminalData.labels;
                    this.charts.terminalDistribution.data.datasets[0].data = terminalData.values;
                    
                    // Actualizar colores si cambió el número de terminales
                    if (terminalData.labels.length !== this.charts.terminalDistribution.data.datasets[0].backgroundColor.length) {
                        this.charts.terminalDistribution.data.datasets[0].backgroundColor = 
                            this.chartColors.slice(0, terminalData.labels.length).map(color => color + 'CC');
                        this.charts.terminalDistribution.data.datasets[0].borderColor = 
                            this.chartColors.slice(0, terminalData.labels.length);
                        this.charts.terminalDistribution.data.datasets[0].hoverBackgroundColor = 
                            this.chartColors.slice(0, terminalData.labels.length).map(color => color + 'FF');
                    }
                    
                    this.charts.terminalDistribution.update('none');
                } else {
                    console.warn('⚠️ No hay datos reales para actualizar el gráfico de distribución por terminal');
                }
            }

            if (this.charts.workload) {
                this.updateWorkloadChart();
            }

            // Actualizar gráficos estáticos
            this.updateStaticCharts();
            
            console.log('✅ Gráficos actualizados correctamente');
            
        } catch (error) {
            console.error('❌ Error actualizando gráficos:', error);
        }
    }

    /**
     * Actualizar gráficos estáticos
     */
    updateStaticCharts() {
        // Actualizar heatmap de disponibilidad
        const availabilityContainer = document.getElementById('weeklyAvailabilityChart');
        if (availabilityContainer) {
            const availabilityData = this.calculateWeeklyAvailability();
            this.renderWeeklyAvailabilityHeatmap(availabilityContainer, availabilityData);
        }

        // Actualizar funnel de estado
        const statusContainer = document.getElementById('nominationsStatusChart');
        if (statusContainer) {
            const statusData = this.calculateNominationsStatus();
            console.log('🔄 Actualizando gráfico de estado de nominaciones con datos reales:', statusData);
            this.renderNominationsStatusFunnel(statusContainer, statusData);
        }

        // Actualizar barras de horas semanales
        const hoursContainer = document.getElementById('weeklyHoursChart');
        if (hoursContainer) {
            const weeklyHoursData = this.calculateWeeklyHours();
            this.renderWeeklyHoursBars(hoursContainer, weeklyHoursData);
        }
    }

    /**
     * Mostrar error en el dashboard
     */
    showError(title, message) {
        const errorContainer = document.querySelector('.dashboard-error');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div class="error-message">${title}</div>
                <div>${message}</div>
                <button class="retry-btn" onclick="location.reload()">
                    <i class="fas fa-redo me-2"></i>Reintentar
                </button>
            `;
            errorContainer.style.display = 'block';
        }
    }

    /**
     * Obtener estado del dashboard
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            chartsCount: Object.keys(this.charts).length,
            dataLastUpdated: this.data.lastUpdated,
            hasData: Object.keys(this.data).length > 0
        };
    }

    /**
     * ✅ Inicializar sistema de tarjetas giratorias
     */
    initializeFlipCards() {
        try {
            console.log('🎴 Inicializando sistema de tarjetas giratorias...');
            
            // Cargar datos para las tarjetas giratorias
            this.loadFlipCardData();
            
            console.log('✅ Sistema de tarjetas giratorias inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando tarjetas giratorias:', error);
        }
    }

    /**
     * ✅ Cargar datos para las tarjetas giratorias
     */
    async loadFlipCardData() {
        try {
            // Cargar nominaciones del mes actual
            await this.loadMonthlyNominations();
            
            // Cargar rosters activos
            await this.loadActiveRosters();
            
            // Cargar samplers disponibles
            await this.loadAvailableSamplers();
            
            // Cargar terminales operacionales
            await this.loadOperationalTerminals();
            
        } catch (error) {
            console.error('❌ Error cargando datos de tarjetas giratorias:', error);
        }
    }

    /**
     * ✅ Cargar nominaciones del mes actual para la tarjeta giratoria
     */
    async loadMonthlyNominations() {
        try {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const monthlyNominations = this.data.nominations?.filter(nomination => {
                const nominationDate = new Date(nomination.createdAt || nomination.date || nomination.arrivalDate || new Date());
                return nominationDate.getMonth() === currentMonth && nominationDate.getFullYear() === currentYear;
            }) || [];
            
            this.renderNominationsList(monthlyNominations);
            
        } catch (error) {
            console.error('❌ Error cargando nominaciones del mes:', error);
        }
    }

    /**
     * ✅ Cargar rosters activos para la tarjeta giratoria
     */
    async loadActiveRosters() {
        try {
            const activeRosters = this.data.rosters?.filter(roster => {
                const status = roster.status || 'draft';
                return status === 'confirmed' || status === 'in_progress';
            }) || [];
            
            this.renderRostersList(activeRosters);
            
        } catch (error) {
            console.error('❌ Error cargando rosters activos:', error);
        }
    }

    /**
     * ✅ Cargar samplers disponibles para la tarjeta giratoria
     */
    async loadAvailableSamplers() {
        try {
            const availableSamplers = this.data.samplers?.filter(sampler => {
                // Por ahora, mostrar todos los samplers
                // En el futuro se puede agregar lógica para determinar disponibilidad
                return true;
            }) || [];
            
            this.renderSamplersList(availableSamplers);
            
        } catch (error) {
            console.error('❌ Error cargando samplers disponibles:', error);
        }
    }

    /**
     * ✅ Cargar terminales operacionales para la tarjeta giratoria
     */
    async loadOperationalTerminals() {
        try {
            const operationalTerminals = this.data.terminals || [];
            
            this.renderTerminalsList(operationalTerminals);
            
        } catch (error) {
            console.error('❌ Error cargando terminales operacionales:', error);
        }
    }

    /**
     * ✅ Renderizar lista de nominaciones del mes
     */
    renderNominationsList(nominations) {
        const container = document.getElementById('monthlyNominationsList');
        if (!container) return;
        
        if (!nominations || nominations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ship"></i>
                    <span>No nominations this month</span>
                </div>
            `;
            return;
        }
        
        let html = '';
        nominations.slice(0, 5).forEach(nomination => { // Mostrar máximo 5
            const status = nomination.status || 'draft';
            const vesselName = nomination.vesselName || nomination.vessel?.name || 'Unknown Vessel';
            const date = new Date(nomination.createdAt || nomination.date || nomination.arrivalDate || new Date());
            
            html += `
                <div class="list-item">
                    <div class="list-item-info">
                        <div class="list-item-name">${vesselName}</div>
                        <div class="list-item-details">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div class="list-item-status status-${status}">${status}</div>
                </div>
            `;
        });
        
        if (nominations.length > 5) {
            html += `
                <div class="list-item">
                    <div class="list-item-info">
                        <div class="list-item-name">+${nominations.length - 5} more</div>
                        <div class="list-item-details">Total: ${nominations.length}</div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    /**
     * ✅ Renderizar lista de rosters activos
     */
    renderRostersList(rosters) {
        const container = document.getElementById('activeRostersList');
        if (!container) return;
        
        if (!rosters || rosters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <span>No active rosters</span>
                </div>
            `;
            return;
        }
        
        let html = '';
        rosters.slice(0, 5).forEach(roster => { // Mostrar máximo 5
            const status = roster.status || 'draft';
            const vesselName = roster.vesselName || 'Unknown Vessel';
            const date = new Date(roster.startDischarge || roster.createdAt || new Date());
            
            html += `
                <div class="list-item">
                    <div class="list-item-info">
                        <div class="list-item-name">${vesselName}</div>
                        <div class="list-item-details">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div class="list-item-status status-${status.replace('_', '-')}">${status}</div>
                </div>
            `;
        });
        
        if (rosters.length > 5) {
            html += `
                <div class="list-item">
                    <div class="list-item-info">
                        <div class="list-item-name">+${rosters.length - 5} more</div>
                        <div class="list-item-details">Total: ${rosters.length}</div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    /**
     * ✅ Renderizar lista de samplers disponibles
     */
    renderSamplersList(samplers) {
        const container = document.getElementById('availableSamplersList');
        if (!container) return;
        
        if (!samplers || samplers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <span>No samplers available</span>
                    </div>
                </div>
            `;
            return;
        }
        
        let html = '';
        samplers.forEach(sampler => { // Mostrar TODOS los samplers
            const restriction = sampler.weeklyRestriction ? '24h limit' : '38h limit';
            
            html += `
                <div class="list-item">
                    <div class="list-item-info">
                        <div class="list-item-name">${sampler.name}</div>
                        <div class="list-item-details">${restriction}</div>
                    </div>
                    <div class="list-item-status status-confirmed">Available</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    /**
     * ✅ Renderizar lista de terminales operacionales
     */
    renderTerminalsList(terminals) {
        const container = document.getElementById('operationalTerminalsList');
        if (!container) return;
        
        if (!terminals || terminals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-industry"></i>
                    <span>No terminals available</span>
                </div>
            `;
            return;
        }
        
        let html = '';
        terminals.forEach(terminal => { // Mostrar TODOS los terminales
            const status = terminal.status || 'operational';
            
            html += `
                <div class="list-item">
                    <div class="list-item-info">
                        <div class="list-item-name">${terminal.name}</div>
                        <div class="list-item-details">${terminal.location || 'Location N/A'}</div>
                    </div>
                    <div class="list-item-status status-${status}">${status}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    /**
     * Destruir el dashboard
     */
    destroy() {
        try {
            // Destruir gráficos de Chart.js
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            
            this.charts = {};
            this.data = {};
            this.isInitialized = false;
            
            console.log('✅ Dashboard destruido correctamente');
            
        } catch (error) {
            console.error('❌ Error destruyendo dashboard:', error);
        }
    }

    /**
     * ✅ Actualizar KPIs con datos reales del dashboard
     */
    updateKPIs() {
        try {
            // Evitar múltiples ejecuciones simultáneas
            if (this._updatingKPIs) {
                console.log('🔄 updateKPIs ya en ejecución, saltando...');
                return;
            }
            
            this._updatingKPIs = true;
            
            if (!this.data) {
                console.warn('⚠️ No hay datos disponibles para actualizar KPIs');
                this._updatingKPIs = false;
                return;
            }
            
            const data = this.data;
            
            // Actualizar Total Nominaciones
            const totalNominationsElement = document.getElementById('totalNominations');
            if (totalNominationsElement && data.nominations) {
                totalNominationsElement.textContent = data.nominations.length;
                
                // Actualizar el cambio porcentual (comparar con mes anterior)
                const nominationsChangeElement = document.getElementById('nominationsChange');
                if (nominationsChangeElement) {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    
                    const currentMonthNominations = data.nominations.filter(nomination => {
                        const nominationDate = new Date(nomination.createdAt || nomination.date || Date.now());
                        return nominationDate.getMonth() === currentMonth && 
                               nominationDate.getFullYear() === currentYear;
                    });
                    
                    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                    
                    const previousMonthNominations = data.nominations.filter(nomination => {
                        const nominationDate = new Date(nomination.createdAt || nomination.date || Date.now());
                        return nominationDate.getMonth() === previousMonth && 
                               nominationDate.getFullYear() === previousYear;
                    });
                    
                    if (previousMonthNominations.length > 0) {
                        const change = ((currentMonthNominations.length - previousMonthNominations.length) / previousMonthNominations.length) * 100;
                        const changeText = change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
                        const changeClass = change >= 0 ? 'positive' : 'negative';
                        
                        nominationsChangeElement.className = `kpi-change ${changeClass}`;
                        nominationsChangeElement.innerHTML = `
                            <i class="fas fa-arrow-${change >= 0 ? 'up' : 'down'} me-1"></i>
                            ${changeText} this month
                        `;
                    } else {
                        nominationsChangeElement.innerHTML = `
                            <i class="fas fa-minus me-1"></i>
                            New this month
                        `;
                    }
                }
            }
            
            // Actualizar Rosters Activos
            const activeRostersElement = document.getElementById('activeRosters');
            if (activeRostersElement && data.rosters) {
                const activeRosters = data.rosters.filter(roster => 
                    roster.status === 'confirmed' || roster.status === 'in_progress'
                );
                activeRostersElement.textContent = activeRosters.length;
                
                // Actualizar el cambio porcentual (comparar con semana anterior)
                const rostersChangeElement = document.getElementById('rostersChange');
                if (rostersChangeElement) {
                    const currentWeekStart = this.getWeekStart();
                    const currentWeekEnd = this.getWeekEnd();
                    
                    const currentWeekRosters = data.rosters.filter(roster => {
                        const rosterDate = new Date(roster.startDischarge || roster.date || Date.now());
                        return rosterDate >= currentWeekStart && rosterDate <= currentWeekEnd;
                    });
                    
                    const previousWeekStart = new Date(currentWeekStart);
                    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
                    const previousWeekEnd = new Date(currentWeekEnd);
                    previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);
                    
                    const previousWeekRosters = data.rosters.filter(roster => {
                        const rosterDate = new Date(roster.startDischarge || roster.date || Date.now());
                        return rosterDate >= previousWeekStart && rosterDate <= previousWeekEnd;
                    });
                    
                    if (previousWeekRosters.length > 0) {
                        const change = ((currentWeekRosters.length - previousWeekRosters.length) / previousWeekRosters.length) * 100;
                        const changeText = change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
                        const changeClass = change >= 0 ? 'positive' : 'negative';
                        
                        rostersChangeElement.className = `kpi-change ${changeClass}`;
                        rostersChangeElement.innerHTML = `
                            <i class="fas fa-arrow-${change >= 0 ? 'up' : 'down'} me-1"></i>
                            ${changeText} this week
                        `;
                    } else {
                        rostersChangeElement.innerHTML = `
                            <i class="fas fa-minus me-1"></i>
                            New this week
                        `;
                    }
                }
            }
            
            // Actualizar Samplers Disponibles
            const availableSamplersElement = document.getElementById('availableSamplers');
            if (availableSamplersElement && data.samplers) {
                // Mostrar todos los samplers como disponibles
                const availableSamplers = data.samplers;
                
                // DEBUG: Log para diagnosticar el problema
                console.log('🔍 DEBUG Samplers en updateKPIs:', {
                    totalSamplers: data.samplers.length,
                    samplers: data.samplers.map(s => ({ name: s.name, id: s._id })),
                    elementFound: !!availableSamplersElement,
                    elementId: availableSamplersElement?.id,
                    currentTextContent: availableSamplersElement.textContent
                });
                
                // Limpiar el contenido antes de actualizar para evitar duplicación
                availableSamplersElement.textContent = '';
                availableSamplersElement.textContent = availableSamplers.length;
                
                // Actualizar el estado de cambio
                const samplersChangeElement = document.getElementById('samplersChange');
                if (samplersChangeElement) {
                    const totalSamplers = data.samplers.length;
                    
                    // Limpiar el contenido antes de actualizar
                    samplersChangeElement.innerHTML = '';
                    
                    // Mostrar el total de samplers disponibles
                    samplersChangeElement.className = 'kpi-change positive';
                    samplersChangeElement.innerHTML = `
                        <i class="fas fa-users me-1"></i>
                        ${totalSamplers} total samplers
                    `;
                }
            } else {
                console.warn('⚠️ DEBUG: Elemento o datos de samplers no encontrados:', {
                    elementFound: !!availableSamplersElement,
                    samplersData: !!data.samplers,
                    samplersLength: data.samplers?.length
                });
            }
            
            // Actualizar Terminales Operativas
            const operationalTerminalsElement = document.getElementById('operationalTerminals');
            if (operationalTerminalsElement && data.terminals) {
                operationalTerminalsElement.textContent = data.terminals.length;
                
                // Actualizar el estado de cambio
                const terminalsChangeElement = document.getElementById('terminalsChange');
                if (terminalsChangeElement) {
                    const totalTerminals = data.terminals.length;
                    const operationalTerminals = data.terminals.filter(terminal => 
                        terminal.status === 'operational' || !terminal.status
                    );
                    const operationalPercentage = (operationalTerminals.length / totalTerminals) * 100;
                    
                    if (operationalPercentage === 100) {
                        terminalsChangeElement.className = 'kpi-change positive';
                        terminalsChangeElement.innerHTML = `
                            <i class="fas fa-check me-1"></i>
                            100% operational
                        `;
                    } else {
                        terminalsChangeElement.className = 'kpi-change negative';
                        terminalsChangeElement.innerHTML = `
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            ${operationalPercentage.toFixed(0)}% operational
                        `;
                    }
                }
            }
            
            console.log('✅ KPIs actualizados con datos reales');
            
        } catch (error) {
            console.error('❌ Error actualizando KPIs:', error);
        } finally {
            // Reset del flag de ejecución
            this._updatingKPIs = false;
        }
    }
}

// Exportar para uso global
window.DashboardManager = DashboardManager;

