/**
 * API Demo Functions
 * Demonstrates frontend-backend communication
 */

class APIDemo {
    constructor() {
        this.init();
    }

    init() {
        this.createDemoPanel();
        this.attachEventListeners();
    }

    createDemoPanel() {
        const demoHTML = `
            <div id="apiDemoPanel" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--bg-card);
                border: 1px solid var(--border-dark);
                border-radius: 12px;
                padding: 1rem;
                box-shadow: var(--shadow-xl);
                backdrop-filter: var(--glass-backdrop);
                z-index: 999;
                min-width: 250px;
            ">
                <h6 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 0.9rem;">
                    <i class="fas fa-flask me-2"></i>API Demo
                </h6>
                
                <div class="d-grid gap-2">
                    <button class="btn btn-outline-info btn-sm" id="testSystemInfo">
                        <i class="fas fa-info-circle me-1"></i>System Info
                    </button>
                    
                    <button class="btn btn-outline-success btn-sm" id="testHealth">
                        <i class="fas fa-heartbeat me-1"></i>Health Check
                    </button>
                    
                    <button class="btn btn-outline-primary btn-sm" id="testShips">
                        <i class="fas fa-ship me-1"></i>Ships API
                    </button>
                    
                    <button class="btn btn-outline-warning btn-sm" id="testRoster">
                        <i class="fas fa-clipboard-list me-1"></i>Roster API
                    </button>
                    
                    <button class="btn btn-outline-secondary btn-sm" id="closeDemoPanel">
                        <i class="fas fa-times me-1"></i>Close
                    </button>
                </div>
                
                <div id="apiResult" style="
                    margin-top: 1rem;
                    padding: 0.5rem;
                    background: var(--bg-secondary);
                    border-radius: 6px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    max-height: 200px;
                    overflow-y: auto;
                    display: none;
                "></div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', demoHTML);
    }

    attachEventListeners() {
        // System Info
        document.getElementById('testSystemInfo').addEventListener('click', async () => {
            await this.callAPI('getSystemInfo', 'System Information');
        });

        // Health Check
        document.getElementById('testHealth').addEventListener('click', async () => {
            await this.callAPI('getHealthStatus', 'Health Status');
        });

        // Ships API
        document.getElementById('testShips').addEventListener('click', async () => {
            await this.callAPI('getShips', 'Ships Data');
        });

        // Roster API
        document.getElementById('testRoster').addEventListener('click', async () => {
            await this.callAPI('getRoster', 'Roster Data');
        });

        // Close Panel
        document.getElementById('closeDemoPanel').addEventListener('click', () => {
            document.getElementById('apiDemoPanel').remove();
        });
    }

    async callAPI(method, title) {
        const resultDiv = document.getElementById('apiResult');
        
        try {
            // Show loading
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading ${title}...`;
            
            // Call API
            const response = await window.API[method]();
            
            // Show result
            resultDiv.innerHTML = `
                <strong>${title}:</strong><br>
                <pre style="margin: 0.5rem 0; font-size: 0.75rem;">${JSON.stringify(response, null, 2)}</pre>
            `;
            
            console.log(`${title}:`, response);
            
        } catch (error) {
            resultDiv.innerHTML = `
                <strong style="color: #dc3545;">Error:</strong><br>
                ${error.message}
            `;
            console.error(`Error in ${title}:`, error);
        }
    }
}

// Initialize demo when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only show demo on index page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        new APIDemo();
    }
});