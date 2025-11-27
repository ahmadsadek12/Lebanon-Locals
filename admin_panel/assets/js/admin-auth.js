/**
 * Admin Authentication Module
 */

(function() {
    'use strict';

    /**
     * Check if user is authenticated admin
     */
    function isAdminAuthenticated() {
        const token = localStorage.getItem('admin_token');
        const user = getAdminUser();
        return !!(token && user && user.user_type === 'admin');
    }

    /**
     * Get current admin user
     */
    function getAdminUser() {
        const userJson = localStorage.getItem('admin_user');
        return userJson ? JSON.parse(userJson) : null;
    }

    /**
     * Get admin auth token
     */
    function getAdminToken() {
        return localStorage.getItem('admin_token');
    }

    /**
     * Logout admin
     */
    function logoutAdmin() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = 'index.html';
    }

    /**
     * Require admin authentication (redirect if not admin)
     */
    function requireAdmin() {
        if (!isAdminAuthenticated()) {
            console.log('[ADMIN AUTH] Not authenticated, redirecting to login');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    /**
     * Make authenticated API request
     */
    async function apiRequest(endpoint, methodOrOptions, body) {
        const token = getAdminToken();

        // Admin runs on 8082, APIs are on 8080
        // Convert ../public/ paths to http://127.0.0.1:8080/
        let apiUrl = endpoint;

        if (endpoint.startsWith('../public/')) {
            apiUrl = endpoint.replace('../public/', 'http://127.0.0.1:8080/');
        }

        let requestOptions = {};

        if (typeof methodOrOptions === 'string') {
            requestOptions.method = methodOrOptions;
            if (body !== undefined) {
                requestOptions.body = body;
            }
        } else if (typeof methodOrOptions === 'object' && methodOrOptions !== null) {
            requestOptions = { ...methodOrOptions };
        } else if (methodOrOptions !== undefined) {
            console.warn('[ADMIN API] Unexpected options type, defaulting to GET.');
        }

        if (!requestOptions.method) {
            requestOptions.method = requestOptions.body ? 'POST' : 'GET';
        }

        const isFormData = requestOptions.body instanceof FormData;

        const defaultHeaders = {
            'Authorization': `Bearer ${token}`
        };

        if (!isFormData) {
            defaultHeaders['Content-Type'] = 'application/json';
            if (requestOptions.body && typeof requestOptions.body !== 'string') {
                requestOptions.body = JSON.stringify(requestOptions.body);
            }
        }

        requestOptions.headers = {
            ...defaultHeaders,
            ...(requestOptions.headers || {})
        };

        try {
            const response = await fetch(apiUrl, requestOptions);

            if (!response.ok) {
                // Try to get error details from response
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                    console.error('[ADMIN API] Server error details:', errorData);
                } catch (e) {
                    // Couldn't parse JSON error
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (!data.success && data.error) {
                throw new Error(data.error);
            }

            return data;
        } catch (error) {
            console.error('[ADMIN API] Request error:', error);
            console.error('[ADMIN API] URL:', apiUrl);
            if (error.message.includes('Failed to fetch')) {
                alert('Unable to connect to server at port 8080. Make sure the public server is running.');
            } else if (error.message.includes('Unexpected token')) {
                alert('Server error. Check that PHP is running correctly on port 8080.');
            }
            throw error;
        }
    }

    // Export to global scope
    window.AdminAuth = {
        isAdminAuthenticated,
        getAdminUser,
        getAdminToken,
        logoutAdmin,
        requireAdmin,
        apiRequest
    };

})();

