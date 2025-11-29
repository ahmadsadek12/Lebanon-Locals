<?php
/**
 * WhiSH Send OTP API
 * Sends OTP to user's phone for WhiSH payment verification
 *
 * Merchant Information:
 * - Merchant Phone: +961 81 434 070
 * - This is the phone number that will receive WhiSH payments
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

// WhiSH Configuration
define('WHISH_MERCHANT_PHONE', '+96181434070');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['phone']) || empty($input['phone'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Phone number is required']);
    exit();
}

$phone = trim($input['phone']);

// Load environment variables
require_once __DIR__ . '/../config/env-loader.php';

// Get Whish credentials
$whishChannel = env('WHISH_CHANNEL');
$whishSecret = env('WHISH_SECRET');
$whishEnvironment = env('WHISH_ENVIRONMENT', 'sandbox');

if (!$whishChannel || !$whishSecret) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Whish not configured']);
    exit();
}

// Determine API URL based on environment
$apiUrl = $whishEnvironment === 'production'
    ? 'https://whish.money/api/v1/otp/send'
    : 'https://lb.sandbox.whish.money/api/v1/otp/send';

try {
    // Prepare Whish API request
    $whishData = [
        'channel' => $whishChannel,
        'phone' => $phone,
        'secret' => $whishSecret
    ];

    // Debug: Log request data
    error_log("Whish API Request - URL: $apiUrl");
    error_log("Whish API Request - Data: " . json_encode($whishData));

    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($whishData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);

    // Disable SSL verification for development/sandbox (enable for production)
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        throw new Exception('Whish API connection error: ' . curl_error($ch));
    }

    curl_close($ch);

    $whishResponse = json_decode($response, true);

    if ($httpCode === 200 && isset($whishResponse['success']) && $whishResponse['success']) {
        echo json_encode([
            'success' => true,
            'message' => 'OTP sent successfully',
            'phone' => $phone,
            'transaction_id' => $whishResponse['transaction_id'] ?? ('whish_' . uniqid())
        ]);
    } else {
        // Return detailed error with raw response for debugging
        $errorMessage = 'Whish API Error';

        if ($whishResponse && isset($whishResponse['message'])) {
            $errorMessage = $whishResponse['message'];
        }

        // Include HTTP code and raw response for debugging
        throw new Exception($errorMessage . " [HTTP $httpCode] Raw: " . substr($response, 0, 200));
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
