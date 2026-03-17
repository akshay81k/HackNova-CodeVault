import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import Navbar from '../components/Navbar';
import InteractiveBackground from '../components/InteractiveBackground';
import { Upload, CheckCircle, AlertTriangle, Clock, Copy, Download, Shield, CloudUpload } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

    const downloadCertificate = async () => {
        const certElement = document.getElementById('digital-certificate');
        if (!certElement) return;
        try {
            const canvas = await html2canvas(certElement, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`HackNova_Certificate_${result.teamId || result.teamName || 'Submission'}.pdf`);
        } catch (err) {
            console.error("Failed to generate PDF", err);
        }
    };

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
        <div className="page-wrapper" style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
            <Navbar />
            <div style={{ textAlign: 'center', padding: 100 }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
        </div>
    );

    if (!event) return (
        <div className="page-wrapper" style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
            <Navbar />
            <div style={{ textAlign: 'center', padding: 80 }}>
                <AlertTriangle size={28} color="var(--accent-amber)" style={{ marginBottom: 12 }} />
                <div style={{ color: 'var(--text-secondary)' }}>{error || 'Event not found'}</div>
                <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/events')}>Back to Events</button>
            </div>
        </div>
    );

    const expired = event.isExpired;

    return (
        <div className="page-wrapper dashboard-page" style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
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
                                {expired ? 'Submissions Closed' : 'Open for Submissions'}
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
                ) : result?.verificationId ? (
                    /* Success State - Digital Certificate */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div id="digital-certificate" style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            border: '1px solid rgba(14, 165, 233, 0.3)',
                            borderRadius: '20px',
                            padding: '48px',
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            marginBottom: '20px'
                        }}>
                            {/* Decorative Premium Border Lines */}
                            <div style={{ position: 'absolute', top: '12px', bottom: '12px', left: '12px', right: '12px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', pointerEvents: 'none' }}></div>

                            {/* Elegant Glowing Orbs */}
                            <div style={{ position: 'absolute', top: -100, right: -50, width: 300, height: 300, background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }}></div>
                            <div style={{ position: 'absolute', bottom: -100, left: -50, width: 300, height: 300, background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: 32 }}>

                                {/* Left Info Column */}
                                <div style={{ flex: '1 1 350px' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                                        <div style={{
                                            width: '48px', height: '48px',
                                            background: 'rgba(14, 165, 233, 0.1)',
                                            border: '1px solid rgba(14, 165, 233, 0.2)',
                                            borderRadius: '12px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                                        }}>🛡️</div>
                                        <div style={{
                                            width: '48px', height: '48px',
                                            background: 'rgba(14, 165, 233, 0.1)',
                                            border: '1px solid rgba(14, 165, 233, 0.2)',
                                            borderRadius: '12px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                                        }}><Shield size={20} /></div>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: '#38bdf8' }}>HackNova</h2>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>Immutable Submission Record</div>
                                        </div>
                                    </div>

                                    {/* Event Name */}
                                    <div style={{ marginBottom: 32 }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Event Reference</div>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>{event.title}</div>
                                    </div>

                                    {/* Grid for User & Date */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '24px', marginBottom: '36px', paddingBottom: '32px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Authenticated Team</div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: 500, color: '#e2e8f0' }}>{result.teamName || result.teamId || user?.name || 'Unknown'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Trusted Timestamp</div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: 500, color: '#e2e8f0' }}>{formatDate(result.trustedTimestamp)}</div>
                                        </div>
                                    </div>

                                    {/* Hash Display */}
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Cryptographic Hash (SHA-256)</div>
                                        <div style={{
                                            fontFamily: 'monospace', fontSize: '0.9rem', color: '#38bdf8',
                                            background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px',
                                            wordBreak: 'break-all', lineHeight: 1.5, border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            {result.sha256Hash}
                                        </div>

                                        {result.mlCategory && (
                                            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>ML Prediction:</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                                    {result.mlCategory}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right QR Code Column */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '0 auto' }}>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', flexShrink: 0 }}>
                                        <QRCodeSVG value={`${window.location.origin}/verify?id=${result.verificationId}`} size={160} level="H" includeMargin={false} />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Scan to Verify</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#f8fafc', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', letterSpacing: '1px' }}>
                                            ID: {result.verificationId}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div className="alert alert-info">
                            💡 Save your <strong>Verification ID</strong> and <strong>SHA-256 hash</strong>. Judges use these to verify your submission's integrity.
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                            <button className="btn btn-primary" onClick={downloadCertificate} style={{ flex: 1, justifyContent: 'center', padding: '14px' }}>
                                <Download size={18} /> Download Certificate (PDF)
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/verify?id=' + result.verificationId)} style={{ flex: 1, justifyContent: 'center' }}>
                                Verification Console
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Upload Form */
                    <form onSubmit={handleSubmit}>
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>📁 Upload .git Folder</div>

                            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertTriangle size={14} /> {error}</div>}

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
                                    <div className="animate-scale-in">
                                        <span className="upload-icon">📦</span>
                                        <div className="upload-title" style={{ color: 'var(--accent-green)' }}>{file.name}</div>
                                        <div className="upload-subtitle">{formatBytes(file.size)} · Click to change</div>
                                    </div>
                                ) : (
                                    <div className="animate-scale-in">
                                        <CloudUpload size={28} color="var(--text-muted)" />
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
