const AdmZip = require('adm-zip');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Recursively collect all file paths within a directory, excluding certain folders.
 *
 * @param {string} dir - Current directory
 * @param {string} rootDir - Original root directory (for relative paths)
 * @param {Array} results - Array to store { path, hash }
 */
function hashDirectoryFiles(dir, rootDir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Exclude .git and node_modules as requested/best practice
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      hashDirectoryFiles(fullPath, rootDir, results);
    } else {
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      const fileBuffer = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      results.push({ path: relativePath, hash: hash });
    }
  }
  return results;
}

/**
 * Extract a ZIP, hash all its files, and return the result.
 * 
 * @param {string} zipFilePath - Path to the ZIP file
 * @returns {Promise<Array>} - Array of { path, hash }
 */
async function computeFileHashes(zipFilePath) {
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hn-files-'));
  
  try {
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(extractDir, true);
    
    // Sometimes ZIPs have a wrapper folder. We should detect if there's only one folder at the root.
    let baseDir = extractDir;
    const rootEntries = fs.readdirSync(extractDir);
    if (rootEntries.length === 1 && fs.statSync(path.join(extractDir, rootEntries[0])).isDirectory()) {
        // If there's only one directory at the top level (e.g. project-name/), use it as base.
        // But only if it's not .git (unlikely to be alone)
        if (rootEntries[0] !== '.git') {
            baseDir = path.join(extractDir, rootEntries[0]);
        }
    }

    const fileHashes = hashDirectoryFiles(baseDir, baseDir);
    return fileHashes;
  } finally {
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
  }
}

/**
 * Compare two sets of hashes and return a change report.
 * 
 * @param {Array} oldHashesArr - Array of { path, hash } (from DB)
 * @param {Array} newHashesArr - Array of { path, hash } (from uploaded ZIP)
 * @returns {Object} - Report with modified, new, and deleted files
 */
function compareFileHashes(oldHashesArr, newHashesArr) {
  const modified = [];
  const added = [];
  const deleted = [];

  // Convert arrays to maps for easier lookup
  const oldHashes = {};
  oldHashesArr.forEach(item => oldHashes[item.path] = item.hash);
  
  const newHashes = {};
  newHashesArr.forEach(item => newHashes[item.path] = item.hash);

  const oldFiles = Object.keys(oldHashes);
  const newFiles = Object.keys(newHashes);

  // Check for new and modified
  for (const file of newFiles) {
    if (!oldHashes.hasOwnProperty(file)) {
      added.push(file);
    } else if (oldHashes[file] !== newHashes[file]) {
      modified.push(file);
    }
  }

  // Check for deleted
  for (const file of oldFiles) {
    if (!newHashes.hasOwnProperty(file)) {
      deleted.push(file);
    }
  }

  return {
    modified,
    added,
    deleted
  };
}

module.exports = {
  computeFileHashes,
  compareFileHashes
};
