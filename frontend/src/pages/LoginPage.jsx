import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import gsap from 'gsap';
import InteractiveBackground from '../components/InteractiveBackground';
import Navbar from '../components/Navbar';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');

    const { login, googleAuth } = useAuth();
    const navigate = useNavigate();

    const boxRef = useRef(null);
    const fieldsRef = useRef(null);
    const turnstileRef = useRef(null);
    const turnstileWidgetId = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(boxRef.current, {
                y: 40,
                opacity: 0,
                scale: 0.95,
                duration: 0.7,
                ease: 'power3.out',
            });

            const fields = fieldsRef.current?.children;
            if (fields?.length) {
                gsap.from(fields, {
                    y: 20,
                    opacity: 1,
                    stagger: 0.08,
                    duration: 0.5,
                    delay: 0.3,
                    ease: 'power2.out',
                });
            }
        });

        return () => ctx.revert();
    }, []);

    // Render Turnstile widget
    useEffect(() => {
        const renderTurnstile = () => {
            if (window.turnstile && turnstileRef.current && turnstileWidgetId.current === null) {
                turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
                    sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
                    callback: (token) => setTurnstileToken(token),
                    'expired-callback': () => setTurnstileToken(''),
                    theme: 'dark',
                });
            }
        };

        // Retry until turnstile is available (async script)
        const interval = setInterval(() => {
            if (window.turnstile) {
                renderTurnstile();
                clearInterval(interval);
            }
        }, 300);

        return () => {
            clearInterval(interval);
            if (turnstileWidgetId.current !== null && window.turnstile) {
                window.turnstile.remove(turnstileWidgetId.current);
                turnstileWidgetId.current = null;
            }
        };
    }, []);

    // Initialize Google Sign-In
    const handleGoogleResponse = useCallback(async (response) => {
        setError('');
        setLoading(true);
        try {
            const data = await googleAuth(response.credential, turnstileToken);
            if (data.user.role === 'admin') navigate('/admin');
            else if (data.user.role === 'organizer') navigate('/organizer');
            else navigate('/user');
        } catch (err) {
            setError(err.response?.data?.message || 'Google Sign-In failed.');
        } finally {
            setLoading(false);
        }
    }, [googleAuth, navigate, turnstileToken]);

    useEffect(() => {
        const initGoogle = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                });
                const googleBtnContainer = document.getElementById('google-signin-btn-login');
                if (googleBtnContainer) {
                    googleBtnContainer.innerHTML = '';
                    window.google.accounts.id.renderButton(googleBtnContainer, {
                        theme: 'filled_black',
                        size: 'large',
                        width: '100%',
                        text: 'signin_with',
                        shape: 'pill',
                    });
                }
            }
        };

        const interval = setInterval(() => {
            if (window.google?.accounts?.id) {
                initGoogle();
                clearInterval(interval);
            }
        }, 300);

        return () => clearInterval(interval);
    }, [handleGoogleResponse]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(email, password, turnstileToken);
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
                        <div className="auth-logo-icon"><Shield size={22} color="#fff" /></div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>HackNova</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submission Integrity Platform</div>
                        </div>
                    </div>

                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-subtitle">Sign in to your account to continue</p>

                    {error && <div className="alert alert-error"><AlertTriangle size={14} /> {error}</div>}

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

                        {/* Cloudflare Turnstile CAPTCHA */}
                        <div style={{ margin: '16px 0', display: 'flex', justifyContent: 'center' }}>
                            <div ref={turnstileRef}></div>
                        </div>

                        <button id="login-submit" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8, opacity: 1, visibility: 'visible' }}>
                            {loading ? 'Processing...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>or continue with</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                    </div>

                    {/* Google Sign-In Button */}
                    <div id="google-signin-btn-login" style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}></div>

                    <div className="auth-footer">
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: 'var(--accent-blue-light)', fontWeight: 600 }}>Create one</Link>
                    </div>

                    <Link to="/verify" className="btn btn-secondary btn-full btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>
                        Verify a Submission (No login required)
                    </Link>
                </div>
            </div>
        </div>
    );
}
