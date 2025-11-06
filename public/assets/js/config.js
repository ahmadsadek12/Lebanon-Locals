/**
 * Lebanon Locals - Configuration
 * Global configuration and constants
 * @version 1.0.0
 */

const LebanonLocalsConfig = {
    // API Configuration
    api: {
        baseUrl: '/api', // Will be updated when backend is ready
        timeout: 10000,
        version: 'v1'
    },

    // Feature Flags
    features: {
        search: false, // Enable when backend ready
        auth: false, // Enable when authentication is implemented
        chat: false, // Enable when chat feature is ready
        booking: false, // Enable when booking system is ready
        payments: false // Enable when payment integration is done
    },

    // UI Configuration
    ui: {
        animationSpeed: 300,
        scrollOffset: 80,
        mobileBreakpoint: 768,
        tabletBreakpoint: 1024,
        desktopBreakpoint: 1200
    },

    // Map Configuration (for future use)
    maps: {
        defaultCenter: { lat: 33.8886, lng: 35.4955 }, // Beirut
        defaultZoom: 10
    },

    // Date Configuration
    date: {
        format: 'YYYY-MM-DD',
        displayFormat: 'MMM DD, YYYY',
        minBookingDays: 1,
        maxBookingMonths: 12
    },

    // Pricing
    pricing: {
        currency: 'USD',
        currencySymbol: '$',
        decimalPlaces: 2
    },

    // Contact Information
    contact: {
        phone: '+961 81 434 070',
        email: 'info@lebanonlocals.com',
        instagram: 'https://instagram.com/lebanonlocals',
        tiktok: 'https://tiktok.com/@lebanonlocals'
    },

    // Messages
    messages: {
        comingSoon: 'This feature is coming soon!',
        searchDisabled: 'Search feature coming soon! Full functionality available when backend is integrated.',
        authRequired: 'Please sign in to continue',
        bookingDisabled: 'Booking system coming soon!',
        chatDisabled: 'Live chat coming soon! For now, call us at +961 81 434 070 or visit our help page.'
    }
};

// Freeze config to prevent modifications
Object.freeze(LebanonLocalsConfig);

