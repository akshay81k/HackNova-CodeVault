import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import { Search, Upload, Hash, Copy, CheckCircle, XCircle } from 'lucide-react';

export default function VerifyPage() {
    const [mode, setMode] = useState('file'); // 'file' | 'hash'
    const [verificationId, setVerificationId] = useState('');
    const [file, setFile] = useState(null);
    const [hashString, setHashString] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragging, setDragging] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const idParam = searchParams.get('id');
        if (idParam) {
            setVerificationId(idParam);
            setMode('lookup');
            performLookup(idParam);
        }
    }, []);

    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'long' });
    const formatBytes = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

    const handleFileVerify = async (e) => {
        e.preventDefault();
        if (!file || !verificationId.trim()) return setError('Please provide both the Verification ID and the file.');
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('verificationId', verificationId.trim());
            const { data } = await API.post('/verify/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleHashVerify = async (e) => {
        e.preventDefault();
        if (!verificationId.trim() || !hashString.trim()) return setError('Please provide both the Verification ID and hash string.');
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const { data } = await API.post('/verify/hash', { verificationId: verificationId.trim(), hashString: hashString.trim() });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const performLookup = async (idToLookup) => {
        const id = typeof idToLookup === 'string' ? idToLookup : verificationId.trim();
        if (!id) return;
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const { data } = await API.get(`/verify/${id}`);
            setResult({ isLookupOnly: true, ...data });
        } catch (err) {
            setError(err.response?.data?.message || 'No record found.');
        } finally {
            setLoading(false);
        }
    };

    const handleLookup = async () => {
        await performLookup(verificationId.trim());
    };

    const copy = (t) => navigator.clipboard.writeText(t);

    const reset = () => {
        setResult(null);
        setError('');
        setFile(null);
        setHashString('');
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 10 }}>Verify Submission</h1>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
                        Judges and organizers can independently verify the integrity of any submission.
                        No account required.
                    </p>
                </div>

                {/* Mode Tabs */}
                <div className="tabs" style={{ marginBottom: 28 }}>
                    <button className={`tab ${mode === 'file' ? 'active' : ''}`} onClick={() => { setMode('file'); reset(); }}>
                        📁 Upload File
                    </button>
                    <button className={`tab ${mode === 'hash' ? 'active' : ''}`} onClick={() => { setMode('hash'); reset(); }}>
                        🔢 Paste Hash
                    </button>
                    <button className={`tab ${mode === 'lookup' ? 'active' : ''}`} onClick={() => { setMode('lookup'); reset(); }}>
                        🔍 Lookup Record
                    </button>
                </div>

                {/* Error */}
                {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

                {/* Result */}
                {result && !result.isLookupOnly && (
                    <div className={`verify-result animate-scale-in ${result.isMatch ? 'match' : 'mismatch'}`} style={{ marginBottom: 24 }}>
                        <div className="verify-icon">{result.isMatch ? '✅' : '❌'}</div>
                        <div className={`verify-status ${result.isMatch ? 'match' : 'mismatch'}`}>
                            {result.result}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
                            {result.isMatch
                                ? 'The file is authentic. Its hash matches the original submission.'
                                : 'Hash mismatch detected. The file may have been modified after submission.'}
                        </div>

                        {result.details && (
                            <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                                {[
                                    ['Verification ID', result.details.verificationId],
                                    ['Event', result.details.eventTitle],
                                    ['Submitted By', result.details.submittedBy],
                                    ['Team', result.details.teamName],
                                    ['Submission Time', formatDate(result.details.submissionTime)],
                                    ['Deadline Status', result.details.submittedBeforeDeadline ? '✅ On-time' : '❌ Late'],
                                    ['Expected Hash', result.details.expectedHash],
                                    ['Provided Hash', result.details.providedHash],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                                        <span className={label.includes('Hash') ? 'mono' : ''} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={reset}>🔄 Verify Another</button>
                    </div>
                )}

                {/* Lookup Result */}
                {result?.isLookupOnly && (
                    <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent-blue)', boxShadow: 'var(--shadow-glow)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ fontSize: '1.5rem' }}>📋</div>
                            <div>
                                <div style={{ fontWeight: 800 }}>Submission Record Found</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lookup only · No file comparison performed</div>
                            </div>
                        </div>
                        {result.record && Object.entries({
                            'Verification ID': result.record.verificationId,
                            'Event': result.record.eventTitle,
                            'Submitted By': result.record.submittedBy,
                            'Team': result.record.teamName,
                            'File Name': result.record.originalFileName,
                            'File Size': formatBytes(result.record.fileSize),
                            'Submission Time': formatDate(result.record.submissionTime),
                            'Deadline Status': result.record.submittedBeforeDeadline ? '✅ On-time' : '❌ Late',
                            'SHA-256 Hash': result.record.sha256Hash,
                        }).map(([label, value]) => (
                            <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {label === 'SHA-256 Hash' ? (
                                        <div className="hash-display" onClick={() => copy(value)} style={{ fontSize: '0.72rem' }}>{value}</div>
                                    ) : (
                                        <span style={{ fontSize: '0.875rem', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                                    )}
                                    {(label.includes('Hash') || label === 'Verification ID') && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => copy(value)}><Copy size={12} /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={reset}>🔄 New Lookup</button>
                    </div>
                )}

                {/* Forms */}
                {!result && (
                    <div className="card">
                        {/* Shared V-ID field */}
                        <div className="form-group">
                            <label className="form-label">Verification ID</label>
                            <input
                                id="verify-id"
                                type="text"
                                className="form-input"
                                placeholder="HN-XXXXXXXXXXXX"
                                value={verificationId}
                                onChange={e => setVerificationId(e.target.value.toUpperCase())}
                                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                            />
                        </div>

                        {mode === 'file' && (
                            <form onSubmit={handleFileVerify}>
                                <div className="form-group">
                                    <label className="form-label">Upload the Original File</label>
                                    <div
                                        className={`upload-zone ${dragging ? 'dragging' : ''}`}
                                        style={{ padding: '28px 20px' }}
                                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]); }}
                                        onClick={() => document.getElementById('verify-file').click()}
                                    >
                                        <input id="verify-file" type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                                        {file ? (
                                            <>
                                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📦</div>
                                                <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{file.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatBytes(file.size)}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>☁️</div>
                                                <div style={{ fontWeight: 600 }}>Drop file or click to upload</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>The same ZIP file you submitted</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button id="file-verify-btn" type="submit" className="btn btn-primary btn-full" disabled={loading || !file || !verificationId.trim()}>
                                    {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Verifying...</> : <><Upload size={15} /> Compare & Verify</>}
                                </button>
                            </form>
                        )}

                        {mode === 'hash' && (
                            <form onSubmit={handleHashVerify}>
                                <div className="form-group">
                                    <label className="form-label">SHA-256 Hash String</label>
                                    <input
                                        id="hash-input"
                                        type="text"
                                        className="form-input"
                                        placeholder="64-character hex string..."
                                        value={hashString}
                                        onChange={e => setHashString(e.target.value)}
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                                    />
                                </div>
                                <button id="hash-verify-btn" type="submit" className="btn btn-primary btn-full" disabled={loading || !hashString.trim() || !verificationId.trim()}>
                                    {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Verifying...</> : <><Hash size={15} /> Verify Hash</>}
                                </button>
                            </form>
                        )}

                        {mode === 'lookup' && (
                            <div>
                                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                                    ℹ️ Lookup only displays the stored record — no integrity check is performed.
                                </div>
                                <button id="lookup-btn" className="btn btn-primary btn-full" onClick={handleLookup} disabled={loading || !verificationId.trim()}>
                                    {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Looking up...</> : <><Search size={15} /> Lookup Record</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* How it works */}
                {!result && (
                    <div className="card" style={{ marginTop: 20 }}>
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>How Verification Works</div>
                        {[
                            ['1', 'SHA-256', 'When a participant submits, the server computes a SHA-256 hash of their .git ZIP file.'],
                            ['2', 'Timestamp', 'A trusted server-side timestamp is recorded — immutable and stored in our database.'],
                            ['3', 'Verify', 'Upload the same file here. If the hash matches, the submission is authentic and unmodified.'],
                        ].map(([num, title, desc]) => (
                            <div key={num} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-blue-light)', flexShrink: 0 }}>{num}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>{title}</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
