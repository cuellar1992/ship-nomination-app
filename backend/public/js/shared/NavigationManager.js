/**
 * Navigation Component
 * Centralized navigation functionality for the Premium System
 */

class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPageName();
        this.init();
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        
        if (filename === 'index.html' || filename === '') {
            return 'home';
        } else if (filename === 'ship-nominations.html') {
            return 'ship-nominations';
        } else if (filename === 'sampling-roster.html') {
            return 'sampling-roster';
        }
        return 'home';
    }

    init() {
        this.createNavigation();
        this.attachEventListeners();
        this.setActiveNavLink();
    }

    createNavigation() {
        const navbarHTML = `
            <nav class="navbar navbar-expand-lg navbar-premium">
                <div class="container">
                    <button class="navbar-toggler ms-auto" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            <li class="nav-item">
                                <a class="nav-link" href="index.html" data-page="home">Home</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="ship-nominations.html" data-page="ship-nominations">Ship Nominations</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="sampling-roster.html" data-page="sampling-roster">Sampling Roster</a>
                            </li>
                        </ul>
                        
                        <button class="btn btn-settings" id="settingsBtn">
                            <i class="fas fa-cog me-2"></i>Settings
                        </button>
                    </div>
                </div>
            </nav>
        `;

        // Insert navigation at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    }

    setActiveNavLink() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const linkPage = link.getAttribute('data-page');
            if (linkPage === this.currentPage) {
                link.classList.add('active');
            }
        });
    }

    attachEventListeners() {
        // Navbar scroll effect
        window.addEventListener('scroll', this.handleScroll);
        
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', this.openSettings);
        }

        // Ripple effects for buttons
        this.addRippleEffects();
    }

    handleScroll() {
        const navbar = document.querySelector('.navbar-premium');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    openSettings() {
    // Check if SettingsManager is available
    if (typeof window.SettingsManager !== 'undefined') {
        window.SettingsManager.openModal();
    } else {
        Logger.warn('SettingsManager not available on this page', {
            module: 'Navigation',
            showNotification: true,
            notificationMessage: 'Settings functionality not available on this page'
        });
    }
}

    addRippleEffects() {
        document.querySelectorAll('.btn-settings, .btn-primary-premium, .btn-secondary-premium').forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.3);
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    transform: scale(0);
                    animation: ripple-animation 0.6s linear;
                    pointer-events: none;
                `;
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    if (ripple.parentNode) {
                        ripple.remove();
                    }
                }, 600);
            });
        });
    }

    // Static utility method for notifications
    static showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
                ${message}
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            color: white;
            font-weight: 500;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            transform: translateX(400px);
            transition: transform 0.3s ease-out;
            max-width: 300px;
            background: ${type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 
                       type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                       'rgba(59, 130, 246, 0.9)'};
            border: 1px solid ${type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 
                               type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 
                               'rgba(59, 130, 246, 0.3)'};
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.NavigationManager = new NavigationManager();
});