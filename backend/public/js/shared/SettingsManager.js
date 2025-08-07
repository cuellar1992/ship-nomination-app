/**
 * Settings Module
 * Basic settings modal structure for the Premium System
 */

class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        this.createSettingsModal();
        // Expose to NavigationManager
        window.SettingsManager = this;
    }

    createSettingsModal() {
        const modalHTML = `
            <!-- Settings Modal -->
            <div class="modal fade" id="settingsModal" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content settings-modal">
                        <div class="modal-header settings-header">
                            <h5 class="modal-title settings-title" id="settingsModalLabel">
                                <i class="fas fa-cog me-3"></i>Settings
                            </h5>
                            <button type="button" class="btn-close settings-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body settings-body">
                            <!-- Settings Content -->
                            <div class="settings-section">
                                <h6 class="settings-section-title">
                                    <i class="fas fa-wrench me-2"></i>Configuration
                                </h6>
                                <p class="text-secondary">Settings functionality will be implemented here.</p>
                            </div>
                        </div>
                        <div class="modal-footer settings-footer">
                            <button type="button" class="btn btn-modal-close" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert modal at the end of body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    openModal() {
        const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
        settingsModal.show();
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new SettingsManager();
});