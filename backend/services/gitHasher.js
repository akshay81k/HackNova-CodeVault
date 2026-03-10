/**
 * gitHasher.js
 * Extracts a ZIP file, locates the .git folder, and computes a
 * deterministic SHA-256 hash over all .git file contents (sorted by path).
 */

const AdmZip = require('adm-zip');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Extract a ZIP archive into a temporary directory.
 *
 * @param {string} zipFilePath - Absolute path to the .zip file
 * @returns {string} extractDir - Path to the temp directory where files were extracted
 */
function extractZip(zipFilePath) {
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hacknova-'));
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(extractDir, /* overwrite */ true);
  console.log(`[GitHasher] Extracted ZIP to: ${extractDir}`);
  return extractDir;
}

/**
 * Recursively find the .git folder starting from rootDir.
 *
 * @param {string} rootDir
 * @returns {string|null} - Absolute path to .git folder, or null if not found
 */
function findGitFolder(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name === '.git') {
      return path.join(rootDir, entry.name);
    }
  }

  // Search one level deeper (in case the ZIP contains a wrapper folder)
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      const subDir = path.join(rootDir, entry.name);
      const found = findGitFolder(subDir);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Recursively collect all file paths within a directory, sorted for determinism.
 *
 * @param {string} dir
 * @param {string[]} [result=[]]
 * @returns {string[]}
 */
function collectFiles(dir, result = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, result);
    } else {
      result.push(fullPath);
    }
  }
  return result;
}

/**
 * Compute a SHA-256 hash over the entire .git folder.
 * Each file contributes: its relative path + its content.
 * Files are processed in sorted order for determinism.
 *
 * @param {string} gitFolderPath - Absolute path to the .git folder
 * @param {string} baseDir       - Base dir to compute relative paths from
 * @returns {string} - 64-char hex SHA-256 hash
 */
function hashGitFolder(gitFolderPath, baseDir) {
  const hash = crypto.createHash('sha256');
  const files = collectFiles(gitFolderPath);

  for (const filePath of files) {
    const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
    hash.update(relativePath);
    hash.update(fs.readFileSync(filePath));
  }

  return hash.digest('hex');
}

/**
 * Main entry point: extract ZIP, find .git, hash it, clean up.
 *
 * @param {string} zipFilePath - Path to the uploaded ZIP file
 * @returns {Promise<string>}  - SHA-256 hex hash of the .git folder
 * @throws Error if no .git folder is found in the ZIP
 */
async function computeGitHash(zipFilePath) {
  let extractDir = null;

  try {
    extractDir = extractZip(zipFilePath);
    const gitFolder = findGitFolder(extractDir);

    if (!gitFolder) {
      throw new Error(
        'No .git folder found in the uploaded ZIP. Please upload your full repository as a ZIP (including the .git folder).'
      );
    }

    console.log(`[GitHasher] Found .git at: ${gitFolder}`);
    const gitHash = hashGitFolder(gitFolder, extractDir);
    console.log(`[GitHasher] SHA-256 of .git folder: ${gitHash}`);

    return gitHash;
  } finally {
    // Always clean up temp dir
    if (extractDir && fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
      console.log(`[GitHasher] Cleaned up temp dir: ${extractDir}`);
    }
  }
}

module.exports = { computeGitHash };
