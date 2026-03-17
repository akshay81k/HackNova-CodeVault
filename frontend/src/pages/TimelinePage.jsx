import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
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

    const timelineContainerRef = useRef(null);
    const lineRef = useRef(null);
    const eventRefs = useRef([]);

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

    useEffect(() => {
        // Run animation when events successfully load
        if (!loading && events.length > 0 && timelineContainerRef.current) {
            const tl = gsap.timeline();
            
            // 1. Fade the container in
            tl.fromTo(timelineContainerRef.current,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
            );

            // 2. Draw the vertical line down
            if (lineRef.current) {
                tl.fromTo(lineRef.current,
                    { scaleY: 0, transformOrigin: "top" },
                    { scaleY: 1, duration: 0.8, ease: "power2.inOut" },
                    "-=0.2" // slight overlap
                );
            }

            // 3. Stagger pop-in the dots
            const dots = eventRefs.current.map(el => el?.querySelector('.timeline-dot'));
            tl.fromTo(dots,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, stagger: 0.15, ease: "back.out(1.7)" },
                "-=0.4"
            );

            // 4. Stagger slide-in the event cards
            const cards = eventRefs.current.map(el => el?.querySelector('.timeline-card'));
            tl.fromTo(cards,
                { x: 40, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: "power3.out" },
                "-=0.7" // Start sliding cards as dots are popping in
            );
        }
    }, [loading, events]);

    const formatTime = (d) =>
        new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });

    return (
        <div className="page-wrapper dashboard-page" style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
            <Navbar />
            <div className="dashboard-main">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }} className="animate-slide-down">
                    <button
                        className="btn btn-breadcrumb"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={14} /> Back to Dashboard
                    </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }} className="animate-slide-down">
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                            Forensic Timeline
                        </div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Clock size={32} color="var(--accent-blue-light)" /> Chain of Custody
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
                    <div ref={timelineContainerRef} className="card" style={{ padding: '32px 40px', background: 'rgba(13, 31, 60, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', opacity: 0 }}>
                        <div style={{ position: 'relative', paddingLeft: 44 }}>
                            {/* Vertical line */}
                            <div ref={lineRef} style={{
                                position: 'absolute',
                                left: 15,
                                top: 12,
                                bottom: 12,
                                width: 3,
                                background: 'linear-gradient(180deg, var(--accent-blue-light) 0%, var(--accent-green) 50%, var(--accent-purple) 100%)',
                                borderRadius: 3,
                                opacity: 0.6,
                                boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)'
                            }} />

                            {events.map((ev, idx) => {
                                const meta = EVENT_META[ev.eventType] || { icon: Clock, color: '#9ca3af', label: ev.eventType, bg: 'rgba(156,163,175,0.12)' };
                                const Icon = meta.icon;
                                return (
                                    <div
                                        key={ev._id || idx}
                                        ref={el => eventRefs.current[idx] = el}
                                        style={{
                                            position: 'relative',
                                            marginBottom: idx < events.length - 1 ? 28 : 0
                                        }}
                                    >
                                        {/* Dot / Icon */}
                                        <div style={{
                                            position: 'absolute',
                                            left: -44,
                                            top: -2,
                                            width: 34,
                                            height: 34,
                                            borderRadius: '50%',
                                            background: meta.bg,
                                            border: `2px solid ${meta.color}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 2,
                                            boxShadow: `0 0 15px ${meta.color}40`,
                                        }} className="timeline-dot">
                                            <Icon size={16} color={meta.color} />
                                        </div>

                                        {/* Content */}
                                        <div className="timeline-card" style={{
                                            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-xl)',
                                            padding: '16px 20px',
                                            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s, border-color 0.2s, background 0.2s',
                                            cursor: 'default'
                                        }}
                                            onMouseEnter={e => { 
                                                e.currentTarget.style.borderColor = meta.color; 
                                                e.currentTarget.style.background = `linear-gradient(145deg, ${meta.bg} 0%, rgba(255,255,255,0.01) 100%)`; 
                                                e.currentTarget.style.transform = 'translateX(4px)';
                                                e.currentTarget.style.boxShadow = `0 4px 20px ${meta.color}20`;
                                            }}
                                            onMouseLeave={e => { 
                                                e.currentTarget.style.borderColor = 'var(--border)'; 
                                                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'; 
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
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

            {/* Timeline hover animations */}
            <style>{`
                .timeline-dot {
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .timeline-dot:hover {
                    transform: scale(1.15);
                }
            `}</style>
        </div>
    );
}
