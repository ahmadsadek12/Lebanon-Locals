/**
 * Standardized Modal Loading Script
 * Ensures auth modals are loaded exactly once across all pages
 */

(function() {
    'use strict';
    
    let modalsLoaded = false;
    
    /**
     * Load auth modals (only once per page)
     */
    function loadAuthModals() {
        // Check if modals already exist
        if (document.getElementById('user-menu-modal')) {
            if (!modalsLoaded) {
                console.log('[MODALS] Modals already exist in DOM, skipping load');
                modalsLoaded = true;
            }
            return Promise.resolve();
        }
        
        // Check if already loading
        if (window.__loadingAuthModals) {
            return window.__loadingAuthModals;
        }
        
        // Set loading flag
        window.__loadingAuthModals = fetch('includes/auth-modals.html')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load auth modals');
                return response.text();
            })
            .then(html => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                while (tempDiv.firstChild) {
                    document.body.appendChild(tempDiv.firstChild);
                }
                modalsLoaded = true;
                window.__loadingAuthModals = null;
                console.log('[MODALS] Auth modals loaded successfully');
                return Promise.resolve();
            })
            .catch(error => {
                console.error('[MODALS] Error loading auth modals:', error);
                window.__loadingAuthModals = null;
                return Promise.reject(error);
            });
        
        return window.__loadingAuthModals;
    }
    
    // Export for global use
    window.loadAuthModals = loadAuthModals;
    
})();
