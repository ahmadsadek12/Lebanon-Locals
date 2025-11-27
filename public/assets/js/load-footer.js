/**
 * Standardized Footer Loader
 * Automatically loads `includes/footer.html` into #footer-placeholder (or a custom target)
 */
(function() {
    'use strict';

    function loadFooter(placeholderId = 'footer-placeholder') {
        const placeholder = document.getElementById(placeholderId);
        if (!placeholder || placeholder.dataset.footerLoaded === 'true') {
            return;
        }

        if (placeholder.childElementCount > 0) {
            placeholder.dataset.footerLoaded = 'true';
            return;
        }

        if (placeholder.dataset.footerLoaded === 'loading') {
            return;
        }

        placeholder.dataset.footerLoaded = 'loading';

        fetch('includes/footer.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load footer');
                }
                return response.text();
            })
            .then(html => {
                placeholder.innerHTML = html;
                placeholder.dataset.footerLoaded = 'true';
            })
            .catch(error => {
                placeholder.dataset.footerLoaded = 'error';
                console.error('[FOOTER] Error loading footer:', error);
            });
    }

    window.loadFooter = loadFooter;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => loadFooter());
    } else {
        loadFooter();
    }
})();


