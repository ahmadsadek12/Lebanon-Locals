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

        // Get current page type from URL
        const params = new URLSearchParams(window.location.search);
        const currentType = params.get('type') || getCurrentPageType();



        // Update active states
        navWords.forEach(word => {
            const wordType = word.dataset.type;
            if (wordType === currentType) {
                word.classList.add('active');

            } else {
                word.classList.remove('active');
            }
        });
    }

    function getCurrentPageType() {
        const path = window.location.pathname;
        
        // Check if we're on index page
        if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
            // Default to experiences on main page
            return 'experience';
        }
        
        // Check for specific page types
        if (path.includes('event')) return 'event';
        if (path.includes('stay')) return 'stay';
        
        // Default to experience
        return 'experience';
    }

    // Listen for navigation changes (for single-page nav if we add it later)
    window.addEventListener('popstate', setActiveNavWord);

    // Initialize
    initHeaderNavigation();

    // Export for other scripts to use
    window.HeaderNav = {
        setActiveNavWord: setActiveNavWord
    };

})();

