/**
 * solana.js
 * Blockchain anchoring service using Solana Devnet + Memo Program.
 * Sends { teamId, hash, timestamp } as a memo transaction and returns txId.
 */

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const fs   = require('fs');
const path = require('path');

// Solana Memo Program ID
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Devnet RPC endpoint
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// How long to wait between airdrop retry attempts (ms)
const AIRDROP_RETRY_DELAY_MS = 3000;
const AIRDROP_MAX_RETRIES    = 3;

/**
 * Load the persistent wallet from wallet.json
 */
function loadWallet() {
  const walletPath = path.join(__dirname, '../wallet.json');
  if (!fs.existsSync(walletPath)) {
    throw new Error('wallet.json not found. Please generate a wallet first.');
  }
  const data      = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const secretKey = Uint8Array.from(data.secretKey);
  return Keypair.fromSecretKey(secretKey);
}

/** Simple sleep helper */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Request a Devnet airdrop with automatic retries.
 * Solana Devnet's faucet is rate-limited and sometimes throws "Internal error"
 * on the first attempt — retrying with a short delay usually resolves it.
 */
async function requestAirdropWithRetry(connection, publicKey, lamports) {
  for (let attempt = 1; attempt <= AIRDROP_MAX_RETRIES; attempt++) {
    try {
      console.log(`[Solana] Airdrop attempt ${attempt}/${AIRDROP_MAX_RETRIES}...`);
      const sig = await connection.requestAirdrop(publicKey, lamports);

      // Use a blockhash-based confirmation which is more reliable than string commitment
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction(
        { signature: sig, ...latestBlockhash },
        'confirmed'
      );

      console.log(`[Solana] Airdrop confirmed on attempt ${attempt}.`);
      return; // success
    } catch (err) {
      console.warn(`[Solana] Airdrop attempt ${attempt} failed: ${err.message}`);
      if (attempt < AIRDROP_MAX_RETRIES) {
        console.log(`[Solana] Retrying in ${AIRDROP_RETRY_DELAY_MS / 1000}s...`);
        await sleep(AIRDROP_RETRY_DELAY_MS);
      } else {
        throw new Error(`Airdrop failed after ${AIRDROP_MAX_RETRIES} attempts: ${err.message}`);
      }
    }
  }
}

/**
 * Ensure the wallet has enough SOL — request a Devnet airdrop if balance is low.
 */
async function ensureFunded(connection, payer) {
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`[Solana] Wallet: ${payer.publicKey.toBase58()} | Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    console.log('[Solana] Low balance — requesting Devnet airdrop of 1 SOL...');
    await requestAirdropWithRetry(connection, payer.publicKey, 1 * LAMPORTS_PER_SOL);
  }
}

/**
 * Anchor a hash on Solana Devnet via the Memo Program.
 *
 * @param {string} teamId    - The team identifier
 * @param {string} hash      - SHA-256 hex hash
 * @param {Date}   timestamp - Trusted server timestamp
 * @returns {Promise<string>} - Solana transaction signature (txId)
 */
async function anchorHashOnSolana(teamId, hash, timestamp) {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const payer      = loadWallet();

  await ensureFunded(connection, payer);

  // Build memo payload
  const payload = JSON.stringify({
    teamId,
    hash,
    timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
  });

  console.log(`[Solana] Sending memo transaction...`);
  console.log(`[Solana] Payload: ${payload}`);

  const memoInstruction = new TransactionInstruction({
    keys:      [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data:      Buffer.from(payload, 'utf-8'),
  });

  const transaction = new Transaction().add(memoInstruction);
  const txSignature = await sendAndConfirmTransaction(connection, transaction, [payer], {
    commitment: 'confirmed',
  });

  console.log(`[Solana] ✔ Transaction confirmed. TxID: ${txSignature}`);
  console.log(`[Solana] Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);

  return txSignature;
}

module.exports = { anchorHashOnSolana };
