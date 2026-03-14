import { useState, useEffect, useRef } from 'react';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Search, Clock, Users, ArrowRight } from 'lucide-react';
import gsap from 'gsap';

export default function EventsPage() {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const { user } = useAuth();
    const navigate = useNavigate();

    const headerRef = useRef(null);
    const filtersRef = useRef(null);
    const gridRef = useRef(null);

    useEffect(() => {
        loadEvents();
    }, []);

    // Animate header + filters on mount
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(headerRef.current, {
                y: -20,
                opacity: 0,
                duration: 0.6,
                ease: 'power3.out',
            });
            gsap.from(filtersRef.current, {
                y: -10,
                opacity: 0,
                duration: 0.5,
                delay: 0.2,
                ease: 'power2.out',
            });
        });
        return () => ctx.revert();
    }, []);

    // Animate cards when data loads
    useEffect(() => {
        if (!loading && events.length > 0 && gridRef.current) {
            const cards = gridRef.current.querySelectorAll('.event-card');
            gsap.from(cards, {
                y: 40,
                opacity: 0,
                scale: 0.95,
                stagger: 0.08,
                duration: 0.5,
                ease: 'power2.out',
            });
        }
    }, [loading, events]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/events?active=true');
            setEvents(data.events);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const filtered = events.filter(ev => {
        const matchSearch = ev.title.toLowerCase().includes(search.toLowerCase()) ||
            ev.description.toLowerCase().includes(search.toLowerCase()) ||
            (ev.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
        if (filter === 'active') return matchSearch && !ev.isExpired;
        if (filter === 'expired') return matchSearch && ev.isExpired;
        return matchSearch;
    });

    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    const getTimeLeft = (deadline) => {
        const diff = new Date(deadline) - new Date();
        if (diff <= 0) return 'Expired';
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        if (days > 0) return `${days}d ${hours}h left`;
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${mins}m left`;
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
                <div ref={headerRef} style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 8 }}>Hackathon Events</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Find events, submit your project before the deadline</p>
                </div>

                {/* Search + Filter */}
                <div ref={filtersRef} style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            id="event-search"
                            type="text"
                            placeholder="Search events by title, description, or tag..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="tabs" style={{ marginBottom: 0, width: 'auto', minWidth: 240 }}>
                        {['all', 'active', 'expired'].map(f => (
                            <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 80 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-title">No events found</div>
                        <div className="empty-state-desc">Try a different search or filter</div>
                    </div>
                ) : (
                    <div className="events-grid" ref={gridRef}>
                        {filtered.map(ev => {
                            const expired = ev.isExpired;
                            const timeLeft = getTimeLeft(ev.deadline);
                            return (
                                <div key={ev._id} className="event-card" onClick={() => {
                                    if (user?.role === 'user' && !expired) navigate(`/event/${ev._id}`);
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span className={`status-badge ${expired ? 'status-expired' : 'status-active'}`}>
                                            {expired ? '⏰ Expired' : '✅ Active'}
                                        </span>
                                        {ev.tags?.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
                                    </div>

                                    <h3 className="event-card-title">{ev.title}</h3>
                                    <p className="event-card-desc">{ev.description}</p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div className={`event-deadline ${expired ? 'expired' : ''}`}>
                                            <Clock size={13} />
                                            {expired ? 'Deadline passed' : timeLeft} · {formatDate(ev.deadline)}
                                        </div>
                                        <div className="event-meta">
                                            <Users size={13} />
                                            by {ev.organizer?.name}
                                            {ev.organizer?.organization && ` · ${ev.organizer.organization}`}
                                        </div>
                                    </div>

                                    {user?.role === 'user' && !expired && (
                                        <button className="btn btn-primary btn-full" style={{ marginTop: 4 }}
                                            onClick={e => { e.stopPropagation(); navigate(`/event/${ev._id}`); }}>
                                            View Event <ArrowRight size={15} />
                                        </button>
                                    )}
                                    {!user && (
                                        <button className="btn btn-secondary btn-full" style={{ marginTop: 4 }}
                                            onClick={e => { e.stopPropagation(); navigate('/login'); }}>
                                            Login to Submit
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
