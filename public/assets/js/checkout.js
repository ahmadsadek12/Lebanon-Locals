/**
 * Lebanon Locals - Checkout Page Logic
 * @version 1.0.0
 */

(function() {
    'use strict';

    // State
    let listingData = null;
    let bookingData = null;
    let whishOTPSent = false;
    let stripe = null;
    let stripeClientSecret = null;
    let isGuestCheckout = false;

    // DOM Elements
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const checkoutContent = document.getElementById('checkout-content');
    const errorMessage = document.getElementById('error-message');

    // Stripe Elements (initialized conditionally)
    let elements = null;
    let cardNumberElement = null;
    let cardExpiryElement = null;
    let cardCvcElement = null;

    /**
     * Initialize the page
     */
    async function init() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type'); // experience, event, stay
        const id = urlParams.get('id');
        const guests = urlParams.get('guests');
        const startDate = urlParams.get('start_date');
        const endDate = urlParams.get('end_date');

        // Validate parameters
        if (!type || !id) {
            showError('Missing booking information. Please return to the listing page.');
            return;
        }

        // Store booking data
        bookingData = {
            type,
            id,
            guests: guests || 1,
            start_date: startDate,
            end_date: endDate
        };

        // Check authentication and show guest checkout option if not logged in
        checkAuthAndSetupGuestCheckout();

        // Check which payment methods are enabled
        await checkPaymentMethods();

        // Load listing data
        loadListing();

        // Setup event listeners
        setupEventListeners();

        // Auto-fill contact information from profile
        autoFillContactInfo();

        // Set default payment method based on availability
        // Prefer whish (if enabled), then cash, then card (to avoid loading Stripe on page load)
        let defaultPaymentMethod = document.querySelector('input[name="payment-method"][value="whish"]:not([style*="display: none"])');
        if (!defaultPaymentMethod) {
            defaultPaymentMethod = document.querySelector('input[name="payment-method"][value="cash"]');
        }
        if (!defaultPaymentMethod) {
            defaultPaymentMethod = document.querySelector('input[name="payment-method"][value="card"]');
        }
        if (defaultPaymentMethod) {
            defaultPaymentMethod.checked = true;
            handlePaymentMethodChange({ target: defaultPaymentMethod });
        }
    }

    /**
     * Check which payment methods are available
     */
    async function checkPaymentMethods() {
        try {
            const response = await fetch('/backend/api/check-payment-methods.php');
            const data = await response.json();

            if (data.success && data.payment_methods) {
                // Hide Whish option if disabled
                if (!data.payment_methods.whish) {
                    const whishOption = document.getElementById('whish-option');
                    if (whishOption) {
                        whishOption.style.display = 'none';
                    }
                }

                // Hide card option if disabled (unlikely)
                if (!data.payment_methods.card) {
                    const cardOption = document.getElementById('card-option');
                    if (cardOption) {
                        cardOption.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            console.error('[CHECKOUT] Error checking payment methods:', error);
            // Continue anyway - all payment methods will be shown
        }
    }

    /**
     * Load listing from API
     */
    async function loadListing() {
        try {
            const { type, id } = bookingData;

            // Use detail page endpoints instead of list endpoints
            let apiUrl = '';
            if (type === 'experience') {
                apiUrl = `/backend/api/experience-detail.php?id=${id}`;
            } else if (type === 'event') {
                apiUrl = `/backend/api/event-detail.php?id=${id}`;
            } else if (type === 'stay') {
                apiUrl = `/backend/api/stay-detail.php?id=${id}`;
            }

            console.log('Loading listing:', { type, id, apiUrl });
            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Response Error:', response.status, errorText);
                throw new Error(`Failed to load listing: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (!data.success || !data.data) {
                throw new Error('Listing not found in response');
            }

            // Detail endpoints return single object in data, not array
            listingData = data.data;

            // Render the page
            renderPage();

            // Hide loading, show content
            loadingState.style.display = 'none';
            checkoutContent.style.display = 'block';
            
            // Update progress indicator to step 1
            updateProgressIndicator(1);

        } catch (error) {
            console.error('Error loading listing:', error);
            showError('Unable to load listing. Please try again later.');
        }
    }

    /**
     * Render the entire page
     */
    function renderPage() {
        renderListingPreview();
        renderBookingDetails();
        renderPriceBreakdown();
        checkCashAvailability();
    }

    /**
     * Render listing preview
     */
    function renderListingPreview() {
        const preview = document.getElementById('listing-preview');
        const mainImage = listingData.main_image || 'images/placeholder.jpg';
        const price = parseFloat(listingData.price || listingData.price_per_night || listingData.price_per_person || 0);
        const isPricePerPerson = listingData.price_per_person === true || listingData.price_per_person === 1;
        
        // Build price display
        let priceDisplay = '';
        if (bookingData.type !== 'stay' && isPricePerPerson) {
            priceDisplay = `<div class="listing-preview-price">$${price.toFixed(2)} × ${bookingData.guests} guest${bookingData.guests > 1 ? 's' : ''}</div>`;
        }

        preview.innerHTML = `
            <img src="${mainImage}" alt="${listingData.title}" class="listing-preview-image">
            <div class="listing-preview-info">
                <div class="listing-preview-type">${bookingData.type}</div>
                <div class="listing-preview-title">${escapeHtml(listingData.title)}</div>
                <div class="listing-preview-location">
                    <i class="fa fa-map-marker"></i>
                    ${escapeHtml(listingData.location || 'Lebanon')}
                </div>
                ${priceDisplay}
            </div>
        `;
    }

    /**
     * Render booking details
     */
    function renderBookingDetails() {
        const detailsContainer = document.getElementById('booking-details');
        const detailsCard = document.querySelector('.booking-details-card');
        
        // Hide entire booking details section for stays
        if (bookingData.type === 'stay') {
            if (detailsCard) {
                detailsCard.style.display = 'none';
            }
            return;
        }
        
        // Show for experiences and events
        if (detailsCard) {
            detailsCard.style.display = 'block';
        }
        
        let detailsHTML = '';

        // Date for experiences/events
        if ((bookingData.type === 'experience' || bookingData.type === 'event') && bookingData.start_date) {
            const date = new Date(bookingData.start_date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });

            detailsHTML += `
                <div class="booking-detail-row">
                    <span class="booking-detail-label">Date</span>
                    <span class="booking-detail-value">${date}</span>
                </div>
            `;
        }

        // Guests with +/- controls for per-person pricing
        const isPricePerPerson = listingData.price_per_person === true || listingData.price_per_person === 1;
        const maxGuests = parseInt(listingData.max_guests) || 10;
        // Use available_capacity if available, otherwise calculate from total_bookings
        const availableCapacity = listingData.available_capacity !== undefined 
            ? parseInt(listingData.available_capacity) 
            : (maxGuests - (parseInt(listingData.total_bookings) || 0));
        const spotsLeft = availableCapacity;
        
        if (isPricePerPerson) {
            detailsHTML += `
                <div class="booking-detail-row">
                    <span class="booking-detail-label">Number of guests</span>
                    <div class="guest-counter">
                        <button type="button" id="decrease-guests" class="guest-btn" ${bookingData.guests <= 1 ? 'disabled' : ''}>−</button>
                        <span id="guest-count" class="guest-count">${bookingData.guests}</span>
                        <button type="button" id="increase-guests" class="guest-btn" ${bookingData.guests >= spotsLeft || spotsLeft <= 0 ? 'disabled' : ''}>+</button>
                    </div>
                </div>
            `;
        } else {
            detailsHTML += `
                <div class="booking-detail-row">
                    <span class="booking-detail-label">Guests</span>
                    <span class="booking-detail-value">${bookingData.guests}</span>
                </div>
            `;
        }

        detailsContainer.innerHTML = detailsHTML;
        
        // Attach event listeners for +/- buttons
        if (isPricePerPerson) {
            const decreaseBtn = document.getElementById('decrease-guests');
            const increaseBtn = document.getElementById('increase-guests');
            const guestCountSpan = document.getElementById('guest-count');
            
            if (decreaseBtn) {
                decreaseBtn.addEventListener('click', function() {
                    if (bookingData.guests > 1) {
                        bookingData.guests--;
                        guestCountSpan.textContent = bookingData.guests;
                        renderListingPreview();
                        renderPriceBreakdown();
                        
                        // Update button states
                        decreaseBtn.disabled = bookingData.guests <= 1;
                        increaseBtn.disabled = bookingData.guests >= spotsLeft;
                    }
                });
            }
            
            if (increaseBtn) {
                increaseBtn.addEventListener('click', function() {
                    if (bookingData.guests < spotsLeft) {
                        bookingData.guests++;
                        guestCountSpan.textContent = bookingData.guests;
                        renderListingPreview();
                        renderPriceBreakdown();
                        
                        // Update button states
                        decreaseBtn.disabled = bookingData.guests <= 1;
                        increaseBtn.disabled = bookingData.guests >= spotsLeft;
                    }
                });
            }
        }
    }

    /**
     * Render price breakdown
     */
    function renderPriceBreakdown() {
        const price = parseFloat(listingData.price || listingData.price_per_night || listingData.price_per_person || 0);
        const guests = parseInt(bookingData.guests);
        let nights = 1;

        // Calculate nights for stays
        if (bookingData.type === 'stay' && bookingData.start_date && bookingData.end_date) {
            const start = new Date(bookingData.start_date);
            const end = new Date(bookingData.end_date);
            nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        }

        // Calculate base price
        let basePrice = 0;
        let priceLabel = '';

        if (bookingData.type === 'stay') {
            basePrice = price * nights;
            priceLabel = `$${price.toFixed(2)} × ${nights} night${nights > 1 ? 's' : ''}`;
        } else {
            basePrice = price * guests;
            priceLabel = `$${price.toFixed(2)}`;
        }

        // Service fee (from database)
        const serviceFeePercentage = parseFloat(listingData.service_fee_percentage || 10.00);
        const serviceFee = basePrice * (serviceFeePercentage / 100);

        // Cleaning fee (stays only)
        let cleaningFee = 0;
        const cleaningFeeRow = document.getElementById('cleaning-fee-row');
        if (bookingData.type === 'stay') {
            cleaningFee = parseFloat(listingData.cleaning_fee || 0);
            if (cleaningFee > 0) {
                cleaningFeeRow.style.display = 'flex';
                document.getElementById('cleaning-fee').textContent = `$${cleaningFee.toFixed(2)}`;
            } else {
                cleaningFeeRow.style.display = 'none';
            }
        } else {
            cleaningFeeRow.style.display = 'none';
        }

        // Calculate total
        const total = basePrice + serviceFee + cleaningFee;

        // Update UI
        document.getElementById('price-label').textContent = priceLabel;
        document.getElementById('price-value').textContent = `$${basePrice.toFixed(2)}`;
        document.getElementById('service-fee').textContent = `$${serviceFee.toFixed(2)}`;
        document.getElementById('total-price').textContent = `$${total.toFixed(2)}`;
    }

    /**
     * Check if cash payment is available
     */
    function checkCashAvailability() {
        const cashOption = document.getElementById('cash-option');
        if (listingData.cash_enabled) {
            cashOption.style.display = 'block';
        } else {
            cashOption.style.display = 'none';
        }
    }

    /**
     * Check authentication and setup guest checkout
     */
    function checkAuthAndSetupGuestCheckout() {
        // Wait for Auth to be ready
        function checkAuth() {
            if (!window.Auth || typeof window.Auth.isAuthenticated !== 'function') {
                setTimeout(checkAuth, 100);
                return;
            }

            const isAuthenticated = window.Auth.isAuthenticated();
            const currentUser = isAuthenticated ? window.Auth.getCurrentUser() : null;
            const guestCheckoutSection = document.getElementById('guest-checkout-section');
            const continueAsGuestBtn = document.getElementById('continue-as-guest-btn');

            console.log('[CHECKOUT] Auth check:', { isAuthenticated, currentUser, hasSection: !!guestCheckoutSection });

            if (!isAuthenticated && !currentUser && guestCheckoutSection) {
                guestCheckoutSection.style.display = 'block';
            } else {
                // User is logged in, hide guest checkout
                if (guestCheckoutSection) {
                    guestCheckoutSection.style.display = 'none';
                }
            }

            if (continueAsGuestBtn) {
                continueAsGuestBtn.addEventListener('click', function() {
                    isGuestCheckout = true;
                    if (guestCheckoutSection) {
                        guestCheckoutSection.style.display = 'none';
                    }
                    // Enable form fields
                    document.getElementById('contact-email').disabled = false;
                    document.getElementById('contact-phone').disabled = false;
                });
            }
        }

        checkAuth();
    }

    /**
     * Auto-fill contact information from logged-in user profile
     */
    function autoFillContactInfo() {
        const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
        if (currentUser) {
            const emailInput = document.getElementById('contact-email');
            const phoneInput = document.getElementById('contact-phone');
            
            if (emailInput && currentUser.email) {
                emailInput.value = currentUser.email;
            }
            
            if (phoneInput && currentUser.phone_number) {
                phoneInput.value = currentUser.phone_number;
            }
        }
    }

    /**
     * Initialize Stripe Elements (only when card payment is selected)
     */
    function initializeStripeElements() {
        if (stripe && elements && cardNumberElement && cardExpiryElement && cardCvcElement) {
            // Already initialized
            return;
        }
        
        if (typeof Stripe === 'undefined' || typeof STRIPE_PUBLISHABLE_KEY === 'undefined') {
            console.warn('[CHECKOUT] Stripe not loaded yet');
            return;
        }
        
        stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        elements = stripe.elements();
        
        const elementStyle = {
            base: {
                fontSize: '16px',
                color: '#222',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#dc3545'
            }
        };
        
        // Create individual card elements
        cardNumberElement = elements.create('cardNumber', { style: elementStyle });
        cardExpiryElement = elements.create('cardExpiry', { style: elementStyle });
        cardCvcElement = elements.create('cardCvc', { style: elementStyle });
        
        // Mount elements
        setTimeout(() => {
            const cardNumberContainer = document.getElementById('card-number-element');
            const cardExpiryContainer = document.getElementById('card-expiry-element');
            const cardCvcContainer = document.getElementById('card-cvc-element');
            
            if (cardNumberContainer && !cardNumberElement._mounted) {
                cardNumberElement.mount('#card-number-element');
                cardExpiryElement.mount('#card-expiry-element');
                cardCvcElement.mount('#card-cvc-element');
                
                cardNumberElement._mounted = true;
                cardExpiryElement._mounted = true;
                cardCvcElement._mounted = true;
                
                // Handle card errors
                const displayError = document.getElementById('card-errors');
                cardNumberElement.on('change', (event) => {
                    if (event.error) displayError.textContent = event.error.message;
                    else displayError.textContent = '';
                });
                cardExpiryElement.on('change', (event) => {
                    if (event.error) displayError.textContent = event.error.message;
                });
                cardCvcElement.on('change', (event) => {
                    if (event.error) displayError.textContent = event.error.message;
                });
            }
        }, 100);
    }

    /**
     * Load Stripe script conditionally
     */
    function loadStripeScript(callback) {
        if (typeof Stripe !== 'undefined') {
            // Stripe already loaded
            if (callback) callback();
            return;
        }
        
        if (typeof ConditionalLoader !== 'undefined') {
            ConditionalLoader.loadScript('https://js.stripe.com/v3/', () => {
                if (callback) callback();
            });
        } else {
            // Fallback: create script tag manually
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                if (callback) callback();
            };
            document.head.appendChild(script);
        }
    }

    /**
     * Update progress indicator
     */
    function updateProgressIndicator(step) {
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach((stepEl, index) => {
            if (index + 1 <= step) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.remove('active');
            }
        });
    }

    // Flag to prevent duplicate event listener attachment
    let listenersAttached = false;

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        if (listenersAttached) {
            console.warn('[CHECKOUT] ⚠️ Event listeners already attached, skipping');
            return;
        }

        console.log('[CHECKOUT] Setting up event listeners...');
        listenersAttached = true;

        // Payment method switching
        document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
            radio.addEventListener('change', handlePaymentMethodChange);
        });

        // Card number formatting
        const cardNumber = document.getElementById('card-number');
        if (cardNumber) {
            cardNumber.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\s/g, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
            });
        }

        // Card expiry formatting
        const cardExpiry = document.getElementById('card-expiry');
        if (cardExpiry) {
            cardExpiry.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                }
                e.target.value = value;
            });
        }

        // WhiSH OTP
        const whishSendOtp = document.getElementById('whish-send-otp');
        if (whishSendOtp) {
            whishSendOtp.addEventListener('click', handleWhishSendOTP);
        }

        const whishResendOtp = document.getElementById('whish-resend-otp');
        if (whishResendOtp) {
            whishResendOtp.addEventListener('click', function(e) {
                e.preventDefault();
                handleWhishSendOTP();
            });
        }

        // Complete booking
        const completeBookingBtn = document.getElementById('complete-booking-btn');
        if (completeBookingBtn) {
            console.log('[CHECKOUT] Attaching click handler to Complete Booking button');
            completeBookingBtn.addEventListener('click', handleCompleteBooking);
        } else {
            console.error('[CHECKOUT] Complete Booking button not found!');
        }
    }

    /**
     * Handle payment method change
     */
    function handlePaymentMethodChange(e) {
        const selectedMethod = e.target.value;

        // Hide all payment forms
        document.querySelectorAll('.payment-form').forEach(form => {
            form.classList.remove('active');
        });

        // Show selected payment form
        const formMap = {
            'card': 'card-form',
            'whish': 'whish-form',
            'cash': 'cash-form'
        };

        const formId = formMap[selectedMethod];
        if (formId) {
            document.getElementById(formId).classList.add('active');
            
            // Load and initialize Stripe only when card payment is selected
            if (selectedMethod === 'card') {
                loadStripeScript(() => {
                    initializeStripeElements();
                });
            }
            
            // Update progress indicator
            updateProgressIndicator(2);
        }
    }

    /**
     * Handle WhiSH Send OTP
     */
    async function handleWhishSendOTP() {
        const phoneInput = document.getElementById('whish-phone');
        const phone = phoneInput.value.trim();

        if (!phone) {
            alert('Please enter your phone number');
            return;
        }

        try {
            // Disable button
            const btn = document.getElementById('whish-send-otp');
            btn.disabled = true;
            btn.textContent = 'Sending...';

            // Call backend to send OTP via WhiSH
            const response = await fetch('/backend/api/whish-send-otp.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone })
            });

            const data = await response.json();

            if (data.success) {
                // Show OTP input section
                document.getElementById('whish-otp-section').style.display = 'block';
                whishOTPSent = true;
                btn.textContent = 'OTP Sent';
                alert('OTP sent to your phone. Please check your WhiSH app.');
            } else {
                throw new Error(data.message || 'Failed to send OTP');
            }

        } catch (error) {
            console.error('Error sending WhiSH OTP:', error);
            alert('Failed to send OTP. Please try again.');

            // Re-enable button
            const btn = document.getElementById('whish-send-otp');
            btn.disabled = false;
            btn.textContent = 'Send OTP';
        }
    }

    // Flag to prevent duplicate submissions
    let isSubmitting = false;

    /**
     * Handle complete booking
     */
    async function handleCompleteBooking() {
        console.log('[CHECKOUT] ==> handleCompleteBooking called at', new Date().toISOString());
        console.log('[CHECKOUT] isSubmitting flag:', isSubmitting);

        // Prevent duplicate submissions
        if (isSubmitting) {
            console.warn('[CHECKOUT] ⚠️ DUPLICATE SUBMISSION BLOCKED - Already submitting!');
            return;
        }

        // Validate terms acceptance
        const termsCheckbox = document.getElementById('accept-terms');
        if (!termsCheckbox.checked) {
            alert('Please accept the terms and conditions');
            return;
        }

        // Get contact information
        const email = document.getElementById('contact-email').value.trim();
        const phone = document.getElementById('contact-phone').value.trim();

        if (!email || !phone) {
            alert('Please fill in your contact information');
            return;
        }

        // Get selected payment method
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

        // Validate payment method specific fields
        if (paymentMethod === 'card') {
            if (!validateCardPayment()) {
                return;
            }
        } else if (paymentMethod === 'whish') {
            if (!validateWhishPayment()) {
                return;
            }
        }

        try {
            // Set submitting flag
            isSubmitting = true;

            // Disable button
            const btn = document.getElementById('complete-booking-btn');
            btn.disabled = true;
            btn.textContent = 'Processing...';

            let paymentTransactionId = null;
            let paymentStatus = 'pending';

            // Process payment based on method
            if (paymentMethod === 'card') {
                // Process Stripe payment
                const totalPrice = calculateTotalPrice();

                // Create payment intent
                const intentResponse = await fetch('/backend/api/stripe-create-payment-intent.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: totalPrice, currency: 'usd' })
                });

                const intentData = await intentResponse.json();
                if (!intentData.success) {
                    throw new Error(intentData.message || 'Failed to initialize payment');
                }

                // Confirm payment with Stripe Elements
                const cardName = document.getElementById('card-name').value.trim();

                const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
                    payment_method: {
                        card: cardNumberElement,  // Use Stripe CardNumber Element
                        billing_details: {
                            name: cardName,
                            email: email
                        }
                    }
                });

                if (error) {
                    throw new Error(error.message);
                }

                paymentTransactionId = paymentIntent.id;
                paymentStatus = 'paid';

            } else if (paymentMethod === 'whish') {
                // For Whish, we need to redirect to their payment page
                // Get current user (or use guest checkout)
                const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
                const userId = (!isGuestCheckout && currentUser) ? currentUser.id : null;

                // Whish requires authentication (no guest checkout for Whish)
                if (!userId) {
                    alert('Please sign in to use Whish payment');
                    isSubmitting = false;
                    btn.disabled = false;
                    btn.textContent = 'Complete Booking';
                    return;
                }

                // Validate capacity for events and experiences before creating booking
                if ((bookingData.type === 'experience' || bookingData.type === 'event') && listingData) {
                    const availableCapacity = parseInt(listingData.available_capacity) || 0;
                    const requestedGuests = parseInt(bookingData.guests) || 1;

                    if (availableCapacity < requestedGuests) {
                        alert(`Sorry, there are only ${availableCapacity} spot${availableCapacity !== 1 ? 's' : ''} available. Maximum guests limit reached for this listing.`);
                        btn.disabled = false;
                        btn.textContent = 'Complete Booking';
                        isSubmitting = false;
                        return;
                    }
                }

                // First create a pending booking to get a booking ID
                const tempBookingPayload = {
                    user_id: userId,
                    listing_type: bookingData.type,
                    listing_id: bookingData.id,
                    guests: bookingData.guests,
                    start_date: bookingData.start_date,
                    end_date: bookingData.end_date,
                    email: email,
                    phone: phone,
                    payment_method: 'whish',
                    payment_transaction_id: null,
                    payment_status: 'pending'
                };

                const bookingResponse = await fetch('/backend/api/create-booking.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tempBookingPayload)
                });

                const bookingData_response = await bookingResponse.json();
                if (!bookingData_response.success) {
                    throw new Error(bookingData_response.message || 'Failed to create booking');
                }

                const tempBookingId = bookingData_response.booking_id;
                const totalPrice = calculateTotalPrice();

                // Create Whish payment and get redirect URL
                const whishResponse = await fetch('/backend/api/whish-create-payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: totalPrice,
                        booking_id: tempBookingId,
                        description: `Lebanon Locals - Booking #${tempBookingId}`
                    })
                });

                const whishData = await whishResponse.json();
                if (!whishData.success) {
                    throw new Error(whishData.message || 'Failed to initialize Whish payment');
                }

                // Redirect to Whish payment page
                window.location.href = whishData.redirect_url;
                return; // Exit function as we're redirecting
            }

            // Get current user (or use guest checkout)
            const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
            const userId = (!isGuestCheckout && currentUser) ? currentUser.id : null;

            // For non-guest checkout, require authentication
            if (!isGuestCheckout && !userId) {
                alert('Please sign in to complete your booking or continue as guest');
                return;
            }
            
            // Update progress indicator to step 3
            updateProgressIndicator(3);

            // Validate capacity for events and experiences before creating booking
            if ((bookingData.type === 'experience' || bookingData.type === 'event') && listingData) {
                const availableCapacity = parseInt(listingData.available_capacity) || 0;
                const requestedGuests = parseInt(bookingData.guests) || 1;
                
                if (availableCapacity < requestedGuests) {
                    alert(`Sorry, there are only ${availableCapacity} spot${availableCapacity !== 1 ? 's' : ''} available. Maximum guests limit reached for this listing.`);
                    btn.disabled = false;
                    btn.textContent = 'Complete Booking';
                    isSubmitting = false;
                    return;
                }
            }

            // Create booking (for non-Whish payments)
            const bookingPayload = {
                listing_type: bookingData.type,
                listing_id: bookingData.id,
                guests: bookingData.guests,
                start_date: bookingData.start_date,
                end_date: bookingData.end_date,
                email: email,
                phone: phone,
                payment_method: paymentMethod,
                payment_transaction_id: paymentTransactionId,
                payment_status: paymentStatus
            };
            
            // Only include user_id if not guest checkout
            if (userId) {
                bookingPayload.user_id = userId;
            }

            console.log('[CHECKOUT] 📤 Sending booking request to API...', {
                payload: bookingPayload,
                timestamp: new Date().toISOString()
            });

            const response = await fetch('/backend/api/create-booking.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingPayload)
            });

            const data = await response.json();
            console.log('[CHECKOUT] 📥 Received booking response:', data);

            if (data.duplicate_prevented) {
                console.warn('[CHECKOUT] ⚠️ Duplicate booking was prevented by API');
            }

            if (data.notifications_error) {
                console.warn('[CHECKOUT] notifications_error:', data.notifications_error);
            }

            if (data.success) {
                console.log('[CHECKOUT] ✅ Booking successful! Response:', data);
                window.location.href = `booking-confirmation.html?booking_id=${data.booking_id}`;
            } else {
                throw new Error(data.message || 'Failed to create booking');
            }

        } catch (error) {
            console.error('Error creating booking:', error);
            alert(`Payment failed: ${error.message}`);

            // Re-enable button
            const btn = document.getElementById('complete-booking-btn');
            btn.disabled = false;
            btn.textContent = 'Complete Booking';
            isSubmitting = false;
        }
    }

    /**
     * Calculate total price
     */
    function calculateTotalPrice() {
        const totalText = document.getElementById('total-price').textContent;
        return parseFloat(totalText.replace('$', ''));
    }

    /**
     * Validate card payment fields
     */
    function validateCardPayment() {
        const name = document.getElementById('card-name').value.trim();

        if (!name) {
            alert('Please enter cardholder name');
            return false;
        }

        // Card validation is handled by Stripe Elements
        return true;
    }

    /**
     * Validate WhiSH payment fields
     */
    function validateWhishPayment() {
        // No validation needed - user will complete payment on Whish's site
        return true;
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
     * Show error state
     */
    function showError(message) {
        errorMessage.textContent = message;
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
