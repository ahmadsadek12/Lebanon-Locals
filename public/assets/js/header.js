/**
 * Lebanon Locals - Header Navigation
 * Handles active state for navigation words across all pages
 * @version 1.0.0
 */

(function() {
    'use strict';

    function initHeaderNavigation() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setActiveNavWord);
        } else {
            setActiveNavWord();
        }
    }

    function setActiveNavWord() {
        const navWords = document.querySelectorAll('.header-nav-words .nav-word');
        if (!navWords.length) {
            // Try again after a short delay if header hasn't loaded yet
            setTimeout(setActiveNavWord, 100);
            return;
        }

        // Check if body has hide-nav-words class - if so, don't highlight anything
        if (document.body.classList.contains('hide-nav-words')) {
            navWords.forEach(word => {
                word.classList.remove('active');
            });
            return;
        }

        // Get current page type from URL
        const params = new URLSearchParams(window.location.search);
        const currentType = params.get('type') || getCurrentPageType();

        // Update active states
        navWords.forEach(word => {
            const wordType = word.dataset.type;
            if (currentType && wordType === currentType) {
                word.classList.add('active');
            } else {
                word.classList.remove('active');
            }
        });
    }

    function getCurrentPageType() {
        const path = window.location.pathname;
        
        // On index page, don't set any nav word as active
        if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
            return null; // Return null so no nav word is highlighted
        }
        
        // Check for specific page types
        if (path.includes('event')) return 'event';
        if (path.includes('stay')) return 'stay';
        if (path.includes('experience')) return 'experience';
        
        // Default to null (no active state)
        return null;
    }

    // Listen for navigation changes (for single-page nav if we add it later)
    window.addEventListener('popstate', setActiveNavWord);

    /**
     * Ensure notifications script is loaded once header is ready
     */
    function ensureNotificationsScriptLoaded() {
        if (document.getElementById('notifications-script') || window.Notifications) {
            return;
        }

        const script = document.createElement('script');
        script.src = 'assets/js/notifications.js';
        script.id = 'notifications-script';
        script.defer = true;
        document.head.appendChild(script);
    }

    document.addEventListener('headerLoaded', ensureNotificationsScriptLoaded);
    // In case header HTML already exists before event fires
    setTimeout(ensureNotificationsScriptLoaded, 300);

    // Initialize
    initHeaderNavigation();

    /**
     * Update host/add posting button based on user type
     */
    function updateHostButton() {
        const becomeHostBtn = document.getElementById('become-host-btn');
        const addPostingBtn = document.getElementById('add-posting-btn');
               
        if (!becomeHostBtn || !addPostingBtn) {
            return;
        }
        
        // Check if user is authenticated
        if (window.Auth && window.Auth.isAuthenticated()) {
            const currentUser = window.Auth.getCurrentUser();
            
            if (currentUser && (currentUser.user_type === 'host' || currentUser.user_type === 'admin')) {
                // User is a host or admin - hide "Become a Host", show "+" on index/collections only
                becomeHostBtn.style.display = 'none';
                
                // Check if we're on index.html or collections.html
                const currentPage = window.location.pathname.split('/').pop();
                const isIndexOrCollections = currentPage === 'index.html' || 
                                            currentPage === 'collections.html' || 
                                            currentPage === '' || 
                                            currentPage === 'index' ||
                                            window.location.pathname === '/' ||
                                            window.location.pathname.endsWith('/index.html') ||
                                            window.location.pathname.endsWith('/collections.html');
                              
                if (isIndexOrCollections) {
                    addPostingBtn.style.display = 'flex';
                    // Set onclick to redirect to posting page
                    addPostingBtn.onclick = function() {
                        window.location.href = 'posting.html';
                    };
                } else {
                    addPostingBtn.style.display = 'none';
                }
            } else if (currentUser && currentUser.user_type === 'pending') {
                // Pending approval - hide both
                becomeHostBtn.style.display = 'none';
                addPostingBtn.style.display = 'none';
            } else {
                // Regular customer - show "Become a Host"
                becomeHostBtn.style.display = 'flex';
                addPostingBtn.style.display = 'none';
            }
        } else {
            // Not logged in - show "Become a Host"
            becomeHostBtn.style.display = 'flex';
            addPostingBtn.style.display = 'none';
        }
    }
    
    // Run on load and when auth changes
    setTimeout(updateHostButton, 100);
    setTimeout(updateHostButton, 500);
    setTimeout(updateHostButton, 1000);
    setTimeout(updateHostButton, 2000);
    
    // Also run when window fully loads
    window.addEventListener('load', function() {
        setTimeout(updateHostButton, 100);
        setTimeout(updateHostButton, 500);
    });
    
    // Listen for auth changes
    document.addEventListener('authStateChanged', updateHostButton);
    window.addEventListener('authChanged', updateHostButton);

    // Export for other scripts to use
    window.HeaderNav = {
        setActiveNavWord: setActiveNavWord,
        updateHostButton: updateHostButton
    };

})();

