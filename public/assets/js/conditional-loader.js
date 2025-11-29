/**
 * Conditional Script Loader
 * Only loads heavy libraries when needed
 */

(function() {
    'use strict';
    
    /**
     * Load GSAP only if needed
     */
    function loadGSAPIfNeeded() {
        const needsGSAP = document.querySelector('#hero') || 
                         document.querySelector('.gsap-animation') ||
                         document.querySelector('[data-gsap]');
        
        if (needsGSAP && typeof gsap === 'undefined') {
            console.log('[LOADER] Loading GSAP...');
            
            const gsapScript = document.createElement('script');
            gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
            gsapScript.async = true;
            gsapScript.crossOrigin = 'anonymous';
            document.head.appendChild(gsapScript);
            
            gsapScript.onload = () => {
                console.log('[LOADER] GSAP loaded');
                
                // Load ScrollTrigger after GSAP
                const scrollTriggerScript = document.createElement('script');
                scrollTriggerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';
                scrollTriggerScript.async = true;
                scrollTriggerScript.crossOrigin = 'anonymous';
                document.head.appendChild(scrollTriggerScript);
                
                scrollTriggerScript.onload = () => {
                    console.log('[LOADER] ScrollTrigger loaded');
                    // Dispatch event for scripts that depend on GSAP
                    window.dispatchEvent(new Event('gsapLoaded'));
                };
            };
        }
    }
    
    /**
     * Load jQuery/Bootstrap only if needed
     */
    function loadjQueryIfNeeded() {
        const needsjQuery = document.querySelector('.bootstrap-modal') ||
                           document.querySelector('[data-toggle]') ||
                           document.querySelector('[data-bs-toggle]') ||
                           document.body.classList.contains('needs-jquery');
        
        if (needsjQuery && typeof jQuery === 'undefined') {
            console.log('[LOADER] Loading jQuery...');
            
            const jqueryScript = document.createElement('script');
            jqueryScript.src = 'js/jquery-3.5.0.js';
            jqueryScript.async = true;
            document.head.appendChild(jqueryScript);
            
            jqueryScript.onload = () => {
                console.log('[LOADER] jQuery loaded');
                
                // Load Bootstrap after jQuery
                const bootstrapScript = document.createElement('script');
                bootstrapScript.src = 'js/bootstrap.min.js';
                bootstrapScript.async = true;
                document.head.appendChild(bootstrapScript);
                
                bootstrapScript.onload = () => {
                    console.log('[LOADER] Bootstrap loaded');
                    window.dispatchEvent(new Event('jqueryLoaded'));
                };
            };
        }
    }
    
    /**
     * Load Stripe only when card payment is selected
     */
    function setupStripeLazyLoad() {
        const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
        
        if (paymentRadios.length > 0) {
            paymentRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'card' && typeof Stripe === 'undefined') {
                        console.log('[LOADER] Loading Stripe...');
                        
                        const stripeScript = document.createElement('script');
                        stripeScript.src = 'https://js.stripe.com/v3/';
                        stripeScript.async = true;
                        document.head.appendChild(stripeScript);
                        
                        stripeScript.onload = () => {
                            console.log('[LOADER] Stripe loaded');
                            window.dispatchEvent(new Event('stripeLoaded'));
                        };
                    }
                });
            });
        }
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadGSAPIfNeeded();
            loadjQueryIfNeeded();
            setupStripeLazyLoad();
        });
    } else {
        loadGSAPIfNeeded();
        loadjQueryIfNeeded();
        setupStripeLazyLoad();
    }
})();

