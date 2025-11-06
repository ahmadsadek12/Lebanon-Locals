<?php
/**
 * JWT Helper Class
 * Handles JWT token generation and validation
 */

class JWTHelper {
    private $secret;
    private $algorithm = 'HS256';

    public function __construct() {
        // Load secret from environment
        require_once __DIR__ . '/env-loader.php';
        $this->secret = env('JWT_SECRET');

        if (!$this->secret) {
            throw new Exception('JWT_SECRET not configured in .env file');
        }
    }

    /**
     * Generate JWT token for user
     */
    public function generateToken($userId, $email, $expiresIn = 86400) {
        $issuedAt = time();
        $expirationTime = $issuedAt + $expiresIn; // Default: 24 hours

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expirationTime,
            'user_id' => $userId,
            'email' => $email
        ];

        return $this->encode($payload);
    }

    /**
     * Validate and decode JWT token
     */
    public function validateToken($token) {
        try {
            $payload = $this->decode($token);

            // Check if token is expired
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                throw new Exception('Token has expired');
            }

            return $payload;
        } catch (Exception $e) {
            throw new Exception('Invalid token: ' . $e->getMessage());
        }
    }

    /**
     * Encode payload to JWT
     */
    private function encode($payload) {
        $header = [
            'typ' => 'JWT',
            'alg' => $this->algorithm
        ];

        $headerEncoded = $this->base64UrlEncode(json_encode($header));
        $payloadEncoded = $this->base64UrlEncode(json_encode($payload));

        $signature = hash_hmac(
            'sha256',
            $headerEncoded . '.' . $payloadEncoded,
            $this->secret,
            true
        );
        $signatureEncoded = $this->base64UrlEncode($signature);

        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    }

    /**
     * Decode JWT to payload
     */
    private function decode($token) {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        // Verify signature
        $signature = hash_hmac(
            'sha256',
            $headerEncoded . '.' . $payloadEncoded,
            $this->secret,
            true
        );

        $signatureCheck = $this->base64UrlEncode($signature);

        if ($signatureEncoded !== $signatureCheck) {
            throw new Exception('Invalid signature');
        }

        $payload = json_decode($this->base64UrlDecode($payloadEncoded), true);

        if (!$payload) {
            throw new Exception('Invalid payload');
        }

        return $payload;
    }

    /**
     * Base64 URL encode
     */
    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     */
    private function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Get user ID from token
     */
    public function getUserIdFromToken($token) {
        $payload = $this->validateToken($token);
        return $payload['user_id'] ?? null;
    }
}
