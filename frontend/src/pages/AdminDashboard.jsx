import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import { Users, Calendar, FileText, Activity, Trash2, Clock } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, events: 0, submissions: 0 });
    const [events, setEvents] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [evRes, subRes] = await Promise.all([
                API.get('/events/organizer/my-events'),
                API.get('/submissions/all')
            ]);
            setEvents(evRes.data.events);
            setSubmissions(subRes.data.submissions);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Delete this event and all its submissions?')) return;
        try {
            await API.delete(`/events/${id}`);
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || 'Delete failed');
        }
    };

    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <div className="dashboard">
            <Navbar />
            <div className="dashboard-main">
                <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Admin Panel</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Platform Overview</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Full visibility into all events and submissions</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.12)' }}><Calendar size={20} color="var(--accent-blue-light)" /></div>
                        <div className="stat-value">{events.length}</div>
                        <div className="stat-label">Total Events</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}><FileText size={20} color="var(--accent-green)" /></div>
                        <div className="stat-value">{submissions.length}</div>
                        <div className="stat-label">Total Submissions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}><Activity size={20} color="var(--accent-amber)" /></div>
                        <div className="stat-value">{events.filter(e => !e.isExpired && e.isActive).length}</div>
                        <div className="stat-label">Active Events</div>
                    </div>
                </div>

                <div className="tabs">
                    {['overview', 'events', 'submissions'].map(t => (
                        <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                ) : (
                    <>
                        {activeTab === 'events' && (
                            <div className="card">
                                <div className="card-header"><span className="card-title"><Calendar size={18} /> All Events</span></div>
                                {events.length === 0 ? (
                                    <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">No events yet</div></div>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead><tr><th>Title</th><th>Organizer</th><th>Deadline</th><th>Status</th><th>Submissions</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                {events.map(ev => (
                                                    <tr key={ev._id}>
                                                        <td style={{ fontWeight: 600 }}>{ev.title}</td>
                                                        <td style={{ color: 'var(--text-secondary)' }}>{ev.organizer?.name}</td>
                                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(ev.deadline)}</td>
                                                        <td><span className={`status-badge ${ev.isExpired ? 'status-expired' : 'status-active'}`}>{ev.isExpired ? '⏰ Expired' : '✅ Active'}</span></td>
                                                        <td style={{ color: 'var(--accent-blue-light)', fontWeight: 600 }}>{ev.submissionCount}</td>
                                                        <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteEvent(ev._id)}><Trash2 size={14} /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'submissions' && (
                            <div className="card">
                                <div className="card-header"><span className="card-title"><FileText size={18} /> All Submissions</span></div>
                                {submissions.length === 0 ? (
                                    <div className="empty-state"><div className="empty-state-icon">📂</div><div className="empty-state-title">No submissions yet</div></div>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead><tr><th>Verification ID</th><th>Team</th><th>Event</th><th>Timestamp</th><th>Deadline Status</th><th>Category</th><th>Hash (SHA-256)</th><th>Timeline</th></tr></thead>
                                            <tbody>
                                                {submissions.map(s => (
                                                    <tr key={s._id}>
                                                        <td><span className="mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>{s.verificationId}</span></td>
                                                        <td style={{ fontWeight: 500 }}>{s.teamName || s.submittedBy?.name}</td>
                                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{s.event?.title}</td>
                                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{formatDate(s.trustedTimestamp)}</td>
                                                        <td><span className={`status-badge ${s.submittedBeforeDeadline ? 'status-active' : 'status-expired'}`}>{s.submittedBeforeDeadline ? '✅ On-time' : '❌ Late'}</span></td>
                                                        <td style={{ fontWeight: 600, color: 'var(--accent-blue-light)', fontSize: '0.8rem' }}>
                                                            {s.mlCategory ? `${s.mlCategory} (${s.mlConfidence ? (s.mlConfidence * 100).toFixed(0) + '%' : ''})` : '—'}
                                                        </td>
                                                        <td><div className="hash-display" title={s.sha256Hash} onClick={() => navigator.clipboard.writeText(s.sha256Hash)}>{s.sha256Hash.substring(0, 16)}…</div></td>
                                                        <td>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '4px 10px' }}
                                                                onClick={() => navigate(`/timeline/${s._id}`)}
                                                            >
                                                                <Clock size={12} /> Timeline
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'overview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="card">
                                    <div className="card-header"><span className="card-title">📊 Recent Events</span></div>
                                    {events.slice(0, 5).map(ev => (
                                        <div key={ev._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev.title}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>by {ev.organizer?.name} · {ev.submissionCount} submissions</div>
                                            </div>
                                            <span className={`status-badge ${ev.isExpired ? 'status-expired' : 'status-active'}`}>{ev.isExpired ? 'Expired' : 'Active'}</span>
                                        </div>
                                    ))}
                                    {events.length === 0 && <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">No events</div></div>}
                                </div>
                                <div className="card">
                                    <div className="card-header"><span className="card-title">📋 Recent Submissions</span></div>
                                    {submissions.slice(0, 6).map(s => (
                                        <div key={s._id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{s.teamName || s.submittedBy?.name}</div>
                                                <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.event?.title}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>{s.verificationId}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(s.trustedTimestamp)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {submissions.length === 0 && <div className="empty-state"><div className="empty-state-icon">📂</div><div className="empty-state-title">No submissions</div></div>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
