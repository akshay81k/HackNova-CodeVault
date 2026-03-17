import { useEffect, useRef } from 'react';

export default function InteractiveBackground() {
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
        const glowRadius = 180;

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
            const cols = Math.floor(canvas.width / 45);
            const rows = Math.floor(canvas.height / 40);

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    codeChars.push({
                        x: col * 45 + 22 + (Math.random() - 0.5) * 15,
                        y: row * 40 + 20 + (Math.random() - 0.5) * 10,
                        char: codeSnippets[Math.floor(Math.random() * codeSnippets.length)],
                        baseOpacity: Math.random() * 0.08 + 0.03,
                        currentOpacity: 0,
                        glowIntensity: 0,
                        fontSize: Math.random() * 4 + 9,
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

                const targetGlow = distance < glowRadius
                    ? Math.pow(1 - distance / glowRadius, 1.5)
                    : 0;
                c.glowIntensity += (targetGlow - c.glowIntensity) * 0.1;

                const opacity = c.baseOpacity + c.glowIntensity * 0.92;
                const currentFontSize = c.fontSize * (1 + c.glowIntensity * 0.5);

                // Punchier colors on hover - original blue/cyan tones
                const r = Math.round(15 + c.glowIntensity * 120); 
                const g = Math.round(45 + c.glowIntensity * 180); 
                const b = Math.round(110 + c.glowIntensity * 145); 

                ctx.font = `${currentFontSize}px 'JetBrains Mono', monospace`;
                ctx.textAlign = 'center';

                if (c.glowIntensity > 0.1) {
                    ctx.shadowColor = `rgba(0, 240, 255, ${c.glowIntensity * 1.0})`;
                    ctx.shadowBlur = 15 + c.glowIntensity * 30;
                } else {
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                }

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                ctx.fillText(c.char, c.x, c.y);
            }

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
