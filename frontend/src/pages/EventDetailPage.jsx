import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import Navbar from '../components/Navbar';
import {
    Upload, CheckCircle, AlertTriangle, Clock, Copy,
    ShieldCheck, ShieldX, Loader, ArrowLeft, Users
} from 'lucide-react';

export default function EventDetailPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileRef = useRef();

    // Event data
    const [event, setEvent] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');

    // Team verification
    const [teamId, setTeamId] = useState('');
    const [teamName, setTeamName] = useState('');
    const [verifyChecked, setVerifyChecked] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verification, setVerification] = useState(null); // { verified, message, teamName? }

    // File upload / submission
    const [file, setFile] = useState(null);
    const [notes, setNotes] = useState('');
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => { loadEvent(); }, [eventId]);

    const loadEvent = async () => {
        setFetchLoading(true);
        try {
            const { data } = await API.get(`/events/${eventId}`);
            setEvent(data.event);
        } catch (err) {
            setFetchError('Event not found or could not be loaded.');
        } finally {
            setFetchLoading(false);
        }
    };

    // ── Verify team participation ─────────────────────────────────────────────
    const handleVerifyTeam = async () => {
        if (!teamId.trim()) {
            setVerification({ verified: false, message: 'Please enter your Team ID first.' });
            return;
        }
        setVerifying(true);
        setVerification(null);
        try {
            const { data } = await API.get(`/events/${eventId}/verify-team`, {
                params: { teamId: teamId.trim() }
            });
            setVerification({
                verified: true,
                message: data.message,
                teamName: data.teamName || '',
                noRoster: data.noRoster || false
            });
            // Auto-populate teamName if returned from server
            if (data.teamName) setTeamName(data.teamName);
        } catch (err) {
            setVerification({
                verified: false,
                message: err.response?.data?.message || 'Verification failed.'
            });
        } finally {
            setVerifying(false);
        }
    };

    // When checkbox is ticked/unticked
    const handleVerifyCheckbox = (e) => {
        setVerifyChecked(e.target.checked);
        if (e.target.checked) {
            handleVerifyTeam();
        } else {
            setVerification(null);
        }
    };

    // Re-verify when teamId changes (reset verification)
    const handleTeamIdChange = (val) => {
        setTeamId(val);
        setVerifyChecked(false);
        setVerification(null);
    };

    // ── File handling ─────────────────────────────────────────────────────────
    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) setFile(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) setFile(f);
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return setError('Please select a ZIP file to upload.');
        if (!teamId.trim()) return setError('Team ID is required.');
        if (!verification?.verified) return setError('You must verify your team participation before submitting.');

        setError('');
        setLoading(true);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('gitFile', file);
            formData.append('eventId', eventId);
            formData.append('teamId', teamId.trim());
            formData.append('teamName', teamName || teamId.trim());
            formData.append('notes', notes);

            const progressInterval = setInterval(() => {
                setProgress(p => Math.min(p + 6, 85));
            }, 250);

            const { data } = await API.post('/submissions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            clearInterval(progressInterval);
            setProgress(100);
            setResult(data.submission);
        } catch (err) {
            setProgress(0);
            setError(err.response?.data?.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => navigator.clipboard.writeText(text);
    const formatBytes = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

    // ── Whether submit is enabled ─────────────────────────────────────────────
    // Submit is enabled only if: file selected + team verified
    const canSubmit = !!file && verification?.verified === true && !loading;

    // ── Render guards ─────────────────────────────────────────────────────────
    if (fetchLoading) return (
        <div className="dashboard"><Navbar />
            <div style={{ textAlign: 'center', padding: 100 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        </div>
    );

    if (fetchError || !event) return (
        <div className="dashboard"><Navbar />
            <div style={{ textAlign: 'center', padding: 80 }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
                <div style={{ color: 'var(--text-secondary)' }}>{fetchError || 'Event not found'}</div>
                <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/events')}>
                    Back to Events
                </button>
            </div>
        </div>
    );

    const expired = event.isExpired;

    return (
        <div className="dashboard">
            <Navbar />
            <div className="dashboard-main" style={{ maxWidth: 720 }}>

                {/* Back + Header */}
                <div style={{ marginBottom: 24 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/user')} style={{ marginBottom: 12, paddingLeft: 0 }}>
                        <ArrowLeft size={15} /> Back to Dashboard
                    </button>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Submit Project
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{event.title}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>{event.description}</p>
                </div>

                {/* Event Meta */}
                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Deadline</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: expired ? 'var(--accent-red)' : 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={14} />{formatDate(event.deadline)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</div>
                            <span className={`status-badge ${expired ? 'status-expired' : 'status-active'}`}>
                                {expired ? '⏰ Submissions Closed' : '✅ Open for Submissions'}
                            </span>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Organizer</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{event.organizer?.name}</div>
                        </div>
                    </div>
                </div>

                {/* Closed */}
                {expired ? (
                    <div className="alert alert-error" style={{ fontSize: '0.9rem', padding: '16px 20px' }}>
                        <AlertTriangle size={18} />
                        <div>
                            <div style={{ fontWeight: 700 }}>Submissions Closed</div>
                            <div>The deadline for this event has passed. No further submissions are accepted.</div>
                        </div>
                    </div>
                ) : result ? (
                    /* ── Success Result ────────────────────────────────────────────── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{
                            background: 'rgba(16,185,129,0.06)',
                            border: '1px solid rgba(16,185,129,0.4)',
                            borderRadius: 'var(--radius-xl)',
                            padding: '32px',
                            textAlign: 'center',
                            boxShadow: 'var(--shadow-green)',
                            animation: 'fadeInUp 0.4s ease'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-green)', marginBottom: 8 }}>
                                SUBMISSION RECEIVED
                            </div>
                            {result.submissionNumber > 1 && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', fontWeight: 600, marginBottom: 8 }}>
                                    Re-submission #{result.submissionNumber}
                                </div>
                            )}
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Your .git submission has been cryptographically hashed and timestamped.
                            </div>
                        </div>

                        <div className="card">
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>📋 Submission Details</div>
                            {[
                                ['Verification ID', result.verificationId, true],
                                ['SHA-256 Hash', result.sha256Hash, true],
                                ['Submitted At', new Date(result.trustedTimestamp).toISOString(), false],
                                ['File Name', result.originalFileName, false],
                                ['File Size', formatBytes(result.fileSize), false],
                                ['Team ID', result.teamId, false],
                                ['Submission #', String(result.submissionNumber || 1), false],
                            ].map(([label, value, mono]) => (
                                <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {mono ? (
                                            <div className="hash-display" style={{ flex: 1 }} onClick={() => copyToClipboard(value)}>{value}</div>
                                        ) : (
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value}</div>
                                        )}
                                        {mono && (
                                            <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(value)}>
                                                <Copy size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="alert alert-info">
                            💡 Save your <strong>Verification ID</strong> and <strong>SHA-256 hash</strong>. You may re-submit before the deadline — only your latest verified submission will be evaluated.
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" onClick={() => { setResult(null); setFile(null); setProgress(0); }}>
                                Submit Again
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/user')}>View My Submissions</button>
                            <button className="btn btn-secondary" onClick={() => navigate('/verify')}>Verify</button>
                        </div>
                    </div>
                ) : (
                    /* ── Upload Form ───────────────────────────────────────────────── */
                    <form onSubmit={handleSubmit}>

                        {/* ── Step 1: Team Identity ───────────────────────────────────── */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={18} /> Step 1 — Team Identity
                            </div>

                            <div className="form-group">
                                <label className="form-label">Team ID <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                                <input
                                    id="team-id-input"
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. TEAM-001"
                                    value={teamId}
                                    onChange={e => handleTeamIdChange(e.target.value)}
                                    required
                                />
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                    Enter the Team ID assigned to your team by the organizer.
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Team Name (optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. CodeCrusaders"
                                    value={teamName}
                                    onChange={e => setTeamName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* ── Step 2: Verify Participation ────────────────────────────── */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldCheck size={18} /> Step 2 — Verify Participation
                            </div>

                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '14px 16px',
                                background: 'var(--bg-secondary)',
                                border: `2px solid ${verification?.verified ? 'var(--accent-green)' : verification?.verified === false ? 'var(--accent-red)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-lg)',
                                cursor: teamId.trim() ? 'pointer' : 'not-allowed',
                                opacity: teamId.trim() ? 1 : 0.5,
                                transition: 'border-color 0.2s, opacity 0.2s'
                            }}>
                                <input
                                    id="verify-participation-checkbox"
                                    type="checkbox"
                                    checked={verifyChecked}
                                    onChange={handleVerifyCheckbox}
                                    disabled={!teamId.trim() || verifying}
                                    style={{ width: 18, height: 18, accentColor: 'var(--accent-green)', cursor: 'pointer', flexShrink: 0 }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>I want to verify my team's participation</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        This checks your Team ID against the organizer's registered team list.
                                    </div>
                                </div>
                                {verifying && <Loader size={18} color="var(--accent-blue-light)" style={{ animation: 'spin 1s linear infinite' }} />}
                            </label>

                            {/* Verification Result */}
                            {verification && (
                                <div style={{
                                    marginTop: 12,
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-lg)',
                                    background: verification.verified
                                        ? 'rgba(16,185,129,0.08)'
                                        : 'rgba(239,68,68,0.08)',
                                    border: `1px solid ${verification.verified ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    animation: 'fadeInUp 0.25s ease'
                                }}>
                                    {verification.verified
                                        ? <ShieldCheck size={20} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                                        : <ShieldX size={20} color="var(--accent-red)" style={{ flexShrink: 0 }} />
                                    }
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: verification.verified ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                            {verification.verified ? '✅ Verified' : '❌ Not Verified'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {verification.message}
                                        </div>
                                        {verification.teamName && (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                Team Name: <strong>{verification.teamName}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!teamId.trim() && (
                                <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    ⬆️ Enter your Team ID above to enable verification.
                                </div>
                            )}
                        </div>

                        {/* ── Step 3: Upload ZIP ──────────────────────────────────────── */}
                        <div className="card" style={{ marginBottom: 20, opacity: verification?.verified ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Upload size={18} /> Step 3 — Upload .git Folder
                            </div>

                            {!verification?.verified && (
                                <div className="alert alert-warning" style={{ marginBottom: 14, fontSize: '0.82rem' }}>
                                    🔒 Verify your participation (Step 2) to unlock file upload.
                                </div>
                            )}

                            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

                            <div
                                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                                style={{ pointerEvents: verification?.verified ? 'auto' : 'none' }}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => verification?.verified && fileRef.current.click()}
                            >
                                <input ref={fileRef} type="file" accept=".zip,.gz,.tar" onChange={handleFileChange} style={{ display: 'none' }} />
                                {file ? (
                                    <div>
                                        <span className="upload-icon">📦</span>
                                        <div className="upload-title" style={{ color: 'var(--accent-green)' }}>{file.name}</div>
                                        <div className="upload-subtitle">{formatBytes(file.size)} · Click to change</div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="upload-icon">☁️</span>
                                        <div className="upload-title">Drop your .git folder ZIP here</div>
                                        <div className="upload-subtitle">Compress your .git folder as ZIP · Max 200MB</div>
                                        <div style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Method: <code>zip -r submission.zip .git/</code>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {loading && (
                                <div style={{ marginTop: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span>Uploading &amp; hashing...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="progress-bar-wrapper">
                                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Notes / Change Log (optional)</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="What changed in this submission? e.g. 'Added authentication module, fixed crash on submit...'"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    style={{ minHeight: 70 }}
                                />
                            </div>
                        </div>

                        <div className="alert alert-info" style={{ marginBottom: 20 }}>
                            💡 <strong>Multiple submissions allowed</strong> — you can re-submit as many times as you like before the deadline. Each submission is hashed and anchored to the blockchain.
                        </div>

                        <button
                            id="final-submit-btn"
                            type="submit"
                            className="btn btn-primary btn-full btn-lg"
                            disabled={!canSubmit}
                            title={!verification?.verified ? 'Verify your team participation first' : !file ? 'Select a file first' : ''}
                        >
                            {loading ? (
                                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Hashing &amp; Submitting...</>
                            ) : (
                                <><Upload size={18} /> Submit &amp; Generate Hash</>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
