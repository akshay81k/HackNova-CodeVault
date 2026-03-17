import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, LayoutDashboard, Search, CheckCircle, Menu, X } from 'lucide-react';
import gsap from 'gsap';

import { RealisticVaultIcon } from './Icons';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navRef = useRef(null);
    const brandRef = useRef(null);
    const linksRef = useRef(null);
    const userRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/');
        setMobileOpen(false);
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
    const dashPath = user?.role === 'admin' ? '/admin' : user?.role === 'organizer' ? '/organizer' : '/user';

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Brand slide in
            gsap.set(brandRef.current, { x: -30, opacity: 0 });
            gsap.to(brandRef.current, {
                x: 0,
                opacity: 1,
                duration: 0.7,
                ease: 'power3.out',
            });

            // Center links drop in
            const links = linksRef.current?.children;
            if (links?.length) {
                gsap.set(links, { y: -15, opacity: 0 });
                gsap.to(links, {
                    y: 0,
                    opacity: 1,
                    stagger: 0.08,
                    duration: 0.5,
                    ease: 'power2.out',
                    delay: 0.3,
                });
            }

            // User area slide in
            if (userRef.current) {
                gsap.set(userRef.current, { x: 30, opacity: 0 });
                gsap.to(userRef.current, {
                    x: 0,
                    opacity: 1,
                    duration: 0.6,
                    ease: 'power3.out',
                    delay: 0.4,
                });
            }
        }, navRef);

        return () => ctx.revert();
    }, []);

    const badgeClass = user ? `nav-badge badge-${user.role}` : '';

    return (
        <nav className="navbar" ref={navRef}>
            {/* Brand */}
            <Link to="/" className="navbar-brand" ref={brandRef} style={{ textDecoration: 'none' }}>
                <div className="brand-icon-wrap">
                    <div className="brand-icon">
                        <RealisticVaultIcon size={24} />
                    </div>
                    <div className="brand-glow" />
                </div>
                <span className="brand-text">
                    Code<span className="accent">Vault</span>
                </span>
            </Link>

            {/* Center Links — desktop */}
            <div className="navbar-center" ref={linksRef}>
                <Link to="/events" className={`nav-link ${isActive('/events') ? 'active' : ''}`}>
                    <Search size={15} />
                    <span>Events</span>
                </Link>
                <Link to="/verify" className={`nav-link ${isActive('/verify') ? 'active' : ''}`}>
                    <CheckCircle size={15} />
                    <span>Verify</span>
                </Link>
                {user && (
                    <Link to={dashPath} className={`nav-link ${isActive(dashPath) ? 'active' : ''}`}>
                        <LayoutDashboard size={15} />
                        <span>Dashboard</span>
                    </Link>
                )}
            </div>

            {/* Right side — user info */}
            <div className="navbar-right" ref={userRef}>
                {user ? (
                    <>
                        <div className="nav-user-info">
                            <div className="nav-avatar">
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="nav-user-details">
                                <span className="nav-user-name">{user.name}</span>
                                <span className={badgeClass}>{user.role}</span>
                            </div>
                        </div>
                        <button className="btn-icon" onClick={handleLogout} title="Logout">
                            <LogOut size={17} />
                        </button>
                    </>
                ) : (
                    <div className="nav-auth-buttons">
                        <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                        <Link to="/register" className="btn btn-primary btn-sm nav-register-btn">
                            Get Started
                        </Link>
                    </div>
                )}
            </div>

            {/* Mobile hamburger */}
            <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="mobile-drawer">
                    <div className="mobile-drawer-links">
                        <Link to="/events" className={`mobile-link ${isActive('/events') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                            <Search size={16} /> Events
                        </Link>
                        <Link to="/verify" className={`mobile-link ${isActive('/verify') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                            <CheckCircle size={16} /> Verify
                        </Link>
                        {user && (
                            <Link to={dashPath} className={`mobile-link ${isActive(dashPath) ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                                <LayoutDashboard size={16} /> Dashboard
                            </Link>
                        )}
                    </div>
                    <div className="mobile-drawer-footer">
                        {user ? (
                            <button className="btn btn-danger btn-full" onClick={handleLogout}>
                                <LogOut size={16} /> Logout
                            </button>
                        ) : (
                            <>
                                <Link to="/login" className="btn btn-secondary btn-full" onClick={() => setMobileOpen(false)}>Login</Link>
                                <Link to="/register" className="btn btn-primary btn-full" onClick={() => setMobileOpen(false)}>Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
