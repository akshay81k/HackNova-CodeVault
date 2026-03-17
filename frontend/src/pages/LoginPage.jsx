import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield } from 'lucide-react';
import gsap from 'gsap';
import InteractiveBackground from '../components/InteractiveBackground';
import Navbar from '../components/Navbar'; // Added Navbar import

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const boxRef = useRef(null);
    const fieldsRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Auth box entrance
            gsap.from(boxRef.current, {
                y: 40,
                opacity: 0,
                scale: 0.95,
                duration: 0.7,
                ease: 'power3.out',
            });

            // Stagger form fields
            const fields = fieldsRef.current?.children;
            if (fields?.length) {
                gsap.from(fields, {
                    y: 20,
                    opacity: 1, // Ensure visible
                    stagger: 0.08,
                    duration: 0.5,
                    delay: 0.3,
                    ease: 'power2.out',
                });
            }
        });

        return () => ctx.revert();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(email, password);
            // Redirect based on role
            if (data.user.role === 'admin') navigate('/admin');
            else if (data.user.role === 'organizer') navigate('/organizer');
            else navigate('/user');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="page-wrapper" style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
            <Navbar />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 100px)', padding: '40px 20px' }}>
                <div className="auth-box" ref={boxRef} style={{ animation: 'none', margin: 0 }}>
                    <div className="auth-logo">
                        <div className="auth-logo-icon">🛡️</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>HackNova</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submission Integrity Platform</div>
                        </div>
                    </div>

                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-subtitle">Sign in to your account to continue</p>

                    {error && <div className="alert alert-error">⚠️ {error}</div>}

                    <form onSubmit={handleSubmit} ref={fieldsRef}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                id="login-email"
                                type="email"
                                className="form-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
                                    type={showPass ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '48px' }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                                >
                                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        <button id="login-submit" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8, opacity: 1, visibility: 'visible' }}>
                            {loading ? 'Processing...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: 'var(--accent-blue-light)', fontWeight: 600 }}>Create one</Link>
                    </div>

                    <Link to="/verify" className="btn btn-secondary btn-full btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>
                        🔍 Verify a Submission (No login required)
                    </Link>
                </div>
            </div>
        </div>
    );
}
