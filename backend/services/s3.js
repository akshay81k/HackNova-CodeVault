/**
 * s3.js
 * AWS S3 upload + pre-signed download service.
 * Uploads a local file to S3 and returns a public URL.
 * Also generates temporary pre-signed download URLs on demand.
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const fs   = require('fs');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // Add a connection timeout to prevent indefinite hangs
  requestHandler: {
    connectionTimeout: 600000, // 10 minutes
    socketTimeout: 600000,
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * Upload a local file to S3 using Multi-part Upload for reliability.
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

  const parallelUploads3 = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileStream,
      ContentType: contentType,
    },
    // Customize for efficiency (5MB chunks)
    partSize: 5 * 1024 * 1024,
    leavePartsOnError: false,
  });

  parallelUploads3.on('httpUploadProgress', (progress) => {
    const percent = Math.round((progress.loaded / progress.total) * 100);
    console.log(`[S3] Uploading ${s3Key}: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
  });

  await parallelUploads3.done();

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

/**
 * Download a file from S3 and return its contents as a Buffer.
 */
async function downloadFileFromS3(s3Key) {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET environment variable is not set.');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key:    s3Key,
  });

  const response = await s3Client.send(command);
  
  // Convert stream to Buffer
  return new Promise((resolve, reject) => {
    const chunks = [];
    response.Body.on('data', (chunk) => chunks.push(chunk));
    response.Body.on('end', () => resolve(Buffer.concat(chunks)));
    response.Body.on('error', reject);
  });
}

module.exports = { uploadFileToS3, getSignedDownloadUrl, downloadFileFromS3 };
