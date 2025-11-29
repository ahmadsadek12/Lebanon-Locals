/**
 * Lebanon Locals - API Module
 * Handles all API requests to backend
 * @version 1.0.0
 */

const API = (function() {
    'use strict';

    // API Configuration
    const BASE_URL = '/backend/api';
    
    /**
     * Generic fetch wrapper with error handling and retry
     */
    async function fetchAPI(endpoint, options = {}, retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = 1000; // ms
        const url = `${BASE_URL}/${endpoint}`;



        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { message: errorText };
                }
                console.error(`[API] Error ${response.status}:`, errorData);
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || errorData.error || errorText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return fetchAPI(endpoint, options, retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * Fetch experiences from database
     */
    async function getExperiences(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `experiences.php${queryString ? '?' + queryString : ''}`;
        return await fetchAPI(endpoint);
    }

    /**
     * Fetch events from database
     */
    async function getEvents(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `events.php${queryString ? '?' + queryString : ''}`;
        return await fetchAPI(endpoint);
    }

    /**
     * Fetch stays from database
     */
    async function getStays(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `stays.php${queryString ? '?' + queryString : ''}`;
        return await fetchAPI(endpoint);
    }

    async function getAmenities() {
        return await fetchAPI('amenities.php');
    }

    const SUBTYPE_ICON_FALLBACKS = [
        'images/host_experiences/categories/host_experience_category_1745564071.png',
        'images/host_experiences/categories/host_experience_category_1745564228.png',
        'images/host_experiences/categories/host_experience_category_1745564597.png',
        'images/host_experiences/categories/host_experience_category_1745564609.png',
        'images/host_experiences/categories/host_experience_category_1745564761.png',
        'images/host_experiences/categories/host_experience_category_1745564840.png',
        'images/host_experiences/categories/host_experience_category_1745564908.png',
        'images/host_experiences/categories/host_experience_category_1745564962.png'
    ];

    function pickFallbackIcon(name) {
        if (!SUBTYPE_ICON_FALLBACKS.length) {
            return 'images/icons/default-subtype.svg';
        }

        if (!name) {
            return SUBTYPE_ICON_FALLBACKS[0];
        }

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
        }

        const index = hash % SUBTYPE_ICON_FALLBACKS.length;
        return SUBTYPE_ICON_FALLBACKS[index];
    }

    async function getSubtypes(category) {
        const endpoint = `subtypes.php?category=${encodeURIComponent(category)}`;
        return await fetchAPI(endpoint);
    }

    /**
     * Render rating stars based on average rating
     */
    function renderRatingStars(ratingValue, reviews, options = {}) {
        const ratingNumber = parseFloat(ratingValue);
        const hasRating = !isNaN(ratingNumber) && ratingNumber > 0;
        const clampedRating = hasRating ? Math.min(5, Math.max(0, ratingNumber)) : 0;
        
        // Render stars using FontAwesome icons directly (like user-profile)
        let starsHTML = '';
        const fullStars = Math.floor(clampedRating);
        const hasHalfStar = (clampedRating % 1) >= 0.5;
        
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fa fa-star"></i>';
        }
        
        if (hasHalfStar) {
            starsHTML += '<i class="fa fa-star-half-o"></i>';
        }
        
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="fa fa-star-o"></i>';
        }
        
        const reviewHref = options.reviewHref || null;
        const reviewsText = (reviews !== undefined && reviews !== null && reviewHref)
            ? `<span class="rating-count" data-review-link="${reviewHref}" role="button" tabindex="0" aria-label="Read ${reviews} reviews">(${reviews})</span>`
            : '';

        return `
            <div class="listing-rating">
                <div class="rating-stars-simple">${starsHTML}</div>
                <span class="rating-text">
                    ${hasRating ? clampedRating.toFixed(1) : 'New'}
                    ${hasRating ? reviewsText : (reviews && reviewHref ? `<span class="rating-count" data-review-link="${reviewHref}" role="button" tabindex="0" aria-label="Read ${reviews} reviews">(${reviews})</span>` : '')}
                </span>
            </div>
        `;
    }

    function buildReviewHref(basePath, id, type) {
        if (!id || !type) return null;
        // Reviews go to listing-reviews.html, not details page
        return `listing-reviews.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
    }

    function bindReviewLinkHandlers(root) {
        const scope = root || document;
        if (!scope) return;

        const elements = scope.querySelectorAll('.rating-count[data-review-link]');

        
        elements.forEach(el => {
            if (el.dataset.bound === 'true') return;
            el.dataset.bound = 'true';

            const navigate = (event) => {
                event.stopPropagation();
                event.preventDefault();
                const href = el.getAttribute('data-review-link');

                if (href) {
                    window.location.href = href;
                }
            };

            el.addEventListener('click', navigate, true); // Use capture phase
            el.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    navigate(event);
                }
            });

            // Add visual feedback
            el.style.cursor = 'pointer';
            el.style.textDecoration = 'underline';
            el.style.textDecorationStyle = 'dotted';
            
            el.addEventListener('mouseenter', () => {
                el.classList.add('show-review-tooltip');
                el.style.color = '#FF385C';
            });

            el.addEventListener('mouseleave', () => {
                el.classList.remove('show-review-tooltip');
                el.style.color = '';
            });
        });
    }

    const DEFAULT_EXPERIENCE_SUBTYPES = [
        'Arts & Culture',
        'Adventure',
        'Food & Flavors',
        'Hidden Gems',
        'Nightlife',
        'Winter Escape',
        'Hikes & Treks',
        'Kids & Family'
    ];
    const FEATURED_SUBTYPE_KEY = 'Featured';
    const FEATURED_DISPLAY_LABEL = 'Featured Experiences';
    const FEATURED_EVENT_LABEL = 'Featured Events';
    const DEFAULT_STAY_SUBTYPES = ['Houses', 'Apartments', 'Villas', 'Rooms'];
    const FEATURED_STAY_LABEL = 'Featured Stays';

    function shuffleArray(array) {
        const arr = Array.isArray(array) ? [...array] : [];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    function sortEventsByParam(events, sortParam) {
        const sortedEvents = [...events];
        
        switch(sortParam) {
            case 'rating-high':
                return sortedEvents.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
            case 'rating-low':
                return sortedEvents.sort((a, b) => (a.average_rating || 0) - (b.average_rating || 0));
            case 'price-high':
                return sortedEvents.sort((a, b) => (b.price || 0) - (a.price || 0));
            case 'price-low':
                return sortedEvents.sort((a, b) => (a.price || 0) - (b.price || 0));
            case 'random':
            default:
                return shuffleArray(sortedEvents);
        }
    }

    function toTitleCase(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function normalizeSubtypeName(name) {
        if (!name || typeof name !== 'string') return '';
        const cleaned = name
            .replace(/[_-]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
        return toTitleCase(cleaned);
    }

    function buildPriceNote(item) {
        if (!item) return '';
        const isPricePerPerson = item.price_per_person === 1 || item.price_per_person === true;
        if (isPricePerPerson) return '';

        const perPrice = Number(item.max_guests_per_price);
        const overall = Number(item.max_guests ?? item.max_guests_overall);

        if (!perPrice || (overall && perPrice === overall)) {
            return '';
        }

        return `<span class="price-note">per ${perPrice} guests</span>`;
    }

    /**
     * Render experience card
     */
    function renderExperienceCard(experience) {
        const reviewHref = buildReviewHref('details.html', experience.id, 'experience');
        const ratingHtml = renderRatingStars(experience.average_rating, experience.total_reviews, { reviewHref });
        const priceNoteHtml = buildPriceNote(experience);

        const duration = experience.length_hours
            ? `${experience.length_hours} hours`
            : experience.length_days ? `${experience.length_days} days` : '';

        const imageUrl = experience.main_image || 'images/logos/logo.jpg';
        const priceText = experience.price_per_person ? '/ Guest' : '/ Group';

        // Create heart button
        const heartButton = window.WishlistManager
            ? window.WishlistManager.createHeartButton(experience.id, 'experience')
            : '';

        return `
            <div class="listing-card-wrapper" style="position: relative;">
                <a href="details.html?id=${experience.id}&type=experience" class="listing-card">
                    <div class="listing-image">
                        <img src="${imageUrl}" alt="${experience.title}" loading="lazy">
                    </div>
                    <div class="listing-info">
                        ${ratingHtml}
                        <div class="listing-title">${experience.title}</div>
                        <div class="listing-subtitle">${duration || 'Flexible'} · ${experience.location}</div>
                        <div class="listing-price"><strong>$${parseFloat(experience.price).toFixed(0)}</strong> ${priceText} ${priceNoteHtml}</div>
                    </div>
                </a>
                ${heartButton}
            </div>
        `;
    }

    /**
     * Utility: parse "YYYY-MM-DD HH:MM:SS" into Date
     */
    function parseDateTime(dateTimeStr) {
        if (!dateTimeStr) return null;
        const normalized = dateTimeStr.replace(' ', 'T');
        const parsed = new Date(normalized);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    /**
     * Check if an event has passed (date and time)
     * Combines date_start and hour_start to get the full event datetime
     */
    function hasEventPassed(event) {
        if (!event.date_start) return true; // If no date, consider it passed
        
        // Parse the date
        const eventDate = parseDateTime(event.date_start);
        if (!eventDate) return true; // If date is invalid, consider it passed
        
        // If hour_start exists, combine it with the date
        if (event.hour_start) {
            const [hours, minutes] = event.hour_start.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
                eventDate.setHours(hours, minutes, 0, 0);
            }
        } else {
            // If no time specified, use end of day (23:59:59)
            eventDate.setHours(23, 59, 59, 999);
        }
        
        // Compare with current time
        const now = new Date();
        return eventDate < now;
    }

    /**
     * Render event card
     */
    function renderEventCard(event) {
        const reviewHref = buildReviewHref('details.html', event.id, 'event');
        const ratingHtml = renderRatingStars(event.average_rating, event.total_reviews, { reviewHref });
        const priceNoteHtml = buildPriceNote(event);

        const eventDate = event._startDate instanceof Date ? event._startDate : parseDateTime(event.date_start);
        const safeDate = eventDate || new Date();
        const dateStr = safeDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const timeStr = safeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        const imageUrl = event.main_image || 'images/logos/logo.jpg';
        const priceText = event.price_per_person ? '/ Person' : '/ Group';

        // Create heart button
        const heartButton = window.WishlistManager
            ? window.WishlistManager.createHeartButton(event.id, 'event')
            : '';

        return `
            <div class="listing-card-wrapper" style="position: relative;">
                <a href="details.html?id=${event.id}&type=event" class="listing-card">
                    <div class="listing-image">
                        <img src="${imageUrl}" alt="${event.title}" loading="lazy">
                    </div>
                    <div class="listing-info">
                        ${ratingHtml}
                        <div class="listing-title">${event.title}</div>
                        <div class="listing-subtitle">${dateStr} · ${timeStr}</div>
                        <div class="listing-price"><strong>$${parseFloat(event.price).toFixed(0)}</strong> ${priceText} ${priceNoteHtml}</div>
                    </div>
                </a>
                ${heartButton}
            </div>
        `;
    }

    /**
     * Utility: format date range label
     */
    function formatDateRange(start, end) {
        const options = { month: 'short', day: 'numeric' };
        const startLabel = start.toLocaleDateString('en-US', options);
        const endLabel = end.toLocaleDateString('en-US', options);
        return `${startLabel} – ${endLabel}`;
    }

    function formatWeekTitle(index, startDate) {
        if (index === 0) return 'Happening This Week';
        if (index === 1) return 'Next Week';
        return `Week of ${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    }

    function getUpcomingWeekRanges(count = 4) {
        const ranges = [];
        const now = new Date();

        const firstStart = new Date(now);
        const firstEnd = new Date(now);
        const daysUntilSunday = (7 - firstEnd.getDay()) % 7;
        firstEnd.setDate(firstEnd.getDate() + daysUntilSunday);
        firstEnd.setHours(23, 59, 59, 999);
        ranges.push({ start: firstStart, end: firstEnd });

        let prevEnd = firstEnd;
        for (let i = 1; i < count; i++) {
            const start = new Date(prevEnd);
            start.setDate(prevEnd.getDate() + 1);
            start.setHours(0, 0, 0, 0);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);

            ranges.push({ start, end });
            prevEnd = end;
        }

        return ranges;
    }

    function determineGroupSlug(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    function renderEventGroup(title, subtitle, events, range = null) {
        const hasEvents = events.length > 0;
        const cardsHtml = hasEvents ? events.map(event => renderEventCard(event)).join('') : '';
        const scrollClass = `horizontal-scroll${hasEvents ? '' : ' empty-state'}`;
        const bodyHtml = hasEvents
            ? cardsHtml
            : '<p class="group-empty-message">No events scheduled for this week yet. Check back soon.</p>';
        
        // Create View All link with date filters for this specific week
        let viewAllLink = '#';
        let viewAllBtn = '';
        if (hasEvents && range && range.start && range.end) {
            const startDate = range.start.toISOString().split('T')[0];
            const endDate = range.end.toISOString().split('T')[0];
            viewAllLink = `collections.html?type=event&start_date=${startDate}&end_date=${endDate}`;
            viewAllBtn = `<a href="${viewAllLink}" class="category-view-all">View All</a>`;
        }

        return `
            <div class="category-section">
                <div class="category-header">
                    <div class="category-header-left">
                        <h3 class="category-title">${title}</h3>
                        <p class="category-subtitle">${subtitle}</p>
                    </div>
                    ${viewAllBtn}
                </div>
                <div class="${scrollClass}">
                    ${bodyHtml}
                </div>
            </div>
        `;
    }

    function renderExperienceGroup(title, experiences) {
        const hasExperiences = experiences.length > 0;
        const cardsHtml = hasExperiences ? experiences.map(exp => renderExperienceCard(exp)).join('') : '';
        const scrollClass = `horizontal-scroll${hasExperiences ? '' : ' empty-state'}`;
        const bodyHtml = hasExperiences
            ? cardsHtml
            : '<p class="group-empty-message">No experiences available for this subtype yet. Check back soon.</p>';
        const subtitle = title === FEATURED_DISPLAY_LABEL
            ? (hasExperiences ? 'Our community favourites right now' : 'Check back soon for fresh highlights')
            : hasExperiences
                ? `${experiences.length} experience${experiences.length === 1 ? '' : 's'} curated by locals`
                : 'We are adding handpicked moments here soon';
        let viewAllLink = '#';
        if (hasExperiences) {
            viewAllLink = title === FEATURED_DISPLAY_LABEL
                ? 'collections.html?type=experience&view=featured'
                : `collections.html?type=experience&subtype=${encodeURIComponent(title)}`;
        }

        return `
            <div class="category-section">
                <div class="category-header">
                    <div class="category-header-left">
                        <h3 class="category-title">${title}</h3>
                        <p class="category-subtitle">${subtitle}</p>
                    </div>
                    <a href="${viewAllLink}" class="category-view-all">View All</a>
                </div>
                <div class="${scrollClass}">
                    ${bodyHtml}
                </div>
            </div>
        `;
    }

    /**
     * Render stay card
     */
    function mapPropertyTypeToSubtype(propertyType) {
        if (!propertyType) return '';
        switch (propertyType.toLowerCase()) {
            case 'house':
                return 'Houses';
            case 'villa':
                return 'Villas';
            case 'apartment':
                return 'Apartments';
            case 'guesthouse':
            case 'hotel':
            case 'hostel':
            case 'cabin':
            case 'room':
            case 'other':
                return 'Rooms';
            default:
                return toTitleCase(propertyType);
        }
    }

    function renderStayCard(stay) {
        const reviewHref = buildReviewHref('details.html', stay.id, 'stay');
        const ratingHtml = renderRatingStars(stay.average_rating, stay.total_reviews, { reviewHref });
        const priceNoteHtml = buildPriceNote(stay);

        const beds = `${stay.number_of_bedrooms} Bed${stay.number_of_bedrooms > 1 ? 's' : ''}`;
        const imageUrl = stay.main_image || 'images/logos/logo.jpg';
        const minNightsNote = stay.min_nights > 1 ? `<span class="min-nights-note">(minimum ${stay.min_nights} nights)</span>` : '';
        const propertyLabel = mapPropertyTypeToSubtype(stay.property_type);

        // Create heart button
        const heartButton = window.WishlistManager
            ? window.WishlistManager.createHeartButton(stay.id, 'stay')
            : '';

        return `
            <div class="listing-card-wrapper" style="position: relative;">
                <a href="details.html?id=${stay.id}&type=stay" class="listing-card">
                    <div class="listing-image">
                        <img src="${imageUrl}" alt="${stay.title}" loading="lazy">
                    </div>
                    <div class="listing-info">
                        ${ratingHtml}
                        <div class="listing-title">${stay.title}</div>
                        <div class="listing-subtitle">${propertyLabel ? propertyLabel + ' · ' : ''}${beds} · ${stay.location}</div>
                        <div class="listing-price"><strong>$${parseFloat(stay.price_per_night).toFixed(0)}</strong> / Night ${minNightsNote} ${priceNoteHtml}</div>
                    </div>
                </a>
                ${heartButton}
            </div>
        `;
    }

    function renderStayGroup(title, stays) {
        const hasStays = stays.length > 0;
        const cardsHtml = hasStays ? stays.map(stay => renderStayCard(stay)).join('') : '';
        const scrollClass = `horizontal-scroll${hasStays ? '' : ' empty-state'}`;
        const bodyHtml = hasStays
            ? cardsHtml
            : '<p class="group-empty-message">No stays available for this category yet. Check back soon.</p>';
        const subtitle = title === FEATURED_STAY_LABEL
            ? (hasStays ? 'Most-loved stays handpicked by locals' : 'Check back soon for featured stays')
            : hasStays
                ? `${stays.length} stay${stays.length === 1 ? '' : 's'} with this vibe`
                : 'We are curating new stays for this category';
        let viewAllLink = '#';
        if (hasStays) {
            viewAllLink = title === FEATURED_STAY_LABEL
                ? 'collections.html?type=stay&view=featured'
                : `collections.html?type=stay&subtype=${encodeURIComponent(title)}`;
        }

        return `
            <div class="category-section">
                <div class="category-header">
                    <div class="category-header-left">
                        <h3 class="category-title">${title}</h3>
                        <p class="category-subtitle">${subtitle}</p>
                    </div>
                    <a href="${viewAllLink}" class="category-view-all">View All</a>
                </div>
                <div class="${scrollClass}">
                    ${bodyHtml}
                </div>
            </div>
        `;
    }

    function renderSubtypeIcon(category, subtype) {
        const iconUrl = (subtype.icon_url && subtype.icon_url.trim()) || pickFallbackIcon(subtype.name);
        const title = subtype.name || 'Subtype';
        const description = subtype.description || '';
        const normalizedCategory = category === 'event' ? 'event' : (category === 'stay' ? 'stay' : 'experience');
        const href = `collections.html?type=${normalizedCategory}&subtype=${encodeURIComponent(title)}`;

        return `
            <a href="${href}" class="type-icon" title="${description}">
                <img src="${iconUrl}" alt="${title}">
                <span>${title}</span>
            </a>
        `;
    }

    async function loadSubtypeIcons(category, containerId, retryCount = 0) {
        const container = document.getElementById(containerId);
        if (!container) {
            // Only retry up to 5 times (1.5 seconds total)
            if (retryCount < 5) {
                setTimeout(() => loadSubtypeIcons(category, containerId, retryCount + 1), 300);
            }
            return;
        }


        container.innerHTML = '';

        try {
            const response = await getSubtypes(category);
            if (response.success && response.data.length > 0) {
                container.innerHTML = response.data.map(subtype => renderSubtypeIcon(category, subtype)).join('');
            }
        } catch (error) {
            console.error(`Failed to load ${category} subtypes:`, error);
        }
    }

    /**
     * Load and display experiences
     */
    async function loadExperiences(limit = 20) {
        try {
            // Check for new home page structure
            const homeList = document.getElementById('experiences-list');
            const container = homeList || document.getElementById('experiences-groups');
            const skeleton = homeList ? document.getElementById('experiences-skeleton') : null;
            
            if (!container) {
                setTimeout(() => loadExperiences(limit), 300);
                return;
            }

            if (homeList) {
                if (skeleton) {
                    skeleton.classList.remove('hidden');
                }
                container.innerHTML = '';
            } else {
                container.innerHTML = '<p style="color: white; padding: 20px;">Loading experiences...</p>';
            }

            const response = await getExperiences({ limit: limit });

            if (response.success && response.data.length > 0) {
                // If home page (experiences-list), render simple horizontal list
                if (homeList) {
                    if (skeleton) {
                        skeleton.classList.add('hidden');
                    }
                    container.innerHTML = response.data.map(exp => renderExperienceCard(exp)).join('');
                    bindReviewLinkHandlers();
                    // Initialize heart buttons after cards are rendered
                    if (window.WishlistManager && typeof window.WishlistManager.initAllHeartButtons === 'function') {
                        setTimeout(() => window.WishlistManager.initAllHeartButtons(), 100);
                    }
                    return;
                }

                // Otherwise, render grouped by subtypes (for old structure)
                const subtypeMap = new Map();

                const addToSubtype = (label, experience) => {
                    if (!label) return;
                    if (!subtypeMap.has(label)) {
                        subtypeMap.set(label, []);
                    }
                    subtypeMap.get(label).push(experience);
                };

                response.data.forEach(exp => {
                    const subtypes = Array.isArray(exp.subtypes) && exp.subtypes.length > 0 ? exp.subtypes : [];

                    subtypes.forEach(subtype => {
                        const key = normalizeSubtypeName(subtype);
                        if (!key) return;
                        addToSubtype(key, exp);
                    });

                    addToSubtype(FEATURED_DISPLAY_LABEL, exp);
                });



                if (subtypeMap.size === 0) {

                    container.innerHTML = '<p style="color: white; padding: 20px;">No experiences available yet.</p>';
                    return;
                }

                const existingSubtypes = Array.from(subtypeMap.keys()).filter(label => label !== FEATURED_DISPLAY_LABEL);
                const shuffledExisting = shuffleArray(existingSubtypes);

                const needed = Math.max(0, 4 - shuffledExisting.length);
                const fallbackPool = shuffleArray(
                    DEFAULT_EXPERIENCE_SUBTYPES.filter(label => !subtypeMap.has(label))
                ).slice(0, needed);

                fallbackPool.forEach(label => {
                    if (!subtypeMap.has(label)) {
                        subtypeMap.set(label, []);
                    }
                });

                const allSubtypes = [FEATURED_DISPLAY_LABEL, ...shuffledExisting, ...fallbackPool];
                const initialRows = 5;



                window.experienceSubtypes = allSubtypes;
                window.experienceSubtypeMap = subtypeMap;
                window.currentExperienceRows = Math.min(initialRows, allSubtypes.length);

                const visibleSubtypes = allSubtypes.slice(0, window.currentExperienceRows);
                const groupsHtml = visibleSubtypes.map(subtype => {
                    const experiences = shuffleArray(subtypeMap.get(subtype) || []);
                    return renderExperienceGroup(subtype, experiences);
                }).join('');

                const hasMore = allSubtypes.length > window.currentExperienceRows;
                const viewMoreBtn = hasMore
                    ? `<button class="view-more-section-btn" data-section="experience">
                            <span>View More</span>
                            <i class="fa fa-chevron-down"></i>
                       </button>`
                    : '';


                container.innerHTML = groupsHtml + viewMoreBtn;

                // Force reflow to ensure CSS is applied
                container.offsetHeight;

                // Ensure cards are visible (force opacity and display)
                requestAnimationFrame(() => {
                    const cards = container.querySelectorAll('.listing-card');

                    cards.forEach(card => {
                        card.style.opacity = '1';
                        card.style.visibility = 'visible';
                    });
                });


                bindReviewLinkHandlers(container);
                attachSectionViewMoreHandler('experience');

                // Initialize wishlist heart buttons
                if (window.WishlistManager && typeof window.WishlistManager.initAllHeartButtons === 'function') {
                    console.log('[WISHLIST] Initializing heart buttons for experiences');
                    window.WishlistManager.initAllHeartButtons();
                } else {
                    console.warn('[WISHLIST] WishlistManager not available yet for experiences');
                }
            } else {

                if (homeList && skeleton) {
                    skeleton.classList.add('hidden');
                }
                container.innerHTML = '<p style="color: white; padding: 20px;">No experiences available yet.</p>';
            }

        } catch (error) {
            console.error('[EXPERIENCES LOAD] ❌ Error:', error);
            const homeSkeleton = document.getElementById('experiences-skeleton');
            if (homeSkeleton) {
                homeSkeleton.classList.add('hidden');
            }
            const container = document.getElementById('experiences-groups');
            if (container) {
                container.innerHTML = '<p style="color: white; padding: 20px;">Failed to load experiences. Please try again later.</p>';
            }
        }
    }

    /**
     * Load and display events
     */
    async function loadEvents(limit = 20) {
        try {
            // Check if we're on home page (simple list) or collections page (week groups)
            const homeList = document.getElementById('events-list');
            const groupsContainer = document.getElementById('events-groups');
            const container = homeList || groupsContainer;
            const skeleton = homeList ? document.getElementById('events-skeleton') : null;
            
            if (!container) {
                setTimeout(() => loadEvents(limit), 300);
                return;
            }

            if (homeList) {
                if (skeleton) {
                    skeleton.classList.remove('hidden');
                }
                container.innerHTML = '';
            } else {
                container.innerHTML = '<p style="color: white; padding: 20px;">Loading events...</p>';
            }

            const response = await getEvents({ limit: homeList ? limit : 40 });

            if (response.success && response.data.length > 0) {
                // Filter out past events
                const upcomingEvents = response.data.filter(event => !hasEventPassed(event));
                
                // If home page (events-list), render simple horizontal list
                if (homeList) {
                    if (skeleton) {
                        skeleton.classList.add('hidden');
                    }
                    
                    if (upcomingEvents.length === 0) {
                        container.innerHTML = '<p style="color: white; padding: 20px;">No upcoming events available.</p>';
                        return;
                    }
                    
                    container.innerHTML = upcomingEvents.map(event => renderEventCard(event)).join('');
                    bindReviewLinkHandlers();
                    // Initialize heart buttons after cards are rendered
                    if (window.WishlistManager && typeof window.WishlistManager.initAllHeartButtons === 'function') {
                        setTimeout(() => window.WishlistManager.initAllHeartButtons(), 100);
                    }
                    return;
                }

                // Otherwise (collections page), render grouped by weeks
                // Filter out past events first
                const upcomingEventsForGroups = response.data.filter(event => !hasEventPassed(event));
                
                // Find the last event date
                let lastEventDate = null;
                upcomingEventsForGroups.forEach(event => {
                    const eventStart = parseDateTime(event.date_start);
                    if (eventStart && (!lastEventDate || eventStart > lastEventDate)) {
                        lastEventDate = eventStart;
                    }
                });

                // Generate enough weeks to cover all events
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const weeksNeeded = lastEventDate 
                    ? Math.ceil((lastEventDate - today) / (7 * 24 * 60 * 60 * 1000)) + 1
                    : 12;
                const totalWeeks = Math.max(12, weeksNeeded);
                
                const ranges = getUpcomingWeekRanges(totalWeeks);
                const groups = [];

                // No featured group - just week groups
                ranges.forEach((range, index) => {
                    const labelStart = new Date(range.start);
                    labelStart.setHours(0, 0, 0, 0);
                    const title = formatWeekTitle(index, labelStart);
                    const subtitle = formatDateRange(labelStart, range.end);
                    groups.push({ title, subtitle, range, events: [] });
                });

                upcomingEventsForGroups.forEach(event => {
                    const eventStart = parseDateTime(event.date_start);
                    if (!eventStart) return;

                    const enrichedEvent = { ...event, _startDate: eventStart };

                    // Add to appropriate week group
                    for (let i = 0; i < groups.length; i++) {
                        const group = groups[i];
                        if (group.range.start && group.range.end && eventStart >= group.range.start && eventStart <= group.range.end) {
                            group.events.push(enrichedEvent);
                            break;
                        }
                    }
                });
                
                // Always sort events randomly within each group
                groups.forEach(group => {
                    if (group.events.length > 0) {
                        group.events = shuffleArray(group.events);
                    }
                });

                // Find last week with events
                let lastWeekWithEvents = 0;
                for (let i = groups.length - 1; i >= 0; i--) {
                    if (groups[i].events.length > 0) {
                        lastWeekWithEvents = i;
                        break;
                    }
                }

                // Only show groups up to the last one with events
                const relevantGroups = groups.slice(0, lastWeekWithEvents + 1);
                const initialRows = 5;



                window.eventGroups = relevantGroups;
                window.currentEventRows = Math.min(initialRows, relevantGroups.length);

                const visibleGroups = relevantGroups.slice(0, window.currentEventRows);
                const groupsHtml = visibleGroups
                    .map(group => renderEventGroup(group.title, group.subtitle, group.events, group.range))
                    .join('');

                const hasMore = relevantGroups.length > window.currentEventRows;
                const viewMoreBtn = hasMore
                    ? `<button class="view-more-section-btn" data-section="event">
                            <span>View More</span>
                            <i class="fa fa-chevron-down"></i>
                       </button>`
                    : '';

                container.innerHTML = groupsHtml + viewMoreBtn;

                // Force reflow to ensure CSS is applied
                container.offsetHeight;

                // Ensure cards are visible (force opacity and display)
                requestAnimationFrame(() => {
                    const cards = container.querySelectorAll('.listing-card');

                    cards.forEach(card => {
                        card.style.opacity = '1';
                        card.style.visibility = 'visible';
                    });
                });


                bindReviewLinkHandlers(container);
                attachSectionViewMoreHandler('event');

                // Initialize wishlist heart buttons
                if (window.WishlistManager && typeof window.WishlistManager.initAllHeartButtons === 'function') {
                    console.log('[WISHLIST] Initializing heart buttons for events');
                    window.WishlistManager.initAllHeartButtons();
                } else {
                    console.warn('[WISHLIST] WishlistManager not available yet for events');
                }
            } else {

                if (homeList && skeleton) {
                    skeleton.classList.add('hidden');
                }
                container.innerHTML = '<p style="color: white; padding: 20px;">No upcoming events available yet.</p>';
            }

        } catch (error) {
            console.error('[EVENTS LOAD] ❌ Error:', error);
            const homeSkeleton = document.getElementById('events-skeleton');
            if (homeSkeleton) {
                homeSkeleton.classList.add('hidden');
            }
            const container = document.getElementById('events-groups');
            if (container) {
                container.innerHTML = '<p style="color: white; padding: 20px;">Failed to load events. Please try again later.</p>';
            }
        }
    }

    /**
     * Load and display stays
     */
    async function loadStays(limit = 20) {
        try {
            // Check for new home page structure
            const homeList = document.getElementById('stays-list');
            const container = homeList || document.getElementById('stays-groups');
            const skeleton = homeList ? document.getElementById('stays-skeleton') : null;
            
            if (!container) {
                setTimeout(() => loadStays(limit), 300);
                return;
            }

            if (homeList) {
                if (skeleton) {
                    skeleton.classList.remove('hidden');
                }
                container.innerHTML = '';
            } else {
                container.innerHTML = '<p style="color: white; padding: 20px;">Loading stays...</p>';
            }

            const response = await getStays({ limit: limit });

            if (response.success && response.data.length > 0) {
                // If home page (stays-list), render simple horizontal list
                if (homeList) {
                    if (skeleton) {
                        skeleton.classList.add('hidden');
                    }
                    container.innerHTML = response.data.map(stay => renderStayCard(stay)).join('');
                    bindReviewLinkHandlers();
                    // Initialize heart buttons after cards are rendered
                    if (window.WishlistManager && typeof window.WishlistManager.initAllHeartButtons === 'function') {
                        setTimeout(() => window.WishlistManager.initAllHeartButtons(), 100);
                    }
                    return;
                }

                // Otherwise, render grouped by subtypes (for old structure)
                const subtypeMap = new Map();

                const addToSubtype = (label, stay) => {
                    if (!label) return;
                    if (!subtypeMap.has(label)) {
                        subtypeMap.set(label, []);
                    }
                    subtypeMap.get(label).push(stay);
                };

                response.data.forEach(stay => {
                    const subtypes = Array.isArray(stay.subtypes) && stay.subtypes.length > 0 ? stay.subtypes : [];

                    if (subtypes.length === 0) {
                        const fallbackSubtype = mapPropertyTypeToSubtype(stay.property_type);
                        if (fallbackSubtype) {
                            subtypes.push(fallbackSubtype);
                        }
                    }

                    subtypes.forEach(subtype => {
                        const key = normalizeSubtypeName(subtype);
                        if (!key) return;
                        addToSubtype(key, stay);
                    });

                    addToSubtype(FEATURED_STAY_LABEL, stay);
                });



                // Get all unique subtypes that have stays, prioritize defaults
                const existingSubtypes = Array.from(subtypeMap.keys()).filter(label => label !== FEATURED_STAY_LABEL);
                const orderedSubtypes = [];
                
                // Add default subtypes first
                DEFAULT_STAY_SUBTYPES.forEach(label => {
                    if (subtypeMap.has(label)) {
                        orderedSubtypes.push(label);
                    }
                });
                
                // Add remaining subtypes
                existingSubtypes.forEach(label => {
                    if (!orderedSubtypes.includes(label)) {
                        orderedSubtypes.push(label);
                    }
                });

                const orderedLabels = [FEATURED_STAY_LABEL, ...orderedSubtypes];
                const initialRows = 5;



                window.staySubtypes = orderedLabels;
                window.staySubtypeMap = subtypeMap;
                window.currentStayRows = Math.min(initialRows, orderedLabels.length);

                const visibleSubtypes = orderedLabels.slice(0, window.currentStayRows);
                const groupsHtml = visibleSubtypes.map(label => {
                    const stays = shuffleArray(subtypeMap.get(label) || []);
                    return renderStayGroup(label, stays);
                }).join('');

                const hasMore = orderedLabels.length > window.currentStayRows;
                const viewMoreBtn = hasMore
                    ? `<button class="view-more-section-btn" data-section="stay">
                            <span>View More</span>
                            <i class="fa fa-chevron-down"></i>
                       </button>`
                    : '';


                container.innerHTML = groupsHtml + viewMoreBtn;

                // Force reflow to ensure CSS is applied
                container.offsetHeight;

                // Ensure cards are visible (force opacity and display)
                requestAnimationFrame(() => {
                    const cards = container.querySelectorAll('.listing-card');

                    cards.forEach(card => {
                        card.style.opacity = '1';
                        card.style.visibility = 'visible';
                    });
                });


                bindReviewLinkHandlers(container);
                attachSectionViewMoreHandler('stay');

                // Initialize wishlist heart buttons
                if (window.WishlistManager && typeof window.WishlistManager.initAllHeartButtons === 'function') {
                    console.log('[WISHLIST] Initializing heart buttons for stays');
                    window.WishlistManager.initAllHeartButtons();
                } else {
                    console.warn('[WISHLIST] WishlistManager not available yet for stays');
                }
            } else {

                if (homeList && skeleton) {
                    skeleton.classList.add('hidden');
                }
                container.innerHTML = '<p style="color: white; padding: 20px;">No stays available yet.</p>';
            }

        } catch (error) {
            console.error('[STAYS LOAD] ❌ Error:', error);
            const homeSkeleton = document.getElementById('stays-skeleton');
            if (homeSkeleton) {
                homeSkeleton.classList.add('hidden');
            }
            const container = document.getElementById('stays-groups');
            if (container) {
                container.innerHTML = '<p style="color: white; padding: 20px;">Failed to load stays. Please try again later.</p>';
            }
        }
    }

    function attachSectionViewMoreHandler(sectionType) {
        const button = document.querySelector(`.view-more-section-btn[data-section="${sectionType}"]`);
        if (!button) return;

        button.addEventListener('click', function() {
            let container, currentRows, allSubtypes, dataMap, renderFunc;

            if (sectionType === 'experience') {
                container = document.getElementById('experiences-groups');
                currentRows = window.currentExperienceRows;
                allSubtypes = window.experienceSubtypes;
                dataMap = window.experienceSubtypeMap;
                renderFunc = (subtype) => {
                    const items = shuffleArray(dataMap.get(subtype) || []);
                    return renderExperienceGroup(subtype, items);
                };
            } else if (sectionType === 'event') {
                container = document.getElementById('events-groups');
                currentRows = window.currentEventRows;
                allSubtypes = window.eventGroups;
                dataMap = null;
                renderFunc = (group) => renderEventGroup(group.title, group.subtitle, group.events, group.range);
            } else if (sectionType === 'stay') {
                container = document.getElementById('stays-groups');
                currentRows = window.currentStayRows;
                allSubtypes = window.staySubtypes;
                dataMap = window.staySubtypeMap;
                renderFunc = (subtype) => {
                    const items = shuffleArray(dataMap.get(subtype) || []);
                    return renderStayGroup(subtype, items);
                };
            }

            if (!container || !allSubtypes) return;

            const totalAvailable = allSubtypes.length;
            const remaining = totalAvailable - currentRows;
            const toAdd = Math.min(5, remaining);
            const newRows = currentRows + toAdd;

            const newSubtypes = allSubtypes.slice(currentRows, newRows);
            const newGroupsHtml = newSubtypes.map(renderFunc).join('');

            this.insertAdjacentHTML('beforebegin', newGroupsHtml);
            bindReviewLinkHandlers(container);

            if (sectionType === 'experience') {
                window.currentExperienceRows = newRows;
            } else if (sectionType === 'event') {
                window.currentEventRows = newRows;
            } else if (sectionType === 'stay') {
                window.currentStayRows = newRows;
            }

            if (newRows >= totalAvailable) {
                this.remove();
            }
        });
    }

    // Make load functions globally accessible for index.html
    window.loadExperiences = loadExperiences;
    window.loadStays = loadStays;
    window.loadEvents = loadEvents;

    function init() {
        // Load data immediately - main.js has already ensured DOM is ready
        // Order: Experiences → Stays → Events (for home page)
        // Limit to 10 items for home page
        const isHomePage = document.body.classList.contains('home-page');
        const limit = isHomePage ? 10 : 20;
        
        loadEvents(limit);
        loadExperiences(limit);
        loadStays(limit);
        loadSubtypeIcons('event', 'event-subtype-icons');
        loadSubtypeIcons('experience', 'experience-subtype-icons');
        loadSubtypeIcons('stay', 'stay-subtype-icons');
    }

    return {
        init,
        getExperiences,
        getEvents,
        getStays,
        loadExperiences,
        loadEvents,
        loadStays,
        renderExperienceCard,
        renderEventCard,
        renderStayCard,
        bindReviewLinkHandlers,
        buildReviewHref,
        getAmenities
    };

})();
