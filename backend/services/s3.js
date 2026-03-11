/**
 * s3.js
 * AWS S3 upload + pre-signed download service.
 * Uploads a local file to S3 and returns a public URL.
 * Also generates temporary pre-signed download URLs on demand.
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs   = require('fs');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * Upload a local file to S3.
 *
 * @param {string} localFilePath  - Absolute path to the local file
 * @param {string} s3Key          - Destination key (path) inside the S3 bucket
 * @param {string} contentType    - MIME type of the file (default: application/zip)
 * @returns {Promise<string>}     - Public S3 URL for the uploaded file
 */
async function uploadFileToS3(localFilePath, s3Key, contentType = 'application/zip') {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET environment variable is not set.');
  }

  const fileStream = fs.createReadStream(localFilePath);
  const fileSize   = fs.statSync(localFilePath).size;

  const command = new PutObjectCommand({
    Bucket:        BUCKET_NAME,
    Key:           s3Key,
    Body:          fileStream,
    ContentType:   contentType,
    ContentLength: fileSize,
  });

  await s3Client.send(command);

  // Build the canonical S3 URL
  const region = process.env.AWS_REGION || 'us-east-1';
  const s3Url  = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
  return s3Url;
}

/**
 * Generate a pre-signed GET URL so the organizer can download a private object
 * from S3 without making the bucket public.
 *
 * @param {string} s3Key         - The S3 object key (e.g. "submissions/file.zip")
 * @param {number} expiresInSecs - URL expiry in seconds (default: 5 minutes)
 * @returns {Promise<string>}    - Pre-signed download URL
 */
async function getSignedDownloadUrl(s3Key, expiresInSecs = 300) {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET environment variable is not set.');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key:    s3Key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSecs });
}

module.exports = { uploadFileToS3, getSignedDownloadUrl };
