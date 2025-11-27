/**
 * Standardized Header Loading Script
 * This should be included on all pages that dynamically load the header
 * It ensures the header is loaded correctly with proper auth state
 */

(function() {
    'use strict';
    
    /**
     * Load header and ensure auth is properly initialized
     * @param {string} placeholderId - ID of the element to load header into (default: 'header-placeholder')
     * @param {boolean} loadModals - Whether to load auth modals (default: false, set true for pages that need login)
     */
    function loadHeader(placeholderId = 'header-placeholder', loadModals = false) {
        const placeholder = document.getElementById(placeholderId);
        if (!placeholder) {
            console.error('[HEADER] Placeholder element not found:', placeholderId);
            return Promise.reject('Placeholder not found');
        }
        
        // Load header HTML
        return fetch('includes/header.html')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load header');
                return response.text();
            })
            .then(html => {
                placeholder.innerHTML = html;
                
                // Load auth modals if needed
                if (loadModals) {
                    return fetch('includes/auth-modals.html')
                        .then(response => {
                            if (!response.ok) throw new Error('Failed to load auth modals');
                            return response.text();
                        })
                        .then(modalHtml => {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = modalHtml;
                            while (tempDiv.firstChild) {
                                document.body.appendChild(tempDiv.firstChild);
                            }
                            return Promise.resolve();
                        });
                }
                return Promise.resolve();
            })
            .then(() => {
                // Wait for Auth module to be available
                function initAuth() {
                    if (window.Auth && typeof window.Auth.initHeader === 'function') {
                        // Initialize header with auth state
                        window.Auth.initHeader();
                        
                        // Also trigger auth state change event for other listeners
                        if (window.Auth.isAuthenticated && window.Auth.isAuthenticated()) {
                            const event = new Event('authStateChanged');
                            document.dispatchEvent(event);
                        }
                    } else {
                        // Retry if Auth not ready yet
                        setTimeout(initAuth, 100);
                    }
                }
                
                // Try immediately and with delays to ensure Auth is loaded
                initAuth();
                setTimeout(initAuth, 200);
                setTimeout(initAuth, 500);
                setTimeout(initAuth, 1000);
                
                // Also listen for Auth module to become available
                window.addEventListener('authModuleReady', initAuth);
            })
            .catch(error => {
                console.error('[HEADER] Error loading header:', error);
            });
    }
    
    // Export for global use
    window.loadHeader = loadHeader;
    
    // Auto-load if placeholder exists and script is loaded at page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const placeholder = document.getElementById('header-placeholder');
            if (placeholder && !placeholder.innerHTML.trim()) {
                // Only auto-load if placeholder is empty
                loadHeader();
            }
        });
    } else {
        // DOM already loaded
        const placeholder = document.getElementById('header-placeholder');
        if (placeholder && !placeholder.innerHTML.trim()) {
            loadHeader();
        }
    }
})();
