import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import gsap from 'gsap';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', organization: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const boxRef = useRef(null);
    const fieldsRef = useRef(null);

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
                    opacity: 0,
                    stagger: 0.08,
                    duration: 0.5,
                    delay: 0.3,
                    ease: 'power2.out',
                });
            }
        });

        return () => ctx.revert();
    }, []);

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) {
            return setError('Password must be at least 6 characters.');
        }
        setLoading(true);
        try {
            const data = await register(form);
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
        <div className="auth-page">
            {/* Animated background orbs */}
            <div style={{
                position: 'absolute', top: '15%', right: '20%',
                width: 280, height: 280, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.07), transparent 70%)',
                animation: 'hero-glow-pulse 9s ease-in-out infinite',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '15%', left: '10%',
                width: 220, height: 220, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(37,99,235,0.06), transparent 70%)',
                animation: 'hero-glow-pulse 11s ease-in-out infinite 3s',
                pointerEvents: 'none',
            }} />

            <div className="auth-box" ref={boxRef} style={{ animation: 'none' }}>
                <div className="auth-logo">
                    <div className="auth-logo-icon">🛡️</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>HackNova</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submission Integrity Platform</div>
                    </div>
                </div>

                <h1 className="auth-title">Create Account</h1>
                <p className="auth-subtitle">Join as an organizer or participant</p>

                {error && <div className="alert alert-error">⚠️ {error}</div>}

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
                            <option value="user">👤 Participant (Team Leader)</option>
                            <option value="organizer">🏛️ Organizer</option>
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

                    <button id="reg-submit" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-blue-light)', fontWeight: 600 }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
}
