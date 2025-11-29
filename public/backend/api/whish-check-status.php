<?php
/**
 * Whish Check Payment Status API
 * Checks the status of a Whish payment transaction
 * Based on Whish API Documentation v1.3
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['external_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'External ID required']);
    exit();
}

$externalId = $input['external_id'];
$currency = isset($input['currency']) ? $input['currency'] : 'USD';

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
    ? 'https://api.whish.money/itel-service/api/payment/collect/status'
    : 'https://lb.sandbox.whish.money/itel-service/api/payment/collect/status';

// Get website URL from environment
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
$websiteUrl = env('WHISH_WEBSITE_URL', $baseUrl);

try {
    // Prepare Whish API request body
    $requestData = [
        'currency' => $currency,
        'externalId' => (int)$externalId
    ];

    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    // Set headers with credentials
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

    // Check response according to API documentation
    if ($httpCode === 200 && $whishResponse && isset($whishResponse['status']) && $whishResponse['status'] === true) {
        $collectStatus = isset($whishResponse['data']['collectStatus']) ? $whishResponse['data']['collectStatus'] : 'unknown';
        $payerPhone = isset($whishResponse['data']['payerPhoneNumber']) ? $whishResponse['data']['payerPhoneNumber'] : null;

        echo json_encode([
            'success' => true,
            'status' => $collectStatus,  // "success", "pending", "failed", etc.
            'payer_phone' => $payerPhone,
            'external_id' => $externalId
        ]);
    } else {
        // Return error from Whish
        $errorMessage = 'Unable to check payment status';

        if (isset($whishResponse['dialog'])) {
            $errorMessage = $whishResponse['dialog'];
        } elseif (isset($whishResponse['message'])) {
            $errorMessage = $whishResponse['message'];
        }

        throw new Exception($errorMessage);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
