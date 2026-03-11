import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import Navbar from '../components/Navbar';
import { Upload, CheckCircle, AlertTriangle, Clock, Copy } from 'lucide-react';

export default function SubmitPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileRef = useRef();

    const [event, setEvent] = useState(null);
    const [file, setFile] = useState(null);
    const [teamId, setTeamId] = useState('');
    const [notes, setNotes] = useState('');
    const [dragging, setDragging] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        loadEvent();
    }, [eventId]);

    const loadEvent = async () => {
        try {
            const { data } = await API.get(`/events/${eventId}`);
            setEvent(data.event);
            setTeamId('');
        } catch (err) {
            setError('Event not found.');
        } finally {
            setFetchLoading(false);
        }
    };

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

    const formatBytes = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return setError('Please select a file to upload.');
        setError('');
        setLoading(true);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('gitFile', file);
            formData.append('eventId', eventId);
            formData.append('teamId', teamId);
            formData.append('notes', notes);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(p => Math.min(p + 8, 85));
            }, 200);

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

    if (fetchLoading) return (
        <div className="dashboard"><Navbar /><div style={{ textAlign: 'center', padding: 100 }}><div className="spinner" style={{ margin: '0 auto' }} /></div></div>
    );

    if (!event) return (
        <div className="dashboard"><Navbar />
            <div style={{ textAlign: 'center', padding: 80 }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
                <div style={{ color: 'var(--text-secondary)' }}>{error || 'Event not found'}</div>
                <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/events')}>Back to Events</button>
            </div>
        </div>
    );

    const expired = event.isExpired;

    return (
        <div className="dashboard">
            <Navbar />
            <div className="dashboard-main" style={{ maxWidth: 700 }}>
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events')} style={{ marginBottom: 12, paddingLeft: 0 }}>
                        ← Back to Events
                    </button>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Submit Project</div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{event.title}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.9rem' }}>{event.description}</p>
                </div>

                {/* Event Info */}
                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Deadline</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: expired ? 'var(--accent-red)' : 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={14} />
                                {formatDate(event.deadline)}
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

                {expired ? (
                    <div className="alert alert-error" style={{ fontSize: '0.9rem', padding: '16px 20px' }}>
                        <AlertTriangle size={18} />
                        <div>
                            <div style={{ fontWeight: 700 }}>Submissions Closed</div>
                            <div>The deadline for this event has passed. No further submissions are accepted.</div>
                        </div>
                    </div>
                ) : result ? (
                    /* Success State */
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
                            💡 Save your <strong>Verification ID</strong> and <strong>SHA-256 hash</strong>. Judges use these to verify your submission's integrity.
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" onClick={() => navigate('/user')}>View My Submissions</button>
                            <button className="btn btn-secondary" onClick={() => navigate('/verify')}>Verify Now</button>
                        </div>
                    </div>
                ) : (
                    /* Upload Form */
                    <form onSubmit={handleSubmit}>
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>📁 Upload .git Folder</div>

                            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

                            {/* Upload Zone */}
                            <div
                                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileRef.current.click()}
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
                                        <span>Uploading & hashing...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="progress-bar-wrapper">
                                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card" style={{ marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>👥 Team Info</div>
                            <div className="form-group">
                                <label className="form-label">Team ID</label>
                                <input type="text" className="form-input" placeholder="e.g. TEAM-001"
                                    value={teamId} onChange={e => setTeamId(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Notes (optional)</label>
                                <textarea className="form-textarea" placeholder="Any notes about your submission..."
                                    value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 70 }} />
                            </div>
                        </div>

                        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                            <AlertTriangle size={16} />
                            <div>
                                <strong>Important:</strong> Only one submission per event is allowed. Once submitted, you cannot re-submit. Ensure your .git folder contains all your latest commits.
                            </div>
                        </div>

                        <button id="submit-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !file}>
                            {loading ? (
                                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Hashing & Submitting...</>
                            ) : (
                                <><Upload size={18} /> Submit & Generate Hash</>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
