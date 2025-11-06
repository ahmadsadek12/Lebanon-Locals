/**
 * Lebanon Locals - Wishlist Management
 * Handles wishlist functionality across the site using database
 * @version 2.0.0
 */

(function() {
    'use strict';

    const BASE_URL = '/backend/api';
    const WISHLIST_API = `${BASE_URL}/wishlist.php`;

    // DEVELOPMENT MODE FLAG - Set to true for testing without login
    const DEVELOPMENT_MODE = false;  // Set to false for production (requires real login)
    const DEV_USER_ID = 1;  // Test user ID for development

    // Get current user ID from auth system
    function getCurrentUserId() {
        // DEVELOPMENT_MODE overrides - always use dev user for testing
        if (DEVELOPMENT_MODE) {

            return DEV_USER_ID;
        }

        // Try to get real user from auth system
        if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
            const user = window.Auth.getCurrentUser();
            if (user && user.id) {

                return user.id;
            }
        }


        return null;
    }

    // Check if user is authenticated
    function isUserAuthenticated() {
        // DEVELOPMENT_MODE overrides everything for testing
        if (DEVELOPMENT_MODE) {

            return true;
        }

        // Check real authentication
        if (window.Auth && typeof window.Auth.isAuthenticated === 'function') {
            const isAuth = window.Auth.isAuthenticated();

            return isAuth;
        }

        // No auth system available and not in dev mode

        return false;
    }

    // Show login modal
    function showLoginModal() {
        if (window.Auth && typeof window.Auth.openModal === 'function') {
            window.Auth.openModal('login-modal');
        } else {
            alert('Please sign in to use the wishlist feature');
        }
    }

    // Cache for wishlist data
    let wishlistCache = null;
    let wishlistCacheTime = null;
    const CACHE_DURATION = 30000; // 30 seconds

    // ==================== WISHLIST API CALLS ====================
    /**
     * Get wishlist from database
     */
    async function getWishlist(forceRefresh = false) {
        // Check if user is authenticated
        if (!isUserAuthenticated()) {

            return [];
        }

        const userId = getCurrentUserId();
        if (!userId) {

            return [];
        }

        // Use cache if available and not expired
        if (!forceRefresh && wishlistCache && wishlistCacheTime && (Date.now() - wishlistCacheTime) < CACHE_DURATION) {

            return wishlistCache;
        }

        try {

            const response = await fetch(`${WISHLIST_API}?user_id=${userId}`);
            const data = await response.json();



            if (data.success) {
                wishlistCache = data.data || [];
                wishlistCacheTime = Date.now();

                return wishlistCache;
            }


            return [];
        } catch (e) {

            return [];
        }
    }

    /**
     * Add item to wishlist
     */
    async function addToWishlist(id, type) {
        // Check authentication
        if (!isUserAuthenticated()) {

            showLoginModal();
            return false;
        }

        const userId = getCurrentUserId();
        if (!userId) {

            return false;
        }

        try {

            const response = await fetch(WISHLIST_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    item_id: parseInt(id),
                    item_type: type
                })
            });

            const data = await response.json();


            if (data.success) {
                // Invalidate cache
                wishlistCache = null;

                await updateWishlistCount();
                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('wishlistUpdated'));
                return true;
            }


            return false;
        } catch (e) {

            return false;
        }
    }

    /**
     * Remove item from wishlist
     */
    async function removeFromWishlist(id, type) {
        // Check authentication
        if (!isUserAuthenticated()) {

            return false;
        }

        const userId = getCurrentUserId();
        if (!userId) {

            return false;
        }

        try {

            const response = await fetch(WISHLIST_API, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    item_id: parseInt(id),
                    item_type: type
                })
            });

            const data = await response.json();


            if (data.success) {
                // Invalidate cache
                wishlistCache = null;

                await updateWishlistCount();
                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('wishlistUpdated'));
                return true;
            }


            return false;
        } catch (e) {

            return false;
        }
    }

    /**
     * Check if item is in wishlist
     */
    async function isInWishlist(id, type) {
        const wishlist = await getWishlist();
        return wishlist.some(item => item.id === parseInt(id) && item._type === type);
    }

    /**
     * Toggle wishlist status
     */
    async function toggleWishlist(id, type) {
        const inWishlist = await isInWishlist(id, type);
        if (inWishlist) {
            await removeFromWishlist(id, type);
            return false;
        } else {
            await addToWishlist(id, type);
            return true;
        }
    }

    /**
     * Get wishlist count
     */
    async function getWishlistCount() {
        const wishlist = await getWishlist();
        return wishlist.length;
    }

    /**
     * Update wishlist count badge
     */
    async function updateWishlistCount() {
        // Only show wishlist count if user is authenticated
        if (!isUserAuthenticated()) {
            const countElements = document.querySelectorAll('#wishlist-count, .wishlist-count');
            countElements.forEach(element => {
                element.style.display = 'none';
            });
            return 0;
        }

        const count = await getWishlistCount();
        const countElements = document.querySelectorAll('#wishlist-count, .wishlist-count');

        countElements.forEach(element => {
            element.textContent = count;
            if (count === 0) {
                element.style.display = 'none';
            } else {
                element.style.display = 'flex';
            }
        });

        return count;
    }

    // ==================== HEART BUTTON ====================
    /**
     * Initialize heart button
     */
    window.initHeartButton = async function(button, id, type) {
        if (!button) return;

        // Set initial state (only if authenticated)
        if (isUserAuthenticated()) {
            const inWishlist = await isInWishlist(id, type);
            updateHeartButtonState(button, inWishlist);
        } else {
            // Show empty heart for non-authenticated users
            updateHeartButtonState(button, false);
        }

        // Add click handler
        button.onclick = async function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Check if user is authenticated
            if (!isUserAuthenticated()) {

                showLoginModal();
                return;
            }

            const isNowInWishlist = await toggleWishlist(id, type);
            updateHeartButtonState(button, isNowInWishlist);

            // Add animation
            button.classList.add('animating');
            setTimeout(() => button.classList.remove('animating'), 500);

            // Show toast notification
            showToast(isNowInWishlist ? 'Added to wishlist' : 'Removed from wishlist');
        };
    };

    /**
     * Update heart button visual state
     */
    function updateHeartButtonState(button, isActive) {
        const icon = button.querySelector('i');
        if (!icon) return;

        if (isActive) {
            icon.className = 'fa fa-heart';
            button.classList.add('active');
        } else {
            icon.className = 'fa fa-heart-o';
            button.classList.remove('active');
        }
    }

    /**
     * Create heart button HTML (async not needed here, state will be set on init)
     */
    window.createHeartButton = function(id, type) {
        // Always create with default state, will be updated on initialization
        return `
            <button class="heart-btn"
                    data-id="${id}"
                    data-type="${type}"
                    aria-label="Add to wishlist"
                    title="Add to wishlist">
                <i class="fa fa-heart-o"></i>
            </button>
        `;
    };

    /**
     * Initialize all heart buttons on page
     */
    window.initAllHeartButtons = function() {
        document.querySelectorAll('.heart-btn').forEach(button => {
            const id = parseInt(button.dataset.id);
            const type = button.dataset.type;

            if (id && type) {
                initHeartButton(button, id, type);
            }
        });
    };

    // ==================== TOAST NOTIFICATIONS ====================
    function showToast(message, duration = 3000) {
        // Remove existing toast
        const existingToast = document.querySelector('.wishlist-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = 'wishlist-toast';
        toast.innerHTML = `
            <i class="fa fa-heart"></i>
            <span>${message}</span>
        `;

        // Add styles inline (can be moved to CSS)
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: '10000',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease'
        });

        document.body.appendChild(toast);

        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Add toast animations to page
    if (!document.querySelector('#wishlist-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'wishlist-toast-styles';
        style.textContent = `
            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(20px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== WISHLIST PAGE ====================
    if (window.location.pathname.includes('wishlist.html')) {
        let currentFilter = 'all';
        let wishlistItems = [];
        let displayedCount = 0;
        
        // Get items per page based on screen size to ensure complete rows
        function getItemsPerPage() {
            const width = window.innerWidth;
            if (width > 1440) {
                return 10; // 5 cards per row × 2 rows
            } else if (width > 1024) {
                return 8; // 4 cards per row × 2 rows
            } else {
                return 9; // 3 cards per row × 3 rows
            }
        }

        async function loadWishlistPage() {



            
            // Check if user is authenticated
            if (!isUserAuthenticated()) {

                showUnauthenticatedState();
                return;
            }

            const userId = getCurrentUserId();


            // Show loading
            document.getElementById('wishlist-loading').style.display = 'block';
            document.getElementById('wishlist-empty').style.display = 'none';
            document.getElementById('wishlist-grid').style.display = 'none';

            try {
                // Fetch wishlist items (already includes full details from API)
                const items = await getWishlist(true); // Force refresh



                if (items.length === 0) {
                    showEmptyState();
                    return;
                }

                wishlistItems = items;

                // Update counts
                updateFilterCounts(items);

                // Render items
                renderWishlistItems(items, currentFilter);

                // Show grid
                document.getElementById('wishlist-loading').style.display = 'none';
                document.getElementById('wishlist-grid').style.display = 'grid';
                

            } catch (error) {

                document.getElementById('wishlist-loading').innerHTML = '<p>Error loading wishlist. Please try again.</p>';
            }
        }
        
        function showUnauthenticatedState() {
            const container = document.querySelector('.wishlist-container');
            if (!container) return;
            
            container.innerHTML = `
                <div class="wishlist-unauthenticated" style="text-align: center; padding: 60px 20px;">
                    <i class="fa fa-heart-o" style="font-size: 80px; color: #FF385C; margin-bottom: 24px;"></i>
                    <h2 style="font-size: 32px; margin-bottom: 16px; color: #222;">Sign in to view your wishlist</h2>
                    <p style="font-size: 18px; color: #717171; margin-bottom: 32px;">
                        Save your favorite experiences, events, and stays to your wishlist
                    </p>
                    <button onclick="window.Auth && window.Auth.openModal('login-modal')" 
                            style="background: #FF385C; color: white; border: none; padding: 14px 32px; font-size: 16px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">
                        Sign In
                    </button>
                    <p style="margin-top: 16px; color: #717171;">
                        Don't have an account? 
                        <a href="#" onclick="event.preventDefault(); window.Auth && window.Auth.openModal('signup-modal')" 
                           style="color: #FF385C; font-weight: 600; text-decoration: none;">Sign up</a>
                    </p>
                </div>
            `;
        }

        function updateFilterCounts(items) {
            const counts = {
                all: items.length,
                experience: items.filter(i => i._type === 'experience').length,
                event: items.filter(i => i._type === 'event').length,
                stay: items.filter(i => i._type === 'stay').length
            };

            document.getElementById('count-all').textContent = counts.all;
            document.getElementById('count-experience').textContent = counts.experience;
            document.getElementById('count-event').textContent = counts.event;
            document.getElementById('count-stay').textContent = counts.stay;
        }

        function renderWishlistItems(items, filter, append = false) {
            const grid = document.getElementById('wishlist-grid');
            const loadMoreBtn = document.getElementById('wishlist-load-more');

            let filteredItems = items;
            if (filter !== 'all') {
                filteredItems = items.filter(item => item._type === filter);
            }

            if (filteredItems.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">No items match this filter</p>';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            // Determine how many items to show
            const itemsPerPage = getItemsPerPage();
            
            if (!append) {
                displayedCount = Math.min(itemsPerPage, filteredItems.length);
            } else {
                displayedCount = Math.min(displayedCount + itemsPerPage, filteredItems.length);
            }

            const itemsToShow = filteredItems.slice(0, displayedCount);

            // Render cards
            grid.innerHTML = itemsToShow.map(item => createWishlistCard(item)).join('');

            // Show/hide "Load More" button
            if (loadMoreBtn) {
                if (displayedCount < filteredItems.length) {
                    loadMoreBtn.style.display = 'block';
                    const remaining = filteredItems.length - displayedCount;
                    loadMoreBtn.textContent = `Load More (${remaining} remaining)`;
                } else {
                    loadMoreBtn.style.display = 'none';
                }
            }

            // Initialize heart buttons
            initAllHeartButtons();
        }

        function createWishlistCard(item) {
            const price = item._type === 'stay'
                ? `$${parseFloat(item.price_per_night || 0).toFixed(0)}`
                : `$${parseFloat(item.price || 0).toFixed(0)}`;

            const priceLabel = item._type === 'stay'
                ? '/ night'
                : item.price_per_person ? '/ person' : '/ group';

            const rating = parseFloat(item.average_rating || 0).toFixed(1);
            const reviewCount = parseInt(item.total_reviews || 0);

            const ratingHtml = reviewCount > 0
                ? `<div class="wishlist-card-rating">
                       <i class="fa fa-star"></i>
                       <span>${rating} (${reviewCount})</span>
                   </div>`
                : '';

            // Get main image or use fallback (Lebanon Locals logo)
            let mainImage = item.main_image || 'images/logos/logo.jpg';
            
            // Make sure image path is correct (no double slashes, starts correctly)
            if (mainImage && !mainImage.startsWith('http')) {
                // Remove leading slash if present to avoid //images
                mainImage = mainImage.replace(/^\/+/, '');
            }
            


            return `
                <div class="wishlist-card">
                    <a href="details.html?id=${item.id}&type=${item._type}" class="wishlist-card-link">
                        <div class="wishlist-card-image">
                            <img src="${mainImage}" 
                                 alt="${item.title}" 
                                 loading="lazy"
                                 onerror="this.src='images/logos/logo.jpg'; console.error('Image failed to load:', '${mainImage}');">
                        </div>
                    </a>
                    <button class="wishlist-card-heart heart-btn active" data-id="${item.id}" data-type="${item._type}">
                        <i class="fa fa-heart"></i>
                    </button>
                    <div class="wishlist-card-content">
                        <a href="details.html?id=${item.id}&type=${item._type}" class="wishlist-card-link">
                            <h3 class="wishlist-card-title">${item.title}</h3>
                            <div class="wishlist-card-location">
                                <i class="fa fa-map-marker"></i>
                                <span>${item.location || 'Location not specified'}</span>
                            </div>
                            ${ratingHtml}
                            <div class="wishlist-card-price">
                                ${price}
                                <span class="wishlist-card-price-label">${priceLabel}</span>
                            </div>
                            <div class="wishlist-card-type-badge">
                                <span style="display: inline-block; padding: 4px 12px; background: #f0f0f0; border-radius: 6px; font-size: 12px; font-weight: 600; color: #666; text-transform: capitalize; margin-top: 8px;">
                                    ${item._type}
                                </span>
                            </div>
                        </a>
                    </div>
                </div>
            `;
        }

        function showEmptyState() {
            document.getElementById('wishlist-loading').style.display = 'none';
            document.getElementById('wishlist-empty').style.display = 'block';
            document.getElementById('wishlist-grid').style.display = 'none';
        }

        // Initialize filters
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Update active state
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Update filter and reset pagination
                currentFilter = this.dataset.filter;
                displayedCount = 0;
                renderWishlistItems(wishlistItems, currentFilter, false);
            });
        });

        // Initialize "Load More" button
        const loadMoreBtn = document.getElementById('wishlist-load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', function() {
                renderWishlistItems(wishlistItems, currentFilter, true);
            });
        }

        // Listen for wishlist updates
        window.addEventListener('wishlistUpdated', () => {

            wishlistCache = null;  // Clear cache
            wishlistCacheTime = null;
            loadWishlistPage();
        });
        
        // Listen for authentication changes
        window.addEventListener('authChanged', () => {

            wishlistCache = null;  // Clear cache
            wishlistCacheTime = null;
            setTimeout(() => {
                loadWishlistPage();
            }, 300);
        });

        // Wait for auth to initialize before loading page
        function initWishlistPage() {
            // Longer delay to ensure auth module and user are fully loaded
            setTimeout(() => {



                
                // Always clear cache before loading to get fresh data
                wishlistCache = null;
                wishlistCacheTime = null;
                
                loadWishlistPage();
            }, 600); // Increased delay to wait for Auth to fully load
        }
        
        // Re-render on window resize to adjust for screen size changes
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // Only re-render if we have items
                if (wishlistItems.length > 0) {
                    displayedCount = 0;
                    renderWishlistItems(wishlistItems, currentFilter, false);
                }
            }, 300);
        });
        
        // Initialize
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initWishlistPage);
        } else {
            initWishlistPage();
        }
    }

    // ==================== INITIALIZATION ====================
    // Update count on page load (with small delay to wait for auth)
    setTimeout(() => {
        updateWishlistCount();
    }, 300);

    // Initialize heart buttons if they exist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initAllHeartButtons, 300);
        });
    } else {
        setTimeout(initAllHeartButtons, 300);
    }

    // Listen for wishlist updates to refresh count
    window.addEventListener('wishlistUpdated', updateWishlistCount);
    
    // Listen for auth changes to reload wishlist
    window.addEventListener('authChanged', () => {

        clearCache();
        setTimeout(() => {
            updateWishlistCount();
            initAllHeartButtons();
        }, 300);
    });

    // Clear wishlist cache
    function clearCache() {

        wishlistCache = null;
        wishlistCacheTime = null;
    }

    // Export functions to window for global access
    window.WishlistManager = {
        getWishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        getWishlistCount,
        updateWishlistCount,
        createHeartButton,
        initHeartButton,
        initAllHeartButtons,
        clearCache  // Export clear cache function
    };

})();
