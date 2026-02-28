import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, LayoutDashboard, Search, CheckCircle } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const badgeClass = user ? `nav-badge badge-${user.role}` : '';
    const dashPath = user?.role === 'admin' ? '/admin' : user?.role === 'organizer' ? '/organizer' : '/user';

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
                <div className="brand-icon">🛡️</div>
                <span>Code<span className="accent">Vault</span></span>
            </Link>

            <div className="navbar-links">
                <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>
                    <Search size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Events
                </Link>
                <Link to="/verify" className={`nav-link ${isActive('/verify') ? 'active' : ''}`}>
                    <CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Verify
                </Link>
                {user && (
                    <Link to={dashPath} className={`nav-link ${isActive(dashPath) ? 'active' : ''}`}>
                        <LayoutDashboard size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Dashboard
                    </Link>
                )}
            </div>

            <div className="nav-user">
                {user ? (
                    <>
                        <span className={badgeClass}>{user.role}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.name}</span>
                        <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
                            <LogOut size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
                        <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
}
