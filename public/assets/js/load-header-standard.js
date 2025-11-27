/**
 * Standardized Header Loader
 * Include this on any page that needs the unified header from index.html
 */

(function() {
    'use strict';
    
    function loadHeaderAndModals() {
        const placeholder = document.getElementById('header-placeholder');
        if (!placeholder) {
            console.error('[HEADER] Header placeholder not found');
            return;
        }
        
        fetch('includes/header.html')
            .then(response => response.text())
            .then(html => {
                placeholder.innerHTML = html;
                
                // Load auth modals using standardized loader
                if (window.loadAuthModals) {
                    return window.loadAuthModals();
                } else {
                    // Fallback if load-modals.js not loaded
                    return fetch('includes/auth-modals.html')
                        .then(response => response.text())
                        .then(html => {
                            if (!document.getElementById('user-menu-modal')) {
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = html;
                                while (tempDiv.firstChild) {
                                    document.body.appendChild(tempDiv.firstChild);
                                }
                            }
                        });
                }
            })
            .then(() => {
                // Dispatch header loaded event
                document.dispatchEvent(new Event('headerLoaded'));
            })
            .catch(error => {
                console.error('[HEADER] Error loading header:', error);
            });
    }
    
    // Load on page ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHeaderAndModals);
    } else {
        loadHeaderAndModals();
    }
})();

