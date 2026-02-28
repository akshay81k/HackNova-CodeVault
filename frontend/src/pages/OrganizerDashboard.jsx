import { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/Navbar';
import { Plus, Calendar, FileText, X, ChevronDown } from 'lucide-react';

export default function OrganizerDashboard() {
    const [events, setEvents] = useState([]);
    const [activeTab, setActiveTab] = useState('events');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [subLoading, setSubLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formError, setFormError] = useState('');
    const [form, setForm] = useState({ title: '', description: '', deadline: '', tags: '', maxTeamSize: 5 });
    const [creating, setCreating] = useState(false);

    useEffect(() => { loadEvents(); }, []);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/events/organizer/my-events');
            setEvents(data.events);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadSubmissions = async (eventId) => {
        setSubLoading(true);
        try {
            const { data } = await API.get(`/submissions/event/${eventId}`);
            setSubmissions(data.submissions);
        } catch (err) { setSubmissions([]); }
        finally { setSubLoading(false); }
    };

    const handleSelectEvent = (ev) => {
        if (selectedEvent?._id === ev._id) {
            setSelectedEvent(null);
            setSubmissions([]);
        } else {
            setSelectedEvent(ev);
            loadSubmissions(ev._id);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        setCreating(true);
        try {
            const payload = {
                ...form,
                tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                maxTeamSize: Number(form.maxTeamSize)
            };
            await API.post('/events', payload);
            setShowCreateModal(false);
            setForm({ title: '', description: '', deadline: '', tags: '', maxTeamSize: 5 });
            loadEvents();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create event.');
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const formatBytes = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

    const minDeadline = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 5);
        return d.toISOString().slice(0, 16);
    };

    return (
        <div className="dashboard">
            <Navbar />
            <div className="dashboard-main">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Organizer Panel</div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Events</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Create and manage hackathon events</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={16} /> Create Event
                    </button>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.12)' }}><Calendar size={20} color="var(--accent-blue-light)" /></div>
                        <div className="stat-value">{events.length}</div>
                        <div className="stat-label">My Events</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}><FileText size={20} color="var(--accent-green)" /></div>
                        <div className="stat-value">{events.reduce((a, e) => a + (e.submissionCount || 0), 0)}</div>
                        <div className="stat-label">Total Submissions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}><Calendar size={20} color="var(--accent-amber)" /></div>
                        <div className="stat-value">{events.filter(e => !e.isExpired).length}</div>
                        <div className="stat-label">Active Events</div>
                    </div>
                </div>

                {/* Events List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                ) : events.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">📅</div>
                            <div className="empty-state-title">No events yet</div>
                            <div className="empty-state-desc">Create your first hackathon event</div>
                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreateModal(true)}>
                                <Plus size={16} /> Create Event
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {events.map(ev => (
                            <div key={ev._id} className="card" style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} onClick={() => handleSelectEvent(ev)}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{ev.title}</span>
                                            <span className={`status-badge ${ev.isExpired ? 'status-expired' : 'status-active'}`}>
                                                {ev.isExpired ? '⏰ Expired' : '✅ Active'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {ev.description}
                                        </div>
                                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                🕐 Deadline: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(ev.deadline)}</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue-light)', fontWeight: 600 }}>
                                                📁 {ev.submissionCount} submissions
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronDown size={18} color="var(--text-muted)" style={{ transform: selectedEvent?._id === ev._id ? 'rotate(180deg)' : 'none', transition: '0.2s', marginLeft: 12, flexShrink: 0 }} />
                                </div>

                                {/* Submissions Accordion */}
                                {selectedEvent?._id === ev._id && (
                                    <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            Submissions ({submissions.length})
                                        </div>
                                        {subLoading ? (
                                            <div style={{ textAlign: 'center', padding: 30 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                                        ) : submissions.length === 0 ? (
                                            <div className="empty-state"><div className="empty-state-icon" style={{ fontSize: '1.5rem' }}>📂</div><div className="empty-state-title">No submissions yet</div></div>
                                        ) : (
                                            <div className="table-wrapper">
                                                <table>
                                                    <thead><tr><th>Verification ID</th><th>Team</th><th>Submitted By</th><th>Timestamp</th><th>Size</th><th>Hash</th></tr></thead>
                                                    <tbody>
                                                        {submissions.map(s => (
                                                            <tr key={s._id}>
                                                                <td><span className="mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.78rem' }}>{s.verificationId}</span></td>
                                                                <td style={{ fontWeight: 500 }}>{s.teamName}</td>
                                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{s.submittedBy?.name}</td>
                                                                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(s.trustedTimestamp)}</td>
                                                                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{formatBytes(s.fileSize)}</td>
                                                                <td><div className="hash-display" title={s.sha256Hash} onClick={() => navigator.clipboard.writeText(s.sha256Hash)}>{s.sha256Hash.substring(0, 12)}…</div></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Event Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Create New Event</h2>
                            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
                        </div>
                        {formError && <div className="alert alert-error">⚠️ {formError}</div>}
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Event Title</label>
                                <input id="ev-title" type="text" className="form-input" placeholder="HackNova 2025 Finals" required
                                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea id="ev-desc" className="form-textarea" placeholder="Describe the hackathon..." required
                                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Submission Deadline</label>
                                <input id="ev-deadline" type="datetime-local" className="form-input" required min={minDeadline()}
                                    value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tags (comma separated)</label>
                                <input type="text" className="form-input" placeholder="AI, Web Dev, Blockchain"
                                    value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Team Size</label>
                                <input type="number" className="form-input" min={1} max={10}
                                    value={form.maxTeamSize} onChange={e => setForm(f => ({ ...f, maxTeamSize: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button type="submit" className="btn btn-primary" disabled={creating} style={{ flex: 1 }}>
                                    {creating ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '✅ Create Event'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
