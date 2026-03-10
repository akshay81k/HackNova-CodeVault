/**
 * s3.js
 * AWS S3 upload service.
 * Uploads a local file to S3 and returns a public-download URL.
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
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
  const fileSize = fs.statSync(localFilePath).size;

  console.log(`[S3] Uploading ${path.basename(localFilePath)} (${fileSize} bytes) → s3://${BUCKET_NAME}/${s3Key}`);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileStream,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  await s3Client.send(command);

  // Build the public URL
  const region = process.env.AWS_REGION || 'us-east-1';
  const s3Url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;

  console.log(`[S3] Upload complete. URL: ${s3Url}`);
  return s3Url;
}

module.exports = { uploadFileToS3 };
