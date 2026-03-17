import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function VaultLoader({ onComplete }) {
    const containerRef = useRef(null);
    const doorGroupRef = useRef(null);
    const dialRef = useRef(null);
    const textRef = useRef(null);
    const binaryGroupRef = useRef(null);
    const circuitLinesRef = useRef(null);
    const lockGlowRef = useRef(null);

    useEffect(() => {
        const tl = gsap.timeline({
            onComplete: () => {
                gsap.to(containerRef.current, {
                    opacity: 0,
                    duration: 0.6,
                    ease: 'power2.inOut',
                    delay: 0.2,
                    onComplete: () => onComplete?.(),
                });
            },
        });

        // 1. Initial state
        gsap.set(doorGroupRef.current, { transformOrigin: '0% 50%', rotationY: -65 });
        gsap.set(lockGlowRef.current, { opacity: 0 });

        // Generate glowing binary effect
        if (binaryGroupRef.current) {
            const children = binaryGroupRef.current.children;
            gsap.to(children, {
                opacity: 0.2,
                duration: 0.1,
                stagger: {
                    each: 0.05,
                    from: "random",
                    yoyo: true,
                    repeat: 20
                }
            });
        }

        // Animate circuit lines drawing in
        if (circuitLinesRef.current) {
            const paths = circuitLinesRef.current.querySelectorAll('path, line, polyline');
            gsap.fromTo(paths, 
                { strokeDasharray: 200, strokeDashoffset: 200 },
                { strokeDashoffset: 0, duration: 1.5, ease: 'power2.out', stagger: 0.05 }
            );
        }

        // 2. Door closes (swinging shut)
        tl.to(doorGroupRef.current, {
            rotationY: 0,
            duration: 1.2,
            ease: 'power3.inOut',
            delay: 1.0 // Wait a moment showing the open vault
        })
        // 3. Dial spins to lock
        .to(dialRef.current, {
            rotation: 360,
            duration: 0.8,
            ease: 'back.out(1.5)',
            transformOrigin: '50% 50%',
        }, '-=0.2')
        // 4. Lock glows to signify locked state
        .to(lockGlowRef.current, {
            opacity: 1,
            duration: 0.3,
            ease: 'power2.out'
        })
        // 5. Brand text reveals
        .from(textRef.current, {
            y: 15,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
        }, '-=0.2');

        return () => {
            tl.kill();
        };
    }, [onComplete]);

    // Generator for random binary blocks
    const generateBinary = () => {
        const lines = [];
        for (let i = 0; i < 9; i++) {
            let line = '';
            for (let j = 0; j < 12; j++) {
                line += Math.random() > 0.5 ? '1' : '0';
            }
            lines.push(
                <text key={i} x="10" y={20 + i * 14} fill="var(--accent-cyan)" fontSize="10" fontFamily="monospace" opacity="0.8">
                    {line}
                </text>
            );
        }
        return lines;
    };

    return (
        <div ref={containerRef} style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#030816', // Deep dark blue almost black
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 100,
            perspective: '1200px'
        }}>
            {/* Ambient background glow */}
            <div style={{
                position: 'absolute',
                width: 600,
                height: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 240, 255, 0.08), transparent 60%)',
                pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', width: 340, height: 340, zIndex: 1, transform: 'scale(1.4)' }}>
                {/* Futuristic Vault SVG Background */}
                <svg width="340" height="340" viewBox="0 0 340 340" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="doorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2c3e50" />
                            <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>
                        <linearGradient id="vaultBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#334155" />
                            <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>
                        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Circuit Board Traces (Background) */}
                    <g ref={circuitLinesRef} stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                        {/* Top traces */}
                        <polyline points="170,40 170,80" />
                        <polyline points="150,50 150,80" />
                        <polyline points="190,50 190,80" />
                        <polyline points="130,60 130,70 140,80" />
                        <polyline points="210,60 210,70 200,80" />
                        <circle cx="170" cy="35" r="3" fill="#00f0ff" />
                        
                        {/* Left traces */}
                        <polyline points="40,170 80,170" />
                        <polyline points="50,150 80,150" />
                        <polyline points="50,190 80,190" />
                        <polyline points="60,130 70,130 80,140" />
                        <polyline points="60,210 70,210 80,200" />
                        
                        {/* Right traces */}
                        <polyline points="300,170 260,170" />
                        <polyline points="290,150 260,150" />
                        <polyline points="290,190 260,190" />
                        <polyline points="280,130 270,130 260,140" />
                        <polyline points="280,210 270,210 260,200" />

                        {/* Bottom traces */}
                        <polyline points="170,300 170,260" />
                        <polyline points="150,290 150,260" />
                        <polyline points="190,290 190,260" />
                        <polyline points="130,280 130,270 140,260" />
                        <polyline points="210,280 210,270 200,260" />
                        
                        {/* Dots at trace ends */}
                        <circle cx="40" cy="170" r="2" fill="#00f0ff" />
                        <circle cx="300" cy="170" r="2" fill="#00f0ff" />
                        <circle cx="170" cy="300" r="2" fill="#00f0ff" />
                        <circle cx="130" cy="280" r="2" fill="#00f0ff" />
                        <circle cx="210" cy="280" r="2" fill="#00f0ff" />
                    </g>

                    {/* Main Vault Body (Outer metallic box) */}
                    <rect x="80" y="80" width="180" height="180" rx="12" fill="#0f172a" stroke="url(#vaultBodyGrad)" strokeWidth="8" filter="url(#neonGlow)" />
                    {/* Metal rim highlight */}
                    <rect x="84" y="84" width="172" height="172" rx="10" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.6" />

                    {/* Inner Vault Area (Where code lives) */}
                    <rect x="95" y="95" width="150" height="150" rx="6" fill="#020617" stroke="#005f9e" strokeWidth="2" />
                    
                    {/* Binary Code inside Vault */}
                    <g ref={binaryGroupRef} transform="translate(105, 105)" style={{ clipPath: 'inset(0 0 0 0)'}}>
                        {generateBinary()}
                    </g>

                    {/* Central locking mechanism (inside wall) */}
                    <circle cx="170" cy="170" r="30" fill="none" stroke="#00b4d8" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                </svg>

                {/* Real 3D HTML Door Overlay */}
                <div ref={doorGroupRef} style={{
                    position: 'absolute',
                    top: 95,
                    left: 95,
                    width: 150,
                    height: 150,
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'left center', // swing from left hinge
                    transform: 'rotateY(-110deg)', // initially wide open
                }}>
                    {/* Inner thick edge (side profile, dark metal) */}
                    <div style={{
                        position: 'absolute',
                        top: 2,
                        left: 140, // right edge of door
                        width: 25, // thickness increased for realism
                        height: 146,
                        background: '#1e293b',
                        border: '1px solid #475569',
                        transformOrigin: 'left center',
                        transform: 'rotateY(90deg)',
                        boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.9)'
                    }} />

                    {/* Door Front Face (Steel/Titanium look) */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
                        border: '2px solid #64748b', // metallic border
                        borderRadius: 6,
                        boxShadow: 'inset 0 0 0 4px #1e293b, inset 0 0 20px rgba(0,0,0,0.8), 0 0 15px rgba(0, 240, 255, 0.4)',
                        transform: 'translateZ(25px)', // pushed forward matching new thickness
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {/* Rivets in corners */}
                        <div style={{ position: 'absolute', top: 6, left: 6, width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.6)' }} />
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.6)' }} />
                        <div style={{ position: 'absolute', bottom: 6, left: 6, width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.6)' }} />
                        <div style={{ position: 'absolute', bottom: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.6)' }} />

                        {/* Abstract Door Patterns (Cyberpunk style) */}
                        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
                            <path d="M20 20 L50 20 L60 30 L60 70 M130 20 L100 20 L90 30 L90 70 M20 130 L50 130 L60 120 L60 80 M130 130 L100 130 L90 120 L90 80" stroke="#00f0ff" strokeWidth="1.5" fill="none" />
                        </svg>

                        {/* Dial (Heavy Steel) */}
                        <svg width="60" height="60" ref={dialRef} style={{ position: 'relative', zIndex: 2 }}>
                            {/* Outer dial ring */}
                            <circle cx="30" cy="30" r="28" fill="#1e293b" stroke="#64748b" strokeWidth="3" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.8))" />
                            {/* Inner dial recess */}
                            <circle cx="30" cy="30" r="20" fill="#020617" stroke="#334155" strokeWidth="2" />
                            {Array.from({ length: 12 }).map((_, i) => {
                                const angle = (i * 30) * Math.PI / 180;
                                return (
                                    <line
                                        key={i}
                                        x1={30 + 20 * Math.cos(angle)}
                                        y1={30 + 20 * Math.sin(angle)}
                                        x2={30 + 26 * Math.cos(angle)}
                                        y2={30 + 26 * Math.sin(angle)}
                                        stroke="#94a3b8"
                                        strokeWidth="2"
                                    />
                                );
                            })}
                            <circle cx="30" cy="30" r="10" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
                            <circle cx="30" cy="30" r="4" fill="#00f0ff" />
                            <polygon points="26,24 34,24 30,12" fill="#00f0ff" />
                            {/* Final Lock Glow Effect */}
                            <circle ref={lockGlowRef} cx="30" cy="30" r="14" fill="rgba(0, 240, 255, 0.6)" opacity="0" filter="blur(6px)" />
                        </svg>
                    </div>

                    {/* Heavy Steel Hinges */}
                    <div style={{ position: 'absolute', top: 25, left: -8, width: 16, height: 26, background: '#475569', borderRadius: 3, border: '1px solid #1e293b', transform: 'translateZ(12px)', boxShadow: '2px 2px 5px rgba(0,0,0,0.5)' }}>
                        <div style={{ position: 'absolute', top: 4, left: 6, width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
                        <div style={{ position: 'absolute', bottom: 4, left: 6, width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
                    </div>
                    <div style={{ position: 'absolute', top: 95, left: -8, width: 16, height: 26, background: '#475569', borderRadius: 3, border: '1px solid #1e293b', transform: 'translateZ(12px)', boxShadow: '2px 2px 5px rgba(0,0,0,0.5)' }}>
                        <div style={{ position: 'absolute', top: 4, left: 6, width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
                        <div style={{ position: 'absolute', bottom: 4, left: 6, width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
                    </div>
                </div>
            </div>

            {/* Brand text */}
            <div ref={textRef} style={{ textAlign: 'center', zIndex: 1 }}>
                <div style={{
                    fontSize: '1.8rem',
                    fontWeight: 900,
                    letterSpacing: '1px',
                    color: '#fff',
                    marginBottom: 8,
                    textShadow: '0 0 10px rgba(0,240,255,0.5)'
                }}>
                    Code<span style={{ color: '#00f0ff' }}>Vault</span>
                </div>
                <div style={{
                    fontSize: '0.85rem',
                    color: '#00b4d8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.25em',
                    fontWeight: 600,
                }}>
                    Integrity Secured
                </div>
            </div>
        </div>
    );
}
