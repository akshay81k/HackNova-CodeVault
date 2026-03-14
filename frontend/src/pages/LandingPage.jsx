import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, Shield, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

// Interactive Code-Themed Glowing Background
function InteractiveBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let codeChars = [];

        const codeSnippets = [
            '0', '1', '{', '}', '<', '>', '/', ';',
            '()', '=>', '[]', '||', '&&', '!=', '==',
            '0x', 'FF', 'A3', 'B7', 'E9', '4D', '00',
            'if', 'fn', 'let', 'var', 'int', 'ret',
            '#', '$', '%', '@', '~', '^', '|',
            '01', '10', '11', '00', '101', '110',
        ];

        const mouse = { x: -1000, y: -1000 };
        const glowRadius = 200;

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };
        window.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseleave', handleMouseLeave);

        const buildGrid = () => {
            codeChars = [];
            const cols = Math.floor(canvas.width / 50);
            const rows = Math.floor(canvas.height / 40);

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    // Slight random offset for organic feel
                    codeChars.push({
                        x: col * 50 + 25 + (Math.random() - 0.5) * 16,
                        y: row * 40 + 20 + (Math.random() - 0.5) * 12,
                        char: codeSnippets[Math.floor(Math.random() * codeSnippets.length)],
                        baseOpacity: Math.random() * 0.06 + 0.02,
                        currentOpacity: 0,
                        glowIntensity: 0,
                        fontSize: Math.random() * 4 + 11,
                    });
                }
            }
        };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            buildGrid();
        };
        window.addEventListener('resize', resize);
        resize();

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < codeChars.length; i++) {
                const c = codeChars[i];
                const dx = mouse.x - c.x;
                const dy = mouse.y - c.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Smooth glow transition
                const targetGlow = distance < glowRadius
                    ? Math.pow(1 - distance / glowRadius, 2)
                    : 0;
                c.glowIntensity += (targetGlow - c.glowIntensity) * 0.08;

                const opacity = c.baseOpacity + c.glowIntensity * 0.85;

                // Color shifts from dim blue to bright cyan at cursor
                const r = Math.round(6 + c.glowIntensity * 30);
                const g = Math.round(37 + c.glowIntensity * 145);
                const b = Math.round(100 + c.glowIntensity * 112);

                ctx.font = `${c.fontSize}px 'JetBrains Mono', monospace`;
                ctx.textAlign = 'center';

                // Draw glow halo behind bright chars
                if (c.glowIntensity > 0.15) {
                    ctx.shadowColor = `rgba(6, 182, 212, ${c.glowIntensity * 0.6})`;
                    ctx.shadowBlur = 12 + c.glowIntensity * 18;
                } else {
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                }

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                ctx.fillText(c.char, c.x, c.y);
            }

            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            animationFrameId = window.requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
            window.cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
}

export default function LandingPage() {
    const navigate = useNavigate();

    const heroRef = useRef(null);
    const badgeRef = useRef(null);
    const titleRef = useRef(null);
    const subtitleRef = useRef(null);
    const actionsRef = useRef(null);
    const statsRef = useRef(null);
    const featuresRef = useRef(null);
    const ctaRef = useRef(null);
    const footerRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero timeline
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

            // Feature cards — stagger in on scroll
            const featureCards = featuresRef.current?.querySelectorAll('.feature-card');
            if (featureCards?.length) {
                gsap.set(featureCards, { y: 60, opacity: 0, scale: 0.92 });
                ScrollTrigger.create({
                    trigger: featuresRef.current,
                    start: 'top 85%',
                    onEnter: () => {
                        gsap.to(featureCards, {
                            y: 0,
                            opacity: 1,
                            scale: 1,
                            stagger: 0.1,
                            duration: 0.7,
                            ease: 'power2.out',
                        });
                    },
                    once: true,
                });
            }

            // CTA — fade in on scroll
            if (ctaRef.current) {
                gsap.set(ctaRef.current, { y: 40, opacity: 0 });
                ScrollTrigger.create({
                    trigger: ctaRef.current,
                    start: 'top 90%',
                    onEnter: () => {
                        gsap.to(ctaRef.current, {
                            y: 0,
                            opacity: 1,
                            duration: 0.7,
                            ease: 'power2.out',
                        });
                    },
                    once: true,
                });
            }

            // Footer
            if (footerRef.current) {
                gsap.set(footerRef.current, { y: 20, opacity: 0 });
                ScrollTrigger.create({
                    trigger: footerRef.current,
                    start: 'top 95%',
                    onEnter: () => {
                        gsap.to(footerRef.current, {
                            y: 0,
                            opacity: 1,
                            duration: 0.5,
                        });
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

            {/* Hero */}
            <section className="hero">
                <div className="hero-badge" ref={badgeRef}>
                    <Sparkles size={14} /> Cryptographic Submission Integrity
                </div>
                <h1 className="hero-title" ref={titleRef}>
                    Hackathon Submissions<br />You Can Trust
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

            {/* Features */}
            <section className="features-grid" ref={featuresRef}>
                {features.map(f => (
                    <div className="feature-card" key={f.title}>
                        <div className="feature-icon" style={{ background: f.bg }}>{f.icon}</div>
                        <h3 className="feature-title">{f.title}</h3>
                        <p className="feature-desc">{f.desc}</p>
                    </div>
                ))}
            </section>

            {/* CTA */}
            <section ref={ctaRef} style={{ padding: '100px 24px' }}>
                <div style={{
                    maxWidth: 1000,
                    margin: '0 auto',
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(37,99,235,0.3)',
                    borderRadius: 32,
                    padding: '80px 40px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 0 40px rgba(37,99,235,0.05)'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '80%',
                        height: '100%',
                        background: 'radial-gradient(ellipse, rgba(37,99,235,0.2) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />
                    
                    <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 20, letterSpacing: '-0.03em', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Ready to Run a Fair Hackathon?
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
                        Create an organizer account and launch your first cryptographically secure event in minutes. Zero configuration required.
                    </p>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/register" className="btn btn-primary btn-lg" style={{ padding: '0 32px', height: 56, fontSize: '1.1rem' }}>
                            Create Organizer Account <ArrowRight size={20} />
                        </Link>
                        <Link to="/events" className="btn btn-secondary btn-lg" style={{ padding: '0 32px', height: 56, fontSize: '1.1rem' }}>
                            Browse Open Events
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer ref={footerRef} style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
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
