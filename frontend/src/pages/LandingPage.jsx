import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Hash, Clock, CheckCircle, ArrowRight, GitBranch, Eye } from 'lucide-react';
import Navbar from '../components/Navbar';

const features = [
    {
        icon: '🔐',
        bg: 'rgba(37,99,235,0.12)',
        title: 'SHA-256 Integrity',
        desc: 'Every submission is cryptographically hashed on arrival. Any post-submission change is instantly detectable.'
    },
    {
        icon: '⏱️',
        bg: 'rgba(245,158,11,0.12)',
        title: 'Trusted Timestamps',
        desc: 'Server-side timestamps are recorded at the exact moment of upload — deadline enforcement is automatic.'
    },
    {
        icon: '👁️',
        bg: 'rgba(16,185,129,0.12)',
        title: 'Public Verification',
        desc: 'Judges can verify any submission hash independently, with zero access to the codebase itself.'
    },
    {
        icon: '🏛️',
        bg: 'rgba(139,92,246,0.12)',
        title: 'Role-Based Access',
        desc: 'Admin, Organizer, and Participant roles with strict permission boundaries at every API endpoint.'
    },
    {
        icon: '📁',
        bg: 'rgba(6,182,212,0.12)',
        title: '.git Folder Submission',
        desc: 'Upload your committed .git folder as a ZIP. Full commit history is preserved and hashed.'
    },
    {
        icon: '🚫',
        bg: 'rgba(239,68,68,0.12)',
        title: 'Zero Late Submissions',
        desc: 'Backend enforces deadline at millisecond precision. No grace periods, no exceptions.'
    }
];

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="page-wrapper">
            <Navbar />

            {/* Hero */}
            <section className="hero">
                <div className="hero-badge">
                    🛡️ Cryptographic Submission Integrity
                </div>
                <h1 className="hero-title">
                    Hackathon Submissions<br />You Can Trust
                </h1>
                <p className="hero-subtitle">
                    HackNova ensures every submission is tamper-proof, timestamped, and independently verifiable —
                    building trust between participants and organizers.
                </p>
                <div className="hero-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                        Get Started <ArrowRight size={18} />
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={() => navigate('/verify')}>
                        <Eye size={18} /> Verify a Submission
                    </button>
                </div>

                {/* Mini stat row */}
                <div style={{ display: 'flex', gap: 32, marginTop: 56, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[['SHA-256', 'Hash Algorithm'], ['RFC 3161', 'Timestamp Standard'], ['0ms', 'Deadline Grace']].map(([val, lbl]) => (
                        <div key={lbl} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue-light)', fontFamily: 'var(--font-mono)' }}>{val}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{lbl}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="features-grid">
                {features.map(f => (
                    <div className="feature-card" key={f.title}>
                        <div className="feature-icon" style={{ background: f.bg }}>{f.icon}</div>
                        <h3 className="feature-title">{f.title}</h3>
                        <p className="feature-desc">{f.desc}</p>
                    </div>
                ))}
            </section>

            {/* CTA */}
            <section style={{ textAlign: 'center', padding: '60px 24px 80px', borderTop: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>Ready to run a fair hackathon?</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
                    Create an organizer account and set up your first event in minutes.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/register" className="btn btn-primary btn-lg">Create Organizer Account</Link>
                    <Link to="/events" className="btn btn-secondary btn-lg">Browse Events</Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem' }}>
                    🛡️ HackNova
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Submission integrity platform — Built for hackathons
                </div>
            </footer>
        </div>
    );
}
