import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import InteractiveBackground from '../components/InteractiveBackground';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Calendar, FileText, X, ChevronDown,
    Upload, Users, Download, ExternalLink, Copy,
    CheckCircle, Clock, AlertCircle, Shield, Search, Crown
} from 'lucide-react';

export default function OrganizerDashboard() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [subLoading, setSubLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formError, setFormError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', deadline: '', tags: '', maxTeamSize: 5 });
    const [teamsFile, setTeamsFile] = useState(null);
    const [creating, setCreating] = useState(false);

    // Per-submission download state: { [submissionId]: 'idle'|'loading'|'done'|'error' }
    const [dlState, setDlState] = useState({});
    // Copied hash ID
    const [copiedId, setCopiedId] = useState(null);

    const teamsFileRef = useRef();

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
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('description', form.description);
            formData.append('deadline', form.deadline);
            formData.append('tags', form.tags.split(',').map(t => t.trim()).filter(Boolean).join(','));
            formData.append('maxTeamSize', form.maxTeamSize);
            
            if (!teamsFile) {
                setFormError('Participating Teams List (CSV/Excel) is required.');
                setCreating(false);
                return;
            }
            formData.append('teamsFile', teamsFile);

            await API.post('/events', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setShowCreateModal(false);
            setForm({ title: '', description: '', deadline: '', tags: '', maxTeamSize: 5 });
            setTeamsFile(null);
            loadEvents();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create event.');
        } finally {
            setCreating(false);
        }
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setFormError('');
        setTeamsFile(null);
        setForm({ title: '', description: '', deadline: '', tags: '', maxTeamSize: 5 });
    };

    // Download from S3 (pre-signed URL)
    const handleDownload = async (submission) => {
        setDlState(prev => ({ ...prev, [submission._id]: 'loading' }));
        try {
            const { data } = await API.get(`/submissions/${submission._id}/download`);
            // Trigger browser download via hidden link
            const a = document.createElement('a');
            a.href = data.downloadUrl;
            a.download = data.fileName || 'submission.zip';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setDlState(prev => ({ ...prev, [submission._id]: 'done' }));
            // Reset icon after 3 seconds
            setTimeout(() => setDlState(prev => ({ ...prev, [submission._id]: 'idle' })), 3000);
        } catch (err) {
            console.error('[Download] error:', err);
            setDlState(prev => ({ ...prev, [submission._id]: 'error' }));
            setTimeout(() => setDlState(prev => ({ ...prev, [submission._id]: 'idle' })), 3000);
        }
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const formatDate = (d) =>
        new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    const formatBytes = (b) =>
        b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

    const minDeadline = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 5);
        return d.toISOString().slice(0, 16);
    };

    const totalSubs = events.reduce((a, e) => a + (e.submissionCount || 0), 0);
    const activeCount = events.filter(e => !e.isExpired).length;

    return (
        <div className="page-wrapper" style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
            <Navbar />
            <div className="dashboard-main">

                {/* Header */}
                <div style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--accent-blue-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                                Organizer Command Center
                            </div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                My Events
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.95rem' }}>
                                Manage your hackathons and secure submission pipelines.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <button className="btn btn-premium-purple pulse-purple" onClick={() => navigate('/subscription')} style={{ padding: '12px 24px' }}>
                                <Crown size={18} /> Upgrade Plan
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Dashboard Overview</div>
                    <button className="btn btn-premium-blue" onClick={() => setShowCreateModal(true)} style={{ padding: '12px 24px', borderRadius: '14px' }}>
                        <Plus size={20} strokeWidth={3} /> Create New Event
                    </button>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.12)' }}>
                            <Calendar size={20} color="var(--accent-blue-light)" />
                        </div>
                        <div className="stat-value">{events.length}</div>
                        <div className="stat-label">My Events</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
                            <FileText size={20} color="var(--accent-green)" />
                        </div>
                        <div className="stat-value">{totalSubs}</div>
                        <div className="stat-label">Total Submissions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
                            <Calendar size={20} color="var(--accent-amber)" />
                        </div>
                        <div className="stat-value">{activeCount}</div>
                        <div className="stat-label">Active Events</div>
                    </div>
                </div>

                {/* Events List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div className="spinner" style={{ margin: '0 auto' }} />
                    </div>
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
                                {/* Event header row */}
                                <div
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                                    onClick={() => handleSelectEvent(ev)}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{ev.title}</span>
                                            <span className={`status-badge ${ev.isExpired ? 'status-expired' : 'status-active'}`}>
                                                {ev.isExpired ? 'Expired' : 'Active'}
                                            </span>
                                            {ev.teamsFileName && (
                                                <span className="status-badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                    <Users size={11} style={{ display: 'inline', marginRight: 4 }} />Teams CSV
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {ev.description}
                                        </div>
                                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                🕐 Deadline: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(ev.deadline)}</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue-light)', fontWeight: 600 }}>
                                                📁 {ev.submissionCount} submission{ev.submissionCount !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        color="var(--text-muted)"
                                        style={{
                                            transform: selectedEvent?._id === ev._id ? 'rotate(180deg)' : 'none',
                                            transition: '0.2s',
                                            marginLeft: 12,
                                            flexShrink: 0
                                        }}
                                    />
                                </div>

                                {/* ── Submissions Accordion ─────────────────────────────── */}
                                {selectedEvent?._id === ev._id && (
                                    <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                                        {/* Section header */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                            <Shield size={16} color="var(--accent-blue-light)" />
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                                Project Submissions
                                            </span>
                                            <span style={{
                                                background: 'rgba(37,99,235,0.15)',
                                                color: 'var(--accent-blue-light)',
                                                borderRadius: 99,
                                                padding: '1px 10px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700
                                            }}>
                                                {submissions.length}
                                            </span>
                                            <div style={{ flex: 1 }} />
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Download size={12} /> Download links are time-limited S3 pre-signed URLs (5 min)
                                            </div>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 5,
                                                    background: 'rgba(139,92,246,0.1)',
                                                    borderColor: 'rgba(139,92,246,0.3)',
                                                    color: 'var(--accent-purple)',
                                                    fontWeight: 600
                                                }}
                                                onClick={(e) => { e.stopPropagation(); navigate(`/plagiarism/${ev._id}`); }}
                                            >
                                                <Search size={13} /> Check Plagiarism
                                            </button>
                                        </div>

                                        {subLoading ? (
                                            <div style={{ textAlign: 'center', padding: 40 }}>
                                                <div className="spinner" style={{ margin: '0 auto' }} />
                                                <div style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.85rem' }}>Loading submissions…</div>
                                            </div>
                                        ) : submissions.length === 0 ? (
                                            <div className="empty-state" style={{ padding: '32px 0' }}>
                                                <div className="empty-state-icon" style={{ fontSize: '1.8rem' }}>📂</div>
                                                <div className="empty-state-title">No submissions yet</div>
                                                <div className="empty-state-desc">Submissions will appear here once teams start uploading</div>
                                            </div>
                                        ) : (
                                            <div className="table-wrapper">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Sub #</th>
                                                            <th>Team ID</th>
                                                            <th>Team Name</th>
                                                            <th>Submitted By</th>
                                                            <th>Timestamp</th>
                                                            <th>SHA-256 Hash</th>
                                                            <th>Blockchain TX</th>
                                                            <th>Category</th>
                                                            <th>File</th>
                                                            <th>Download</th>
                                                            <th>Timeline</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            // Deduplicate: group by teamId, keep latest (highest submissionNumber)
                                                            const teamMap = {};
                                                            submissions.forEach(s => {
                                                                const key = s.teamId || s._id;
                                                                if (!teamMap[key] || (s.submissionNumber || 1) > (teamMap[key].submissionNumber || 1)) {
                                                                    teamMap[key] = s;
                                                                }
                                                            });
                                                            const deduped = Object.values(teamMap);
                                                            return deduped.map(s => {
                                                            const dlStatus = dlState[s._id] || 'idle';
                                                            const isAnchored = s.blockchainAnchored && s.blockchainTxId;
                                                            return (
                                                                <tr key={s._id}>
                                                                    {/* Sub # */}
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <span style={{
                                                                            background: s.submissionNumber > 1 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.1)',
                                                                            color: s.submissionNumber > 1 ? 'var(--accent-amber)' : 'var(--accent-green)',
                                                                            borderRadius: 4,
                                                                            padding: '2px 7px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 700
                                                                        }}>
                                                                            #{s.submissionNumber || 1}
                                                                        </span>
                                                                    </td>

                                                                    {/* Team ID */}
                                                                    <td>
                                                                        <span
                                                                            className="mono"
                                                                            title={s.teamId}
                                                                            style={{
                                                                                background: 'rgba(37,99,235,0.08)',
                                                                                color: 'var(--accent-blue-light)',
                                                                                padding: '2px 8px',
                                                                                borderRadius: 4,
                                                                                fontSize: '0.78rem',
                                                                                fontWeight: 600,
                                                                                cursor: 'pointer',
                                                                                userSelect: 'all'
                                                                            }}
                                                                            onClick={() => copyToClipboard(s.teamId, `tid-${s._id}`)}
                                                                        >
                                                                            {s.teamId || '—'}
                                                                            {copiedId === `tid-${s._id}`
                                                                                ? <CheckCircle size={10} style={{ marginLeft: 4, display: 'inline' }} />
                                                                                : <Copy size={10} style={{ marginLeft: 4, display: 'inline', opacity: 0.5 }} />}
                                                                        </span>
                                                                    </td>

                                                                    {/* Team Name */}
                                                                    <td style={{ fontWeight: 500, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {s.teamName || '—'}
                                                                    </td>

                                                                    {/* Submitted By */}
                                                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                                                        {s.submittedBy?.name || '—'}
                                                                    </td>

                                                                    {/* Timestamp */}
                                                                    <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                                        <Clock size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                                                                        {formatDate(s.trustedTimestamp)}
                                                                    </td>

                                                                    {/* SHA-256 Hash */}
                                                                    <td>
                                                                        <div
                                                                            title={s.sha256Hash}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 5,
                                                                                cursor: 'pointer'
                                                                            }}
                                                                            onClick={() => copyToClipboard(s.sha256Hash, `hash-${s._id}`)}
                                                                        >
                                                                            <span
                                                                                className="mono"
                                                                                style={{
                                                                                    fontSize: '0.73rem',
                                                                                    color: 'var(--accent-cyan)',
                                                                                    background: 'rgba(6,182,212,0.08)',
                                                                                    padding: '2px 6px',
                                                                                    borderRadius: 4,
                                                                                    letterSpacing: '0.03em'
                                                                                }}
                                                                            >
                                                                                {s.sha256Hash.substring(0, 14)}…
                                                                            </span>
                                                                            {copiedId === `hash-${s._id}`
                                                                                ? <CheckCircle size={12} color="var(--accent-green)" />
                                                                                : <Copy size={11} color="var(--text-muted)" style={{ opacity: 0.5 }} />}
                                                                        </div>
                                                                    </td>

                                                                    {/* Blockchain TX */}
                                                                    <td>
                                                                        {isAnchored ? (
                                                                            <a
                                                                                href={`https://explorer.solana.com/tx/${s.blockchainTxId}?cluster=devnet`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                title={s.blockchainTxId}
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: 4,
                                                                                    color: 'var(--accent-green)',
                                                                                    fontSize: '0.73rem',
                                                                                    textDecoration: 'none',
                                                                                    fontFamily: 'monospace'
                                                                                }}
                                                                            >
                                                                                <CheckCircle size={12} />
                                                                                {s.blockchainTxId.substring(0, 10)}…
                                                                                <ExternalLink size={10} />
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                <AlertCircle size={12} color="var(--accent-amber)" />
                                                                                Not anchored
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    {/* ML Category */}
                                                                    <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                                                        {s.mlCategory ? (
                                                                            <div>
                                                                                <span style={{ fontWeight: 600, color: 'var(--accent-blue-light)' }}>{s.mlCategory}</span>
                                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                                                    {s.mlConfidence ? `${(s.mlConfidence * 100).toFixed(1)}% match` : ''}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                                        )}
                                                                    </td>

                                                                    {/* File info */}
                                                                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                                        <div style={{ fontWeight: 500, color: 'var(--text-secondary)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                                            title={s.originalFileName}>
                                                                            {s.originalFileName}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.7rem', marginTop: 1 }}>{formatBytes(s.fileSize)}</div>
                                                                    </td>

                                                                    {/* Download button */}
                                                                    <td>
                                                                        <button
                                                                            id={`dl-btn-${s._id}`}
                                                                            className="btn btn-secondary"
                                                                            style={{
                                                                                padding: '5px 12px',
                                                                                fontSize: '0.78rem',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 5,
                                                                                minWidth: 100,
                                                                                justifyContent: 'center',
                                                                                background: dlStatus === 'done'
                                                                                    ? 'rgba(16,185,129,0.15)'
                                                                                    : dlStatus === 'error'
                                                                                        ? 'rgba(239,68,68,0.15)'
                                                                                        : undefined,
                                                                                color: dlStatus === 'done'
                                                                                    ? 'var(--accent-green)'
                                                                                    : dlStatus === 'error'
                                                                                        ? 'var(--accent-red)'
                                                                                        : undefined,
                                                                                borderColor: dlStatus === 'done'
                                                                                    ? 'rgba(16,185,129,0.4)'
                                                                                    : dlStatus === 'error'
                                                                                        ? 'rgba(239,68,68,0.4)'
                                                                                        : undefined
                                                                            }}
                                                                            disabled={dlStatus === 'loading'}
                                                                            onClick={() => handleDownload(s)}
                                                                            title={s.s3Key ? 'Download from AWS S3 (5-min link)' : 'Download file'}
                                                                        >
                                                                            {dlStatus === 'loading' ? (
                                                                                <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Generating…</>
                                                                            ) : dlStatus === 'done' ? (
                                                                                <><CheckCircle size={13} /> Downloaded</>
                                                                            ) : dlStatus === 'error' ? (
                                                                                <><AlertCircle size={13} /> Failed</>
                                                                            ) : (
                                                                                <>
                                                                                    <Download size={13} />
                                                                                    {s.s3Key ? 'S3 Download' : 'Download'}
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </td>

                                                                    {/* Timeline button */}
                                                                    <td>
                                                                        <button
                                                                            className="btn btn-secondary btn-sm"
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 4,
                                                                                fontSize: '0.75rem',
                                                                                padding: '4px 10px',
                                                                                background: 'rgba(139,92,246,0.1)',
                                                                                borderColor: 'rgba(139,92,246,0.3)',
                                                                                color: 'var(--accent-purple)',
                                                                                fontWeight: 600
                                                                            }}
                                                                            onClick={() => navigate(`/timeline/${s._id}`)}
                                                                        >
                                                                            <Clock size={12} /> Timeline
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                        })()}
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

            {/* ── Create Event Modal ────────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div
                        className="modal"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Create New Event</h2>
                            <button className="btn btn-ghost" onClick={handleCloseModal}><X size={18} /></button>
                        </div>
                        {formError && <div className="alert alert-error"><AlertCircle size={14} /> {formError}</div>}
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Event Title</label>
                                <input
                                    id="ev-title" type="text" className="form-input"
                                    placeholder="HackNova 2025 Finals" required
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    id="ev-desc" className="form-textarea"
                                    placeholder="Describe the hackathon..." required
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Submission Deadline</label>
                                <input
                                    id="ev-deadline" type="datetime-local" className="form-input"
                                    required min={minDeadline()}
                                    value={form.deadline}
                                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tags (comma separated)</label>
                                <input
                                    type="text" className="form-input" placeholder="AI, Web Dev, Blockchain"
                                    value={form.tags}
                                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Team Size</label>
                                <input
                                    type="number" className="form-input" min={1} max={10}
                                    value={form.maxTeamSize}
                                    onChange={e => setForm(f => ({ ...f, maxTeamSize: e.target.value }))}
                                />
                            </div>

                            {/* Teams CSV/Excel Upload */}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Users size={15} /> Participating Teams List <span style={{ color: 'var(--accent-red)', marginLeft: -2 }}>*</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                        (CSV or Excel)
                                    </span>
                                </label>
                                <div
                                    style={{
                                        border: `2px dashed ${teamsFile ? 'var(--accent-green)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '16px 20px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: teamsFile ? 'rgba(16,185,129,0.04)' : 'transparent',
                                        transition: 'border-color 0.2s, background 0.2s'
                                    }}
                                    onClick={() => teamsFileRef.current.click()}
                                >
                                    <input
                                        ref={teamsFileRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        style={{ display: 'none' }}
                                        onChange={e => setTeamsFile(e.target.files[0] || null)}
                                    />
                                    {teamsFile ? (
                                        <div className="animate-scale-in">
                                            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>📊</div>
                                            <div style={{ fontWeight: 600, color: 'var(--accent-green)', fontSize: '0.9rem' }}>{teamsFile.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Click to replace</div>
                                        </div>
                                    ) : (
                                        <div className="animate-scale-in">
                                            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>
                                                <Upload size={22} color="var(--text-muted)" style={{ display: 'inline' }} />
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                Upload Teams CSV / Excel
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                                                File should have columns: <code>teamId</code>, <code>teamName</code><br />
                                                (First column = teamId, Second = teamName if headers differ)
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {teamsFile && (
                                    <button
                                        type="button" className="btn btn-ghost btn-sm animate-fade-in"
                                        style={{ marginTop: 6, color: 'var(--accent-red)' }}
                                        onClick={() => { setTeamsFile(null); teamsFileRef.current.value = ''; }}
                                    >
                                        Remove file
                                    </button>
                                )}
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                                    If uploaded, participants must verify their Team ID before submitting.
                                    If not uploaded, all Team IDs are accepted.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button type="submit" className="btn btn-primary" disabled={creating} style={{ flex: 1 }}>
                                    {creating
                                        ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                        : 'Create Event'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
