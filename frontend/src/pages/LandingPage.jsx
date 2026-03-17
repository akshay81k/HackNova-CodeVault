import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, Sparkles, Shield, Github, Twitter, Mail, ExternalLink, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import InteractiveBackground from '../components/InteractiveBackground';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── Data ── */
const features = [
    {
        icon: '🔐',
        bg: 'rgba(37,99,235,0.12)',
        glow: 'rgba(37,99,235,0.4)',
        title: 'SHA-256 Integrity',
        desc: 'Every submission is cryptographically hashed on arrival. Any post-submission change is instantly detectable.'
    },
    {
        icon: '⏱️',
        bg: 'rgba(245,158,11,0.12)',
        glow: 'rgba(245,158,11,0.4)',
        title: 'Trusted Timestamps',
        desc: 'Server-side timestamps are recorded at the exact moment of upload — deadline enforcement is automatic.'
    },
    {
        icon: '👁️',
        bg: 'rgba(16,185,129,0.12)',
        glow: 'rgba(16,185,129,0.4)',
        title: 'Public Verification',
        desc: 'Judges can verify any submission hash independently, with zero access to the codebase itself.'
    },
    {
        icon: '🏛️',
        bg: 'rgba(139,92,246,0.12)',
        glow: 'rgba(139,92,246,0.4)',
        title: 'Role-Based Access',
        desc: 'Admin, Organizer, and Participant roles with strict permission boundaries at every API endpoint.'
    },
    {
        icon: '📁',
        bg: 'rgba(6,182,212,0.12)',
        glow: 'rgba(6,182,212,0.4)',
        title: '.git Folder Submission',
        desc: 'Upload your committed .git folder as a ZIP. Full commit history is preserved and hashed.'
    },
    {
        icon: '🚫',
        bg: 'rgba(239,68,68,0.12)',
        glow: 'rgba(239,68,68,0.4)',
        title: 'Zero Late Submissions',
        desc: 'Backend enforces deadline at millisecond precision. No grace periods, no exceptions.'
    }
];

const typewriterWords = ['Tamper-Proof', 'Timestamped', 'Verifiable', 'Trusted'];

/* ── Typewriter Hook ── */
function useTypewriter(words, typingSpeed = 100, deleteSpeed = 60, pauseTime = 2000) {
    const [text, setText] = useState('');
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const current = words[wordIndex];
        let timeout;

        if (!isDeleting && text === current) {
            timeout = setTimeout(() => setIsDeleting(true), pauseTime);
        } else if (isDeleting && text === '') {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length);
        } else {
            timeout = setTimeout(() => {
                setText(current.substring(0, text.length + (isDeleting ? -1 : 1)));
            }, isDeleting ? deleteSpeed : typingSpeed);
        }

        return () => clearTimeout(timeout);
    }, [text, wordIndex, isDeleting, words, typingSpeed, deleteSpeed, pauseTime]);

    return text;
}

/* ── Main Component ── */
export default function LandingPage() {
    const navigate = useNavigate();
    const typedWord = useTypewriter(typewriterWords);

    // Refs
    const heroRef = useRef(null);
    const badgeRef = useRef(null);
    const titleRef = useRef(null);
    const subtitleRef = useRef(null);
    const actionsRef = useRef(null);
    const statsRef = useRef(null);
    const featuresRef = useRef(null);
    const featureHeaderRef = useRef(null);
    const ctaRef = useRef(null);
    const footerRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            /* ── Hero entrance ── */
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            tl.from(badgeRef.current, {
                y: -20,
                opacity: 0,
                duration: 0.6,
                scale: 0.9,
            })
            .from(titleRef.current, {
                y: 40,
                opacity: 0,
                duration: 0.8,
                scale: 0.95,
            }, '-=0.3')
            .from(subtitleRef.current, {
                y: 20,
                opacity: 0,
                duration: 0.6,
            }, '-=0.4')
            .from(actionsRef.current?.children || [], {
                y: 20,
                opacity: 0,
                stagger: 0.12,
                duration: 0.5,
            }, '-=0.3')
            .from(statsRef.current?.children || [], {
                y: 15,
                opacity: 0,
                stagger: 0.1,
                duration: 0.4,
            }, '-=0.2');

            /* ── Feature cards ── */
            if (featureHeaderRef.current) {
                gsap.set(featureHeaderRef.current, { y: 30, opacity: 0 });
                ScrollTrigger.create({
                    trigger: featureHeaderRef.current,
                    start: 'top 88%',
                    onEnter: () => {
                        gsap.to(featureHeaderRef.current, {
                            y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
                        });
                    },
                    once: true,
                });
            }

            const featureCards = featuresRef.current?.querySelectorAll('.feature-card');
            if (featureCards?.length) {
                gsap.set(featureCards, { y: 60, opacity: 0, scale: 0.92 });
                ScrollTrigger.create({
                    trigger: featuresRef.current,
                    start: 'top 85%',
                    onEnter: () => {
                        gsap.to(featureCards, {
                            y: 0, opacity: 1, scale: 1,
                            stagger: 0.1, duration: 0.7, ease: 'power2.out',
                        });
                    },
                    once: true,
                });
            }

            /* ── CTA ── */
            if (ctaRef.current) {
                gsap.set(ctaRef.current, { y: 40, opacity: 0 });
                ScrollTrigger.create({
                    trigger: ctaRef.current,
                    start: 'top 90%',
                    onEnter: () => {
                        gsap.to(ctaRef.current, {
                            y: 0, opacity: 1, duration: 0.7, ease: 'power2.out',
                        });
                    },
                    once: true,
                });
            }

            /* ── Footer ── */
            if (footerRef.current) {
                gsap.set(footerRef.current, { y: 20, opacity: 0 });
                ScrollTrigger.create({
                    trigger: footerRef.current,
                    start: 'top 95%',
                    onEnter: () => {
                        gsap.to(footerRef.current, { y: 0, opacity: 1, duration: 0.5 });
                    },
                    once: true,
                });
            }
        }, heroRef);

        return () => ctx.revert();
    }, []);

    return (
        <div className="page-wrapper" ref={heroRef} style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
            <Navbar />

            {/* ═══════════ 1. HERO ═══════════ */}
            <section className="hero">
                {/* Floating decorative elements */}
                <div className="hero-float-element">🔐</div>
                <div className="hero-float-element">⛓️</div>
                <div className="hero-float-element">🛡️</div>
                <div className="hero-float-element">#️⃣</div>
                <div className="hero-float-element">🔑</div>

                {/* Floating gradient orb */}
                <div className="hero-orb" style={{ top: '30%', left: '50%' }} />

                <div className="hero-badge" ref={badgeRef}>
                    <Sparkles size={14} /> Cryptographic Submission Integrity
                </div>

                <h1 className="hero-title" ref={titleRef}>
                    Hackathon Submissions<br />
                    That Are{' '}
                    <span className="typewriter-wrapper">
                        <span className="typewriter-text">{typedWord}</span>
                        <span className="typewriter-cursor" />
                    </span>
                </h1>

                <p className="hero-subtitle" ref={subtitleRef}>
                    HackNova ensures every submission is tamper-proof, timestamped, and independently verifiable —
                    building trust between participants and organizers.
                </p>

                <div className="hero-actions" ref={actionsRef}>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                        Get Started <ArrowRight size={18} />
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={() => navigate('/verify')}>
                        <Eye size={18} /> Verify a Submission
                    </button>
                </div>

                {/* Mini stat row */}
                <div ref={statsRef} style={{ display: 'flex', gap: 40, marginTop: 56, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[['SHA-256', 'Hash Algorithm'], ['RFC 3161', 'Timestamp Standard'], ['0ms', 'Deadline Grace']].map(([val, lbl]) => (
                        <div key={lbl} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue-light)', fontFamily: 'var(--font-mono)' }}>{val}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{lbl}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="section-divider" />

            {/* ═══════════ 2. FEATURES ═══════════ */}
            <section style={{ padding: '100px 0 60px' }}>
                <div ref={featureHeaderRef} className="landing-section-header">
                    <div className="landing-section-badge">
                        <Shield size={12} /> Core Features
                    </div>
                    <h2 className="landing-section-title">Built for Integrity</h2>
                    <p className="landing-section-subtitle">
                        Every feature is designed to make hackathon submissions verifiable, fair, and dispute-free.
                    </p>
                </div>

                <div className="features-grid" ref={featuresRef}>
                    {features.map(f => (
                        <div className="feature-card feature-card-enhanced" key={f.title}>
                            <div className="icon-orb" style={{ background: f.bg, color: f.glow }}>{f.icon}</div>
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="section-divider" />

            {/* ═══════════ 3. CTA ═══════════ */}
            <section className="cta-section" ref={ctaRef}>
                <div className="cta-card">
                    <div className="cta-glow-ring" />
                    <div className="cta-glow-ring" />
                    <div className="cta-glow-ring" />
                    <div className="cta-top-glow" />

                    <h2 className="cta-title">Ready to Run a Fair Hackathon?</h2>
                    <p className="cta-desc">
                        Create an organizer account and launch your first cryptographically secure event in minutes. Zero configuration required.
                    </p>
                    <div className="cta-buttons">
                        <button className="btn btn-primary btn-lg" style={{ padding: '0 32px', height: 56, fontSize: '1.1rem' }} onClick={() => navigate('/register')}>
                            Create Organizer Account <ArrowRight size={20} />
                        </button>
                        <button className="btn btn-secondary btn-lg" style={{ padding: '0 32px', height: 56, fontSize: '1.1rem' }} onClick={() => navigate('/events')}>
                            Browse Open Events
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══════════ 4. FOOTER ═══════════ */}
            <footer className="footer-new" ref={footerRef}>
                <div className="pre-footer">
                    <h2 className="pre-footer-title">Ready to secure your next event?</h2>
                    <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
                        Join hundreds of hackathon organizers who trust CodeVault for cryptographic submission integrity.
                    </p>
                    <button className="pre-footer-btn" onClick={() => navigate('/register')}>
                        Get Started for Free
                    </button>
                </div>

                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="footer-brand-name">
                            🛡️ Code<span className="accent">Vault</span>
                        </div>
                        <p className="footer-brand-desc">
                            Cryptographic submission integrity for hackathons. Every upload is hashed, timestamped, and independently verifiable.
                        </p>
                        <div className="footer-socials">
                            <a href="#" className="footer-social-link" title="GitHub"><Github size={16} /></a>
                            <a href="#" className="footer-social-link" title="Twitter"><Twitter size={16} /></a>
                            <a href="#" className="footer-social-link" title="Email"><Mail size={16} /></a>
                        </div>
                    </div>



                    <div>
                        <div className="footer-column-title">Connect</div>
                        <div className="footer-links">
                            <a href="#" className="footer-link"><Github size={14} /> GitHub</a>
                            <a href="#" className="footer-link"><Twitter size={14} /> Twitter</a>
                            <a href="#" className="footer-link"><Mail size={14} /> Contact</a>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span>© 2026 HackNova CodeVault — Built for hackathons</span>
                    <span>Submission integrity platform</span>
                </div>
            </footer>
        </div>
    );
}
