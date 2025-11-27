/**
 * Lebanon Locals - Main JavaScript
 * Handles all frontend interactions and animations
 * @version 1.0.0
 */

(function() {
    'use strict';

    // ===========================================
    // CONFIGURATION
    // ===========================================
    const CONFIG = {
        scrollOffset: 0.6, // 60% of viewport height
        stickyNavThreshold: 0.5, // Show sticky nav at 50% scroll
        heroScrollThreshold: 0.9, // Scroll to 90% on hero click
        animationDuration: 1000 // ms
    };
    const isHomePage = document.body.classList.contains('home-page');

    let currentSection = 'experiences';

    // ===========================================
    // DOM ELEMENTS
    // ===========================================
    const elements = {
        hero: {
            overlay: document.querySelector('.hero-overlay'),
            text: document.querySelector('.hero-text'),
            scrollHint: document.getElementById('scrollHintBtn'),
            words: {
                experiences: document.getElementById('exp'),
                events: document.getElementById('eventsWord'),
                stays: document.getElementById('staysWord')
            }
        },
        nav: {
            header: document.querySelector('.main-header'),
            words: document.querySelectorAll('.nav-word'),
            searchBtn: document.getElementById('headerSearchBtn')
        },
        sections: {
            stays: document.getElementById('stays'),
            events: document.getElementById('events'),
            experiences: document.getElementById('experiences')
        },
        search: {
            labelStart: document.getElementById('label-date-start'),
            labelEnd: document.getElementById('label-date-end'),
            dateStart: document.getElementById('input-date-start'),
            dateEnd: document.getElementById('input-date-end')
        }
    };

    // ===========================================
    // HERO SCROLL ANIMATION
    // ===========================================
    function handleHeroScroll() {
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const progress = Math.min(scrollY / (viewportHeight * 0.8), 1);

        // Animate gradient rise
        if (elements.hero.overlay) {
            const topOpacity = progress * 0.6;
            const topPosition = (1 - progress) * 50;
            elements.hero.overlay.style.background =
                `linear-gradient(to top, rgba(160,0,0,0.6) 0%, rgba(160,0,0,${topOpacity}) ${topPosition}%)`;
        }

        // Show unified header when tab disappears
        if (elements.nav.header) {
            // Calculate tab height (matches CSS min(55vh, 600px) with responsive adjustments)
            let tabHeightVh = 0.55;
            if (window.innerWidth <= 768) tabHeightVh = 0.45;
            if (window.innerWidth <= 480) tabHeightVh = 0.40;
            
            const tabHeight = Math.min(viewportHeight * tabHeightVh, 600);
            
            if (scrollY > tabHeight) {
                if (!elements.nav.header.classList.contains('header-visible')) {
                    elements.nav.header.style.display = 'block';
                    // Small delay to trigger CSS animation
                    setTimeout(() => {
                        elements.nav.header.classList.add('header-visible');
                    }, 10);
                }
            } else {
                if (elements.nav.header.classList.contains('header-visible')) {
                    elements.nav.header.classList.remove('header-visible');
                    // Wait for animation to finish before hiding
                    setTimeout(() => {
                        if (!elements.nav.header.classList.contains('header-visible')) {
                            elements.nav.header.style.display = 'none';
                        }
                    }, 300);
                }
            }
        }

        if (elements.nav.searchBtn) {
            const heroTarget = viewportHeight * CONFIG.heroScrollThreshold;
            if (scrollY > heroTarget + 50) {
                if (!elements.nav.searchBtn.classList.contains('visible')) {
                    elements.nav.searchBtn.style.display = 'inline-flex';
                    // Small delay to trigger animation
                    setTimeout(() => {
                        elements.nav.searchBtn.classList.add('visible');
                    }, 10);
                }
            } else {
                if (elements.nav.searchBtn.classList.contains('visible')) {
                    elements.nav.searchBtn.classList.remove('visible');
                    // Wait for animation to finish before hiding
                    setTimeout(() => {
                        if (!elements.nav.searchBtn.classList.contains('visible')) {
                            elements.nav.searchBtn.style.display = 'none';
                        }
                    }, 400);
                }
            }
        }

        // Toggle scroll hint visibility
        if (elements.hero.scrollHint) {
            if (scrollY > viewportHeight * 0.15) {
                elements.hero.scrollHint.classList.add('hidden');
            } else {
                elements.hero.scrollHint.classList.remove('hidden');
            }
        }
    }

    // ===========================================
    // SECTION MANAGEMENT
    // ===========================================
    function updateActiveWords() {
        document.querySelectorAll('.hero-word, .nav-word').forEach(word => {
            const href = word.getAttribute('href');
            if (!href || !href.startsWith('#')) return;

            const targetId = href.substring(1);
            if (targetId === currentSection) {
                word.classList.add('active');
            } else {
                word.classList.remove('active');
            }
        });
    }

    function showSection(sectionId) {
        if (isHomePage) {
            currentSection = sectionId;
            updateActiveWords();
            updateSearchLabels(currentSection);
            const targetSection = elements.sections[sectionId];
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
        }

        let matchedSection = null;

        // Hide all sections and reveal the requested one
        Object.entries(elements.sections).forEach(([id, section]) => {
            if (!section) return;

            if (id === sectionId) {
                section.style.display = 'block';
                matchedSection = id;
            } else {
                section.style.display = 'none';
            }
        });

        // Fallback to experiences if the section id was invalid
        currentSection = matchedSection || 'experiences';

        updateActiveWords();

        // Update search bar labels
        updateSearchLabels(currentSection);
    }

    function updateSearchLabels(sectionId) {
        if (!elements.search.labelStart || !elements.search.labelEnd) return;

        if (sectionId === 'stays') {
            elements.search.labelStart.textContent = 'Check in';
            elements.search.labelEnd.textContent = 'Check out';
        } else {
            elements.search.labelStart.textContent = 'Date from';
            elements.search.labelEnd.textContent = 'Date to';
        }
    }

    // ===========================================
    // NAVIGATION HANDLERS
    // ===========================================
    function scrollToHeroContent() {
        const viewportHeight = window.innerHeight;
        window.scrollTo({
            top: viewportHeight * CONFIG.heroScrollThreshold,
            behavior: 'smooth'
        });
    }

    function handleHeroWordClick(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);

        showSection(targetId);
        
        if (!isHomePage) {
            scrollToHeroContent();
        }
    }

    function handleScrollHintClick(e) {
        e.preventDefault();
        showSection('experiences');
        scrollToHeroContent();
    }

    function handleNavWordClick(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        
        showSection(targetId);
        
        // Only scroll if near top
        const viewportHeight = window.innerHeight;
        const currentScroll = window.scrollY || window.pageYOffset;
        
        if (currentScroll < viewportHeight * CONFIG.stickyNavThreshold) {
            window.scrollTo({ 
                top: viewportHeight * CONFIG.scrollOffset, 
                behavior: 'smooth' 
            });
        }
    }

    function handleQuickFilterClick() {
        const type = this.dataset.type || 'experience';
        const params = new URLSearchParams();
        params.set('type', type);

        if (this.dataset.subtype) {
            params.set('subtype', this.dataset.subtype);
        }

        if (this.dataset.location) {
            params.set('location', this.dataset.location);
        }

        window.location.href = `collections.html?${params.toString()}`;
    }

    function getActiveCollectionType() {
        if (currentSection === 'events') return 'event';
        if (currentSection === 'stays') return 'stay';
        return 'experience';
    }

    function handleSearchSubmit(event) {
        if (event) {
            event.preventDefault();
        }

        const locationInput = document.getElementById('input-location');
        const guestsInput = document.getElementById('input-guests');
        const location = locationInput ? locationInput.value.trim() : '';
        let startDate = elements.search.dateStart ? elements.search.dateStart.value : '';
        let endDate = elements.search.dateEnd ? elements.search.dateEnd.value : '';
        const guestsValue = guestsInput ? parseInt(guestsInput.value, 10) : NaN;

        // If only end date is provided, set start date to today
        if (!startDate && endDate) {
            startDate = new Date().toISOString().split('T')[0];
        }

        const params = new URLSearchParams();
        params.set('type', getActiveCollectionType());

        if (location) params.set('location', location);
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        if (!isNaN(guestsValue) && guestsValue > 0) params.set('guests', guestsValue.toString());

        window.location.href = `collections.html?${params.toString()}`;
    }

    // ===========================================
    // DATE INPUT HANDLING
    // ===========================================
    function handleDateInputChange() {
        if (this.value) {
            this.classList.add('has-value');
        } else {
            this.classList.remove('has-value');
        }
    }

    function setupDateValidation() {
        const { dateStart, dateEnd } = elements.search;
        
        if (!dateStart || !dateEnd) return;

        // "From" date changes
        dateStart.addEventListener('change', function() {
            if (this.value) {
                dateEnd.min = this.value;
                
                // Clear "to" date if it's before "from" date
                if (dateEnd.value && dateEnd.value < this.value) {
                    dateEnd.value = '';
                    dateEnd.classList.remove('has-value');
                }
            }
        });

        // "To" date changes
        dateEnd.addEventListener('change', function() {
            if (this.value) {
                dateStart.max = this.value;
            }
        });
    }

    // ===========================================
    // GSAP ANIMATIONS
    // ===========================================
    function initAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {

            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        // Hero text animation
        gsap.timeline({
            scrollTrigger: {
                trigger: "#hero",
                start: "top top",
                end: "bottom 30%",
                scrub: 1,
                pin: false
            }
        })
        .to(elements.hero.text, {
            y: -200,
            scale: 0.8,
            ease: "power2.out"
        });

        // Main content fade in
        gsap.timeline({
            scrollTrigger: {
                trigger: ".main-content",
                start: "top 80%",
                end: "top 50%",
                scrub: 1
            }
        })
        .from(".main-content", {
            opacity: 0,
            y: 50,
            ease: "power2.out"
        });
    }

    // ===========================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ===========================================
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            // Skip hero and nav words (they have custom handlers)
            if (anchor.classList.contains('hero-word') || anchor.classList.contains('nav-word')) {
                return;
            }

            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    // ===========================================
    // EVENT LISTENERS
    // ===========================================
    function attachEventListeners() {
        // Scroll handler
        window.addEventListener('scroll', handleHeroScroll);

        // Hero words
        document.querySelectorAll('.hero-word').forEach(word => {
            word.addEventListener('click', handleHeroWordClick);
        });
        
        // Note: Header nav words are handled separately in index.html
        // to prevent navigation to collections page

        if (elements.hero.scrollHint) {
            elements.hero.scrollHint.addEventListener('click', handleScrollHintClick);
        }

        // Nav words (only if they have hash links - on index page)
        // Skip nav words with full URLs (they're handled in index.html for index page)
        document.querySelectorAll('.nav-word').forEach(word => {
            const href = word.getAttribute('href');
            // Only attach handler if it's a hash link like #experiences
            if (href && href.startsWith('#')) {
                word.addEventListener('click', handleNavWordClick);
            }
        });

        // Header search button - now handled by search-dropdown.js
        // Removed old scroll handler

        const searchActionBtn = document.querySelector('.search-action-btn');
        if (searchActionBtn) {
            searchActionBtn.addEventListener('click', handleSearchSubmit);
        }

        const searchForm = document.getElementById('home-search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', function(event) {
                event.preventDefault();
                handleSearchSubmit(event);
            });
        }

        document.querySelectorAll('.search-bar-container input').forEach(input => {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    handleSearchSubmit(event);
                }
            });
        });

        // Date inputs
        document.querySelectorAll('.date-input').forEach(input => {
            input.addEventListener('change', handleDateInputChange);
            // Check initial value
            if (input.value) {
                input.classList.add('has-value');
            }
        });

        // Setup date validation
        setupDateValidation();

        // Smooth scroll
        setupSmoothScroll();

        document.querySelectorAll('.hero-quick-filter').forEach(btn => {
            btn.addEventListener('click', handleQuickFilterClick);
        });
    }

    // ===========================================
    // DATE PICKER INITIALIZATION
    // ===========================================
    function initDatePickers() {
        const today = new Date().toISOString().split('T')[0];
        
        if (elements.search.dateStart) {
            // Disable past dates
            elements.search.dateStart.setAttribute('min', today);
            
            // When start date changes, update end date minimum
            elements.search.dateStart.addEventListener('change', function() {
                if (elements.search.dateEnd && this.value) {
                    elements.search.dateEnd.setAttribute('min', this.value);
                    
                    // If end date is before start date, clear it
                    if (elements.search.dateEnd.value && elements.search.dateEnd.value < this.value) {
                        elements.search.dateEnd.value = '';
                    }
                }
            });
        }
        
        if (elements.search.dateEnd) {
            // Disable past dates
            elements.search.dateEnd.setAttribute('min', today);
        }
    }

    // ===========================================
    // INITIALIZATION
    // ===========================================
    function init() {
        

        if (!elements.sections.experiences || !elements.sections.events || !elements.sections.stays) {
            console.error('❌ Section elements not found, retrying...');
            setTimeout(init, 100);
            return;
        }
        // Show all sections on home page (no selection needed)
        currentSection = isHomePage ? 'all' : 'experiences';
        
        // Make all sections visible
        Object.values(elements.sections).forEach(section => {
            if (section) {
                section.style.display = 'block';
            }
        });

        // Remove active class from all navigation words (no selection on home page)
        if (isHomePage) {
            document.querySelectorAll('.hero-word, .nav-word').forEach(w => {
                w.classList.remove('active');
            });
        }

        // Attach event listeners
        attachEventListeners();

        // Initialize animations
        initAnimations();

        // Initialize date pickers
        initDatePickers();

        // Wait for CSS to be fully loaded before rendering cards
        function waitForCSS() {
            // Check if stylesheets are loaded by testing for a known class
            const testEl = document.createElement('div');
            testEl.className = 'listing-card';
            testEl.style.display = 'none';
            document.body.appendChild(testEl);

            const styles = window.getComputedStyle(testEl);
            const hasStyles = styles.display !== 'inline'; // listing-card should not be inline

            document.body.removeChild(testEl);

            if (hasStyles) {
                loadData();
            } else {
                setTimeout(waitForCSS, 50);
            }
        }

        function loadData() {
            // Load data from database AFTER CSS is ready
            if (typeof API !== 'undefined') {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        API.init();
                    }, 100);
                });
            }
        }

        // Start CSS check
        waitForCSS();
    }

    // ===========================================
    // RUN ON DOM READY
    // ===========================================

    // Wait for both DOM and all external scripts to load
    function waitForDependencies() {


        // Check if GSAP is loaded
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {

            setTimeout(waitForDependencies, 100);
            return;
        }

        // Check if jQuery is loaded (if needed)
        if (typeof jQuery === 'undefined') {

            setTimeout(waitForDependencies, 100);
            return;
        }



        // All dependencies loaded, initialize

        init();
    }

    // Start checking when DOM is ready



    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', () => {

            waitForDependencies();
        });
    } else {
        waitForDependencies();
    }

    // Export showSection for header navigation
    window.showSection = showSection;

})();

