<?php
/**
 * Stripe Create Payment Intent API
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

// Load environment variables
require_once __DIR__ . '/../config/env-loader.php';

// Get Stripe secret key from environment
$stripeSecretKey = env('STRIPE_SECRET_KEY');

if (!$stripeSecretKey) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Stripe not configured']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['amount']) || !is_numeric($input['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid amount']);
    exit();
}

$amount = intval($input['amount'] * 100); // Convert to cents
$currency = isset($input['currency']) ? $input['currency'] : 'usd';

try {
    // Log request
    error_log("Creating Stripe Payment Intent - Amount: $amount cents ({$input['amount']} USD)");
    
    // Create payment intent using Stripe API
    $ch = curl_init('https://api.stripe.com/v1/payment_intents');

    $postData = http_build_query([
        'amount' => $amount,
        'currency' => $currency,
        'automatic_payment_methods[enabled]' => 'true'
    ]);

    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $stripeSecretKey,
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    
    // Disable SSL verification for local development
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        error_log("Stripe cURL Error: $error");
        throw new Exception('Connection error: ' . $error);
    }
    
    curl_close($ch);

    error_log("Stripe Response - Code: $httpCode, Body: $response");

    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMsg = isset($errorData['error']['message']) ? $errorData['error']['message'] : $response;
        error_log("Stripe API Error: $errorMsg");
        throw new Exception('Stripe error: ' . $errorMsg);
    }

    $stripeResponse = json_decode($response, true);

    if (!isset($stripeResponse['client_secret'])) {
        error_log("Stripe Response missing client_secret: " . print_r($stripeResponse, true));
        throw new Exception('Invalid Stripe response - no client_secret');
    }

    echo json_encode([
        'success' => true,
        'clientSecret' => $stripeResponse['client_secret'],
        'paymentIntentId' => $stripeResponse['id']
    ]);

} catch (Exception $e) {
    error_log("Stripe Payment Intent Exception: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
