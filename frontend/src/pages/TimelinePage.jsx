import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import InteractiveBackground from '../components/InteractiveBackground';
import {
    ArrowLeft, Upload, Hash, LinkIcon, Brain, Search, ShieldCheck,
    Clock, CheckCircle, AlertCircle, FileText
} from 'lucide-react';

const EVENT_META = {
    SUBMISSION_UPLOADED: { icon: Upload, color: '#3b82f6', label: 'Submission Uploaded', bg: 'rgba(59,130,246,0.12)' },
    SUBMISSION_RESUBMITTED: { icon: Upload, color: '#f59e0b', label: 'Project Re-submitted', bg: 'rgba(245,158,11,0.12)' },
    HASH_GENERATED:      { icon: Hash, color: '#06b6d4', label: 'Hash Generated', bg: 'rgba(6,182,212,0.12)' },
    BLOCKCHAIN_ANCHORED: { icon: LinkIcon, color: '#10b981', label: 'Blockchain Anchored', bg: 'rgba(16,185,129,0.12)' },
    ML_CLASSIFIED:       { icon: Brain, color: '#8b5cf6', label: 'ML Classified', bg: 'rgba(139,92,246,0.12)' },
    PLAGIARISM_CHECK_RUN:{ icon: Search, color: '#f59e0b', label: 'Plagiarism Check Run', bg: 'rgba(245,158,11,0.12)' },
    VERIFICATION_CHECKED:{ icon: ShieldCheck, color: '#ec4899', label: 'Verification Checked', bg: 'rgba(236,72,153,0.12)' },
};

export default function TimelinePage() {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [submission, setSub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadTimeline();
    }, [submissionId]);

    const loadTimeline = async () => {
        setLoading(true);
        setError('');
        try {
            const [tlRes, subRes] = await Promise.all([
                API.get(`/submissions/${submissionId}/timeline`),
                API.get(`/submissions/${submissionId}`)
            ]);
            setEvents(tlRes.data.events);
            setSub(subRes.data.submission);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load timeline.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (d) =>
        new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });

    return (
        <div className="page-wrapper dashboard-page" style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
            <Navbar />
            <div className="dashboard-main">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(-1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <ArrowLeft size={15} /> Back
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                            Forensic Timeline
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                            📜 Chain of Custody
                        </h1>
                    </div>
                </div>

                {/* Submission Info Card */}
                {submission && (
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Team</div>
                                <div style={{ fontWeight: 700 }}>{submission.teamName || submission.teamId}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Event</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{submission.event?.title || '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Verification ID</div>
                                <div className="mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{submission.verificationId}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>SHA-256</div>
                                <div className="mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.78rem' }}>{submission.sha256Hash?.substring(0, 20)}…</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>File</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <FileText size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                    {submission.originalFileName}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

                {/* Loading */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div className="spinner" style={{ margin: '0 auto' }} />
                        <div style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.85rem' }}>Loading timeline…</div>
                    </div>
                ) : events.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">📜</div>
                            <div className="empty-state-title">No timeline events yet</div>
                            <div className="empty-state-desc">Events will appear here as actions are performed on this submission.</div>
                        </div>
                    </div>
                ) : (
                    /* Timeline */
                    <div className="card" style={{ padding: '28px 32px' }}>
                        <div style={{ position: 'relative', paddingLeft: 40 }}>
                            {/* Vertical line */}
                            <div style={{
                                position: 'absolute',
                                left: 15,
                                top: 8,
                                bottom: 8,
                                width: 2,
                                background: 'linear-gradient(180deg, var(--accent-blue-light) 0%, var(--accent-green) 50%, var(--accent-purple) 100%)',
                                borderRadius: 2,
                                opacity: 0.4
                            }} />

                            {events.map((ev, idx) => {
                                const meta = EVENT_META[ev.eventType] || { icon: Clock, color: '#9ca3af', label: ev.eventType, bg: 'rgba(156,163,175,0.12)' };
                                const Icon = meta.icon;
                                return (
                                    <div
                                        key={ev._id || idx}
                                        style={{
                                            position: 'relative',
                                            marginBottom: idx < events.length - 1 ? 28 : 0,
                                            animation: `fadeIn 0.4s ease ${idx * 0.08}s both`
                                        }}
                                    >
                                        {/* Dot / Icon */}
                                        <div style={{
                                            position: 'absolute',
                                            left: -40,
                                            top: 2,
                                            width: 30,
                                            height: 30,
                                            borderRadius: '50%',
                                            background: meta.bg,
                                            border: `2px solid ${meta.color}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 1
                                        }}>
                                            <Icon size={14} color={meta.color} />
                                        </div>

                                        {/* Content */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: '14px 18px',
                                            transition: 'border-color 0.2s, background 0.2s'
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.background = meta.bg; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.88rem',
                                                    color: meta.color
                                                }}>
                                                    {meta.label}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.73rem',
                                                    color: 'var(--text-muted)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <Clock size={11} />
                                                    {formatTime(ev.timestamp)}
                                                </span>
                                            </div>
                                            {ev.details && (
                                                <div style={{
                                                    fontSize: '0.82rem',
                                                    color: 'var(--text-secondary)',
                                                    lineHeight: 1.5
                                                }}>
                                                    {ev.details}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Fade-in animation */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
