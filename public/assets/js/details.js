/**
 * Lebanon Locals - Details Page JavaScript
 * Handles loading and displaying item details
 * @version 1.0.0
 */

(function() {
    'use strict';

    const BASE_URL = 'backend/api';

    // ==================== HEADER SCROLL BEHAVIOR ====================
    function initHeaderScroll() {
        const headerSearchBtn = document.getElementById('headerSearchBtn');
        const searchSection = document.getElementById('detailsSearchSection');

        if (!headerSearchBtn || !searchSection) {
            setTimeout(initHeaderScroll, 100);
            return;
        }

        window.addEventListener('scroll', () => {
            const searchSectionBottom = searchSection.offsetTop + searchSection.offsetHeight;
            const scrollPosition = window.scrollY;

            // Show search button when scrolled past search section
            if (scrollPosition > searchSectionBottom) {
                headerSearchBtn.classList.add('visible');
            } else {
                headerSearchBtn.classList.remove('visible');
            }
        });

        // Click handler for header search button - now handled by search-dropdown.js
        // Removed old scroll handler
    }

    // ==================== SEARCH FUNCTIONALITY ====================
    function initSearchFunctionality() {
        const searchBtn = document.getElementById('detailSearchBtn');
        const dateInputs = document.querySelectorAll('.details-search-section .date-input');

        // Handle date input placeholder
        dateInputs.forEach(input => {
            input.addEventListener('change', function() {
                if (this.value) {
                    this.classList.add('has-value');
                } else {
                    this.classList.remove('has-value');
                }
            });
        });

        // Search button handler
        if (searchBtn) {
            searchBtn.addEventListener('click', handleSearch);
        }

        // Enter key handler for search inputs
        const searchInputs = document.querySelectorAll('.details-search-section input');
        searchInputs.forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });
        });
    }

    function handleSearch() {
        const location = document.getElementById('detail-search-location')?.value.trim();
        let dateStart = document.getElementById('detail-input-date-start')?.value;
        let dateEnd = document.getElementById('detail-input-date-end')?.value;
        const guests = document.getElementById('detail-search-guests')?.value;

        // If only end date is provided, set start date to today
        if (!dateStart && dateEnd) {
            dateStart = new Date().toISOString().split('T')[0];
        }

        // Get current item type from URL
        const params = getUrlParams();
        const type = params.type || 'experience';

        const searchParams = new URLSearchParams();
        searchParams.set('type', type);

        if (location) searchParams.set('location', location);
        if (dateStart) searchParams.set('start_date', dateStart);
        if (dateEnd) searchParams.set('end_date', dateEnd);
        if (guests) searchParams.set('guests', guests);

        // Redirect to collections page with search params
        window.location.href = `collections.html?${searchParams.toString()}`;
    }

    // Get URL parameters
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            id: params.get('id'),
            type: params.get('type') // experience, event, or stay
        };
    }

    // Determine API endpoint based on type or referrer
    function getApiEndpoint(type, id) {
        if (type === 'experience') {
            return `${BASE_URL}/experience-detail.php?id=${id}`;
        } else if (type === 'event') {
            return `${BASE_URL}/event-detail.php?id=${id}`;
        } else if (type === 'stay') {
            return `${BASE_URL}/stay-detail.php?id=${id}`;
        }

        // If no type specified, try to detect from referrer
        const referrer = document.referrer;
        if (referrer.includes('experience')) {
            return `${BASE_URL}/experience-detail.php?id=${id}`;
        } else if (referrer.includes('event')) {
            return `${BASE_URL}/event-detail.php?id=${id}`;
        } else if (referrer.includes('stay')) {
            return `${BASE_URL}/stay-detail.php?id=${id}`;
        }

        // Default to experience
        return `${BASE_URL}/experience-detail.php?id=${id}`;
    }

    // Fetch data with fallback to other types
    async function fetchDetails(id, type) {
        if (!id) {
            throw new Error('No item ID specified in URL parameters');
        }

        const endpoints = [
            { type: type || 'experience', url: getApiEndpoint(type, id) }
        ];

        // Add fallback endpoints if type wasn't specified
        if (!type) {
            endpoints.push(
                { type: 'event', url: `${BASE_URL}/event-detail.php?id=${id}` },
                { type: 'stay', url: `${BASE_URL}/stay-detail.php?id=${id}` }
            );
        }

        const errors = [];
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint.url);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch (e) {
                        errorData = { message: errorText };
                    }
                    errors.push(`${endpoint.type}: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`);
                    continue;
                }
                
                const data = await response.json();

                if (data.success && data.data) {
                    return {
                        ...data.data,
                        _type: endpoint.type
                    };
                } else {
                    errors.push(`${endpoint.type}: ${data.message || 'No data returned'}`);
                }
            } catch (error) {
                console.error(`Failed to fetch from ${endpoint.url}:`, error);
                errors.push(`${endpoint.type}: ${error.message}`);
            }
        }

        const errorMsg = errors.length > 0 
            ? `Item not found. Tried: ${errors.join('; ')}`
            : 'Item not found';
        throw new Error(errorMsg);
    }

    // Render rating stars with decimal support
    function renderRatingStars(rating, reviewCount) {
        const ratingNumber = parseFloat(rating);
        const hasRating = !isNaN(ratingNumber) && ratingNumber > 0;
        const clampedRating = hasRating ? Math.min(5, Math.max(0, ratingNumber)) : 0;
        const widthPercent = (clampedRating / 5) * 100;

        return `
            <div class="stars-container">
                <div class="stars-background">★★★★★</div>
                <div class="stars-fill" style="width: ${widthPercent}%">
                    <div class="stars-foreground">★★★★★</div>
                </div>
            </div>
            <span class="rating-text">
                ${hasRating ? clampedRating.toFixed(1) : 'New'}
                ${reviewCount > 0 ? ` (${reviewCount} reviews)` : ''}
            </span>
        `;
    }

    // Render image gallery
    // ==================== GALLERY SLIDER ====================
    let galleryImages = [];
    let currentImageIndex = 0;

    function renderGallery(data) {
        galleryImages = [];
        categorizedImagesData = [];

        // Add main image
        if (data.main_image) {
            galleryImages.push(data.main_image);
            // Add to categorized data (main image typically doesn't have category)
            categorizedImagesData.push({
                image_url: data.main_image,
                caption: 'Main',
                display_order: -1,
                is_primary: 1
            });
        }

        // Add additional images
        if (data.images && Array.isArray(data.images)) {
            data.images.forEach(img => {
                if (img.image_url) {
                    galleryImages.push(img.image_url);
                    categorizedImagesData.push(img);
                }
            });
        }

        if (galleryImages.length === 0) {
            galleryImages.push('images/logos/home_page_experience_image.webp');
            categorizedImagesData.push({
                image_url: 'images/logos/home_page_experience_image.webp',
                caption: 'Default',
                display_order: 0
            });
        }

        // Set initial main image
        const mainImage = document.getElementById('galleryMainImage');
        if (mainImage) {
            mainImage.src = galleryImages[0];
            mainImage.alt = data.title || 'Main image';
        }

        // Render thumbnails
        const thumbnailsContainer = document.getElementById('galleryThumbnails');
        if (thumbnailsContainer) {
            thumbnailsContainer.innerHTML = galleryImages.map((img, index) => `
                <div class="gallery-thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <img src="${img}" alt="Thumbnail ${index + 1}">
                </div>
            `).join('');

            // Add click handlers to thumbnails
            thumbnailsContainer.querySelectorAll('.gallery-thumbnail').forEach(thumb => {
                thumb.addEventListener('click', function() {
                    const index = parseInt(this.dataset.index);
                    showImage(index);
                });
            });
        }

        // Initialize gallery controls
        initGalleryControls();
    }

    function initGalleryControls() {
        const hasMultipleImages = galleryImages.length > 1;

        // Previous button
        const prevBtn = document.getElementById('galleryPrevBtn');
        if (prevBtn) {
            if (hasMultipleImages) {
                prevBtn.style.display = 'flex';
                prevBtn.onclick = () => {
                    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
                    showImage(currentImageIndex);
                };
            } else {
                prevBtn.style.display = 'none';
            }
        }

        // Next button
        const nextBtn = document.getElementById('galleryNextBtn');
        if (nextBtn) {
            if (hasMultipleImages) {
                nextBtn.style.display = 'flex';
                nextBtn.onclick = () => {
                    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
                    showImage(currentImageIndex);
                };
            } else {
                nextBtn.style.display = 'none';
            }
        }

        // Fullscreen button
        const fullscreenBtn = document.getElementById('galleryFullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.onclick = openCategorizedGalleryModal;

            // Update button text based on image count
            const btnText = fullscreenBtn.querySelector('span');
            if (btnText) {
                btnText.textContent = hasMultipleImages ? 'Show all photos' : 'View photo';
            }
        }

        // Hide thumbnails if only one image
        const thumbnailsContainer = document.getElementById('galleryThumbnails');
        if (thumbnailsContainer) {
            thumbnailsContainer.style.display = hasMultipleImages ? 'flex' : 'none';
        }
    }

    function showImage(index) {
        currentImageIndex = index;
        const mainImage = document.getElementById('galleryMainImage');
        if (mainImage) {
            mainImage.src = galleryImages[index];
        }

        // Update active thumbnail
        document.querySelectorAll('.gallery-thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }

    // ==================== GALLERY MODAL ====================
    function openGalleryModal() {
        const modal = document.getElementById('galleryModal');
        if (!modal) return;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Set initial image
        updateModalImage(currentImageIndex);

        // Render modal thumbnails
        renderModalThumbnails();

        // Initialize modal controls
        initModalControls();
    }

    function initModalControls() {
        const hasMultipleImages = galleryImages.length > 1;

        const closeBtn = document.getElementById('galleryModalClose');
        if (closeBtn) {
            closeBtn.onclick = closeGalleryModal;
        }

        const prevBtn = document.getElementById('galleryModalPrev');
        if (prevBtn) {
            if (hasMultipleImages) {
                prevBtn.style.display = 'flex';
                prevBtn.onclick = () => {
                    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
                    updateModalImage(currentImageIndex);
                };
            } else {
                prevBtn.style.display = 'none';
            }
        }

        const nextBtn = document.getElementById('galleryModalNext');
        if (nextBtn) {
            if (hasMultipleImages) {
                nextBtn.style.display = 'flex';
                nextBtn.onclick = () => {
                    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
                    updateModalImage(currentImageIndex);
                };
            } else {
                nextBtn.style.display = 'none';
            }
        }

        // Hide modal thumbnails if only one image
        const modalThumbnails = document.getElementById('galleryModalThumbnails');
        if (modalThumbnails) {
            modalThumbnails.style.display = hasMultipleImages ? 'flex' : 'none';
        }

        // Keyboard navigation
        document.addEventListener('keydown', handleModalKeyboard);
    }

    function handleModalKeyboard(e) {
        const modal = document.getElementById('galleryModal');
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'Escape') {
                closeGalleryModal();
            } else if (galleryImages.length > 1) {
                // Only allow arrow navigation if there are multiple images
                if (e.key === 'ArrowLeft') {
                    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
                    updateModalImage(currentImageIndex);
                } else if (e.key === 'ArrowRight') {
                    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
                    updateModalImage(currentImageIndex);
                }
            }
        }
    }

    function updateModalImage(index) {
        const modalImage = document.getElementById('galleryModalImage');
        const counter = document.getElementById('galleryModalCounter');

        if (modalImage) {
            modalImage.src = galleryImages[index];
        }

        if (counter) {
            // Hide counter if only one image
            if (galleryImages.length === 1) {
                counter.style.display = 'none';
            } else {
                counter.style.display = 'block';
                counter.textContent = `${index + 1} / ${galleryImages.length}`;
            }
        }

        // Update modal thumbnails
        document.querySelectorAll('#galleryModalThumbnails .gallery-thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }

    function renderModalThumbnails() {
        const container = document.getElementById('galleryModalThumbnails');
        if (!container) return;

        container.innerHTML = galleryImages.map((img, index) => `
            <div class="gallery-thumbnail ${index === currentImageIndex ? 'active' : ''}" data-index="${index}">
                <img src="${img}" alt="Thumbnail ${index + 1}">
            </div>
        `).join('');

        container.querySelectorAll('.gallery-thumbnail').forEach(thumb => {
            thumb.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                currentImageIndex = index;
                updateModalImage(index);
            });
        });
    }

    function closeGalleryModal() {
        const modal = document.getElementById('galleryModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        document.removeEventListener('keydown', handleModalKeyboard);
    }

    // ==================== CATEGORIZED GALLERY MODAL ====================
    let categorizedImagesData = [];

    function openCategorizedGalleryModal() {
        const modal = document.getElementById('categorizedGalleryModal');
        if (!modal) return;

        // Group images by category/room
        const groupedImages = groupImagesByCategory();

        // Render categorized images
        renderCategorizedImages(groupedImages);

        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Attach close handler
        const closeBtn = document.getElementById('categorizedModalClose');
        if (closeBtn) {
            closeBtn.onclick = closeCategorizedGalleryModal;
        }

        // Close on ESC key
        document.addEventListener('keydown', handleCategorizedModalKeyboard);

        // Close on background click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCategorizedGalleryModal();
            }
        });
    }

    function closeCategorizedGalleryModal() {
        const modal = document.getElementById('categorizedGalleryModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        document.removeEventListener('keydown', handleCategorizedModalKeyboard);
    }

    function handleCategorizedModalKeyboard(e) {
        const modal = document.getElementById('categorizedGalleryModal');
        if (modal && modal.style.display === 'flex' && e.key === 'Escape') {
            closeCategorizedGalleryModal();
        }
    }

    function groupImagesByCategory() {
        const grouped = {};

        // Process images array which contains {image_url, caption, display_order}
        // caption is either "room" for stays or "category" for hostings
        categorizedImagesData.forEach((img, index) => {
            const category = img.caption || 'Other';

            if (!grouped[category]) {
                grouped[category] = [];
            }

            grouped[category].push({
                url: img.image_url,
                index: index, // Store original index for gallery modal
                order: img.display_order || 0
            });
        });

        // Sort images within each category by display_order
        Object.keys(grouped).forEach(category => {
            grouped[category].sort((a, b) => a.order - b.order);
        });

        return grouped;
    }

    function renderCategorizedImages(groupedImages) {
        const container = document.getElementById('categorizedModalContent');
        if (!container) return;

        const categories = Object.keys(groupedImages);

        if (categories.length === 0) {
            container.innerHTML = '<p style="color: white; text-align: center; padding: 40px;">No images available</p>';
            return;
        }

        let html = '';

        categories.forEach(category => {
            const images = groupedImages[category];

            html += `
                <div class="categorized-image-group">
                    <h3>${category}</h3>
                    <div class="categorized-images-grid">
            `;

            images.forEach(img => {
                html += `
                    <div class="categorized-image-item" data-index="${img.index}" onclick="openGalleryFromCategorized(${img.index})">
                        <img src="${img.url}" alt="${category}" loading="lazy">
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Open gallery modal from categorized modal at specific image
    window.openGalleryFromCategorized = function(index) {
        closeCategorizedGalleryModal();
        currentImageIndex = index;
        openGalleryModal();
    };

    // Render header section
    function renderHeader(data) {
        document.getElementById('detail-title').textContent = data.title || 'Untitled';
        document.getElementById('detail-location').textContent = data.location || 'Location not specified';
        document.getElementById('detail-rating').innerHTML = renderRatingStars(data.average_rating, data.total_reviews);

        // Initialize wishlist heart button
        const heartBtn = document.getElementById('detail-heart-btn');
        if (heartBtn && window.WishlistManager) {
            heartBtn.dataset.id = data.id;
            heartBtn.dataset.type = data._type;

            // Check if already in wishlist (async)
            (async function() {
                const isInWishlist = await window.WishlistManager.isInWishlist(data.id, data._type);
                const icon = heartBtn.querySelector('i');
                if (isInWishlist) {
                    icon.className = 'fa fa-heart';
                    heartBtn.classList.add('active');
                } else {
                    icon.className = 'fa fa-heart-o';
                    heartBtn.classList.remove('active');
                }
            })();

            // Add click handler
            heartBtn.onclick = async function(e) {
                e.preventDefault();
                const icon = heartBtn.querySelector('i');
                const isNowInWishlist = await window.WishlistManager.toggleWishlist(data.id, data._type);

                if (isNowInWishlist) {
                    icon.className = 'fa fa-heart';
                    heartBtn.classList.add('active');
                } else {
                    icon.className = 'fa fa-heart-o';
                    heartBtn.classList.remove('active');
                }

                heartBtn.classList.add('animating');
                setTimeout(() => heartBtn.classList.remove('animating'), 500);
            };
        }
    }

    // Render host information
    function renderHost(data) {
        const hostContainer = document.getElementById('detail-host');
        if (!hostContainer) return;

        const hostPicture = data.host_picture || 'images/icons/default-avatar.png';
        const hostName = `${data.host_first_name || 'Host'} ${data.host_last_name || ''}`.trim();
        const hostId = data.host_id;
        const verified = data.host_verified ? '<div class="host-verified"><i class="fa fa-check-circle"></i> Verified</div>' : '';

        hostContainer.innerHTML = `
            <a href="host-profile.html?id=${hostId}" class="host-avatar-link">
            <img src="${hostPicture}" alt="${hostName}" class="host-avatar" onerror="this.src='images/icons/default-avatar.png'">
            </a>
            <div class="host-info">
                <h3><a href="host-profile.html?id=${hostId}" class="host-name-link">Hosted by ${hostName}</a></h3>
                ${data.host_bio ? `<p>${data.host_bio}</p>` : ''}
                ${verified}
            </div>
        `;
    }

    // Render highlights for experiences/events
    function renderExperienceHighlights(data) {
        const highlights = [];

        if (data._type === 'experience' && data.length_hours) {
            highlights.push({
                icon: 'clock-o',
                title: 'Duration',
                text: `${data.length_hours} hours`
            });
        }

        if (data._type === 'event' && data.date_start) {
            const eventDate = new Date(data.date_start.replace(' ', 'T'));
            highlights.push({
                icon: 'calendar',
                title: 'Event Date',
                text: eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            });
        }

        if (data.max_guests) {
            highlights.push({
                icon: 'users',
                title: 'Group Size',
                text: `Up to ${data.max_guests} guests`
            });
        }

        if (data.difficulty) {
            highlights.push({
                icon: 'signal',
                title: 'Difficulty',
                text: data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1)
            });
        }

        if (data.min_age || data.max_age) {
            const ageText = data.min_age && data.max_age
                ? `Ages ${data.min_age}-${data.max_age}`
                : data.min_age
                    ? `${data.min_age}+ years`
                    : `Up to ${data.max_age} years`;
            highlights.push({
                icon: 'child',
                title: 'Age Range',
                text: ageText
            });
        }

        return highlights;
    }

    // Render highlights for stays
    function renderStayHighlights(data) {
        const highlights = [];

        if (data.number_of_bedrooms) {
            highlights.push({
                icon: 'bed',
                title: 'Bedrooms',
                text: `${data.number_of_bedrooms} bedroom${data.number_of_bedrooms > 1 ? 's' : ''}`
            });
        }

        if (data.number_of_beds) {
            const bedDetails = [];
            if (data.number_double_beds > 0) bedDetails.push(`${data.number_double_beds} double`);
            if (data.number_single_beds > 0) bedDetails.push(`${data.number_single_beds} single`);
            if (data.number_sofa_beds > 0) bedDetails.push(`${data.number_sofa_beds} sofa`);
            
            const bedText = bedDetails.length > 0 
                ? `${data.number_of_beds} bed${data.number_of_beds > 1 ? 's' : ''} (${bedDetails.join(', ')})`
                : `${data.number_of_beds} bed${data.number_of_beds > 1 ? 's' : ''}`;
            
            highlights.push({
                icon: 'bed',
                title: 'Beds',
                text: bedText
            });
        }

        if (data.number_of_bathrooms) {
            highlights.push({
                icon: 'bath',
                title: 'Bathrooms',
                text: `${data.number_of_bathrooms} bathroom${data.number_of_bathrooms > 1 ? 's' : ''}`
            });
        }

        if (data.max_guests) {
            highlights.push({
                icon: 'users',
                title: 'Guests',
                text: `Up to ${data.max_guests} guests`
            });
        }

        if (data.property_type) {
            highlights.push({
                icon: 'home',
                title: 'Property Type',
                text: data.property_type.charAt(0).toUpperCase() + data.property_type.slice(1)
            });
        }

        return highlights;
    }

    // Render highlights section
    function renderHighlights(data) {
        const highlightsContainer = document.getElementById('detail-highlights');
        if (!highlightsContainer) return;

        const highlights = data._type === 'stay'
            ? renderStayHighlights(data)
            : renderExperienceHighlights(data);

        if (highlights.length === 0) {
            highlightsContainer.style.display = 'none';
            return;
        }

        highlightsContainer.innerHTML = highlights.map(h => `
            <div class="highlight-item">
                <i class="fa fa-${h.icon} highlight-icon"></i>
                <div class="highlight-content">
                    <h4>${h.title}</h4>
                    <p>${h.text}</p>
                </div>
            </div>
        `).join('');
    }

    // Render list section
    function renderListSection(sectionId, listId, data, field) {
        const section = document.getElementById(sectionId);
        const list = document.getElementById(listId);

        if (!section || !list) return;

        if (!data[field]) {
            section.style.display = 'none';
            return;
        }

        // Try to parse JSON if it's a string
        let items = data[field];
        if (typeof items === 'string') {
            try {
                items = JSON.parse(items);
            } catch (e) {
                // If not JSON, split by newlines or commas
                items = items.split(/[\n,]+/).map(s => s.trim()).filter(s => s);
            }
        }

        if (!Array.isArray(items) || items.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        list.innerHTML = items.map(item => `<li>${item}</li>`).join('');
    }

    // Render amenities
    function renderAmenities(data) {
        const section = document.getElementById('amenities-section');
        const grid = document.getElementById('amenities-grid');

        if (!section || !grid || !data.amenities || data.amenities.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        grid.innerHTML = data.amenities.map(amenity => `
            <div class="amenity-item">
                ${renderAmenityIcon(amenity)}
                <span>${amenity.name}</span>
            </div>
        `).join('');
    }

    function renderAmenityIcon(amenity) {
        const iconValue = amenity.icon_url || amenity.icon;
        if (iconValue) {
            const isUrl = /^https?:\/\//i.test(iconValue);
            if (isUrl) {
                return `<img src="${iconValue}" alt="${amenity.name} icon" loading="lazy">`;
            }
            return `<i class="${iconValue}"></i>`;
        }
        return '<i class="fa fa-check"></i>';
    }

    // Render house rules
    function renderHouseRules(data) {
        const section = document.getElementById('house-rules-section');
        const content = document.getElementById('house-rules-content');

        if (!section || !content || !data.house_rules) {
            if (section) section.style.display = 'none';
            return;
        }

        let rules = data.house_rules;
        if (typeof rules === 'string') {
            try {
                rules = JSON.parse(rules);
            } catch (e) {
                section.style.display = 'none';
                return;
            }
        }

        const ruleItems = [
            { key: 'pets_allowed', label: 'Pets allowed', icon: 'paw' },
            { key: 'smoking_allowed', label: 'Smoking allowed', icon: 'smoking' },
            { key: 'parties_allowed', label: 'Parties/events allowed', icon: 'music' },
            { key: 'filming_allowed', label: 'Commercial filming allowed', icon: 'video-camera' },
            { key: 'quiet_hours_enforced', label: 'Quiet hours enforced', icon: 'volume-off' }
        ];

        const rulesHtml = ruleItems
            .filter(rule => rules.hasOwnProperty(rule.key))
            .map(rule => {
                const allowed = rules[rule.key];
                return `
                    <div class="house-rule-item ${allowed ? 'allowed' : 'not-allowed'}">
                        <i class="fa fa-${allowed ? 'check-circle' : 'times-circle'}"></i>
                        <span>${rule.label}</span>
                    </div>
                `;
            }).join('');

        if (rulesHtml) {
            section.style.display = 'block';
            content.innerHTML = rulesHtml;
        } else {
            section.style.display = 'none';
        }
    }

    // Render cancellation policy
    function renderCancellationPolicy(data) {
        const policyElement = document.getElementById('cancellation-policy');
        if (!policyElement) return;

        const policyTexts = {
            flexible: 'Full refund up to 24 hours before the experience starts.',
            moderate: 'Full refund up to 5 days before the experience starts, 50% refund up to 24 hours before.',
            strict: 'Full refund up to 7 days before the experience starts, no refund after that.'
        };

        const policy = data.cancellation_policy || 'moderate';
        policyElement.textContent = policyTexts[policy] || policyTexts.moderate;
    }

    // Render reviews
    function renderReviews(data) {
        const summary = document.getElementById('reviews-summary');
        const list = document.getElementById('reviews-list');

        if (!summary || !list) return;

        if (!data.reviews || data.reviews.length === 0) {
            summary.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
            list.innerHTML = '';
            return;
        }

        summary.innerHTML = `
            <div>
                <div class="review-rating-large">${parseFloat(data.average_rating).toFixed(1)}</div>
                <div>
                    <a href="listing-reviews.html?type=${data._type}&id=${data.id}" class="reviews-count-link">
                        ${data.total_reviews} review${data.total_reviews > 1 ? 's' : ''}
                    </a>
                </div>
            </div>
        `;

        const maxReviewsToShow = 3;
        const reviewsToDisplay = data.reviews.slice(0, maxReviewsToShow);
        const hasMoreReviews = data.reviews.length > maxReviewsToShow;

        const reviewsHtml = reviewsToDisplay.map(review => {
            const reviewDate = new Date(review.created_at);
            const starRating = parseFloat(review.stars);
            const starWidthPercent = (starRating / 5) * 100;
            const stars = `
                <div class="stars-container">
                    <div class="stars-background">★★★★★</div>
                    <div class="stars-fill" style="width: ${starWidthPercent}%">
                        <div class="stars-foreground">★★★★★</div>
                    </div>
                </div>
            `;
            const reviewerPicture = review.reviewer_picture || 'images/icons/default-avatar.png';
            const reviewerName = `${review.reviewer_first_name || 'Guest'} ${review.reviewer_last_name || ''}`.trim();

            return `
                <div class="review-item">
                    <div class="review-header">
                        <img src="${reviewerPicture}" alt="${reviewerName}" class="reviewer-avatar" onerror="this.src='images/icons/default-avatar.png'">
                        <div class="reviewer-info">
                            <h4>${reviewerName}</h4>
                            <p>${reviewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div class="review-stars-display">${stars}</div>
                    <p class="review-text">${review.review_text || ''}</p>
                </div>
            `;
        }).join('');

        const viewMoreBtn = hasMoreReviews
            ? `<a href="listing-reviews.html?type=${data._type}&id=${data.id}" class="view-all-reviews-btn">
                    <span>View all ${data.total_reviews} reviews</span>
                    <i class="fa fa-arrow-right"></i>
               </a>`
            : '';

        list.innerHTML = reviewsHtml + viewMoreBtn;
    }

    // Handle reserve button click
    function handleReserve(data) {
        // Build checkout URL with parameters
        const params = new URLSearchParams({
            type: data._type,
            id: data.id,
            guests: 1 // Default to 1 guest
        });

        // Add dates for stays
        if (data._type === 'stay' && stayDatePickerState.selectedCheckin && stayDatePickerState.selectedCheckout) {
            params.set('start_date', stayDatePickerState.selectedCheckin);
            params.set('end_date', stayDatePickerState.selectedCheckout);
        } else if (data._type === 'stay') {
            // Don't proceed if dates not selected (button should be disabled anyway)
            return;
        }

        window.location.href = `checkout.html?${params.toString()}`;
    }

    // Update reserve button state
    function updateReserveButtonState(data) {
        const reserveBtn = document.getElementById('reserve-btn');
        if (!reserveBtn) return;

        if (data._type === 'stay') {
            const hasDates = stayDatePickerState.selectedCheckin && stayDatePickerState.selectedCheckout;
            reserveBtn.disabled = !hasDates;
        } else if (data._type === 'experience' || data._type === 'event') {
            // Check available capacity for events and experiences
            if (data.available_capacity !== undefined) {
                const availableCapacity = parseInt(data.available_capacity);
                if (availableCapacity <= 0) {
                    reserveBtn.disabled = true;
                    reserveBtn.style.opacity = '0.5';
                    reserveBtn.style.cursor = 'not-allowed';
                    reserveBtn.textContent = 'Fully Booked';
                }
            }
        }
    }

    // Render booking card
    function renderBookingCard(data) {
        const card = document.getElementById('booking-card');
        if (!card) return;

        let price, priceLabel;

        if (data._type === 'stay') {
            price = parseFloat(data.price_per_night).toFixed(0);
            priceLabel = '/ night';
        } else {
            price = parseFloat(data.price).toFixed(0);
            priceLabel = data.price_per_person ? '/ person' : '/ group';
        }

        const infoItems = [];

        if (data._type === 'stay' && data.min_nights) {
            infoItems.push({
                label: 'Minimum stay',
                value: `${data.min_nights} night${data.min_nights > 1 ? 's' : ''}`
            });
        }

        if (data._type === 'stay' && data.cleaning_fee && parseFloat(data.cleaning_fee) > 0) {
            infoItems.push({
                label: 'Cleaning fee',
                value: `$${parseFloat(data.cleaning_fee).toFixed(0)}`
            });
        }

        if (data._type === 'stay' && data.check_in_time) {
            infoItems.push({
                label: 'Check-in',
                value: data.check_in_time.substring(0, 5) // HH:MM format
            });
        }

        if (data._type === 'stay' && data.check_out_time) {
            infoItems.push({
                label: 'Check-out',
                value: data.check_out_time.substring(0, 5) // HH:MM format
            });
        }

        if (data.max_guests) {
            const guestsValue = data._type === 'stay'
                ? `Up to ${data.max_guests} guest${data.max_guests > 1 ? 's' : ''}`
                : `${data.max_guests} guest${data.max_guests > 1 ? 's' : ''}`;
            infoItems.push({
                label: 'Guests allowed',
                value: guestsValue
            });
        }

        // Calculate spots left warning for events and experiences
        let spotsLeftWarning = '';
        let isFullyBooked = false;
        if ((data._type === 'experience' || data._type === 'event') && data.available_capacity !== undefined && data.max_guests) {
            const spotsLeft = parseInt(data.available_capacity);
            const maxGuests = parseInt(data.max_guests);

            if (spotsLeft <= 0) {
                isFullyBooked = true;
                spotsLeftWarning = `<div class="spots-left-warning" style="color: #dc2626; font-weight: 600;">Fully booked</div>`;
            } else {
                // Show warning if:
                // - max_guests > 100 and spots_left <= 20, OR
                // - max_guests <= 100 and spots_left <= 5
                const shouldShowWarning = (maxGuests > 100 && spotsLeft <= 20) || (maxGuests <= 100 && spotsLeft <= 5);

                if (shouldShowWarning && spotsLeft > 0) {
                    spotsLeftWarning = `<div class="spots-left-warning">Only ${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left!</div>`;
                }
            }
        }

        // Date picker for stays

        const datePickerHtml = data._type === 'stay' ? `
            <div class="booking-dates">
                <div class="booking-date-row">
                    <div class="booking-date-field" id="checkin-field">
                        <label>Check-in</label>
                        <input type="text" id="checkin-date" readonly placeholder="Add date">
                    </div>
                    <div class="booking-date-field" id="checkout-field">
                        <label>Check-out</label>
                        <input type="text" id="checkout-date" readonly placeholder="Add date">
                    </div>
                </div>
                <div class="booking-calendar" id="booking-calendar" style="display: none;">
                    <!-- Calendar will be rendered here -->
                </div>
            </div>
        ` : '';


        card.innerHTML = `
            <div class="booking-price">
                <span class="price-amount">$${price}</span>
                <span class="price-label">${priceLabel}</span>
            </div>
            ${datePickerHtml}
            ${infoItems.length > 0 ? `
                <div class="booking-info">
                    ${infoItems.map(item => `
                        <div class="booking-info-item">
                            <span class="booking-info-label">${item.label}</span>
                            <span class="booking-info-value">${item.value}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${spotsLeftWarning}
            <button class="booking-btn" id="reserve-btn" ${data._type === 'stay' ? 'disabled' : ''} ${isFullyBooked ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                ${isFullyBooked ? 'Fully Booked' : 'Reserve'}
            </button>
            <p class="booking-note">You won't be charged yet</p>
        `;

        // Initialize date picker for stays
        if (data._type === 'stay') {
            setTimeout(() => {
                initStayDatePicker(data);
            }, 0);
        }

        // Add event listener for reserve button
        setTimeout(() => {
            const reserveBtn = document.getElementById('reserve-btn');
            if (reserveBtn) {
                reserveBtn.addEventListener('click', () => handleReserve(data));
            }
        }, 0);
    }

    // Stay date picker state
    let stayDatePickerState = {
        selectedCheckin: null,
        selectedCheckout: null,
        bookedDates: [],
        currentMonth: new Date(),
        stayData: null
    };

    // Initialize stay date picker
    async function initStayDatePicker(data) {
        stayDatePickerState.stayData = data;
        
        // Fetch booked dates
        try {
            const response = await fetch(`${BASE_URL}/stay-booked-dates.php?id=${data.id}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    stayDatePickerState.bookedDates = result.data;
                }
            }
        } catch (error) {
            console.error('Failed to load booked dates:', error);
        }

        const checkinField = document.getElementById('checkin-field');
        const checkoutField = document.getElementById('checkout-field');
        const calendar = document.getElementById('booking-calendar');

        if (!checkinField || !checkoutField || !calendar) return;

        // Show calendar on field click
        checkinField.addEventListener('click', () => {
            calendar.style.display = calendar.style.display === 'none' ? 'block' : 'none';
            if (calendar.style.display === 'block') {
                renderStayCalendar();
            }
        });

        checkoutField.addEventListener('click', () => {
            calendar.style.display = calendar.style.display === 'none' ? 'block' : 'none';
            if (calendar.style.display === 'block') {
                renderStayCalendar();
            }
        });

        // Close calendar when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#booking-calendar') && 
                !e.target.closest('#checkin-field') && 
                !e.target.closest('#checkout-field')) {
                calendar.style.display = 'none';
            }
        });
    }

    // Render stay calendar
    function renderStayCalendar() {
        const calendar = document.getElementById('booking-calendar');
        if (!calendar) return;

        const state = stayDatePickerState;
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

        let calendarHtml = `
            <div class="calendar-header">
                <button class="calendar-nav-btn" id="prev-month">&lt;</button>
                <span class="calendar-month-year">${monthNames[month]} ${year}</span>
                <button class="calendar-nav-btn" id="next-month">&gt;</button>
            </div>
            <div class="calendar-weekdays">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-days">
        `;

        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHtml += '<div class="calendar-day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            // Use local date string to avoid timezone issues
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            let classes = ['calendar-day'];
            let disabled = false;

            // Check if past date
            if (currentDate < today) {
                classes.push('disabled');
                disabled = true;
            }

            // Check if booked
            const isBooked = state.bookedDates.some(range => {
                return dateStr >= range.start_date && dateStr <= range.end_date;
            });

            if (isBooked) {
                classes.push('booked');
                disabled = true;
            }

            // Check if selected
            if (state.selectedCheckin && dateStr === state.selectedCheckin) {
                classes.push('selected checkin');
            }
            if (state.selectedCheckout && dateStr === state.selectedCheckout) {
                classes.push('selected checkout');
            }

            // Check if in range
            if (state.selectedCheckin && state.selectedCheckout) {
                if (dateStr > state.selectedCheckin && dateStr < state.selectedCheckout) {
                    classes.push('in-range');
                }
            }

            calendarHtml += `
                <div class="${classes.join(' ')}" data-date="${dateStr}" ${disabled ? '' : 'data-selectable="true"'}>
                    ${day}
                </div>
            `;
        }

        calendarHtml += '</div>';
        calendar.innerHTML = calendarHtml;

        // Attach event listeners
        document.getElementById('prev-month')?.addEventListener('click', (e) => {
            e.stopPropagation();
            state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
            renderStayCalendar();
        });

        document.getElementById('next-month')?.addEventListener('click', (e) => {
            e.stopPropagation();
            state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
            renderStayCalendar();
        });

        // Date selection
        calendar.querySelectorAll('.calendar-day[data-selectable]').forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDateSelection(dayEl.dataset.date);
            });
        });
    }

    // Handle date selection
    function handleDateSelection(dateStr) {
        const state = stayDatePickerState;

        // If no checkin selected, or both are selected, start fresh
        if (!state.selectedCheckin || (state.selectedCheckin && state.selectedCheckout)) {
            state.selectedCheckin = dateStr;
            state.selectedCheckout = null;
            document.getElementById('checkin-date').value = formatDisplayDate(dateStr);
            document.getElementById('checkout-date').value = '';
            updateReserveButtonState(state.stayData);
        }
        // If checkin selected but no checkout
        else if (state.selectedCheckin && !state.selectedCheckout) {
            // If selected date is before checkin, swap them
            if (dateStr < state.selectedCheckin) {
                state.selectedCheckout = state.selectedCheckin;
                state.selectedCheckin = dateStr;
                document.getElementById('checkin-date').value = formatDisplayDate(dateStr);
                document.getElementById('checkout-date').value = formatDisplayDate(state.selectedCheckout);
                updateReserveButtonState(state.stayData);
            } else {
                // Check if any booked dates between checkin and selected
                const hasBlockedDates = state.bookedDates.some(range => {
                    return (range.start_date > state.selectedCheckin && range.start_date < dateStr) || 
                           (range.end_date > state.selectedCheckin && range.end_date < dateStr);
                });

                if (hasBlockedDates) {
                    // Silently ignore invalid selection
                    return;
                }

                state.selectedCheckout = dateStr;
                document.getElementById('checkout-date').value = formatDisplayDate(dateStr);
                updateReserveButtonState(state.stayData);
                
                // Close calendar after selecting checkout
                setTimeout(() => {
                    document.getElementById('booking-calendar').style.display = 'none';
                }, 200);
            }
        }

        renderStayCalendar();
    }

    // Format date for display
    function formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    // Main render function
    function renderDetails(data) {
        // Update page title
        document.title = `${data.title} - Lebanon Locals`;

        // Render all sections
        renderGallery(data);
        renderHeader(data);
        renderHost(data);
        renderHighlights(data);

        // Description
        const descriptionElement = document.getElementById('detail-description');
        if (descriptionElement) {
            descriptionElement.textContent = data.description || 'No description available.';
        }

        // Type-specific sections
        if (data._type !== 'stay') {
            renderListSection('whats-included-section', 'whats-included-list', data, 'what_included');
            renderListSection('whats-not-included-section', 'whats-not-included-list', data, 'what_not_included');
            renderListSection('what-to-bring-section', 'what-to-bring-list', data, 'what_to_bring');
        } else {
            renderAmenities(data);
            renderHouseRules(data);
        }

        // Accessibility
        if (data.accessibility_info) {
            const section = document.getElementById('accessibility-section');
            const info = document.getElementById('accessibility-info');
            if (section && info) {
                section.style.display = 'block';
                info.textContent = data.accessibility_info;
            }
        }

        renderCancellationPolicy(data);
        renderReviews(data);
        renderLocationMap(data);
        renderTiming(data);
        renderBookingCard(data);

        // Show content, hide loading
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('details-content').style.display = 'block';
    }

    // ==================== LOCATION MAP ====================
    let detailMapInstance = null;
    let detailMapData = null;
    let googleMapsLoaded = false;

    async function loadGoogleMapsAPI() {
        if (googleMapsLoaded || (typeof google !== 'undefined' && google.maps)) {
            googleMapsLoaded = true;
            return;
        }

        try {
            // Fetch API key from backend
            const response = await fetch('/backend/api/config-maps.php');
            const config = await response.json();
            
            if (!config.success || !config.api_key) {
                console.error('Failed to load Google Maps API key');
                return;
            }

            // Load Google Maps script
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${config.api_key}&libraries=places&callback=initMap`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            
            googleMapsLoaded = true;
        } catch (error) {
            console.error('Error loading Google Maps:', error);
        }
    }

    function renderLocationMap(data) {
        const mapContainer = document.getElementById('location-map');
        const locationDescription = document.getElementById('location-description');

        if (!mapContainer) return;

        // Get coordinates from address data
        const latitude = parseFloat(data.address_latitude || data.latitude || 33.8886);
        const longitude = parseFloat(data.address_longitude || data.longitude || 35.4955);

        // Store for Google Maps callback
        detailMapData = { latitude, longitude, title: data.title, location: data.location };

        // Set location description
        if (locationDescription) {
            locationDescription.textContent = data.location || 'Exact location will be provided after booking.';
        }

        // Load Google Maps API and initialize
        loadGoogleMapsAPI();

        // Try to initialize map if Google Maps is already loaded
        if (typeof google !== 'undefined' && google.maps) {
            initDetailMap();
        }
    }

    // Initialize Google Map (callback from API)
    window.initMap = function() {
        if (detailMapData) {
            initDetailMap();
        }
    };

    function initDetailMap() {
        const mapContainer = document.getElementById('location-map');
        if (!mapContainer || !detailMapData || typeof google === 'undefined') return;

        const { latitude, longitude, title, location } = detailMapData;

        // Create map
        detailMapInstance = new google.maps.Map(mapContainer, {
            center: { lat: latitude, lng: longitude },
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'cooperative',
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'transit',
                    elementType: 'labels.icon',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        // Add circle for approximate location (privacy)
        new google.maps.Circle({
            strokeColor: '#ff7a18',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#ff7a18',
            fillOpacity: 0.15,
            map: detailMapInstance,
            center: { lat: latitude, lng: longitude },
            radius: 500 // 500 meters
        });

        // Add center marker
        new google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: detailMapInstance,
            title: title || 'Location',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#af002d',
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 3
            }
        });
    }

    // ==================== TIMING/HOURS ====================
    function renderTiming(data) {
        const timingSection = document.getElementById('timing-section');
        if (!timingSection) return;

        // Only show for experiences and events
        if (data.hosting_type !== 'experience' && data.hosting_type !== 'event') {
            return;
        }

        timingSection.style.display = 'block';

        const timingDates = document.getElementById('timing-dates');
        const timingHours = document.getElementById('timing-hours');
        const timingDuration = document.getElementById('timing-duration');

        // Render dates
        if (timingDates && (data.date_start || data.date_end)) {
            const startDate = data.date_start ? new Date(data.date_start).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
            }) : '';
            const endDate = data.date_end ? new Date(data.date_end).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
            }) : '';

            let dateText = '';
            if (startDate && endDate && startDate !== endDate) {
                dateText = `${startDate} - ${endDate}`;
            } else if (startDate) {
                dateText = startDate;
            }

            if (dateText) {
                timingDates.innerHTML = `
                    <strong><i class="fa fa-calendar"></i> Dates</strong>
                    <p>${dateText}</p>
                `;
            } else {
                timingDates.style.display = 'none';
            }
        }

        // Render hours
        if (timingHours && (data.hour_start || data.hour_end)) {
            const startTime = data.hour_start ? formatTime(data.hour_start) : '';
            const endTime = data.hour_end ? formatTime(data.hour_end) : '';

            let timeText = '';
            if (startTime && endTime) {
                timeText = `${startTime} - ${endTime}`;
            } else if (startTime) {
                timeText = `Starts at ${startTime}`;
            }

            if (timeText) {
                timingHours.innerHTML = `
                    <strong><i class="fa fa-clock-o"></i> Time</strong>
                    <p>${timeText}</p>
                `;
            } else {
                timingHours.style.display = 'none';
            }
        }

        // Render duration
        if (timingDuration) {
            let durationText = '';

            if (data.length_days) {
                durationText = `${data.length_days} day${data.length_days > 1 ? 's' : ''}`;
            } else if (data.length_hours) {
                durationText = `${data.length_hours} hour${data.length_hours > 1 ? 's' : ''}`;
            }

            if (durationText) {
                timingDuration.innerHTML = `
                    <strong><i class="fa fa-hourglass-half"></i> Duration</strong>
                    <p>${durationText}</p>
                `;
            } else {
                timingDuration.style.display = 'none';
            }
        }
    }

    function formatTime(time) {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    // ==================== THINGS TO KNOW ====================
    function renderThingsToKnow(data) {
        const container = document.getElementById('things-to-know');
        if (!container) return;

        const items = [];

        // House rules (for stays)
        if (data.house_rules) {
            const rules = data.house_rules.split('\n').filter(r => r.trim());
            if (rules.length > 0) {
                items.push({
                    title: 'House rules',
                    items: rules.slice(0, 5) // Limit to 5
                });
            }
        }

        // Check-in/out (for stays)
        if (data.check_in_time || data.check_out_time) {
            const checkItems = [];
            if (data.check_in_time) {
                checkItems.push(`Check-in: ${formatTime(data.check_in_time)}`);
            }
            if (data.check_out_time) {
                checkItems.push(`Check-out: ${formatTime(data.check_out_time)}`);
            }
            if (checkItems.length > 0) {
                items.push({
                    title: 'Check-in & check-out',
                    items: checkItems
                });
            }
        }

        // Safety & property
        if (data.safety_property_info) {
            const safety = data.safety_property_info.split('\n').filter(s => s.trim());
            if (safety.length > 0) {
                items.push({
                    title: 'Safety & property',
                    items: safety.slice(0, 5)
                });
            }
        }

        // Cancellation policy
        if (data.cancellation_policy) {
            const policy = data.cancellation_policy.charAt(0).toUpperCase() + data.cancellation_policy.slice(1);
            items.push({
                title: 'Cancellation',
                items: [`${policy} cancellation policy`]
            });
        }

        if (items.length === 0) {
            container.parentElement.style.display = 'none';
            return;
        }

        container.innerHTML = items.map(section => `
            <div class="things-to-know-item">
                <h3>${section.title}</h3>
                <ul>
                    ${section.items.map(item => `
                        <li><i class="fa fa-check"></i>${item}</li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
    }

    // Show error state
    function showError(message) {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'flex';
        document.getElementById('error-message').textContent = message;
    }

    // Initialize date pickers
    function initDatePickers() {
        const today = new Date().toISOString().split('T')[0];
        const dateStart = document.getElementById('detail-input-date-start');
        const dateEnd = document.getElementById('detail-input-date-end');
        
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
    }

    // Initialize page
    async function init() {
        // Initialize header scroll behavior and search
        initHeaderScroll();
        initSearchFunctionality();
        initDatePickers();

        const params = getUrlParams();

        if (!params.id) {
            console.error('[DETAILS] No ID in URL parameters. URL:', window.location.href);
            showError('No item ID specified in URL. Please access this page with ?id=XXX&type=experience|event|stay');
            return;
        }

        console.log('[DETAILS] Loading details for ID:', params.id, 'Type:', params.type || 'auto-detect');

        try {
            const data = await fetchDetails(params.id, params.type);
            console.log('[DETAILS] Successfully loaded:', data);
            renderDetails(data);
        } catch (error) {
            console.error('[DETAILS] Error loading details:', error);
            console.error('[DETAILS] Error message:', error.message);
            showError(`Unable to load item details: ${error.message || 'The item may not exist or there was a server error.'}`);
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
