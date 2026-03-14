/**
 * plagiarism.js
 * Token-based code similarity detection service.
 *
 * Extracts two ZIP archives, reads all source-code files, normalises and
 * tokenises them, then computes per-file-pair and overall similarity scores.
 */

const AdmZip = require('adm-zip');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');

// ── File extensions we treat as source code ──────────────────────────────────
// ── File extensions we treat as source code ──────────────────────────────────
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.java',
  '.c', '.h', '.cpp', '.hpp', '.cc', '.cxx',
  '.cs',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.html', '.htm',
  '.css', '.scss', '.less',
  '.sol',
  '.dart',
  '.kt', '.kts',
  '.swift',
  '.lua',
  '.r', '.R',
  '.sql',
  '.sh', '.bash',
  '.json',     // config files can be plagiarised too
  '.xml',
  '.yaml', '.yml',
]);

// Directories we always skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.vscode', '.idea',
  'dist', 'build', '.next', 'vendor', 'venv', 'env',
  '.gradle', 'target', 'bin', 'obj', 'out', '.expo',
  'bower_components', 'jspm_packages', '.nuxt', '.cache',
  'coverage', '.nyc_output',
]);

// Max file size to process (1MB). Massive files are usually not hand-written source code
const MAX_FILE_SIZE = 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract a ZIP archive into a temporary directory.
 */
function extractZipToTemp(zipBuffer) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plag-'));
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(tmpDir, true);
  return tmpDir;
}

/**
 * Recursively collect source-code file paths from `dir`.
 */
function collectSourceFiles(dir, basePath = dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectSourceFiles(path.join(dir, entry.name), basePath, results);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (CODE_EXTENSIONS.has(ext)) {
        const fullPath = path.join(dir, entry.name);
        const stats    = fs.statSync(fullPath);
        
        // Skip files that are too large
        if (stats.size > MAX_FILE_SIZE) {
          console.log(`[PlagiarismEngine] Skipping large file: ${entry.name} (${Math.round(stats.size/1024)} KB)`);
          continue;
        }

        const relPath  = path.relative(basePath, fullPath).replace(/\\/g, '/');
        results.push({ fullPath, relPath, ext, size: stats.size });
      }
    }
  }
  return results;
}

/**
 * Strip single-line ( // and # ) and multi-line ( /* ... *​/ ) comments from code.
 */
function stripComments(code, ext) {
  // For HTML/XML-type files, strip <!-- ... -->
  if (['.html', '.htm', '.xml'].includes(ext)) {
    code = code.replace(/<!--[\s\S]*?-->/g, '');
  }
  // For CSS / SCSS / Less, strip /* ... */
  if (['.css', '.scss', '.less'].includes(ext)) {
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    return code;
  }
  // For Python, strip # comments and triple-quote docstrings
  if (['.py', '.pyw', '.r', '.R'].includes(ext)) {
    code = code.replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, '');
    code = code.replace(/#.*/g, '');
    return code;
  }
  // For shell scripts
  if (['.sh', '.bash'].includes(ext)) {
    code = code.replace(/#.*/g, '');
    return code;
  }
  // C-family / JS / Java / Go / Rust / etc.
  // Remove multi-line comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments
  code = code.replace(/\/\/.*/g, '');
  return code;
}

/**
 * Normalise source code: strip comments, collapse whitespace, lowercase.
 */
function normalise(code, ext) {
  code = stripComments(code, ext);
  code = code.replace(/\r\n/g, '\n');     // CRLF → LF
  code = code.replace(/[ \t]+/g, ' ');    // collapse horizontal whitespace
  code = code.replace(/\n\s*\n/g, '\n');  // collapse blank lines
  code = code.trim().toLowerCase();
  return code;
}

/**
 * Tokenise normalised code into an array of meaningful tokens.
 * Keeps keywords, identifiers, numbers, and operators/punctuation.
 */
function tokenise(code) {
  // Match identifiers/keywords, numbers, and operators/punctuation
  const tokens = code.match(/[a-z_$][a-z0-9_$]*|[0-9]+(?:\.[0-9]+)?|[^\s\w]/g);
  return tokens || [];
}

/**
 * Build a token frequency map and pre-calculate magnitude for cosine similarity.
 */
function processTokens(tokens) {
  const freq = {};
  let sumSq = 0;
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }
  for (const t in freq) {
    sumSq += freq[t] * freq[t];
  }
  return { freq, magnitude: Math.sqrt(sumSq) };
}

/**
 * Cosine similarity between two frequency maps.
 * Optimized: uses pre-calculated magnitudes and only loops over the smaller map.
 */
function cosineSimilarity(freqA, freqB, magA, magB) {
  if (magA === 0 || magB === 0) return 0;
  
  let dot = 0;
  const keysA = Object.keys(freqA);
  const keysB = Object.keys(freqB);
  
  // Pivot to loop over the smaller set
  if (keysA.length <= keysB.length) {
    for (const t of keysA) {
      if (freqB[t]) dot += freqA[t] * freqB[t];
    }
  } else {
    for (const t of keysB) {
      if (freqA[t]) dot += freqA[t] * freqB[t];
    }
  }
  
  return dot / (magA * magB);
}

/**
 * Jaccard similarity between two token sets.
 */
function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  if (union === 0) return 0;
  return intersection / union;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main comparison function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare two ZIP buffers and return similarity results.
 */
async function compareSubmissions(zipBufferA, zipBufferB) {
  let tmpDirA = null;
  let tmpDirB = null;

  try {
    // 1. Extract both ZIPs
    console.log('[PlagiarismEngine] Extracting ZIP A...');
    tmpDirA = extractZipToTemp(zipBufferA);
    console.log('[PlagiarismEngine] Extracting ZIP B...');
    tmpDirB = extractZipToTemp(zipBufferB);

    // 2. Collect source files
    console.log('[PlagiarismEngine] Collecting source files...');
    const filesA = collectSourceFiles(tmpDirA);
    const filesB = collectSourceFiles(tmpDirB);

    console.log(`[PlagiarismEngine] Found ${filesA.length} files in A, ${filesB.length} files in B`);

    if (filesA.length === 0 || filesB.length === 0) {
      return {
        overallSimilarity: 0,
        fileMatches: [],
        teamAFiles: filesA.length,
        teamBFiles: filesB.length,
        teamAFileList: filesA.map(f => f.relPath),
        teamBFileList: filesB.map(f => f.relPath),
      };
    }

    // 3. Read, normalise, and tokenise each file
    console.log('[PlagiarismEngine] Processing files (read, normalise, tokenise)...');
    const startProc = Date.now();
    const processFile = (fileInfo) => {
      try {
        const raw = fs.readFileSync(fileInfo.fullPath, 'utf-8');
        const normalised = normalise(raw, fileInfo.ext);
        const tokens = tokenise(normalised);
        const { freq, magnitude } = processTokens(tokens);
        return { 
          ...fileInfo, 
          tokens, 
          freq, 
          magnitude, 
          lineCount: raw.split('\n').length 
        };
      } catch (err) {
        console.warn(`[PlagiarismEngine] Error processing ${fileInfo.relPath}: ${err.message}`);
        return { ...fileInfo, tokens: [], freq: {}, magnitude: 0, lineCount: 0 };
      }
    };

    const processedA = filesA.map(processFile).filter(f => f.tokens.length > 0);
    const processedB = filesB.map(processFile).filter(f => f.tokens.length > 0);
    console.log(`[PlagiarismEngine] Files processed in ${Date.now() - startProc}ms`);

    // 4. Compare every file pair across submissions
    console.log('[PlagiarismEngine] Comparing file pairs and building matrix...');
    const startCompare = Date.now();
    
    // Matrix to store similarity results
    const matrix = Array(processedA.length).fill(0).map(() => Array(processedB.length).fill(0));
    const fileMatches = [];

    // Use async batching to prevent blocking the event loop for too long
    // This allows heartbeats and heartbeats to be sent
    let pairsCompared = 0;
    for (let i = 0; i < processedA.length; i++) {
      const fA = processedA[i];
      for (let j = 0; j < processedB.length; j++) {
        const fB = processedB[j];
        
        const cosine = cosineSimilarity(fA.freq, fB.freq, fA.magnitude, fB.magnitude);
        
        // Skip jaccard if cosine is very low
        if (cosine < 0.15) {
          matrix[i][j] = 0;
        } else {
          const jaccard = jaccardSimilarity(fA.tokens, fB.tokens);
          const similarity = cosine * 0.6 + jaccard * 0.4;
          matrix[i][j] = similarity;

          if (similarity > 0.15) {
            fileMatches.push({
              fileA: fA.relPath,
              fileB: fB.relPath,
              similarity: Math.round(similarity * 10000) / 100,
              cosine: Math.round(cosine * 10000) / 100,
              jaccard: Math.round(jaccard * 10000) / 100,
              tokensA: fA.tokens.length,
              tokensB: fB.tokens.length,
              commonTokenCount: 0, 
              linesA: fA.lineCount,
              linesB: fB.lineCount,
              idxA: i,
              idxB: j
            });
          }
        }

        pairsCompared++;
        // Yield to event loop every 5000 comparisons
        if (pairsCompared % 5000 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    }
    console.log(`[PlagiarismEngine] Pair comparison (matrix built) in ${Date.now() - startCompare}ms`);

    // Sort by similarity descending
    fileMatches.sort((a, b) => b.similarity - a.similarity);

    // Filter to top 50 unique-ish matches for the UI
    const topMatches = fileMatches.slice(0, 50);

    // 5. Compute overall similarity
    console.log('[PlagiarismEngine] Computing overall score from matrix...');
    const startScore = Date.now();

    // Strategy: for each file in A, take its best match from B.
    const bestMatchA = processedA.map((_, i) => Math.max(...matrix[i], 0));
    // For each file in B, take its best match from A.
    const bestMatchB = processedB.map((_, j) => {
      let max = 0;
      for (let i = 0; i < processedA.length; i++) {
        if (matrix[i][j] > max) max = matrix[i][j];
      }
      return max;
    });

    const avgA = bestMatchA.length > 0 ? bestMatchA.reduce((s, v) => s + v, 0) / bestMatchA.length : 0;
    const avgB = bestMatchB.length > 0 ? bestMatchB.reduce((s, v) => s + v, 0) / bestMatchB.length : 0;

    const overallSimilarity = Math.round(((avgA + avgB) / 2) * 10000) / 100;
    console.log(`[PlagiarismEngine] Overall score computed in ${Date.now() - startScore}ms: ${overallSimilarity}%`);

    // For the top matches, compute common tokens for UI display efficiently
    topMatches.forEach(match => {
      const fA = processedA[match.idxA];
      const fB = processedB[match.idxB];
      if (fA && fB) {
        const setB = new Set(fB.tokens);
        const uniqueCommon = new Set();
        for (const t of fA.tokens) {
          if (setB.has(t)) uniqueCommon.add(t);
        }
        match.commonTokenCount = uniqueCommon.size;
      }
    });

    return {
      overallSimilarity,
      fileMatches: topMatches,
      teamAFiles: filesA.length,
      teamBFiles: filesB.length,
      teamAFileList: filesA.map(f => f.relPath),
      teamBFileList: filesB.map(f => f.relPath),
    };
  } finally {
    // Clean up temp directories
    if (tmpDirA && fs.existsSync(tmpDirA)) {
      fs.rmSync(tmpDirA, { recursive: true, force: true });
    }
    if (tmpDirB && fs.existsSync(tmpDirB)) {
      fs.rmSync(tmpDirB, { recursive: true, force: true });
    }
  }
}

module.exports = { compareSubmissions };
