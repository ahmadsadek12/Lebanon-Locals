<?php
/**
 * Error Handling Configuration
 * Environment-based error display and logging
 */

function setupErrorHandling() {
    // Load environment
    require_once __DIR__ . '/env-loader.php';
    $envPath = __DIR__ . '/../../../.env';
    
    if (file_exists($envPath)) {
        loadEnv($envPath);
    }
    
    $environment = env('APP_ENV', 'production');
    
    if ($environment === 'production') {
        // Production: Hide errors from users, log them
        ini_set('display_errors', 0);
        ini_set('display_startup_errors', 0);
        ini_set('log_errors', 1);
        
        // Create logs directory if it doesn't exist
        $logDir = __DIR__ . '/../../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        ini_set('error_log', $logDir . '/php-errors.log');
        error_reporting(E_ALL); // Still log all errors
    } else {
        // Development: Show errors for debugging
        ini_set('display_errors', 1);
        ini_set('display_startup_errors', 1);
        ini_set('log_errors', 1);
        error_reporting(E_ALL);
    }
}

/**
 * Handle API errors with proper response
 */
function handleApiError($exception, $showDetails = false) {
    // Load environment
    require_once __DIR__ . '/env-loader.php';
    $envPath = __DIR__ . '/../../../.env';
    
    if (file_exists($envPath)) {
        loadEnv($envPath);
    }
    
    $environment = env('APP_ENV', 'production');
    
    http_response_code(500);
    
    $response = [
        'success' => false,
        'message' => 'An error occurred. Please try again later.'
    ];
    
    // Only show details in development
    if ($environment === 'development' && $showDetails) {
        $response['error'] = $exception->getMessage();
        $response['file'] = basename($exception->getFile());
        $response['line'] = $exception->getLine();
    }
    
    // Always log errors
    $logDir = __DIR__ . '/../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    error_log(sprintf(
        "[%s] API Error: %s in %s:%d\nStack trace:\n%s",
        date('Y-m-d H:i:s'),
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine(),
        $exception->getTraceAsString()
    ), 3, $logDir . '/php-errors.log');
    
    echo json_encode($response);
    exit();
}

