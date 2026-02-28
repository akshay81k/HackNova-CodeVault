import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FileText, Clock, CheckCircle, Search } from 'lucide-react';

export default function UserDashboard() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('submissions');
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
                        <div className="stat-label">Submissions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.12)' }}><CheckCircle size={20} color="var(--accent-blue-light)" /></div>
                        <div className="stat-value">{submissions.filter(s => s.submittedBeforeDeadline).length}</div>
                        <div className="stat-label">On-Time</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}><Clock size={20} color="var(--accent-amber)" /></div>
                        <div className="stat-value">{submissions.filter(s => s.event && !new Date(s.event.deadline).valueOf() < Date.now()).length}</div>
                        <div className="stat-label">Active Events</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/events')}>
                        <Search size={16} /> Browse & Submit to Events
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/verify')}>
                        🔍 Verify a Submission
                    </button>
                </div>

                {/* Submissions */}
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
                            <div className="empty-state-desc">Find an event and submit your .git folder as a ZIP</div>
                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/events')}>
                                Browse Events
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {submissions.map(s => (
                                <div key={s._id} style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 20
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{s.event?.title || 'Unknown Event'}</div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                                                Team: {s.teamName} · {s.originalFileName} · {formatBytes(s.fileSize)}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                🕐 Submitted: {formatDate(s.trustedTimestamp)}
                                            </div>
                                        </div>
                                        <span className={`status-badge ${s.submittedBeforeDeadline ? 'status-active' : 'status-expired'}`}>
                                            {s.submittedBeforeDeadline ? '✅ On-time' : '❌ Late'}
                                        </span>
                                    </div>

                                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                                Verification ID
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="mono" style={{ fontSize: '1rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{s.verificationId}</span>
                                                <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(s.verificationId)} title="Copy">📋</button>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                                SHA-256 Hash
                                            </div>
                                            <div className="hash-display" onClick={() => copyToClipboard(s.sha256Hash)} title="Click to copy">
                                                {s.sha256Hash}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/verify`)}>
                                            🔍 Verify
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
