(function() {
    'use strict';

    const PRICE_RANGE = { min: 0, max: 10000, step: 10 };
    const LENGTH_RANGE = { min: 0, max: 24, step: 0.5 };

    const DIFFICULTY_OPTIONS = [
        { value: 'professional', label: 'Professional' },
        { value: 'extreme', label: 'Extreme' },
        { value: 'hard', label: 'Hard' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'easy', label: 'Easy' },
        { value: 'beginners', label: 'Beginners' }
    ];

    const CANCELLATION_OPTIONS = [
        { value: 'flexible', label: 'Flexible' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'strict', label: 'Strict' }
    ];

    const STAY_PROPERTY_TYPES = [
        { value: 'house', label: 'House' },
        { value: 'apartment', label: 'Apartment' },
        { value: 'villa', label: 'Villa' },
        { value: 'cabin', label: 'Cabin' },
        { value: 'hotel', label: 'Hotel' },
        { value: 'hostel', label: 'Hostel' },
        { value: 'guesthouse', label: 'Guesthouse' },
        { value: 'other', label: 'Other' }
    ];

    const HOUSE_RULE_OPTIONS = [
        { value: 'smoking_allowed', label: 'Smoking allowed' },
        { value: 'parties_allowed', label: 'Parties & events allowed' },
        { value: 'filming_allowed', label: 'Filming allowed' },
        { value: 'pets_allowed', label: 'Pets allowed' },
        { value: 'quiet_hours', label: 'Quiet hours enforced' }
    ];

    const HOUSE_RULE_LABEL_MAP = HOUSE_RULE_OPTIONS.reduce((acc, option) => {
        acc[option.value] = option.label;
        return acc;
    }, {});

    const PROPERTY_TYPE_LABEL_MAP = STAY_PROPERTY_TYPES.reduce((acc, option) => {
        acc[option.value] = option.label;
        return acc;
    }, {});

    function parseNumericParam(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function parseIntegerParam(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function parseArrayParam(value) {
        if (!value) return [];
        return value
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);
    }

    function formatCurrency(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '';
        return `$${number.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }

    function parseBooleanParam(value) {
        if (value === null || value === undefined || value === '') return false;
        const normalized = String(value).toLowerCase();
        return ['1', 'true', 'yes', 'on'].includes(normalized);
    }

    function formatHours(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '';
        return `${number.toLocaleString(undefined, { maximumFractionDigits: number % 1 === 0 ? 0 : 1 })} hrs`;
    }

    function formatTimeLabel(value) {
        if (!value) return '';
        return value;
    }

    function clamp(value, min, max) {
        if (!Number.isFinite(value)) return min;
        return Math.min(Math.max(value, min), max);
    }

    function getActivePriceRange() {
        return {
            min: state.priceMin !== null ? clamp(state.priceMin, PRICE_RANGE.min, PRICE_RANGE.max) : PRICE_RANGE.min,
            max: state.priceMax !== null ? clamp(state.priceMax, PRICE_RANGE.min, PRICE_RANGE.max) : PRICE_RANGE.max
        };
    }

    let filtersOpen = false;
    let amenitiesLoaded = false;
    let currentPage = 1;
    let allResults = [];
    let totalPages = 1;
    let amenityOptions = [];
    const amenityLabelMap = new Map();

    const params = new URLSearchParams(window.location.search);
    const state = {
        type: parseType(params.get('type') || 'experience'),
        location: params.get('location') ? params.get('location').trim() : '',
        startDate: params.get('start_date') ? params.get('start_date').trim() : '',
        endDate: params.get('end_date') ? params.get('end_date').trim() : '',
        guests: params.get('guests') ? parseInt(params.get('guests'), 10) : null,
        subtype: params.get('subtype') ? params.get('subtype').trim() : '',
        view: params.get('view') ? params.get('view').trim() : '',
        sort: params.get('sort') ? params.get('sort').trim() : 'random',
        priceMin: parseNumericParam(params.get('price_min')),
        priceMax: parseNumericParam(params.get('price_max')),
        lengthMin: parseNumericParam(params.get('length_hours_min')),
        lengthMax: parseNumericParam(params.get('length_hours_max')),
        hourStart: params.get('hour_start') ? params.get('hour_start').trim() : null,
        hourEnd: params.get('hour_end') ? params.get('hour_end').trim() : null,
        difficulty: parseArrayParam(params.get('difficulty')),
        minAge: parseIntegerParam(params.get('min_age')),
        maxAge: parseIntegerParam(params.get('max_age')),
        cancellation: parseArrayParam(params.get('cancellation')),
        bedroomsMin: parseIntegerParam(params.get('bedrooms_min')),
        bedsMin: parseIntegerParam(params.get('beds_min')),
        doubleBedsMin: parseIntegerParam(params.get('double_beds_min')),
        singleBedsMin: parseIntegerParam(params.get('single_beds_min')),
        includeCouchBeds: parseBooleanParam(params.get('include_couch_beds')),
        bathroomsMin: parseNumericParam(params.get('bathrooms_min')),
        propertyTypes: parseArrayParam(params.get('property_type')).map(value => value.toLowerCase()),
        houseRules: parseArrayParam(params.get('house_rules')).map(value => value.toLowerCase()),
        amenities: parseArrayParam(params.get('amenities')).filter(value => value !== '')
    };

    state.difficulty = state.difficulty.filter(value => DIFFICULTY_OPTIONS.some(option => option.value === value));
    state.cancellation = state.cancellation.filter(value => CANCELLATION_OPTIONS.some(option => option.value === value));
    state.propertyTypes = state.propertyTypes.filter(value => STAY_PROPERTY_TYPES.some(option => option.value === value));
    state.houseRules = state.houseRules.filter(value => HOUSE_RULE_LABEL_MAP[value]);
    state.amenities = Array.from(new Set(state.amenities.filter(value => /^\d+$/.test(value))));
    state.includeCouchBeds = Boolean(state.includeCouchBeds);

    function openFilters() {
        if (filtersOpen || !filterElements.panel) return;
        filtersOpen = true;
        filterElements.panel.classList.add('open');
        filterElements.panel.setAttribute('aria-hidden', 'false');
        if (filterElements.backdrop) {
            filterElements.backdrop.classList.add('visible');
            filterElements.backdrop.setAttribute('aria-hidden', 'false');
        }
        document.body.classList.add('filters-open');
        if (filterElements.toggleBtn) {
            filterElements.toggleBtn.setAttribute('aria-expanded', 'true');
        }
        setInitialFilterControlValues();
        updateFilterVisibility();
    }

    function closeFilters() {
        if (!filterElements.panel) return;
        filtersOpen = false;
        filterElements.panel.classList.remove('open');
        filterElements.panel.setAttribute('aria-hidden', 'true');
        if (filterElements.backdrop) {
            filterElements.backdrop.classList.remove('visible');
            filterElements.backdrop.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('filters-open');
        if (filterElements.toggleBtn) {
            filterElements.toggleBtn.setAttribute('aria-expanded', 'false');
        }
    }

    function toggleFilters(event) {
        if (event) {
            event.preventDefault();
        }
        if (filtersOpen) {
            closeFilters();
        } else {
            openFilters();
        }
    }

    function handleFilterKeydown(event) {
        if (event.key === 'Escape' && filtersOpen) {
            closeFilters();
        }
    }

    function ensureTimeOptions(select) {
        if (!select || select.dataset.initialised === 'true') return;

        const fragment = document.createDocumentFragment();
        const anyOption = document.createElement('option');
        anyOption.value = '';
        anyOption.textContent = 'Any';
        fragment.appendChild(anyOption);

        for (let hour = 0; hour < 24; hour += 1) {
            for (let minute of [0, 30]) {
                const option = document.createElement('option');
                const label = `${hour.toString().padStart(2, '0')}:${minute === 0 ? '00' : '30'}`;
                option.value = label;
                option.textContent = label;
                fragment.appendChild(option);
            }
        }

        select.innerHTML = '';
        select.appendChild(fragment);
        select.dataset.initialised = 'true';
    }

    const titleMap = {
        experience: 'Experiences',
        event: 'Events',
        stay: 'Stays'
    };

    const resultsContainer = document.getElementById('collectionsResults');
    const titleEl = document.getElementById('collectionsTitle');
    const subtitleEl = document.getElementById('collectionsSubtitle');
    const filtersEl = document.getElementById('collectionsFilters');
    const navWords = document.querySelectorAll('.nav-word[data-type]');
    const stickySearchBtn = document.getElementById('stickySearchBtn');
    const searchSection = document.querySelector('.collections-search');

    const filterElements = {
        panel: document.getElementById('collectionsFiltersPanel'),
        form: document.getElementById('collectionsFiltersForm'),
        applyBtn: document.getElementById('filtersApplyBtn'),
        resetBtn: document.getElementById('filtersResetBtn'),
        priceMinRange: document.getElementById('filter-price-min-range'),
        priceMaxRange: document.getElementById('filter-price-max-range'),
        priceMinInput: document.getElementById('filter-price-min-input'),
        priceMaxInput: document.getElementById('filter-price-max-input'),
        lengthMinInput: document.getElementById('filter-length-min-input'),
        lengthMaxInput: document.getElementById('filter-length-max-input'),
        bedroomsMinInput: document.getElementById('filter-bedrooms-min'),
        bedsMinInput: document.getElementById('filter-beds-min'),
        doubleBedsMinInput: document.getElementById('filter-double-beds-min'),
        singleBedsMinInput: document.getElementById('filter-single-beds-min'),
        couchBedsCheckbox: document.getElementById('filter-single-include-couch'),
        bathroomsMinInput: document.getElementById('filter-bathrooms-min'),
        hourStart: document.getElementById('filter-hour-start'),
        hourEnd: document.getElementById('filter-hour-end'),
        minAge: document.getElementById('filter-min-age'),
        maxAge: document.getElementById('filter-max-age'),
        difficultyContainer: document.getElementById('filter-difficulty-options'),
        cancellationContainer: document.getElementById('filter-cancellation-options'),
        propertyTypeContainer: document.getElementById('filter-property-type-options'),
        houseRulesContainer: document.getElementById('filter-house-rules'),
        amenitiesContainer: document.getElementById('filter-amenities-options'),
        difficultyCheckboxes: null,
        cancellationCheckboxes: null,
        propertyTypeCheckboxes: null,
        houseRuleCheckboxes: null,
        amenityCheckboxes: null,
        eventDateStart: document.getElementById('filter-event-date-start'),
        eventDateEnd: document.getElementById('filter-event-date-end'),
        toggleBtn: document.getElementById('filtersToggleBtn'),
        backdrop: document.getElementById('filtersBackdrop')
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function initDatePickers() {
        const today = new Date().toISOString().split('T')[0];
        const dateStart = document.getElementById('input-date-start');
        const dateEnd = document.getElementById('input-date-end');
        const filterEventDateStart = document.getElementById('filter-event-date-start');
        const filterEventDateEnd = document.getElementById('filter-event-date-end');
        
        // Main search bar dates
        if (dateStart) {
            dateStart.setAttribute('min', today);
            dateStart.addEventListener('change', function() {
                if (dateEnd && this.value) {
                    dateEnd.setAttribute('min', this.value);
                    if (dateEnd.value && dateEnd.value < this.value) {
                        dateEnd.value = '';
                    }
                }
            });
        }
        
        if (dateEnd) {
            dateEnd.setAttribute('min', today);
        }
        
        // Filter event date range
        if (filterEventDateStart) {
            filterEventDateStart.setAttribute('min', today);
            filterEventDateStart.addEventListener('change', function() {
                if (filterEventDateEnd && this.value) {
                    filterEventDateEnd.setAttribute('min', this.value);
                    if (filterEventDateEnd.value && filterEventDateEnd.value < this.value) {
                        filterEventDateEnd.value = '';
                    }
                }
            });
        }
        
        if (filterEventDateEnd) {
            filterEventDateEnd.setAttribute('min', today);
        }
    }

    function init() {
        updateHeader();
        populateSearchFields();
        initDatePickers();
        setupDateInputHandlers();
        registerNavHandlers();
        registerSearchScrollHandler();
        registerSearchSubmitHandlers();
        registerClearSearchHandler();
        registerSortHandler();
        initFilters();
        loadSubtypes();
        setupPagination();
        loadResults();
    }
    
    // Get items per page based on screen width
    function getItemsPerPage() {
        const width = window.innerWidth;
        if (width > 1440) {
            return 24; // 6 columns × 4 rows
        } else if (width > 1200) {
            return 25; // 5 columns × 5 rows
        } else if (width > 1024) {
            return 20; // 4 columns × 5 rows
        } else {
            return 24; // 3 columns × 8 rows
        }
    }
    
    // Setup pagination controls
    function setupPagination() {
        const firstBtn = document.getElementById('firstPageBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (firstBtn) {
            firstBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage = 1;
                    renderPage();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderPage();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderPage();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
        
        // Re-calculate pagination on window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (allResults.length > 0) {
                    const itemsPerPage = getItemsPerPage();
                    const newTotalPages = Math.ceil(allResults.length / itemsPerPage);
                    
                    // If total pages changed, recalculate
                    if (newTotalPages !== totalPages) {
                        totalPages = newTotalPages;
                        // Stay on same page if possible, otherwise go to last page
                        currentPage = Math.min(currentPage, totalPages);
                        renderPage();
                    }
                }
            }, 300);
        });
    }
    
    // Render current page
    function renderPage() {
        const resultsContainer = document.getElementById('collectionsResults');
        if (!resultsContainer || allResults.length === 0) return;
        
        const itemsPerPage = getItemsPerPage();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = allResults.slice(startIndex, endIndex);
        
        // Render cards
        const cardsHtml = pageItems.map(item => renderCard(item)).join('');
        resultsContainer.innerHTML = cardsHtml;
        API.bindReviewLinkHandlers(resultsContainer);
        
        if (window.WishlistManager) {
            window.WishlistManager.initAllHeartButtons();
        }
        
        // Update pagination controls
        updatePaginationControls();
    }
    
    // Update pagination UI
    function updatePaginationControls() {
        const container = document.getElementById('paginationContainer');
        const firstBtn = document.getElementById('firstPageBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const info = document.getElementById('paginationInfo');
        
        if (!container) return;
        
        if (totalPages > 1) {
            container.style.display = 'flex';
            
            if (firstBtn) {
                firstBtn.disabled = currentPage === 1;
            }
            
            if (prevBtn) {
                prevBtn.disabled = currentPage === 1;
            }
            
            if (nextBtn) {
                nextBtn.disabled = currentPage === totalPages;
            }
            
            if (info) {
                info.textContent = `Page ${currentPage} of ${totalPages}`;
            }
        } else {
            container.style.display = 'none';
        }
    }

    function parseType(value) {
        const normalized = (value || '').toLowerCase();
        return ['experience', 'event', 'stay'].includes(normalized) ? normalized : 'experience';
    }

    function updateHeader(count) {
        const baseTitle = titleMap[state.type] || 'Collections';
        titleEl.textContent = `${baseTitle} Collections`;
        document.title = `${baseTitle} Collections – Lebanon Locals`;

        navWords.forEach(word => {
            if (word.dataset.type === state.type) {
                word.classList.add('active');
            } else {
                word.classList.remove('active');
            }
        });

        const resultCount = typeof count === 'number' ? count : null;
        const subtitleParts = [];
        if (resultCount !== null) {
            subtitleParts.push(`${resultCount} ${baseTitle.toLowerCase()} found`);
        } else {
            subtitleParts.push(`Exploring ${baseTitle.toLowerCase()}`);
        }

        if (state.view === 'featured') {
            subtitleParts.push('Featured picks');
        } else if (state.subtype) {
            subtitleParts.push(`Subtype: ${state.subtype}`);
        }

        subtitleEl.textContent = subtitleParts.join(' • ');

        renderFilterChips();
    }

    function renderFilterChips() {
        const chips = [];

        // Removed redundant search parameter chips (location, dates, guests)
        // These are already shown in the search bar above

        // if (state.location) {
        //     chips.push(createChip(`Location: ${state.location}`));
        // }

        // if (state.startDate) {
        //     chips.push(createChip(`From: ${formatDate(state.startDate)}`));
        // }

        // if (state.endDate) {
        //     chips.push(createChip(`To: ${formatDate(state.endDate)}`));
        // }

        // if (state.guests && state.guests > 0) {
        //     chips.push(createChip(`${state.guests} guest${state.guests > 1 ? 's' : ''}`));
        // }

        const hasPriceMin = state.priceMin !== null && state.priceMin > PRICE_RANGE.min;
        const hasPriceMax = state.priceMax !== null && state.priceMax < PRICE_RANGE.max;
        if (hasPriceMin || hasPriceMax) {
            const parts = [];
            if (hasPriceMin) parts.push(`from ${formatCurrency(state.priceMin)}`);
            if (hasPriceMax) parts.push(`to ${formatCurrency(state.priceMax)}`);
            chips.push(createChip(`Price ${parts.join(' ')}`));
        }

        const hasLengthMin = state.lengthMin !== null && state.lengthMin > LENGTH_RANGE.min;
        const hasLengthMax = state.lengthMax !== null && state.lengthMax < LENGTH_RANGE.max;
        if (hasLengthMin || hasLengthMax) {
            const parts = [];
            if (hasLengthMin) parts.push(`min ${formatHours(state.lengthMin)}`);
            if (hasLengthMax) parts.push(`max ${formatHours(state.lengthMax)}`);
            chips.push(createChip(`Duration ${parts.join(' ')}`));
        }

        if (state.type === 'experience') {
            if (state.hourStart || state.hourEnd) {
                const startLabel = state.hourStart ? formatTimeLabel(state.hourStart) : 'Any';
                const endLabel = state.hourEnd ? formatTimeLabel(state.hourEnd) : 'Any';
                chips.push(createChip(`Hours ${startLabel} – ${endLabel}`));
            }
        }

        if (state.type === 'stay') {
            if (state.bedroomsMin !== null && state.bedroomsMin > 0) {
                chips.push(createChip(`Bedrooms ≥ ${state.bedroomsMin}`));
            }

            if (state.bedsMin !== null && state.bedsMin > 0) {
                chips.push(createChip(`Beds ≥ ${state.bedsMin}`));
            }

            if (state.doubleBedsMin !== null && state.doubleBedsMin > 0) {
                chips.push(createChip(`Double beds ≥ ${state.doubleBedsMin}`));
            }

            if (state.singleBedsMin !== null && state.singleBedsMin > 0) {
                let label = `Single beds ≥ ${state.singleBedsMin}`;
                if (state.includeCouchBeds) {
                    label += ' (incl. couch)';
                }
                chips.push(createChip(label));
            }

            if (state.bathroomsMin !== null && state.bathroomsMin > 0) {
                chips.push(createChip(`Bathrooms ≥ ${state.bathroomsMin}`));
            }

            if (state.propertyTypes.length > 0) {
                const labels = state.propertyTypes
                    .map(value => PROPERTY_TYPE_LABEL_MAP[value] || toTitleCase(value))
                    .join(', ');
                chips.push(createChip(`Property type: ${labels}`));
            }

            if (state.houseRules.length > 0) {
                const labels = state.houseRules
                    .map(value => HOUSE_RULE_LABEL_MAP[value] || toTitleCase(value.replace(/_/g, ' ')))
                    .join(', ');
                chips.push(createChip(`House rules: ${labels}`));
            }

            if (state.amenities.length > 0) {
                const names = state.amenities
                    .map(id => amenityLabelMap.get(id) || `Amenity ${id}`);
                if (names.length <= 2) {
                    chips.push(createChip(`Amenities: ${names.join(', ')}`));
                } else {
                    const [first, second, ...rest] = names;
                    chips.push(createChip(`Amenities: ${first}, ${second} +${rest.length}`));
                }
            }
        }

        if (state.difficulty.length > 0) {
            const labels = state.difficulty
                .map(value => {
                    const option = DIFFICULTY_OPTIONS.find(opt => opt.value === value);
                    return option ? option.label : value;
                })
                .join(', ');
            chips.push(createChip(`Difficulty: ${labels}`));
        }

        if (state.minAge !== null) {
            chips.push(createChip(`Min age ≥ ${state.minAge}`));
        }

        if (state.maxAge !== null) {
            chips.push(createChip(`Max age ≤ ${state.maxAge}`));
        }

        if (state.cancellation.length > 0) {
            const labels = state.cancellation
                .map(value => {
                    const option = CANCELLATION_OPTIONS.find(opt => opt.value === value);
                    return option ? option.label : value;
                })
                .join(', ');
            chips.push(createChip(`Cancellation: ${labels}`));
        }

        filtersEl.innerHTML = chips.join('');
    }

    function createChip(label) {
        return `<span class="filter-chip">${label}</span>`;
    }

    function formatDate(dateStr) {
        const parsed = new Date(dateStr);
        if (Number.isNaN(parsed.getTime())) return dateStr;
        return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function registerNavHandlers() {
        navWords.forEach(word => {
            word.addEventListener('click', (event) => {
                event.preventDefault();
                const newType = word.dataset.type;
                if (!newType || newType === state.type) return;

                // Update active class immediately for visual feedback
                navWords.forEach(w => w.classList.remove('active'));
                word.classList.add('active');

                state.type = parseType(newType);
                state.subtype = '';
                state.view = '';

                if (state.type !== 'experience') {
                    state.hourStart = null;
                    state.hourEnd = null;
                }

                if (state.type === 'stay') {
                    state.lengthMin = null;
                    state.lengthMax = null;
                    state.difficulty = [];
                    state.minAge = null;
                    state.maxAge = null;
                } else {
                    state.bedroomsMin = null;
                    state.bedsMin = null;
                    state.doubleBedsMin = null;
                    state.singleBedsMin = null;
                    state.includeCouchBeds = false;
                    state.bathroomsMin = null;
                    state.propertyTypes = [];
                    state.houseRules = [];
                    state.amenities = [];
                }

                const query = buildQueryParamsFromState();
                closeFilters();
                window.location.href = `collections.html?${query.toString()}`;
            });
        });
        
        // Set initial active state based on current type
        updateNavActiveState();
    }
    
    function updateNavActiveState() {
        navWords.forEach(word => {
            const wordType = word.dataset.type;
            if (wordType === state.type) {
                word.classList.add('active');
            } else {
                word.classList.remove('active');
            }
        });
    }

    function registerSearchScrollHandler() {
        // Search button click handler now handled by search-dropdown.js
        // Removed old scroll handler
        if (stickySearchBtn && searchSection) {
            // Keep scroll position tracking for other purposes
            // stickySearchBtn.addEventListener('click', (event) => {
            //     event.preventDefault();
            //     searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // });

            const updateStickyButton = () => {
                const threshold = searchSection.offsetTop + searchSection.offsetHeight + 50;
                if (window.scrollY > threshold) {
                    stickySearchBtn.classList.add('visible');
                } else {
                    stickySearchBtn.classList.remove('visible');
                }
            };

            window.addEventListener('scroll', updateStickyButton);
            updateStickyButton();
        }
    }

    function registerSearchSubmitHandlers() {
        const searchButton = document.querySelector('.collections-search .search-action-btn');
        const inputs = document.querySelectorAll('.collections-search .search-bar-container input');

        const submit = (event) => {
            if (event) {
                event.preventDefault();
            }

            const locationInput = document.getElementById('input-location');
            const guestsInput = document.getElementById('input-guests');
            const locationValue = locationInput ? locationInput.value.trim() : '';
            let startValue = document.getElementById('input-date-start')?.value || '';
            let endValue = document.getElementById('input-date-end')?.value || '';
            const guestsValue = guestsInput ? parseInt(guestsInput.value, 10) : NaN;

            // If only end date is provided, set start date to today
            if (!startValue && endValue) {
                startValue = new Date().toISOString().split('T')[0];
            }

            state.location = locationValue;
            state.startDate = startValue;
            state.endDate = endValue;
            state.guests = !Number.isNaN(guestsValue) && guestsValue > 0 ? guestsValue : null;

            const query = buildQueryParamsFromState();
            closeFilters();
            window.location.href = `collections.html?${query.toString()}`;
        };

        if (searchButton) {
            searchButton.addEventListener('click', submit);
        }

        inputs.forEach(input => {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    submit(event);
                }
            });
        });
    }

    function registerClearSearchHandler() {
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (!clearSearchBtn) return;

        // Function to check if any search fields have values
        function updateClearButtonVisibility() {
            const hasSearchValues = state.location || state.startDate || state.endDate || state.guests;
            if (hasSearchValues) {
                clearSearchBtn.style.display = 'inline-flex';
            } else {
                clearSearchBtn.style.display = 'none';
            }
        }

        // Initial check
        updateClearButtonVisibility();

        // Check on input changes
        const searchInputs = document.querySelectorAll('#locationInput, #startDateInput, #endDateInput, #guestsInput');
        searchInputs.forEach(input => {
            input.addEventListener('input', updateClearButtonVisibility);
            input.addEventListener('change', updateClearButtonVisibility);
        });

        clearSearchBtn.addEventListener('click', (event) => {
            event.preventDefault();
            
            state.location = '';
            state.startDate = '';
            state.endDate = '';
            state.guests = null;
            
            const query = buildQueryParamsFromState();
            closeFilters();
            window.location.href = `collections.html?${query.toString()}`;
        });
    }

    async function loadSubtypes() {
        const container = document.getElementById('collectionsSubtypes');
        if (!container) return;
        
        try {
            // Fetch subtypes for current type
            const response = await fetch(`/backend/api/subtypes.php?category=${state.type}`);
            const data = await response.json();
            
            console.log('Subtypes loaded:', data);
            
            if (data.success && data.data && data.data.length > 0) {
                // Add "All" option first with star icon
                let subtypesHtml = `<button class="subtype-btn ${!state.subtype ? 'active' : ''}" data-subtype="">
                    <i class="fa fa-star subtype-icon-star"></i>
                    <span class="subtype-name">All</span>
                </button>`;
                
                // Add each subtype with icon if available
                subtypesHtml += data.data.map(subtype => {
                    const isActive = state.subtype === subtype.name ? 'active' : '';
                    const iconUrl = subtype.icon_url || 'images/icons/default-subtype.svg';
                    console.log(`Subtype: ${subtype.name}, Icon: ${iconUrl}`);
                    return `<button class="subtype-btn ${isActive}" data-subtype="${subtype.name}">
                        <img src="${iconUrl}" alt="${subtype.name}" class="subtype-icon" onerror="this.src='images/icons/default-subtype.svg'">
                        <span class="subtype-name">${subtype.name}</span>
                    </button>`;
                }).join('');
                
                container.innerHTML = subtypesHtml;
                container.style.display = 'flex';
                
                // Add click handlers
                container.querySelectorAll('.subtype-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const selectedSubtype = this.dataset.subtype;
                        
                        // Update state
                        state.subtype = selectedSubtype || null;
                        
                        // Update URL and reload
                        const query = buildQueryParamsFromState();
                        window.location.href = `collections.html?${query.toString()}`;
                    });
                });
            } else {
                container.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to load subtypes:', error);
            container.style.display = 'none';
        }
    }

    function registerSortHandler() {
        const sortSelect = document.getElementById('sortSelect');
        if (!sortSelect) return;

        // Set initial value based on state
        sortSelect.value = state.sort || 'random';

        sortSelect.addEventListener('change', (event) => {
            state.sort = event.target.value;
            const query = buildQueryParamsFromState();
            window.location.href = `collections.html?${query.toString()}`;
        });
    }

    function sortResults(data, sortType) {
        const dataCopy = [...data];
        
        switch(sortType) {
            case 'rating_high':
                return dataCopy.sort((a, b) => {
                    const ratingA = parseFloat(a.average_rating) || 0;
                    const ratingB = parseFloat(b.average_rating) || 0;
                    return ratingB - ratingA;
                });
            
            case 'rating_low':
                return dataCopy.sort((a, b) => {
                    const ratingA = parseFloat(a.average_rating) || 0;
                    const ratingB = parseFloat(b.average_rating) || 0;
                    return ratingA - ratingB;
                });
            
            case 'price_high':
                return dataCopy.sort((a, b) => {
                    const priceA = parseFloat(a.price || a.price_per_night || 0);
                    const priceB = parseFloat(b.price || b.price_per_night || 0);
                    return priceB - priceA;
                });
            
            case 'price_low':
                return dataCopy.sort((a, b) => {
                    const priceA = parseFloat(a.price || a.price_per_night || 0);
                    const priceB = parseFloat(b.price || b.price_per_night || 0);
                    return priceA - priceB;
                });
            
            case 'random':
            default:
                // Fisher-Yates shuffle algorithm
                for (let i = dataCopy.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [dataCopy[i], dataCopy[j]] = [dataCopy[j], dataCopy[i]];
                }
                return dataCopy;
        }
    }

    function buildQueryParamsFromState() {
        const query = new URLSearchParams();
        query.set('type', state.type || 'experience');

        if (state.location) query.set('location', state.location);
        if (state.startDate) query.set('start_date', state.startDate);
        if (state.endDate) query.set('end_date', state.endDate);
        if (state.guests && state.guests > 0) query.set('guests', state.guests.toString());

        if (state.subtype && state.view !== 'featured') {
            query.set('subtype', state.subtype);
        }

        if (state.view === 'featured') {
            query.set('view', 'featured');
        }
        
        if (state.sort && state.sort !== 'random') {
            query.set('sort', state.sort);
        }

        if (state.priceMin !== null && state.priceMin > PRICE_RANGE.min) {
            query.set('price_min', String(state.priceMin));
        }

        if (state.priceMax !== null && state.priceMax < PRICE_RANGE.max) {
            query.set('price_max', String(state.priceMax));
        }

        if (state.type === 'stay') {
            if (state.bedroomsMin !== null && state.bedroomsMin >= 0) {
                query.set('bedrooms_min', String(state.bedroomsMin));
            }

            if (state.bedsMin !== null && state.bedsMin >= 0) {
                query.set('beds_min', String(state.bedsMin));
            }

            if (state.doubleBedsMin !== null && state.doubleBedsMin >= 0) {
                query.set('double_beds_min', String(state.doubleBedsMin));
            }

            if (state.singleBedsMin !== null && state.singleBedsMin >= 0) {
                query.set('single_beds_min', String(state.singleBedsMin));
            }

            if (state.includeCouchBeds) {
                query.set('include_couch_beds', '1');
            }

            if (state.bathroomsMin !== null && state.bathroomsMin >= 0) {
                query.set('bathrooms_min', String(state.bathroomsMin));
            }

            if (state.propertyTypes.length > 0) {
                query.set('property_type', state.propertyTypes.join(','));
            }

            if (state.cancellation.length > 0) {
                query.set('cancellation', state.cancellation.join(','));
            }

            if (state.houseRules.length > 0) {
                query.set('house_rules', state.houseRules.join(','));
            }

            if (state.amenities.length > 0) {
                query.set('amenities', state.amenities.join(','));
            }

        } else {
            if (state.lengthMin !== null && state.lengthMin > LENGTH_RANGE.min) {
                query.set('length_hours_min', String(state.lengthMin));
            }

            if (state.lengthMax !== null && state.lengthMax < LENGTH_RANGE.max) {
                query.set('length_hours_max', String(state.lengthMax));
            }

            if (state.difficulty.length > 0) {
                query.set('difficulty', state.difficulty.join(','));
            }

            if (state.minAge !== null && state.minAge >= 0) {
                query.set('min_age', String(state.minAge));
            }

            if (state.maxAge !== null && state.maxAge >= 0) {
                query.set('max_age', String(state.maxAge));
            }

            if (state.cancellation.length > 0) {
                query.set('cancellation', state.cancellation.join(','));
            }

            if (state.type === 'experience') {
                if (state.hourStart) {
                    query.set('hour_start', state.hourStart);
                }

                if (state.hourEnd) {
                    query.set('hour_end', state.hourEnd);
                }
            }
        }

        return query;
    }

    function renderCheckboxGroup(container, options, filterKey) {
        if (!container || !Array.isArray(options)) return;
        container.innerHTML = options.map((option, index) => {
            const id = `${filterKey}-option-${index}`;
            return `
                <label class="filter-checkbox" for="${id}">
                    <input type="checkbox" id="${id}" data-filter="${filterKey}" value="${option.value}">
                    <span>${option.label}</span>
                </label>
            `;
        }).join('');

        if (filterKey === 'difficulty') {
            filterElements.difficultyCheckboxes = container.querySelectorAll('input[data-filter="difficulty"]');
        } else if (filterKey === 'cancellation') {
            filterElements.cancellationCheckboxes = container.querySelectorAll('input[data-filter="cancellation"]');
        } else if (filterKey === 'property_type') {
            filterElements.propertyTypeCheckboxes = container.querySelectorAll('input[data-filter="property_type"]');
        } else if (filterKey === 'house_rules') {
            filterElements.houseRuleCheckboxes = container.querySelectorAll('input[data-filter="house_rules"]');
        } else if (filterKey === 'amenities') {
            filterElements.amenityCheckboxes = container.querySelectorAll('input[data-filter="amenities"]');
        }
    }

    async function loadAmenitiesOptions() {
        if (!filterElements.amenitiesContainer || amenitiesLoaded) return;

        try {
            const response = await API.getAmenities();
            if (response && response.success && Array.isArray(response.data)) {
                amenityOptions = response.data.map(item => ({
                    value: String(item.id),
                    label: item.name
                }));
                amenityLabelMap.clear();
                amenityOptions.forEach(option => amenityLabelMap.set(option.value, option.label));
                renderCheckboxGroup(filterElements.amenitiesContainer, amenityOptions, 'amenities');
                amenitiesLoaded = true;
                setInitialFilterControlValues();
                renderFilterChips();
            }
        } catch (error) {
            console.error('Failed to load amenities:', error);
        }
    }

    function initFilters() {
        if (!filterElements.form) return;

        renderCheckboxGroup(filterElements.difficultyContainer, DIFFICULTY_OPTIONS, 'difficulty');
        renderCheckboxGroup(filterElements.cancellationContainer, CANCELLATION_OPTIONS, 'cancellation');
        renderCheckboxGroup(filterElements.propertyTypeContainer, STAY_PROPERTY_TYPES, 'property_type');
        renderCheckboxGroup(filterElements.houseRulesContainer, HOUSE_RULE_OPTIONS, 'house_rules');

        ensureTimeOptions(filterElements.hourStart);
        ensureTimeOptions(filterElements.hourEnd);

        setInitialFilterControlValues();
        attachFilterControlHandlers();
        updateFilterVisibility();
        closeFilters();

        loadAmenitiesOptions();

        if (filterElements.toggleBtn) {
            filterElements.toggleBtn.addEventListener('click', toggleFilters);
        }

        if (filterElements.backdrop) {
            filterElements.backdrop.addEventListener('click', closeFilters);
        }

        document.addEventListener('keydown', handleFilterKeydown);
    }

    function setInitialFilterControlValues() {
        const priceRange = getActivePriceRange();
        if (filterElements.priceMinRange && filterElements.priceMaxRange) {
            filterElements.priceMinRange.min = PRICE_RANGE.min;
            filterElements.priceMinRange.max = PRICE_RANGE.max;
            filterElements.priceMinRange.step = PRICE_RANGE.step;

            filterElements.priceMaxRange.min = PRICE_RANGE.min;
            filterElements.priceMaxRange.max = PRICE_RANGE.max;
            filterElements.priceMaxRange.step = PRICE_RANGE.step;

            filterElements.priceMinRange.value = priceRange.min;
            filterElements.priceMaxRange.value = priceRange.max;
        }

        if (filterElements.priceMinInput && filterElements.priceMaxInput) {
            filterElements.priceMinInput.value = priceRange.min;
            filterElements.priceMaxInput.value = priceRange.max;
            filterElements.priceMinInput.min = PRICE_RANGE.min;
            filterElements.priceMinInput.max = PRICE_RANGE.max;
            filterElements.priceMaxInput.min = PRICE_RANGE.min;
            filterElements.priceMaxInput.max = PRICE_RANGE.max;
        }

        if (filterElements.lengthMinInput) {
            filterElements.lengthMinInput.min = LENGTH_RANGE.min;
            filterElements.lengthMinInput.max = LENGTH_RANGE.max;
            filterElements.lengthMinInput.step = LENGTH_RANGE.step;
            filterElements.lengthMinInput.value = state.lengthMin !== null ? clamp(state.lengthMin, LENGTH_RANGE.min, LENGTH_RANGE.max) : '';
        }

        if (filterElements.lengthMaxInput) {
            filterElements.lengthMaxInput.min = LENGTH_RANGE.min;
            filterElements.lengthMaxInput.max = LENGTH_RANGE.max;
            filterElements.lengthMaxInput.step = LENGTH_RANGE.step;
            filterElements.lengthMaxInput.value = state.lengthMax !== null ? clamp(state.lengthMax, LENGTH_RANGE.min, LENGTH_RANGE.max) : '';
        }

        if (filterElements.bedroomsMinInput) {
            filterElements.bedroomsMinInput.value = state.bedroomsMin !== null ? state.bedroomsMin : '';
        }

        if (filterElements.bedsMinInput) {
            filterElements.bedsMinInput.value = state.bedsMin !== null ? state.bedsMin : '';
        }

        if (filterElements.doubleBedsMinInput) {
            filterElements.doubleBedsMinInput.value = state.doubleBedsMin !== null ? state.doubleBedsMin : '';
        }

        if (filterElements.singleBedsMinInput) {
            filterElements.singleBedsMinInput.value = state.singleBedsMin !== null ? state.singleBedsMin : '';
        }

        if (filterElements.couchBedsCheckbox) {
            filterElements.couchBedsCheckbox.checked = Boolean(state.includeCouchBeds);
        }

        if (filterElements.bathroomsMinInput) {
            filterElements.bathroomsMinInput.value = state.bathroomsMin !== null ? state.bathroomsMin : '';
        }

        if (filterElements.hourStart) {
            filterElements.hourStart.value = state.hourStart || '';
        }

        if (filterElements.hourEnd) {
            filterElements.hourEnd.value = state.hourEnd || '';
        }

        if (filterElements.minAge) {
            filterElements.minAge.value = state.minAge !== null ? state.minAge : '';
        }

        if (filterElements.maxAge) {
            filterElements.maxAge.value = state.maxAge !== null ? state.maxAge : '';
        }

        if (filterElements.difficultyCheckboxes) {
            filterElements.difficultyCheckboxes.forEach((checkbox) => {
                checkbox.checked = state.difficulty.includes(checkbox.value);
            });
        }

        if (filterElements.cancellationCheckboxes) {
            filterElements.cancellationCheckboxes.forEach((checkbox) => {
                checkbox.checked = state.cancellation.includes(checkbox.value);
            });
        }

        if (filterElements.propertyTypeCheckboxes) {
            filterElements.propertyTypeCheckboxes.forEach((checkbox) => {
                checkbox.checked = state.propertyTypes.includes(checkbox.value);
            });
        }

        if (filterElements.houseRuleCheckboxes) {
            filterElements.houseRuleCheckboxes.forEach((checkbox) => {
                checkbox.checked = state.houseRules.includes(checkbox.value);
            });
        }

        if (filterElements.amenityCheckboxes) {
            filterElements.amenityCheckboxes.forEach((checkbox) => {
                checkbox.checked = state.amenities.includes(checkbox.value);
            });
        }

        if (filterElements.eventDateStart) {
            filterElements.eventDateStart.value = state.startDate || '';
        }

        if (filterElements.eventDateEnd) {
            filterElements.eventDateEnd.value = state.endDate || '';
        }
    }

    function attachFilterControlHandlers() {
        if (filterElements.priceMinRange && filterElements.priceMaxRange && filterElements.priceMinInput && filterElements.priceMaxInput) {
            const syncFromRanges = (target) => {
                let min = parseInt(filterElements.priceMinRange.value, 10);
                let max = parseInt(filterElements.priceMaxRange.value, 10);

                min = clamp(min, PRICE_RANGE.min, PRICE_RANGE.max);
                max = clamp(max, PRICE_RANGE.min, PRICE_RANGE.max);

                if (min > max) {
                    if (target === filterElements.priceMinRange) {
                        max = min;
                        filterElements.priceMaxRange.value = max;
                    } else {
                        min = max;
                        filterElements.priceMinRange.value = min;
                    }
                }

                filterElements.priceMinInput.value = min;
                filterElements.priceMaxInput.value = max;
            };

            const syncFromInputs = (target) => {
                let min = parseInt(filterElements.priceMinInput.value, 10);
                let max = parseInt(filterElements.priceMaxInput.value, 10);

                if (!Number.isFinite(min)) min = PRICE_RANGE.min;
                if (!Number.isFinite(max)) max = PRICE_RANGE.max;

                min = clamp(min, PRICE_RANGE.min, PRICE_RANGE.max);
                max = clamp(max, PRICE_RANGE.min, PRICE_RANGE.max);

                if (min > max) {
                    if (target === filterElements.priceMinInput) {
                        max = min;
                    } else {
                        min = max;
                    }
                }

                filterElements.priceMinInput.value = min;
                filterElements.priceMaxInput.value = max;
                filterElements.priceMinRange.value = min;
                filterElements.priceMaxRange.value = max;
            };

            filterElements.priceMinRange.addEventListener('input', () => syncFromRanges(filterElements.priceMinRange));
            filterElements.priceMaxRange.addEventListener('input', () => syncFromRanges(filterElements.priceMaxRange));
            filterElements.priceMinInput.addEventListener('change', () => syncFromInputs(filterElements.priceMinInput));
            filterElements.priceMaxInput.addEventListener('change', () => syncFromInputs(filterElements.priceMaxInput));
            filterElements.priceMinInput.addEventListener('blur', () => syncFromInputs(filterElements.priceMinInput));
            filterElements.priceMaxInput.addEventListener('blur', () => syncFromInputs(filterElements.priceMaxInput));
        }

        if (filterElements.lengthMinInput && filterElements.lengthMaxInput) {
            const normaliseLengthInputs = (activeInput) => {
                let min = parseFloat(filterElements.lengthMinInput.value);
                let max = parseFloat(filterElements.lengthMaxInput.value);

                min = Number.isFinite(min) ? clamp(min, LENGTH_RANGE.min, LENGTH_RANGE.max) : null;
                max = Number.isFinite(max) ? clamp(max, LENGTH_RANGE.min, LENGTH_RANGE.max) : null;

                if (min !== null && max !== null && min > max) {
                    if (activeInput === filterElements.lengthMinInput) {
                        max = min;
                        filterElements.lengthMaxInput.value = max;
                    } else {
                        min = max;
                        filterElements.lengthMinInput.value = min;
                    }
                } else {
                    if (min !== null) {
                        filterElements.lengthMinInput.value = min;
                    }
                    if (max !== null) {
                        filterElements.lengthMaxInput.value = max;
                    }
                }
            };

            ['change', 'blur'].forEach(eventName => {
                filterElements.lengthMinInput.addEventListener(eventName, () => normaliseLengthInputs(filterElements.lengthMinInput));
                filterElements.lengthMaxInput.addEventListener(eventName, () => normaliseLengthInputs(filterElements.lengthMaxInput));
            });
        }

        if (filterElements.applyBtn) {
            filterElements.applyBtn.addEventListener('click', handleFiltersApply);
        }

        if (filterElements.resetBtn) {
            filterElements.resetBtn.addEventListener('click', handleFiltersReset);
        }

        if (filterElements.form) {
            filterElements.form.addEventListener('submit', handleFiltersApply);
        }
    }

    function hasActiveSearchOrFilters() {
        // Check if there are active search parameters
        if (state.location || state.startDate || state.endDate || state.guests) {
            return true;
        }
        
        // Check if there are active filters
        if (state.priceMin || state.priceMax || state.lengthMin || state.lengthMax ||
            state.hourStart || state.hourEnd || state.subtype ||
            (state.difficulty && state.difficulty.length > 0) ||
            (state.cancellation && state.cancellation.length > 0) ||
            (state.propertyType && state.propertyType.length > 0) ||
            (state.amenities && state.amenities.length > 0) ||
            (state.houseRules && state.houseRules.length > 0)) {
            return true;
        }
        
        return false;
    }

    function updateFilterVisibility() {
        if (!filterElements.panel) return;
        const blocks = filterElements.panel.querySelectorAll('[data-visible-for]');
        let hasVisibleBlocks = false;
        blocks.forEach((block) => {
            const visibility = block.dataset.visibleFor.split(',').map(item => item.trim());
            const isHidden = visibility.length > 0 && !visibility.includes(state.type);
            block.hidden = isHidden;
            if (!isHidden) {
                hasVisibleBlocks = true;
            }
        });

        if (filterElements.toggleBtn) {
            filterElements.toggleBtn.style.display = hasVisibleBlocks ? '' : 'none';
        }
        
        // Show sort dropdown when searching, otherwise hide for events without search
        const sortWrapper = document.getElementById('sortSelectWrapper');
        if (sortWrapper) {
            const hasActiveFilters = hasActiveSearchOrFilters();
            // Show for all types except events, OR show for events if there are active filters
            if (state.type === 'event' && !hasActiveFilters) {
                sortWrapper.style.display = 'none';
            } else {
                sortWrapper.style.display = '';
            }
        }
    }

    function collectFilterValues() {
        const values = {
            priceMin: null,
            priceMax: null,
            lengthMin: null,
            lengthMax: null,
            hourStart: null,
            hourEnd: null,
            difficulty: [],
            minAge: null,
            maxAge: null,
            cancellation: [],
            startDate: state.startDate,
            endDate: state.endDate,
            bedroomsMin: null,
            bedsMin: null,
            doubleBedsMin: null,
            singleBedsMin: null,
            includeCouchBeds: false,
            bathroomsMin: null,
            propertyTypes: [],
            houseRules: [],
            amenities: []
        };

        if (filterElements.priceMinRange && filterElements.priceMaxRange) {
            let min = parseInt(filterElements.priceMinRange.value, 10);
            let max = parseInt(filterElements.priceMaxRange.value, 10);
            min = clamp(min, PRICE_RANGE.min, PRICE_RANGE.max);
            max = clamp(max, PRICE_RANGE.min, PRICE_RANGE.max);
            if (min > max) min = max;
            values.priceMin = min > PRICE_RANGE.min ? min : null;
            values.priceMax = max < PRICE_RANGE.max ? max : null;
        }

        if (filterElements.lengthMinInput || filterElements.lengthMaxInput) {
            let min = filterElements.lengthMinInput ? parseFloat(filterElements.lengthMinInput.value) : null;
            let max = filterElements.lengthMaxInput ? parseFloat(filterElements.lengthMaxInput.value) : null;

            min = Number.isFinite(min) ? clamp(min, LENGTH_RANGE.min, LENGTH_RANGE.max) : null;
            max = Number.isFinite(max) ? clamp(max, LENGTH_RANGE.min, LENGTH_RANGE.max) : null;

            if (min !== null && max !== null && min > max) {
                const swappedMin = Math.min(min, max);
                const swappedMax = Math.max(min, max);
                min = swappedMin;
                max = swappedMax;
            }

            values.lengthMin = min;
            values.lengthMax = max;
        }

        if (filterElements.hourStart) {
            values.hourStart = filterElements.hourStart.value ? filterElements.hourStart.value : null;
        }

        if (filterElements.hourEnd) {
            values.hourEnd = filterElements.hourEnd.value ? filterElements.hourEnd.value : null;
        }

        if (filterElements.bedroomsMinInput) {
            const parsed = parseIntegerParam(filterElements.bedroomsMinInput.value);
            values.bedroomsMin = parsed !== null && parsed >= 0 ? parsed : null;
        }

        if (filterElements.bedsMinInput) {
            const parsed = parseIntegerParam(filterElements.bedsMinInput.value);
            values.bedsMin = parsed !== null && parsed >= 0 ? parsed : null;
        }

        if (filterElements.doubleBedsMinInput) {
            const parsed = parseIntegerParam(filterElements.doubleBedsMinInput.value);
            values.doubleBedsMin = parsed !== null && parsed >= 0 ? parsed : null;
        }

        if (filterElements.singleBedsMinInput) {
            const parsed = parseIntegerParam(filterElements.singleBedsMinInput.value);
            values.singleBedsMin = parsed !== null && parsed >= 0 ? parsed : null;
        }

        if (filterElements.couchBedsCheckbox) {
            values.includeCouchBeds = filterElements.couchBedsCheckbox.checked;
        }

        if (filterElements.bathroomsMinInput) {
            const parsed = parseNumericParam(filterElements.bathroomsMinInput.value);
            values.bathroomsMin = parsed !== null && parsed >= 0 ? parsed : null;
        }

        if (filterElements.minAge) {
            const parsed = parseIntegerParam(filterElements.minAge.value);
            values.minAge = parsed !== null && parsed >= 0 ? parsed : null;
        }

        if (filterElements.maxAge) {
            const parsed = parseIntegerParam(filterElements.maxAge.value);
            values.maxAge = parsed !== null && parsed >= 0 ? parsed : null;
        }

        if (filterElements.difficultyCheckboxes) {
            values.difficulty = Array.from(filterElements.difficultyCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
        }

        if (filterElements.cancellationCheckboxes) {
            values.cancellation = Array.from(filterElements.cancellationCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
        }

        if (filterElements.propertyTypeCheckboxes) {
            values.propertyTypes = Array.from(filterElements.propertyTypeCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
        }

        if (filterElements.houseRuleCheckboxes) {
            values.houseRules = Array.from(filterElements.houseRuleCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
        }

        if (filterElements.amenityCheckboxes) {
            values.amenities = Array.from(filterElements.amenityCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
        }

        if (filterElements.eventDateStart) {
            values.startDate = filterElements.eventDateStart.value || '';
        }

        if (filterElements.eventDateEnd) {
            values.endDate = filterElements.eventDateEnd.value || '';
        }

        return values;
    }

    function syncSearchDateInputs() {
        const startInput = document.getElementById('input-date-start');
        const endInput = document.getElementById('input-date-end');
        if (startInput) startInput.value = state.startDate || '';
        if (endInput) endInput.value = state.endDate || '';
        document.querySelectorAll('.date-input').forEach(input => {
            if (input.value) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    }
    
    // Setup date input change handlers
    function setupDateInputHandlers() {
        document.querySelectorAll('.date-input').forEach(input => {
            input.addEventListener('change', function() {
                if (this.value) {
                    this.classList.add('has-value');
                } else {
                    this.classList.remove('has-value');
                }
            });
            
            input.addEventListener('input', function() {
                if (this.value) {
                    this.classList.add('has-value');
                } else {
                    this.classList.remove('has-value');
                }
            });
        });
    }

    function handleFiltersApply(event) {
        if (event) {
            event.preventDefault();
        }

        const newValues = collectFilterValues();

        state.priceMin = newValues.priceMin;
        state.priceMax = newValues.priceMax;
        state.lengthMin = newValues.lengthMin;
        state.lengthMax = newValues.lengthMax;
        state.hourStart = state.type === 'experience' ? newValues.hourStart : null;
        state.hourEnd = state.type === 'experience' ? newValues.hourEnd : null;
        state.difficulty = newValues.difficulty;
        state.minAge = newValues.minAge;
        state.maxAge = newValues.maxAge;
        state.cancellation = newValues.cancellation;
        state.startDate = state.type === 'event' ? newValues.startDate : state.startDate;
        state.endDate = state.type === 'event' ? newValues.endDate : state.endDate;
        state.bedroomsMin = newValues.bedroomsMin;
        state.bedsMin = newValues.bedsMin;
        state.doubleBedsMin = newValues.doubleBedsMin;
        state.singleBedsMin = newValues.singleBedsMin;
        state.includeCouchBeds = newValues.includeCouchBeds;
        state.bathroomsMin = newValues.bathroomsMin;
        state.propertyTypes = newValues.propertyTypes;
        state.houseRules = newValues.houseRules;
        state.amenities = newValues.amenities;

        syncSearchDateInputs();

        const query = buildQueryParamsFromState();
        closeFilters();
        window.location.href = `collections.html?${query.toString()}`;
    }

    function handleFiltersReset(event) {
        if (event) {
            event.preventDefault();
        }

        state.priceMin = null;
        state.priceMax = null;
        state.lengthMin = null;
        state.lengthMax = null;
        state.hourStart = null;
        state.hourEnd = null;
        state.difficulty = [];
        state.minAge = null;
        state.maxAge = null;
        state.cancellation = [];
        state.bedroomsMin = null;
        state.bedsMin = null;
        state.doubleBedsMin = null;
        state.singleBedsMin = null;
        state.includeCouchBeds = false;
        state.bathroomsMin = null;
        state.propertyTypes = [];
        state.houseRules = [];
        state.amenities = [];

        if (state.type === 'event') {
            state.startDate = '';
            state.endDate = '';
        }

        setInitialFilterControlValues();
        syncSearchDateInputs();
        updateFilterVisibility();

        const query = buildQueryParamsFromState();
        closeFilters();
        window.location.href = `collections.html?${query.toString()}`;
    }

    function populateSearchFields() {
        const locationInput = document.getElementById('input-location');
        const startInput = document.getElementById('input-date-start');
        const endInput = document.getElementById('input-date-end');
        const guestsInput = document.getElementById('input-guests');
        const startLabel = document.getElementById('label-date-start');
        const endLabel = document.getElementById('label-date-end');

        if (locationInput) locationInput.value = state.location || '';
        if (startInput) startInput.value = state.startDate || '';
        if (endInput) endInput.value = state.endDate || '';
        if (guestsInput && state.guests && state.guests > 0) guestsInput.value = state.guests;

        if (startLabel && endLabel) {
            if (state.type === 'stay') {
                startLabel.textContent = 'Check in';
                endLabel.textContent = 'Check out';
            } else {
                startLabel.textContent = 'Date from';
                endLabel.textContent = 'Date to';
            }
        }

        document.querySelectorAll('.date-input').forEach(input => {
            if (input.value) {
                input.classList.add('has-value');
            }
        });
    }

    async function loadResults() {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '<p class="collections-loading">Loading results...</p>';

        const filters = { limit: 60 };

        if (state.location) filters.location = state.location;
        if (state.startDate) filters.start_date = state.startDate;
        if (state.endDate) filters.end_date = state.endDate;
        if (state.guests && state.guests > 0) filters.guests = state.guests;
        if (state.subtype && state.view !== 'featured') filters.subtype = state.subtype;
        if (state.view === 'featured') {
            filters.view = 'featured';
        }

        if (state.priceMin !== null && state.priceMin > PRICE_RANGE.min) {
            filters.price_min = state.priceMin;
        }

        if (state.priceMax !== null && state.priceMax < PRICE_RANGE.max) {
            filters.price_max = state.priceMax;
        }

        if (state.type !== 'stay') {
            if (state.lengthMin !== null && state.lengthMin > LENGTH_RANGE.min) {
                filters.length_hours_min = state.lengthMin;
            }

            if (state.lengthMax !== null && state.lengthMax < LENGTH_RANGE.max) {
                filters.length_hours_max = state.lengthMax;
            }
        }

        if (state.type === 'experience') {
            if (state.hourStart) {
                filters.hour_start = state.hourStart;
            }
            if (state.hourEnd) {
                filters.hour_end = state.hourEnd;
            }
        }

        if (state.type !== 'stay' && state.difficulty.length > 0) {
            filters.difficulty = state.difficulty.join(',');
        }

        if (state.type !== 'stay' && state.minAge !== null && state.minAge >= 0) {
            filters.min_age = state.minAge;
        }

        if (state.type !== 'stay' && state.maxAge !== null && state.maxAge >= 0) {
            filters.max_age = state.maxAge;
        }

        if (state.cancellation.length > 0) {
            filters.cancellation = state.cancellation.join(',');
        }

        if (state.type === 'stay') {
            if (state.bedroomsMin !== null && state.bedroomsMin >= 0) {
                filters.bedrooms_min = state.bedroomsMin;
            }

            if (state.bedsMin !== null && state.bedsMin >= 0) {
                filters.beds_min = state.bedsMin;
            }

            if (state.doubleBedsMin !== null && state.doubleBedsMin >= 0) {
                filters.double_beds_min = state.doubleBedsMin;
            }

            if (state.singleBedsMin !== null && state.singleBedsMin >= 0) {
                filters.single_beds_min = state.singleBedsMin;
            }

            if (state.includeCouchBeds) {
                filters.include_couch_beds = '1';
            }

            if (state.bathroomsMin !== null && state.bathroomsMin >= 0) {
                filters.bathrooms_min = state.bathroomsMin;
            }

            if (state.propertyTypes.length > 0) {
                filters.property_type = state.propertyTypes.join(',');
            }

            if (state.houseRules.length > 0) {
                filters.house_rules = state.houseRules.join(',');
            }

            if (state.amenities.length > 0) {
                filters.amenities = state.amenities.join(',');
            }
        }

        try {
            let response;
            if (state.type === 'experience') {
                response = await API.getExperiences(filters);
            } else if (state.type === 'event') {
                response = await API.getEvents(filters);
            } else {
                response = await API.getStays(filters);
            }

            if (response && response.success && response.data.length > 0) {
                // Check if user has active search/filters
                const hasActiveFilters = state.location || state.startDate || state.endDate || 
                                         state.guests || state.priceMin || state.priceMax ||
                                         state.subtype || state.difficulty.length > 0 ||
                                         state.cancellation.length > 0;
                
                // For events on collections page
                if (state.type === 'event') {
                    const eventsContainer = document.getElementById('events-groups');
                    
                    // If search/filters active, show as grid with pagination
                    if (hasActiveFilters) {
                        if (eventsContainer) eventsContainer.style.display = 'none';
                        resultsContainer.style.display = 'grid';
                        
                        // Sort the results and setup pagination
                        allResults = sortResults(response.data, state.sort);
                        currentPage = 1;
                        
                        const itemsPerPage = getItemsPerPage();
                        totalPages = Math.ceil(allResults.length / itemsPerPage);
                        
                        // Render first page
                        renderPage();
                        
                        updateHeader(response.data.length);
                        return;
                    }
                    
                    // Otherwise, use week-based grouping (no pagination for weeks)
                    if (eventsContainer) {
                        resultsContainer.style.display = 'none';
                        eventsContainer.style.display = 'block';
                        
                        // Hide pagination for week view
                        const paginationContainer = document.getElementById('paginationContainer');
                        if (paginationContainer) {
                            paginationContainer.style.display = 'none';
                        }
                        
                        // Trigger week-based rendering
                        API.loadEvents();
                        updateHeader(response.data.length);
                        return;
                    }
                }
                
                // For experiences/stays, hide events container and show grid
                const eventsContainer = document.getElementById('events-groups');
                if (eventsContainer) {
                    eventsContainer.style.display = 'none';
                }
                resultsContainer.style.display = 'grid';
                
                // Sort the results and setup pagination
                allResults = sortResults(response.data, state.sort);
                currentPage = 1;
                
                const itemsPerPage = getItemsPerPage();
                totalPages = Math.ceil(allResults.length / itemsPerPage);
                
                // Render first page
                renderPage();
                
                updateHeader(response.data.length);
            } else {
                updateHeader(0);
                allResults = [];
                totalPages = 1;
                currentPage = 1;
                updatePaginationControls();
                resultsContainer.innerHTML = '<div class="collections-empty">No results match your filters yet. Try adjusting your search.</div>';
            }
        } catch (error) {
            console.error('Failed to load collections results:', error);
            resultsContainer.innerHTML = '<div class="collections-empty">Something went wrong while loading the results. Please try again later.</div>';
        }
    }

    function renderCard(item) {
        if (state.type === 'experience') {
            return API.renderExperienceCard(item);
        }
        if (state.type === 'event') {
            return API.renderEventCard(item);
        }
        return API.renderStayCard(item);
    }

})();
