<?php
/**
 * Whish Create Payment API
 * Creates payment request and returns redirect URL
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['amount']) || !is_numeric($input['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid amount']);
    exit();
}

$amount = floatval($input['amount']);
$description = isset($input['description']) ? $input['description'] : 'Lebanon Locals Booking';
$bookingId = isset($input['booking_id']) ? $input['booking_id'] : uniqid('booking_');

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
    ? 'https://api.whish.money/itel-service/api/payment/whish'
    : 'https://lb.sandbox.whish.money/itel-service/api/payment/whish';

// Success and cancel URLs
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
$successRedirectUrl = $baseUrl . '/whish-payment-success.html?booking_id=' . $bookingId;
$failureRedirectUrl = $baseUrl . '/whish-payment-cancel.html?booking_id=' . $bookingId;

// Callback URLs (API-to-API communication)
$successCallbackUrl = $baseUrl . '/backend/api/whish-callback.php?status=success&booking_id=' . $bookingId;
$failureCallbackUrl = $baseUrl . '/backend/api/whish-callback.php?status=failure&booking_id=' . $bookingId;

// Get website URL from environment (or use base URL)
$websiteUrl = env('WHISH_WEBSITE_URL', $baseUrl);

// Generate external ID (transaction ID)
$externalId = (int)($bookingId . time());

try {
    // Prepare Whish API request body (matching Whish API Documentation v1.3)
    $requestData = [
        'amount' => $amount,
        'currency' => 'USD',  // Can be LBP, USD, or AED
        'invoice' => $description,
        'externalId' => $externalId,
        'successCallbackUrl' => $successCallbackUrl,
        'failureCallbackUrl' => $failureCallbackUrl,
        'successRedirectUrl' => $successRedirectUrl,
        'failureRedirectUrl' => $failureRedirectUrl
    ];

    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    // Set headers with credentials (matching Laravel implementation)
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'channel: ' . $whishChannel,
        'secret: ' . $whishSecret,
        'websiteurl: ' . $websiteUrl
    ]);

    // Disable SSL verification for development/sandbox
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        throw new Exception('Whish API connection error: ' . curl_error($ch));
    }

    curl_close($ch);

    $whishResponse = json_decode($response, true);

    // Log the full response for debugging
    $logFile = __DIR__ . '/../../logs/whish-errors.log';
    $logDir = dirname($logFile);
    if (!file_exists($logDir)) {
        @mkdir($logDir, 0777, true);
    }

    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'http_code' => $httpCode,
        'request' => $requestData,
        'response' => $whishResponse,
        'curl_error' => curl_errno($ch) ? curl_error($ch) : null
    ];
    @file_put_contents($logFile, json_encode($logData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

    // Check for collectUrl in response (matching Whish API Documentation v1.3)
    if ($httpCode === 200 && $whishResponse && isset($whishResponse['status']) && $whishResponse['status'] === true) {
        if (!empty($whishResponse['data']['collectUrl'])) {
            echo json_encode([
                'success' => true,
                'redirect_url' => $whishResponse['data']['collectUrl'],
                'external_id' => $externalId,
                'transaction_id' => $requestData['externalId']
            ]);
        } else {
            throw new Exception('No collect URL returned from Whish');
        }
    } else {
        // Return detailed error message from Whish
        $errorMessage = 'Whish payment unavailable';

        if (isset($whishResponse['dialog'])) {
            $errorMessage = is_string($whishResponse['dialog']) ? $whishResponse['dialog'] : $whishResponse['dialog']['message'];
        } elseif (isset($whishResponse['message'])) {
            $errorMessage = $whishResponse['message'];
        }

        // Provide helpful message with actual error
        $errorDetails = json_encode($whishResponse, JSON_PRETTY_PRINT);
        $userMessage = 'Whish payment is temporarily unavailable. Please use Stripe or Cash payment instead.';

        // Log detailed error
        error_log("Whish API Error: $errorMessage | Details: $errorDetails");

        throw new Exception($userMessage);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
