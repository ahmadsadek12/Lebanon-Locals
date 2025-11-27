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

    // DOM Elements
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const checkoutContent = document.getElementById('checkout-content');
    const errorMessage = document.getElementById('error-message');

    // Initialize Stripe and Elements
    let elements = null;
    let cardNumberElement = null;
    let cardExpiryElement = null;
    let cardCvcElement = null;
    
    if (typeof Stripe !== 'undefined' && typeof STRIPE_PUBLISHABLE_KEY !== 'undefined') {
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
    }

    /**
     * Initialize the page
     */
    function init() {
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

        // Mount Stripe Card Elements (since card form is active by default)
        if (cardNumberElement && cardExpiryElement && cardCvcElement) {
            setTimeout(() => {
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
            }, 1000);
        }

        // Load listing data
        loadListing();

        // Setup event listeners
        setupEventListeners();
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
     * Setup event listeners
     */
    function setupEventListeners() {
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
            completeBookingBtn.addEventListener('click', handleCompleteBooking);
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
            
            // Mount Stripe Card Elements when card form is shown
            if (selectedMethod === 'card' && cardNumberElement && !cardNumberElement._mounted) {
                setTimeout(() => {
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
                }, 100);
            }
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

    /**
     * Handle complete booking
     */
    async function handleCompleteBooking() {
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
                // Get current user
                const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
                const userId = currentUser ? currentUser.id : null;

                if (!userId) {
                    alert('Please sign in to complete your booking');
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

            // Get current user
            const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
            const userId = currentUser ? currentUser.id : null;

            if (!userId) {
                alert('Please sign in to complete your booking');
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
                    return;
                }
            }

            // Create booking (for non-Whish payments)
            const bookingPayload = {
                user_id: userId,
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

            const response = await fetch('/backend/api/create-booking.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingPayload)
            });

            const data = await response.json();
            console.log('[CHECKOUT] create-booking response:', data);

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
