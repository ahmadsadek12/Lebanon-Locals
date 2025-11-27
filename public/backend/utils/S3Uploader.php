<?php

use Aws\Exception\AwsException;
use Aws\S3\S3Client;

require_once __DIR__ . '/../config/env-loader.php';
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Lightweight helper around AWS S3 uploads.
 */
class S3Uploader
{
    private static ?S3Client $client = null;

    /**
     * Upload a local file to the configured S3 bucket.
     *
     * @param string $filePath     Local temporary path (from $_FILES['tmp_name'])
     * @param string $key          Destination key inside the bucket
     * @param string|null $mime    Optional MIME type
     * @param string $acl          ACL to apply (defaults to public-read)
     * @return string              Public URL to the uploaded object
     * @throws Exception
     */
    public static function uploadFile(string $filePath, string $key, ?string $mime = null, ?string $acl = null): string
    {
        if (!file_exists($filePath)) {
            throw new Exception('Upload failed: source file missing.');
        }

        $bucket = env('AWS_S3_BUCKET');
        if (!$bucket) {
            throw new Exception('AWS_S3_BUCKET is not configured.');
        }

        $client = self::getClient();

        $params = [
            'Bucket' => $bucket,
            'Key' => ltrim($key, '/'),
            'SourceFile' => $filePath,
        ];
        if ($acl !== null) {
            $params['ACL'] = $acl;
        }

        if ($mime) {
            $params['ContentType'] = $mime;
        }

        try {
            $result = $client->putObject($params);
        } catch (AwsException $e) {
            $awsMessage = $e->getAwsErrorMessage();
            $fullMessage = $awsMessage ?: $e->getMessage();
            throw new Exception('Failed to upload to S3: ' . $fullMessage, 0, $e);
        }

        $baseUrl = env('AWS_S3_BASE_URL');
        if ($baseUrl) {
            return rtrim($baseUrl, '/') . '/' . ltrim($key, '/');
        }

        $region = env('AWS_S3_REGION', 'us-east-1');
        if ($region === 'us-east-1') {
            return sprintf('https://%s.s3.amazonaws.com/%s', $bucket, ltrim($key, '/'));
        }

        return sprintf('https://%s.s3.%s.amazonaws.com/%s', $bucket, $region, ltrim($key, '/'));
    }

    /**
     * Generate a consistent object key for the bucket.
     */
    public static function buildKey(string $prefix, string $slug, string $extension): string
    {
        $cleanPrefix = trim($prefix, '/');
        $cleanSlug = preg_replace('/[^a-zA-Z0-9-_]/', '-', strtolower($slug));
        $cleanSlug = trim(preg_replace('/-+/', '-', $cleanSlug), '-');
        $timestamp = date('Ymd_His');

        return sprintf('%s/%s_%s.%s', $cleanPrefix, $cleanSlug ?: 'asset', $timestamp, strtolower($extension));
    }

    private static function getClient(): S3Client
    {
        if (self::$client === null) {
            $region = env('AWS_S3_REGION');
            if (!$region) {
                throw new Exception('AWS_S3_REGION is not configured.');
            }

            $config = [
                'version' => 'latest',
                'region' => $region,
            ];

            $accessKey = env('AWS_ACCESS_KEY_ID');
            $secretKey = env('AWS_SECRET_ACCESS_KEY');

            if ($accessKey && $secretKey) {
                $config['credentials'] = [
                    'key' => $accessKey,
                    'secret' => $secretKey,
                ];
            }

            self::$client = new S3Client($config);
        }

        return self::$client;
    }
}


