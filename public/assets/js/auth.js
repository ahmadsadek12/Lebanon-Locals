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
        
        // Setup form listeners (for login/signup pages and modals)
        setupFormListeners();
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

    /**
     * Setup form listeners (login and signup)
     * Can be called multiple times safely
     * Works for both pages (login.html, signup.html) and modals
     */
    function setupFormListeners() {
        // Login form submit
        const loginForm = document.getElementById('login-form');
        if (loginForm && !loginForm.dataset.listenerAttached) {
            console.log('[AUTH] ✅ Attaching login form listener');
            loginForm.addEventListener('submit', handleLogin);
            loginForm.dataset.listenerAttached = 'true';
        }

        // Signup form submit
        const signupForm = document.getElementById('signup-form');
        if (signupForm && !signupForm.dataset.listenerAttached) {
            console.log('[AUTH] ✅ Attaching signup form listener');
            signupForm.addEventListener('submit', handleSignup);
            signupForm.dataset.listenerAttached = 'true';
        }
    }

    function setupModalListeners() {
        // Prevent modal from closing when interacting with form elements
        // This needs to be done after modals are loaded
        function preventModalCloseOnFormInteraction() {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                const modalContent = modal.querySelector('.modal-content, .auth-modal-content, .user-menu-content');
                if (modalContent && !modalContent.dataset.listenersAdded) {
                    modalContent.dataset.listenersAdded = 'true';
                    // Use event delegation on the modal content to stop propagation ONLY for clicks that would close the modal
                    // But allow clicks on interactive elements (buttons, links, tabs) to work normally
                    modalContent.addEventListener('click', function(e) {
                        // Don't stop propagation for interactive elements - let them handle their own clicks
                        const isInteractive = e.target.tagName === 'BUTTON' || 
                                            e.target.tagName === 'A' || 
                                            e.target.tagName === 'INPUT' || 
                                            e.target.tagName === 'SELECT' || 
                                            e.target.tagName === 'TEXTAREA' ||
                                            e.target.closest('button') ||
                                            e.target.closest('a') ||
                                            e.target.closest('.tab-btn') ||
                                            e.target.closest('.modal-close') ||
                                            e.target.closest('#user-profile-link') ||
                                            e.target.closest('#logout-btn') ||
                                            e.target.id === 'show-signup' || 
                                            e.target.id === 'show-login' || 
                                            e.target.closest('#show-signup') || 
                                            e.target.closest('#show-login');
                        
                        if (isInteractive) {
                            return; // Let the click go through to the element's handler
                        }
                        
                        // Only stop propagation for non-interactive clicks inside modal content
                        // This prevents the modal close handler from firing when clicking empty space
                        e.stopPropagation();
                    }, false); // Use bubbling phase so it runs after the element's own handlers
                    
                    // Don't stop propagation on focus events - they don't close modals anyway
                }
            });
        }
        
        // Run immediately and also after a delay to catch dynamically loaded modals
        setTimeout(preventModalCloseOnFormInteraction, 100);
        setTimeout(preventModalCloseOnFormInteraction, 500);
        
        // Also run when auth modals are loaded via loadAuthModals
        if (window.loadAuthModals) {
            const originalLoadAuthModals = window.loadAuthModals;
            window.loadAuthModals = function() {
                return originalLoadAuthModals().then(() => {
                    setTimeout(preventModalCloseOnFormInteraction, 100);
                    setupFormListeners(); // Also setup form listeners after modals load
                });
            };
        }
        
        // Setup form listeners (works for pages and modals)
        setupFormListeners();
        
        // Retry after delays to catch dynamically loaded content
        setTimeout(setupFormListeners, 100);
        setTimeout(setupFormListeners, 500);
        
        // Also setup on DOMContentLoaded for pages
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupFormListeners);
        }

        // Logout button
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'logout-btn') {
                handleLogout();
            }
        });

        // Modal close buttons - use capture phase to ensure it runs before other handlers
        document.addEventListener('click', function(e) {
            // Check if click is on modal-close button or its child (the × symbol)
            const closeBtn = e.target.closest('.modal-close');
            if (closeBtn) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const modal = closeBtn.closest('.modal');
                if (modal && modal.id) {
                    closeModal(modal.id);
                }
                return false;
            }
        }, true); // Use capture phase to run before other handlers

        // Close modal when clicking outside (on modal background only)
        // This listener must run AFTER the form interaction prevention
        document.addEventListener('click', function(e) {
            // Ignore if user is selecting text (mouseup after mousedown with selection)
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                return; // User is selecting text, don't close modal
            }
            
            // Ignore if click is part of a drag operation
            if (e.target.closest('.modal') && (e.detail === 0 || e.which === 0)) {
                return; // Likely a programmatic or drag event, ignore
            }
            
            // FIRST: Check if click is on input, select, textarea, button, label inside modal - don't close
            if (e.target.closest('.modal') && 
                (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || 
                 e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || 
                 e.target.tagName === 'LABEL' || e.target.closest('input') || 
                 e.target.closest('select') || e.target.closest('textarea'))) {
                return; // Click is on form element, don't close
            }
            
            // SECOND: Check if click is inside any modal content area - don't close
            const modalContent = e.target.closest('.modal-content, .auth-modal-content, .user-menu-content');
            if (modalContent) {
                return; // Click is inside modal content, don't close
            }
            
            // THIRD: Check if click is on any form element inside a modal - don't close
            if (e.target.closest('form') && e.target.closest('.modal')) {
                return; // Click is on form element inside modal, don't close
            }
            
            // FINALLY: Find which modal (if any) was clicked directly on the dark overlay
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                // Only close if clicking directly on the modal background itself (the dark overlay)
                if (e.target === modal && modal.style.display === 'flex') {
                    closeModal(modal.id);
                }
            });
        }, false); // Use bubbling phase, not capture
        
        // Also prevent text selection from closing modal
        document.addEventListener('mousedown', function(e) {
            // Check if clicking on or near password/input fields inside modal
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            const hasInputParent = e.target.closest('input') || e.target.closest('textarea');
            // Password fields are wrapped in a div, check for that too
            const inputWrapper = e.target.closest('div[style*="position: relative"]');
            const hasPasswordInput = inputWrapper && inputWrapper.querySelector('input[type="password"], input[type="text"]');
            
            if (e.target.closest('.modal') && (isInput || hasInputParent || hasPasswordInput)) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, true);
        
        document.addEventListener('mouseup', function(e) {
            // Check if clicking on or near password/input fields inside modal
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            const hasInputParent = e.target.closest('input') || e.target.closest('textarea');
            // Password fields are wrapped in a div, check for that too
            const inputWrapper = e.target.closest('div[style*="position: relative"]');
            const hasPasswordInput = inputWrapper && inputWrapper.querySelector('input[type="password"], input[type="text"]');
            
            if (e.target.closest('.modal') && (isInput || hasInputParent || hasPasswordInput)) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, true);

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
                // For hosts and admins, go to my-host.html; otherwise go to user-profile.html
                const currentUser = getCurrentUser();
                if (currentUser && (currentUser.user_type === 'host' || currentUser.user_type === 'admin')) {
                    window.location.href = 'my-host.html';
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
                
                // Trigger event for header to update host button
                document.dispatchEvent(new Event('authStateChanged'));
                
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
        e.stopPropagation();

        console.log('[AUTH] Auth button clicked, currentUser:', currentUser ? 'exists' : 'null');

        if (currentUser) {
            // User is logged in, show user menu modal
            // Ensure modal exists before opening
            const modal = document.getElementById('user-menu-modal');
            if (!modal) {
                console.error('[AUTH] User menu modal not found in DOM. Trying to load modals...');
                // Try loading modals first
                if (window.loadAuthModals) {
                    window.loadAuthModals().then(() => {
                        const retryModal = document.getElementById('user-menu-modal');
                        if (retryModal) {
                            console.log('[AUTH] Modal loaded, opening now');
                            openModal('user-menu-modal');
                            // Load data asynchronously (non-blocking, don't await)
                            loadUserMenuData();
                        } else {
                            console.error('[AUTH] Modal still not found after loading');
                        }
                    }).catch(err => {
                        console.error('[AUTH] Failed to load modals:', err);
                    });
                } else {
                    console.error('[AUTH] loadAuthModals function not available');
                }
                return;
            }
            console.log('[AUTH] Opening user menu modal');
            openModal('user-menu-modal');
            // Load data asynchronously (non-blocking, don't await - loadUserMenuData is no longer async)
            loadUserMenuData();
        } else {
            // User is not logged in, redirect to login page
            // Check if there's a return URL to preserve
            const currentPath = window.location.pathname;
            const returnUrl = currentPath !== '/' && !currentPath.includes('login.html') && !currentPath.includes('signup.html') 
                ? encodeURIComponent(currentPath + window.location.search)
                : null;
            
            const loginUrl = returnUrl ? `login.html?return=${returnUrl}` : 'login.html';
            window.location.href = loginUrl;
        }
    }

    /**
     * Handle login form submission
     */
    /**
     * Show error message - works for both modals and pages
     */
    function showAuthError(modalId, message) {
        // Check if we're on a page (login.html or signup.html)
        const isOnLoginPage = window.location.pathname.includes('login.html');
        const isOnSignupPage = window.location.pathname.includes('signup.html');
        
        if (isOnLoginPage || isOnSignupPage) {
            // Use page error display
            showPageError(message);
            return;
        }
        
        // Otherwise use modal error display
        const errorDiv = document.getElementById(modalId === 'login-modal' ? 'login-error' : 'signup-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Clear error when user starts typing
            const form = modalId === 'login-modal' ? 
                document.getElementById('login-form') : 
                document.getElementById('signup-form');
            if (form) {
                const inputs = form.querySelectorAll('input, select');
                inputs.forEach(input => {
                    input.addEventListener('input', function clearError() {
                        errorDiv.style.display = 'none';
                        input.removeEventListener('input', clearError);
                    }, { once: true });
                });
            }
        }
        // Also show notification
        showNotification(message, 'error');
    }
    
    /**
     * Show error message on login/signup pages
     */
    function showPageError(message) {
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `<div class="auth-error-message">${message}</div>`;
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Clear error when user starts typing in any form field
            const form = document.getElementById('login-form') || document.getElementById('signup-form');
            if (form) {
                const inputs = form.querySelectorAll('input, select');
                inputs.forEach(input => {
                    input.addEventListener('input', function clearError() {
                        clearPageError();
                        input.removeEventListener('input', clearError);
                    }, { once: true });
                });
            }
        }
    }
    
    /**
     * Clear error message on pages
     */
    function clearPageError() {
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = '';
        }
    }

    /**
     * Clear error message in modal
     */
    function clearAuthError(modalId) {
        // Check if we're on a page
        const isOnLoginPage = window.location.pathname.includes('login.html');
        const isOnSignupPage = window.location.pathname.includes('signup.html');
        
        if (isOnLoginPage || isOnSignupPage) {
            clearPageError();
            return;
        }
        
        const errorDiv = document.getElementById(modalId === 'login-modal' ? 'login-error' : 'signup-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        clearAuthError('login-modal'); // Clear any previous errors

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        // Basic validation
        if (!email) {
            showAuthError('login-modal', 'Please enter your email address');
            return;
        }
        if (!password) {
            showAuthError('login-modal', 'Please enter your password');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            const response = await fetch('backend/api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            // Check if response is ok
            if (!response.ok) {
                let errorMessage = 'Login failed. Please try again.';
                
                // Try to parse error response
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } catch (e) {
                        // Response is JSON but couldn't parse it
                        errorMessage = `Server error (${response.status}). Please try again.`;
                    }
                } else {
                    // Not JSON response (probably HTML error page)
                    errorMessage = `Server error (${response.status}). Please try again.`;
                }
                
                showAuthError('login-modal', errorMessage);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            // Parse response
            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('[AUTH] Failed to parse login response:', parseError);
                showAuthError('login-modal', 'Invalid response from server. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            if (data.success && data.token) {
                // Save token
                authToken = data.token;
                localStorage.setItem('auth_token', authToken);

                // Save user
                currentUser = data.user;
                updateAuthUI(currentUser);
                
                // Trigger event for header to update host button
                document.dispatchEvent(new Event('authStateChanged'));

                // Check if we're on login page or in modal
                const isOnLoginPage = window.location.pathname.includes('login.html');
                
                if (isOnLoginPage) {
                    // Redirect after successful login
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('return');
                    
                    if (returnUrl && (returnUrl.startsWith('/') || returnUrl.startsWith('http') || !returnUrl.includes('login.html'))) {
                        // Valid return URL
                        window.location.href = decodeURIComponent(returnUrl);
                    } else {
                        // Default redirect
                        window.location.href = 'index.html';
                    }
                } else {
                    // In modal - close it
                    closeModal('login-modal');
                    showNotification('Login successful! Welcome back, ' + currentUser.first_name + '!', 'success');
                    e.target.reset();
                    clearAuthError('login-modal');
                }
                
                // Clear wishlist cache and reload for this user
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
                // Login failed - show specific error message
                const errorMsg = data.message || data.error || 'Invalid email or password. Please try again.';
                showAuthError('login-modal', errorMsg);
            }
        } catch (error) {
            console.error('[AUTH] Login error:', error);
            // Network error or other exception
            let errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message) {
                errorMessage = 'An error occurred: ' + error.message;
            }
            
            showAuthError('login-modal', errorMessage);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Handle signup form submission
     */
    async function handleSignup(e) {
        console.log('[AUTH] 🔵 SIGNUP FORM SUBMITTED!');
        e.preventDefault();
        clearAuthError('signup-modal'); // Clear any previous errors

        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const firstName = document.getElementById('signup-first-name').value.trim();
        const lastName = document.getElementById('signup-last-name').value.trim();
        const phoneNumber = document.getElementById('signup-phone').value.trim();
        const dateOfBirth = document.getElementById('signup-dob').value || null;
        const gender = document.getElementById('signup-gender').value || null;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        console.log('[AUTH] Signup form data:', {
            email: email ? email.substring(0, 3) + '***' : 'empty',
            firstName: firstName || 'empty',
            lastName: lastName || 'empty',
            hasPassword: !!password,
            hasDateOfBirth: !!dateOfBirth,
            gender: gender || 'empty'
        });

        // Validate required fields - collect ALL errors
        const errors = [];
        
        if (!firstName) {
            errors.push('Please enter your first name');
        }
        if (!lastName) {
            errors.push('Please enter your last name');
        }
        if (!email) {
            errors.push('Please enter your email address');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Please enter a valid email address');
        }
        if (!password) {
            errors.push('Please enter a password');
        } else if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (password !== confirmPassword) {
            errors.push('Passwords do not match. Please re-enter your password.');
        }
        if (!dateOfBirth) {
            errors.push('Please select your date of birth');
        }
        if (!gender) {
            errors.push('Please select your gender');
        }
        
        // Show all errors at once if any
        if (errors.length > 0) {
            const errorMessage = errors.length === 1 ? errors[0] : 'Please fix the following errors:<br>' + errors.map(err => '• ' + err).join('<br>');
            showAuthError('signup-modal', errorMessage);
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            // Build request body - only include non-empty optional fields
            const requestBody = {
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth,
                gender: gender
            };
            
            // Only include phone_number if it's not empty
            if (phoneNumber && phoneNumber.trim() !== '') {
                requestBody.phone_number = phoneNumber.trim();
            }
            
            const response = await fetch('backend/api/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            // Read response once (can only be read once)
            let responseText;
            let data;
            try {
                responseText = await response.text();
                if (!responseText || responseText.trim() === '') {
                    throw new Error('Empty response from server');
                }
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('[AUTH] Failed to parse signup response:', parseError);
                console.error('[AUTH] Response status:', response.status);
                console.error('[AUTH] Response text:', responseText);
                showAuthError('signup-modal', 'Invalid response from server. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            console.log('[AUTH] Signup response:', data);

            // Check if response indicates an error
            if (!response.ok || !data.success) {
                let errorMessage = data.message || data.error || 'Registration failed. Please try again.';
                
                // Provide user-friendly messages for common errors
                if (data.message && (data.message.includes('Duplicate entry') || data.message.includes('already exists') || data.message.includes('Email already registered'))) {
                    errorMessage = 'An account with this email already exists. Please sign in instead.';
                } else if (data.message && data.message.includes('email')) {
                    errorMessage = 'Please enter a valid email address.';
                }
                
                console.error('[AUTH] Signup failed:', data);
                showAuthError('signup-modal', errorMessage);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            if (data.success && data.token && data.user) {
                // Save token
                authToken = data.token;
                localStorage.setItem('auth_token', authToken);

                // Save user
                currentUser = data.user;
                updateAuthUI(currentUser);
                
                // Trigger event for header to update host button
                document.dispatchEvent(new Event('authStateChanged'));

                // Check if we're on signup page or in modal
                const isOnSignupPage = window.location.pathname.includes('signup.html');
                
                if (isOnSignupPage) {
                    // Redirect after successful signup
                    window.location.href = 'index.html';
                } else {
                    // In modal - close it
                    closeModal('signup-modal');
                    showNotification('Signup successful! Welcome to Lebanon Locals, ' + currentUser.first_name + '!', 'success');
                    e.target.reset();
                    clearAuthError('signup-modal');
                }
                
                // Clear wishlist cache and reload for new user
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
                // Registration failed - show specific error message
                let errorMsg = data.message || data.error || 'Registration failed. Please check your information and try again.';
                
                console.error('[AUTH] Signup failed:', data);
                
                // Provide user-friendly messages
                if (data.message && (data.message.includes('Duplicate entry') || data.message.includes('already exists'))) {
                    errorMsg = 'An account with this email already exists. Please sign in instead.';
                } else if (data.message && data.message.includes('email')) {
                    errorMsg = 'Please enter a valid email address.';
                } else if (data.error) {
                    // Show the actual error for debugging - but make it user-friendly
                    if (data.message) {
                        errorMsg = data.message;
                    } else {
                        errorMsg = data.error;
                    }
                }
                
                // Always show error in console for debugging
                console.error('[AUTH] Registration failed. Full error data:', data);
                
                showAuthError('signup-modal', errorMsg);
            }
        } catch (error) {
            console.error('[AUTH] Signup error:', error);
            // Network error or other exception
            let errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message) {
                errorMessage = 'An error occurred: ' + error.message;
            }
            
            showAuthError('signup-modal', errorMessage);
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
        
        // Trigger event for header to update host button
        document.dispatchEvent(new Event('authStateChanged'));
        
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
                ? `<img src="${profilePic}" alt="${user.first_name}" class="user-avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
                : `<div class="user-avatar-placeholder" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; background: linear-gradient(135deg, #FF385C 0%, #E8344E 100%); color: white;">${initials}</div>`;
            authButton.setAttribute('title', `${user.first_name} ${user.last_name}`);
        } else {
            // User is not logged in
            authButton.innerHTML = '<i class="fa fa-user"></i> Sign In';
            authButton.removeAttribute('title');
        }
    }

    /**
     * Categorize bookings by status
     */
    function categorizeBookings(allBookings) {
        const upcoming = [];
        const previous = [];
        const cancelled = [];
        const pending = [];

        allBookings.forEach(booking => {
            const bookingStatus = booking.booking_status || booking.status;
            const endDate = new Date(booking.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (bookingStatus === 'cancelled') {
                cancelled.push(booking);
            } else if (bookingStatus === 'pending') {
                pending.push(booking);
            } else if (endDate >= today && bookingStatus === 'confirmed') {
                upcoming.push(booking);
            } else {
                previous.push(booking);
            }
        });

        return { upcoming, previous, cancelled, pending };
    }

    /**
     * Load user menu data (bookings and wishlist)
     */
    async function loadUserMenuData() {
        if (!authToken) {
            console.log('[AUTH] No auth token, skipping user menu data load');
            return;
        }

        // Load bookings (non-blocking)
        fetch('backend/api/user-bookings.php', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Bookings API returned ${response.status}`);
            }
            return response.json();
        }).then(bookingsData => {
            if (bookingsData && bookingsData.success) {
                // Categorize bookings by status
                const categorizedBookings = categorizeBookings(bookingsData.bookings.all || []);
                renderBookings(categorizedBookings);
                
                // Calculate counts
                const counts = {
                    upcoming: categorizedBookings.upcoming.length,
                    previous: categorizedBookings.previous.length,
                    cancelled: categorizedBookings.cancelled.length,
                    pending: categorizedBookings.pending.length
                };
                updateBookingCounts(counts);
            }
        }).catch(error => {
            console.log('[AUTH] Error loading bookings:', error.message);
            // Continue even if bookings fail
        });

        // Load wishlist (non-blocking, handle 401 gracefully)
        fetch('backend/api/user-wishlist.php', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(response => {
            if (response.status === 401) {
                // 401 is expected - endpoint might not exist or requires different auth
                console.log('[AUTH] Wishlist API requires authentication (using localStorage instead)');
                return null;
            }
            if (!response.ok) {
                throw new Error(`Wishlist API returned ${response.status}`);
            }
            return response.json();
        }).then(wishlistData => {
            if (wishlistData && wishlistData.success) {
                renderWishlist(wishlistData.wishlist);
                updateWishlistCount(wishlistData.count);
            }
        }).catch(error => {
            // Silently fail - wishlist.js handles localStorage wishlist
            console.log('[AUTH] Wishlist not available (using localStorage instead)');
        });

        // Update user info in modal (always works)
        try {
            updateUserMenuProfile();
        } catch (error) {
            console.error('[AUTH] Error updating user menu profile:', error);
        }
    }

    /**
     * Render bookings in the user menu
     */
    async function renderBookings(bookings) {
        const upcomingContainer = document.getElementById('upcoming-bookings-list');
        const previousContainer = document.getElementById('previous-bookings-list');
        const cancelledContainer = document.getElementById('cancelled-bookings-list');
        const pendingContainer = document.getElementById('pending-bookings-list');

        if (upcomingContainer && bookings.upcoming) {
            if (bookings.upcoming.length > 0) {
                const cards = await Promise.all(
                    bookings.upcoming.map(booking => createBookingCard(booking, false))
                );
                upcomingContainer.innerHTML = cards.join('');
            } else {
                upcomingContainer.innerHTML = '<p class="empty-state">No upcoming bookings</p>';
            }
        }

        if (previousContainer && bookings.previous) {
            if (bookings.previous.length > 0) {
                // Create cards for previous bookings with review button
                const cards = await Promise.all(
                    bookings.previous.map(booking => createBookingCard(booking, true))
                );
                previousContainer.innerHTML = cards.join('');
            } else {
                previousContainer.innerHTML = '<p class="empty-state">No previous bookings</p>';
            }
        }

        if (cancelledContainer && bookings.cancelled) {
            if (bookings.cancelled.length > 0) {
                const cards = await Promise.all(
                    bookings.cancelled.map(booking => createBookingCard(booking, false))
                );
                cancelledContainer.innerHTML = cards.join('');
            } else {
                cancelledContainer.innerHTML = '<p class="empty-state">No cancelled bookings</p>';
            }
        }

        if (pendingContainer && bookings.pending) {
            if (bookings.pending.length > 0) {
                const cards = await Promise.all(
                    bookings.pending.map(booking => createBookingCard(booking, false))
                );
                pendingContainer.innerHTML = cards.join('');
            } else {
                pendingContainer.innerHTML = '<p class="empty-state">No pending bookings</p>';
            }
        }
    }

    /**
     * Create booking card HTML
     */
    async function createBookingCard(booking, isPrevious = false) {
        const image = booking.listing_image || '/images/placeholder.jpg';
        const title = booking.listing_title || 'Booking';
        const dates = `${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`;
        const status = booking.booking_status || booking.status;
        
        const listingType = booking.listing_type || 'experience';
        const typeName = listingType === 'experience' ? 'Experience' : 
                        listingType === 'event' ? 'Event' : 'Stay';

        // Check if already reviewed (only for previous bookings)
        let reviewButton = '';
        if (isPrevious) {
            const hasReviewed = await checkIfBookingReviewed(booking.id);
            console.log(`[AUTH] Booking ${booking.id} - Already reviewed:`, hasReviewed);
            
            if (hasReviewed) {
                reviewButton = `<div class="review-status-badge"><i class="fa fa-check-circle"></i> Reviewed</div>`;
            } else {
                reviewButton = `<a href="review.html?booking_id=${booking.id}" class="btn-review-booking" style="text-decoration: none;">
                    <i class="fa fa-star"></i> Review
                </a>`;
            }
        }

        return `
            <div class="booking-card" data-booking-id="${booking.id}">
                <img src="${image}" alt="${escapeHtml(title)}" class="booking-image">
                <div class="booking-details">
                    <h4>${escapeHtml(title)}</h4>
                    <p class="booking-dates">${dates}</p>
                    <p class="booking-guests">${booking.number_of_guests || booking.guests || 1} guest${(booking.number_of_guests || booking.guests || 1) > 1 ? 's' : ''}</p>
                    <span class="booking-status status-${status}">${status}</span>
                    ${reviewButton}
                </div>
            </div>
        `;
    }

    /**
     * Check if a booking has been reviewed
     */
    async function checkIfBookingReviewed(bookingId) {
        // Get token from Auth module or localStorage
        const token = authToken || localStorage.getItem('token');
        if (!token) {
            console.log(`[AUTH] No token available yet for booking ${bookingId}, assuming not reviewed`);
            return false;
        }

        try {
            const response = await fetch(`/backend/api/check-review.php?booking_id=${bookingId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            console.log(`[AUTH] Check review result for booking ${bookingId}:`, data);
            return data.success && data.has_review;
        } catch (error) {
            console.error(`[AUTH] Error checking review for booking ${bookingId}:`, error);
            return false;
        }
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
        const cancelledCount = document.getElementById('cancelled-count');
        const pendingCount = document.getElementById('pending-count');

        if (upcomingCount) upcomingCount.textContent = counts.upcoming || 0;
        if (previousCount) previousCount.textContent = counts.previous || 0;
        if (cancelledCount) cancelledCount.textContent = counts.cancelled || 0;
        if (pendingCount) pendingCount.textContent = counts.pending || 0;
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

    //==================== REVIEW MODAL HANDLING ====================
    
    let currentBookingId = null;
    let currentStarRating = 0;

    /**
     * Open review modal
     */
    window.openReviewModal = function(bookingId, listingTitle, listingType) {
        // Check if modal elements exist
        const modalTitle = document.getElementById('review-modal-title');
        const modalSubtitle = document.getElementById('review-modal-subtitle');
        const bookingIdInput = document.getElementById('review-booking-id');
        const reviewTextArea = document.getElementById('review-text');
        
        if (!modalTitle || !modalSubtitle || !bookingIdInput || !reviewTextArea) {
            console.error('[REVIEW] Review modal elements not found. Modal may not be loaded yet.');
            showNotification('Unable to open review form. Please refresh the page.', 'error');
            return;
        }

        currentBookingId = bookingId;
        currentStarRating = 0;

        const typeName = listingType === 'experience' ? 'Experience' : 
                       listingType === 'event' ? 'Event' : 'Stay';

        modalTitle.textContent = `Rate Your ${typeName}`;
        modalSubtitle.textContent = listingTitle;
        bookingIdInput.value = bookingId;
        reviewTextArea.value = '';

        // Reset star rating
        document.querySelectorAll('#star-rating-input .star-btn').forEach(btn => {
            btn.style.color = '#ddd';
        });

        openModal('review-modal');
    };

    /**
     * Close review modal
     */
    window.closeReviewModal = function() {
        closeModal('review-modal');
        currentBookingId = null;
        currentStarRating = 0;
    };

    /**
     * Initialize review modal handlers
     */
    function initReviewModalHandlers() {
        // Star rating interaction
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('star-btn') && e.target.closest('#star-rating-input')) {
                const rating = parseInt(e.target.dataset.rating);
                currentStarRating = rating;

                // Update star display
                const stars = document.querySelectorAll('#star-rating-input .star-btn');
                stars.forEach((btn, index) => {
                    btn.style.color = index < rating ? '#FFD700' : '#ddd';
                    btn.style.transform = index < rating ? 'scale(1.1)' : 'scale(1)';
                });
            }
        });

        // Handle review form submission
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                if (currentStarRating === 0) {
                    showNotification('Please select a star rating', 'error');
                    return;
                }

                const token = localStorage.getItem('token');
                if (!token) {
                    showNotification('Authentication error. Please log in again.', 'error');
                    return;
                }

                const reviewText = document.getElementById('review-text').value.trim();
                if (!reviewText) {
                    showNotification('Please write a review', 'error');
                    return;
                }

                const reviewData = {
                    booking_id: currentBookingId,
                    stars: currentStarRating,
                    review_text: reviewText
                };

                try {
                    const response = await fetch('/backend/api/submit-review.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(reviewData)
                    });

                    const data = await response.json();

                    if (data.success) {
                        window.closeReviewModal();
                        showNotification('Thank you for your review!', 'success');
                        // Reload bookings to update UI
                        setTimeout(() => loadUserMenuData(), 1000);
                    } else {
                        showNotification('Error: ' + (data.message || 'Unknown error'), 'error');
                    }
                } catch (error) {
                    console.error('[REVIEW SUBMIT] Error:', error);
                    showNotification('Error submitting review. Please try again.', 'error');
                }
            });
        }
    }

    /**
     * Initialize header after it's loaded dynamically
     * This ensures the auth button is set up and displays correctly
     */
    function initHeader() {
        // Setup auth button
        setupAuthButton();
        
        // If user is already logged in, update the button immediately
        if (authToken && currentUser) {
            updateAuthUI(currentUser);
        } else if (authToken && !currentUser) {
            // Token exists but user data not loaded yet, load it
            loadCurrentUser();
        } else {
            // No token, ensure button shows Sign In
            updateAuthUI(null);
        }
        
        // Setup modal listeners in case modals haven't been loaded yet
        setupModalListeners();
    }
    
    /**
     * Continuously check and update auth button
     * This ensures the button is always up-to-date even if header loads after auth.js
     */
    function ensureAuthButtonUpdated() {
        const authButton = document.getElementById('auth-button');
        if (authButton) {
            // Setup click handler if not already attached
            setupAuthButton();
            
            // Update UI state
            if (authToken && currentUser) {
                updateAuthUI(currentUser);
            } else if (authToken && !currentUser) {
                // Token exists but user not loaded, load it
                loadCurrentUser();
            } else {
                updateAuthUI(null);
            }
            return true; // Button found and updated
        }
        return false; // Button not found yet
    }
    
    // Continuously check for auth button on pages with dynamic headers
    // This ensures the button is always updated even if header loads after auth.js
    let authButtonCheckInterval = null;
    
    function startAuthButtonChecker() {
        // Clear any existing interval
        if (authButtonCheckInterval) {
            clearInterval(authButtonCheckInterval);
        }
        
        // Check immediately
        ensureAuthButtonUpdated();
        
        // Check every 500ms for the first 5 seconds after page load
        let checkCount = 0;
        authButtonCheckInterval = setInterval(() => {
            checkCount++;
            if (ensureAuthButtonUpdated() || checkCount >= 10) {
                // Button found and updated, or 5 seconds passed, stop checking
                clearInterval(authButtonCheckInterval);
                authButtonCheckInterval = null;
            }
        }, 500);
    }
    
    // Start checking for auth button
    startAuthButtonChecker();
    
    // Also listen for header loaded events
    document.addEventListener('headerLoaded', function() {
        ensureAuthButtonUpdated();
    });
    
    // Listen for auth state changes and update button
    document.addEventListener('authStateChanged', function() {
        ensureAuthButtonUpdated();
    });
    
    // Export public API
    window.Auth = {
        getCurrentUser,
        getAuthToken,
        isAuthenticated,
        logout,
        openModal,  // Allow other modules to open login/signup modals
        setupAuthButton,  // Allow re-initialization after dynamic header load
        setupFormListeners,  // Allow explicit form listener setup
        handleLogin,  // For explicit calls if needed
        handleSignup,  // For explicit calls if needed
        initHeader,  // Initialize header with auth state
        updateAuthUI,  // Allow manual UI updates
        ensureAuthButtonUpdated,  // Ensure button is updated (called automatically)
        startAuthButtonChecker  // Start continuous checking (called automatically)
    };

    // Password visibility toggle handler - must run before modal close handler
    document.addEventListener('click', function(e) {
        // Check if click is on the toggle button or its icon
        const toggleBtn = e.target.closest('.toggle-password-btn') || 
                          (e.target.classList.contains('fa-eye') || e.target.classList.contains('fa-eye-slash')) ? 
                          e.target.closest('button') : null;
        
        if (toggleBtn && toggleBtn.classList.contains('toggle-password-btn')) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling up to modal close handler
            e.stopImmediatePropagation(); // Stop all handlers on this element
            
            const targetId = toggleBtn.dataset.target;
            const passwordInput = document.getElementById(targetId);
            const icon = toggleBtn.querySelector('i') || toggleBtn;
            
            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    if (icon && icon.classList) {
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    }
                } else {
                    passwordInput.type = 'password';
                    if (icon && icon.classList) {
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    }
                }
            }
            return false; // Prevent any further event handling
        }
    }, true); // Use capture phase to run before other handlers

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            initReviewModalHandlers();
        });
    } else {
        init();
        initReviewModalHandlers();
    }

})();
