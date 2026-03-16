# HackNova-CodeVault 🛡️🛡️

A full-stack **MERN** application designed for hackathons and coding competitions to guarantee secure, verifiable, and tamper-proof project submissions. By cryptographically hashing and time-stamping code submissions on a blockchain, HackNova removes trust from the equation and produces undeniably authentic records of when a project was submitted and what it contained.

---

## 🚀 Objective
Hackathons often rely on GitHub links or manual checks to validate project submissions, making it difficult to prove whether a team submitted before the deadline or modified their project afterward. This leads to plagiarism concerns, disputes, and unfair evaluation.

The **CodeVault** is a secure submission platform designed to provide verifiable and tamper-proof hackathon project validation. Teams upload their final project (ZIP or Git repository), and the system generates a cryptographic hash and timestamp at the moment of submission. The hash, along with team and event details, is anchored on the Solana blockchain to create an immutable proof of submission. Any modification to files after submission changes the hash, instantly detecting tampering.

Overall, the system improves fairness, transparency, and credibility of hackathons by ensuring projects are evaluated on provably unchanged submissions.

---

## 🌟 Key Features Built So Far

### 🔐 Security & Identity
- **Role-Based Access Control (RBAC):** Three distinct access levels tailored for the hackathon lifecycle (Admin, Organizer, User).
- **Google OAuth Integration:** Frictionless registration and login powered by Google SSO.
- **Cloudflare Turnstile CAPTCHA:** Enterprise-grade bot protection integrated on both registration and standard login routes.

### 📦 Submission Integrity & Blockchain
- **Secure Archive Uploads:** Users securely submit their `.git` or `.zip` archives directly to the backend.
- **Strict Deadline Enforcement:** Time-based access controls automatically close events at the strike of their deadline.
- **SHA-256 Cryptographic Hashing:** The moment a file hits the backend, an immutable SHA-256 fingerprint is immediately generated for the bytes.
- **Blockchain Anchoring (Solana):** The submission hash and timestamp are cryptographically signed encoded to a web3 blockchain network (Solana) ensuring the record can never be silently altered.
- **Digital Certificates:** A sleek, automatically generated Verified Submission Certificate is issued for every submission containing the exact hash, transaction ID, and timestamp.
- **QR Code Verification:** Certificates proudly display a scannable QR Code that links directly back to the public Verify Console.
- **Downloadable PDF Certificates:** Hackers can download their cryptographic proof of submission as an official PDF document.

### 🧠 Advanced Analysis
- **Machine Learning Integration (Python Classifier):** Uploaded submissions are piped to a secure Python child process powered by scikit-learn that automatically predicts the project category with confidence scores.
- **Plagiarism & Similarity Checking:** Built-in safeguards evaluating submission contents against previously known submissions to prevent code theft.

### 🔎 Judgement & Verification
- **Public Verification Console:** An open portal where judges or organizers can enter a Verification ID (or scan a QR code) to instantly pull the recorded hash and blockchain transaction verifying the submission hasn't been altered.
- **Lookups API:** Frictionless query matching returning visual "Match" or "Tampered" status components to definitively prove authenticity.

---

## 💻 Tech Stack
- **Frontend:** React (Vite), React Router, Lucide Icons, QR-Code React, jsPDF, html2canvas, CSS3
- **Backend:** Node.js, Express.js, JWT, Multer (File Uploads), child_process (Python scripting)
- **Database:** MongoDB (Mongoose ODMs)
- **Blockchain:** Solana Web3.js (@solana/web3.js & bs58)
- **Machine Learning:** Python (scikit-learn, joblib)
- **Security:** Cloudflare Turnstile API, Google OAuth via `@react-oauth/google`

---

## 🛠️ Usage Pipeline
1. **Organizers** create an Event with a specific deadline. 
2. **Participants (Users)** login (or OAuth) passing the Cloudflare check.
3. Participants browse to the event, verify their Team ID, and upload their `.git` repo ZIP.
4. The **Node Backend** hashes the file, calls the **Python ML service** to classify the project, and anchors the final SHA-256 to **Solana**.
5. The Participant receives a gorgeous **Digital Certificate** with a corresponding QR code.
6. **Judges** scan the QR code to seamlessly hit the public **Verification Console**, where they confirm the project code perfectly matches the blockchain footprint.
