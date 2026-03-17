import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, Shield } from 'lucide-react';
import gsap from 'gsap';
import InteractiveBackground from '../components/InteractiveBackground';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', organization: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');

    const { register, googleAuth } = useAuth();
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

    // Initialize Google Sign-Up
    const handleGoogleResponse = useCallback(async (response) => {
        setError('');
        setLoading(true);
        try {
            const data = await googleAuth(response.credential, turnstileToken, form.role, form.organization);
            if (data.user.role === 'admin') navigate('/admin');
            else if (data.user.role === 'organizer') navigate('/organizer');
            else navigate('/user');
        } catch (err) {
            setError(err.response?.data?.message || 'Google Sign-Up failed.');
        } finally {
            setLoading(false);
        }
    }, [googleAuth, navigate, turnstileToken, form.role, form.organization]);

    useEffect(() => {
        const initGoogle = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                });
                const googleBtnContainer = document.getElementById('google-signup-btn-register');
                if (googleBtnContainer) {
                    googleBtnContainer.innerHTML = '';
                    window.google.accounts.id.renderButton(googleBtnContainer, {
                        theme: 'filled_black',
                        size: 'large',
                        width: '100%',
                        text: 'signup_with',
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

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) {
            return setError('Password must be at least 6 characters.');
        }

        setLoading(true);
        try {
            const data = await register({ ...form, turnstileToken });
            if (data.user.role === 'admin') navigate('/admin');
            else if (data.user.role === 'organizer') navigate('/organizer');
            else navigate('/user');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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

                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join as an organizer or participant</p>

                    {error && <div className="alert alert-error"><AlertTriangle size={14} /> {error}</div>}

                    <form onSubmit={handleSubmit} ref={fieldsRef}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input id="reg-name" type="text" name="name" className="form-input" placeholder="Jane Doe"
                                value={form.name} onChange={handleChange} required minLength={2} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input id="reg-email" type="email" name="email" className="form-input" placeholder="you@example.com"
                                value={form.email} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select id="reg-role" name="role" className="form-select" value={form.role} onChange={handleChange}>
                                <option value="user">Participant (Team Leader)</option>
                                <option value="organizer">Organizer</option>
                            </select>
                        </div>

                        {form.role === 'organizer' && (
                            <div className="form-group">
                                <label className="form-label">Organization / Institution</label>
                                <input type="text" name="organization" className="form-input" placeholder="MIT, Google, etc."
                                    value={form.organization} onChange={handleChange} />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reg-password"
                                    type={showPass ? 'text' : 'password'}
                                    name="password"
                                    className="form-input"
                                    placeholder="Min. 6 characters"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    style={{ paddingRight: '48px' }}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        {/* Cloudflare Turnstile CAPTCHA */}
                        <div style={{ margin: '16px 0', display: 'flex', justifyContent: 'center' }}>
                            <div ref={turnstileRef}></div>
                        </div>

                        <button id="reg-submit" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8, opacity: 1, visibility: 'visible' }}>
                            {loading ? 'Processing...' : 'Create Account'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>or sign up with</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                    </div>

                    {/* Google Sign-Up Button */}
                    <div id="google-signup-btn-register" style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}></div>

                    <div className="auth-footer">
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--accent-blue-light)', fontWeight: 600 }}>Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
