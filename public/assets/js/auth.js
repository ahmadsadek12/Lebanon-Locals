/**
 * Authentication Handler
 * Manages user authentication, login, signup, and session management
 */

(function() {
    'use strict';

    // Auth state
    let currentUser = null;
    let authToken = null;

    /**
     * Initialize authentication on page load
     */
    function init() {
        // Load token from localStorage
        authToken = localStorage.getItem('auth_token');

        if (authToken) {
            // Validate token and load user info
            loadCurrentUser();
        } else {
            updateAuthUI(null);
        }

        // Setup event listeners
        setupEventListeners();
        setupModalListeners();
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Auth button in header
        const authButton = document.getElementById('auth-button');
        if (authButton) {
            authButton.addEventListener('click', handleAuthButtonClick);
        } else {
            // Header might not be loaded yet, retry
            setTimeout(setupAuthButton, 100);
        }
    }
    
    /**
     * Setup auth button (can be called multiple times safely)
     */
    function setupAuthButton() {
        const authButton = document.getElementById('auth-button');
        if (authButton && !authButton.dataset.listenerAttached) {
            authButton.addEventListener('click', handleAuthButtonClick);
            authButton.dataset.listenerAttached = 'true';
        }
    }

    function setupModalListeners() {
        // Login form submit
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        // Signup form submit
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', handleSignup);
        }

        // Logout button
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'logout-btn') {
                handleLogout();
            }
        });

        // Modal close buttons
        document.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('modal-close')) {
                closeModal(e.target.closest('.modal').id);
            }
        });

        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                closeModal(e.target.id);
            }
        });

        // Switch between login and signup
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'show-signup') {
                e.preventDefault();
                closeModal('login-modal');
                openModal('signup-modal');
            }
            if (e.target && e.target.id === 'show-login') {
                e.preventDefault();
                closeModal('signup-modal');
                openModal('login-modal');
            }
        });

        // Tab switching in user menu
        document.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('tab-btn')) {
                const tabName = e.target.getAttribute('data-tab');

                // Remove active class from all tabs and contents
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                e.target.classList.add('active');
                const tabContent = document.getElementById('tab-' + tabName);
                if (tabContent) {
                    tabContent.classList.add('active');
                }
            }
        });
        
        // Click on user profile info to go to profile page
        document.addEventListener('click', function(e) {
            const profileLink = e.target.closest('#user-profile-link');
            if (profileLink) {
                // Check if user is a host (user_type field in database)
                if (currentUser && (currentUser.user_type === 'host' || currentUser.user_type === 'admin')) {
                    window.location.href = 'host-profile.html';
                } else {
                    window.location.href = 'user-profile.html';
                }
            }
        });
    }

    /**
     * Load current user info from API
     */
    async function loadCurrentUser() {
        if (!authToken) {

            return;
        }



        try {
            const response = await fetch('/backend/api/me.php', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (data.success) {
                currentUser = data.user;


                updateAuthUI(currentUser);
                
                // Load wishlist for this user
                if (window.WishlistManager) {

                    window.WishlistManager.clearCache();
                    window.WishlistManager.updateWishlistCount();
                    setTimeout(() => {
                        window.WishlistManager.initAllHeartButtons();
                    }, 300);
                }
                
                // Trigger auth changed event
                window.dispatchEvent(new CustomEvent('authChanged'));
            } else {

                // Token is invalid, clear it
                logout();
            }
        } catch (error) {

            logout();
        }
    }

    /**
     * Handle auth button click
     */
    function handleAuthButtonClick(e) {
        e.preventDefault();

        if (currentUser) {
            // User is logged in, show user menu modal
            openModal('user-menu-modal');
            loadUserMenuData();
        } else {
            // User is not logged in, show login modal
            openModal('login-modal');
        }
    }

    /**
     * Handle login form submission
     */
    async function handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            const response = await fetch('/backend/api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Save token
                authToken = data.token;
                localStorage.setItem('auth_token', authToken);

                // Save user
                currentUser = data.user;


                updateAuthUI(currentUser);

                // Close modal
                closeModal('login-modal');

                // Show success message
                showNotification('Welcome back, ' + currentUser.first_name + '!', 'success');
                
                // Clear wishlist cache and reload for this user
                if (window.WishlistManager) {
                    // Force clear cache so it fetches fresh data for this user
                    window.WishlistManager.clearCache();
                    // Update wishlist count
                    window.WishlistManager.updateWishlistCount();
                    // Reinitialize all heart buttons
                    setTimeout(() => {
                        window.WishlistManager.initAllHeartButtons();
                    }, 300);
                }
                
                // Trigger auth changed event for wishlist page
                window.dispatchEvent(new CustomEvent('authChanged'));

                // Reset form
                e.target.reset();
            } else {
                showNotification(data.message || 'Login failed', 'error');
            }
        } catch (error) {

            showNotification('An error occurred. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Handle signup form submission
     */
    async function handleSignup(e) {
        e.preventDefault();

        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const firstName = document.getElementById('signup-first-name').value.trim();
        const lastName = document.getElementById('signup-last-name').value.trim();
        const phoneNumber = document.getElementById('signup-phone').value.trim();
        const dateOfBirth = document.getElementById('signup-dob').value;
        const gender = document.getElementById('signup-gender').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        // Validate passwords match
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        // Validate date of birth and gender
        if (!dateOfBirth || !gender) {
            showNotification('Please provide your date of birth and gender', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            const response = await fetch('/backend/api/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber,
                    date_of_birth: dateOfBirth,
                    gender: gender
                })
            });

            const data = await response.json();

            if (data.success) {
                // Save token
                authToken = data.token;
                localStorage.setItem('auth_token', authToken);

                // Save user
                currentUser = data.user;
                updateAuthUI(currentUser);

                // Close modal
                closeModal('signup-modal');

                // Show success message
                showNotification('Welcome to Lebanon Locals, ' + currentUser.first_name + '!', 'success');
                
                // Clear wishlist cache and reload for new user
                if (window.WishlistManager) {
                    window.WishlistManager.clearCache();
                    window.WishlistManager.updateWishlistCount();
                    setTimeout(() => {
                        window.WishlistManager.initAllHeartButtons();
                    }, 300);
                }
                
                // Trigger auth changed event for wishlist page
                window.dispatchEvent(new CustomEvent('authChanged'));

                // Reset form
                e.target.reset();
            } else {
                showNotification(data.message || 'Registration failed', 'error');
            }
        } catch (error) {

            showNotification('An error occurred. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Handle logout
     */
    function handleLogout() {
        logout();
        closeModal('user-menu-modal');
        showNotification('You have been logged out', 'success');
    }

    /**
     * Logout (clear session)
     */
    function logout() {

        authToken = null;
        currentUser = null;
        localStorage.removeItem('auth_token');
        updateAuthUI(null);
        
        // Clear wishlist completely when logging out
        if (window.WishlistManager) {

            window.WishlistManager.clearCache();
            window.WishlistManager.updateWishlistCount();
            // Reset all heart buttons to empty
            setTimeout(() => {
                document.querySelectorAll('.heart-btn').forEach(btn => {
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.className = 'fa fa-heart-o';
                        btn.classList.remove('active');
                    }
                });
            }, 100);
        }
        
        // Trigger auth changed event
        window.dispatchEvent(new CustomEvent('authChanged'));
    }

    /**
     * Update authentication UI based on user state
     */
    function updateAuthUI(user) {
        const authButton = document.getElementById('auth-button');

        if (!authButton) return;

        if (user) {
            // User is logged in
            const initials = (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase();
            const profilePic = user.profile_picture || null;

            authButton.innerHTML = profilePic
                ? `<img src="${profilePic}" alt="${user.first_name}" class="user-avatar">`
                : `<div class="user-avatar-placeholder">${initials}</div>`;
            authButton.setAttribute('title', `${user.first_name} ${user.last_name}`);
        } else {
            // User is not logged in
            authButton.innerHTML = '<i class="fa fa-user"></i> Sign In';
            authButton.removeAttribute('title');
        }
    }

    /**
     * Load user menu data (bookings and wishlist)
     */
    async function loadUserMenuData() {
        if (!authToken) return;

        try {
            // Load bookings
            const bookingsResponse = await fetch('/backend/api/user-bookings.php', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const bookingsData = await bookingsResponse.json();

            if (bookingsData.success) {
                renderBookings(bookingsData.bookings);
                updateBookingCounts(bookingsData.count);
            }

            // Load wishlist
            const wishlistResponse = await fetch('/backend/api/user-wishlist.php', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const wishlistData = await wishlistResponse.json();

            if (wishlistData.success) {
                renderWishlist(wishlistData.wishlist);
                updateWishlistCount(wishlistData.count);
            }

            // Update user info in modal
            updateUserMenuProfile();

        } catch (error) {

        }
    }

    /**
     * Render bookings in the user menu
     */
    function renderBookings(bookings) {
        const upcomingContainer = document.getElementById('upcoming-bookings-list');
        const previousContainer = document.getElementById('previous-bookings-list');

        if (upcomingContainer && bookings.upcoming) {
            upcomingContainer.innerHTML = bookings.upcoming.length > 0
                ? bookings.upcoming.map(booking => createBookingCard(booking)).join('')
                : '<p class="empty-state">No upcoming bookings</p>';
        }

        if (previousContainer && bookings.previous) {
            previousContainer.innerHTML = bookings.previous.length > 0
                ? bookings.previous.map(booking => createBookingCard(booking)).join('')
                : '<p class="empty-state">No previous bookings</p>';
        }
    }

    /**
     * Create booking card HTML
     */
    function createBookingCard(booking) {
        const image = booking.listing_image || '/images/placeholder.jpg';
        const title = booking.listing_title || 'Booking';
        const dates = `${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`;
        const status = booking.status;

        return `
            <div class="booking-card" data-booking-id="${booking.id}">
                <img src="${image}" alt="${escapeHtml(title)}" class="booking-image">
                <div class="booking-details">
                    <h4>${escapeHtml(title)}</h4>
                    <p class="booking-dates">${dates}</p>
                    <p class="booking-guests">${booking.guests} guest${booking.guests > 1 ? 's' : ''}</p>
                    <span class="booking-status status-${status}">${status}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render wishlist in the user menu
     */
    function renderWishlist(wishlist) {
        const container = document.getElementById('wishlist-items-list');

        if (container) {
            container.innerHTML = wishlist.length > 0
                ? wishlist.map(item => createWishlistCard(item)).join('')
                : '<p class="empty-state">Your wishlist is empty</p>';
        }
    }

    /**
     * Create wishlist card HTML
     */
    function createWishlistCard(item) {
        const image = item.item_image || '/images/placeholder.jpg';
        const title = item.item_title || 'Item';
        const location = item.item_location || '';
        const price = item.item_price || 0;

        return `
            <div class="wishlist-card" data-item-id="${item.id}">
                <img src="${image}" alt="${escapeHtml(title)}" class="wishlist-image">
                <div class="wishlist-details">
                    <h4>${escapeHtml(title)}</h4>
                    <p class="wishlist-location">${escapeHtml(location)}</p>
                    <p class="wishlist-price">$${price}</p>
                </div>
            </div>
        `;
    }

    /**
     * Update booking counts
     */
    function updateBookingCounts(counts) {
        const upcomingCount = document.getElementById('upcoming-count');
        const previousCount = document.getElementById('previous-count');

        if (upcomingCount) upcomingCount.textContent = counts.upcoming || 0;
        if (previousCount) previousCount.textContent = counts.previous || 0;
    }

    /**
     * Update wishlist count
     */
    function updateWishlistCount(count) {
        const wishlistCount = document.getElementById('wishlist-count');
        if (wishlistCount) wishlistCount.textContent = count || 0;
    }

    /**
     * Update user profile in menu
     */
    function updateUserMenuProfile() {
        if (!currentUser) return;

        const userNameElement = document.getElementById('user-menu-name');
        const userAvatarElement = document.getElementById('user-menu-avatar');

        if (userNameElement) {
            userNameElement.textContent = `${currentUser.first_name} ${currentUser.last_name}`;
        }

        if (userAvatarElement) {
            if (currentUser.profile_picture) {
                userAvatarElement.innerHTML = `<img src="${currentUser.profile_picture}" alt="${currentUser.first_name}">`;
            } else {
                const initials = (currentUser.first_name.charAt(0) + currentUser.last_name.charAt(0)).toUpperCase();
                userAvatarElement.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
            }
        }
    }

    /**
     * Open modal
     */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close modal
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Format date
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Get current user
     */
    function getCurrentUser() {

        return currentUser;
    }

    /**
     * Get auth token
     */
    function getAuthToken() {
        return authToken;
    }

    /**
     * Check if user is authenticated
     */
    function isAuthenticated() {
        return !!authToken && !!currentUser;
    }

    // Export public API
    window.Auth = {
        getCurrentUser,
        getAuthToken,
        isAuthenticated,
        logout,
        openModal,  // Allow other modules to open login/signup modals
        setupAuthButton  // Allow re-initialization after dynamic header load
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
