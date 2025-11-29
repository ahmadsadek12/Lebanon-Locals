<?php
/**
 * CORS Configuration Helper
 * Properly handles Cross-Origin Resource Sharing
 */

function setCorsHeaders() {
    // Allowed origins (add your production domains)
    $allowedOrigins = [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'https://www.lebanonlocals.com',
        'https://lebanonlocals.com',
        'https://admin.lebanonlocals.com'
    ];
    
    // Get the origin from request
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Check if origin is allowed
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        // For development: allow localhost variations
        if (strpos($origin, 'localhost') !== false || 
            strpos($origin, '127.0.0.1') !== false ||
            strpos($origin, '192.168.') !== false) {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            // Production: reject unknown origins
            // Optionally, you can set a default allowed origin
            // header("Access-Control-Allow-Origin: https://www.lebanonlocals.com");
        }
    }
    
    // Set other CORS headers
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 3600');
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

