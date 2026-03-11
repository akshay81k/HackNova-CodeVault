import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FileText, Clock, CheckCircle, Search, ExternalLink } from 'lucide-react';

export default function UserDashboard() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { loadSubmissions(); }, []);

    const loadSubmissions = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/submissions/my');
            setSubmissions(data.submissions);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const formatBytes = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

    // Group submissions by event for display
    const submissionsByEvent = submissions.reduce((acc, s) => {
        const eid = s.event?._id || 'unknown';
        if (!acc[eid]) acc[eid] = { event: s.event, submissions: [] };
        acc[eid].submissions.push(s);
        return acc;
    }, {});

    // Count unique events that still have active deadlines
    const activeEventCount = Object.values(submissionsByEvent).filter(
        g => g.event && new Date(g.event.deadline) > new Date()
    ).length;

    return (
        <div className="dashboard">
            <Navbar />
            <div className="dashboard-main">
                <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Team Leader Panel</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Submissions</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Track your hackathon submissions and verification IDs</p>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}><FileText size={20} color="var(--accent-green)" /></div>
                        <div className="stat-value">{submissions.length}</div>
                        <div className="stat-label">Total Submissions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.12)' }}><CheckCircle size={20} color="var(--accent-blue-light)" /></div>
                        <div className="stat-value">{submissions.filter(s => s.submittedBeforeDeadline).length}</div>
                        <div className="stat-label">On-Time</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}><Clock size={20} color="var(--accent-amber)" /></div>
                        <div className="stat-value">{activeEventCount}</div>
                        <div className="stat-label">Active Events</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/events')}>
                        <Search size={16} /> Browse Events
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/verify')}>
                        🔍 Verify a Submission
                    </button>
                </div>

                {/* Submissions grouped by event */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title"><FileText size={18} /> My Submission History</span>
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : submissions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📂</div>
                            <div className="empty-state-title">No submissions yet</div>
                            <div className="empty-state-desc">Browse events and submit your project</div>
                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/events')}>
                                Browse Events
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {Object.values(submissionsByEvent).map(group => {
                                const ev = group.event;
                                const isActive = ev && new Date(ev.deadline) > new Date();
                                return (
                                    <div key={ev?._id || 'unknown'} style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-lg)',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Event header row */}
                                        <div style={{
                                            padding: '14px 20px',
                                            borderBottom: '1px solid var(--border)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: 10,
                                            background: 'rgba(255,255,255,0.02)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{ev?.title || 'Unknown Event'}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                    🕐 Deadline: {ev?.deadline ? formatDate(ev.deadline) : 'N/A'}
                                                    &nbsp;·&nbsp;
                                                    <span style={{ color: isActive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                        {isActive ? '● Open' : '● Closed'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {group.submissions.length} submission{group.submissions.length > 1 ? 's' : ''}
                                                </span>
                                                {isActive && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => navigate(`/event/${ev._id}`)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        <ExternalLink size={13} /> View Event
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Individual submissions for this event */}
                                        <div style={{ padding: '0 20px' }}>
                                            {group.submissions.map((s, idx) => (
                                                <div key={s._id} style={{
                                                    padding: '16px 0',
                                                    borderBottom: idx < group.submissions.length - 1 ? '1px solid var(--border)' : 'none'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                                                {s.submissionNumber > 1
                                                                    ? <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>Re-submission #{s.submissionNumber}</span>
                                                                    : <span style={{ color: 'var(--text-muted)' }}>Initial submission</span>
                                                                }
                                                                &nbsp;·&nbsp; Team: <strong>{s.teamName}</strong>
                                                                &nbsp;·&nbsp; {s.originalFileName}
                                                                &nbsp;·&nbsp; {formatBytes(s.fileSize)}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                🕐 {formatDate(s.trustedTimestamp)}
                                                            </div>
                                                        </div>
                                                        <span className={`status-badge ${s.submittedBeforeDeadline ? 'status-active' : 'status-expired'}`}>
                                                            {s.submittedBeforeDeadline ? '✅ On-time' : '❌ Late'}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                                                                Verification ID
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span className="mono" style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{s.verificationId}</span>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(s.verificationId)} title="Copy">📋</button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                                                                SHA-256 Hash
                                                            </div>
                                                            <div className="hash-display" onClick={() => copyToClipboard(s.sha256Hash)} title="Click to copy">
                                                                {s.sha256Hash}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: 10 }}>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/verify`)}>
                                                            🔍 Verify
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
