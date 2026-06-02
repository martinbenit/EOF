'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
    onWin: (xp: number) => void;
}

const CANVAS_W = 600;
const CANVAS_H = 400;

export default function AvalonStage4({ onWin }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [v, setV] = useState(1000);
    const [q, setQ] = useState(1);
    const [won, setWon] = useState(false);
    const [showWinMsg, setShowWinMsg] = useState(false);
    
    const animRef = useRef(0);
    const timeRef = useRef(0);
    const spawnEnergyRef = useRef(0);
    const photonsRef = useRef<any[]>([]);

    const isTrapped = q > 5000 && v > 20;
    let fp = (q / v);
    if (isTrapped) fp *= 0.01; // severe penalty
    const emissionRatePs = 1000 / Math.max(0.01, fp);

    // check win
    useEffect(() => {
        if (won) return;
        if (fp >= 1000) {
            setWon(true);
            setTimeout(() => setShowWinMsg(true), 1500);
            setTimeout(() => onWin(300), 4500); 
        }
    }, [fp, won, onWin]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let running = true;
        const render = () => {
            if (!running) return;
            timeRef.current += 0.05;
            const t = timeRef.current;

            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            
            // BG
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            const centerX = CANVAS_W / 2;
            const centerY = CANVAS_H / 2;
            const boxSize = 40 + (v / 1000) * 160;

            // Spawn photons
            if (!showWinMsg) {
                spawnEnergyRef.current += Math.max(0.1, fp * 0.02);
                let spawns = Math.floor(spawnEnergyRef.current);
                if (spawns > 5) spawns = 5; // cap to 5 per frame
                
                if (spawns > 0) {
                    spawnEnergyRef.current -= spawns;
                    for (let i = 0; i < spawns; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 4 + Math.random() * 2;
                        photonsRef.current.push({
                            x: centerX,
                            y: centerY,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            life: isTrapped ? 30 : 100,
                            maxLife: isTrapped ? 30 : 100,
                            trapped: isTrapped
                        });
                    }
                }
            }

            // Draw Box
            ctx.strokeStyle = isTrapped ? '#ff0040' : 'rgba(0, 240, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);
            ctx.fillStyle = isTrapped ? 'rgba(255, 0, 64, 0.05)' : 'rgba(0, 240, 255, 0.02)';
            ctx.fillRect(centerX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);

            // Draw Atom
            ctx.fillStyle = won ? '#ffd700' : '#00f0ff';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8 + Math.sin(t * 10) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 15;
            ctx.shadowColor = won ? '#ffd700' : '#00f0ff';
            ctx.fill();
            ctx.shadowBlur = 0;

            // Update & Draw Photons
            for (let i = photonsRef.current.length - 1; i >= 0; i--) {
                const p = photonsRef.current[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;

                if (p.trapped) {
                    // Bounce
                    if (p.x < centerX - boxSize/2 || p.x > centerX + boxSize/2) p.vx *= -1;
                    if (p.y < centerY - boxSize/2 || p.y > centerY + boxSize/2) p.vy *= -1;
                }

                if (p.life <= 0) {
                    photonsRef.current.splice(i, 1);
                    continue;
                }

                const alpha = p.life / p.maxLife;
                ctx.fillStyle = won ? `rgba(255, 215, 0, ${alpha})` : (p.trapped ? `rgba(255, 0, 64, ${alpha})` : `rgba(57, 255, 20, ${alpha})`);
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Confetti Lluvia (16-bits style)
            if (showWinMsg) {
                for (let i = 0; i < 5; i++) {
                    const cx = Math.random() * CANVAS_W;
                    const cy = Math.random() * CANVAS_H;
                    const colors = ['#00f0ff', '#39ff14', '#ffd700', '#ff0040'];
                    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                    ctx.fillRect(cx, cy, 6, 6);
                }
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                ctx.font = '22px "Share Tech Mono", monospace';
                ctx.fillStyle = '#ffd700';
                ctx.textAlign = 'center';
                ctx.fillText('¡DATOS CUÁNTICOS TRANSMITIDOS!', CANVAS_W / 2, CANVAS_H / 2 - 15);
                ctx.font = '16px "Share Tech Mono", monospace';
                ctx.fillStyle = '#39ff14';
                ctx.fillText('PROYECTO ÁVALON COMPLETADO', CANVAS_W / 2, CANVAS_H / 2 + 15);
                ctx.textAlign = 'left';
            }

            animRef.current = requestAnimationFrame(render);
        };
        
        animRef.current = requestAnimationFrame(render);
        return () => {
            running = false;
            cancelAnimationFrame(animRef.current);
        };
    }, [v, fp, isTrapped, won, showWinMsg]);

    return (
        <div className="ava-s1-game">
            {/* Toolbar */}
            <div className="ava-s1-toolbar">
                <span className="ava-s1-toolbar-label">CONTROL DE RESONADOR:</span>
                <span style={{ fontSize: '10px', color: '#5a8a8a', marginLeft: 'auto' }}>
                    Ajustá Volumen (V) y Calidad (Q)
                </span>
            </div>

            {/* Top Info */}
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px', background: 'rgba(0, 240, 255, 0.05)', borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#00f0ff' }}>Factor de Purcell (Fp)</div>
                    <div style={{ fontSize: '20px', color: '#e0ffff', textShadow: '0 0 10px #00f0ff' }}>{fp.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#39ff14' }}>Tasa de Emisión Espontánea</div>
                    <div style={{ fontSize: '20px', color: '#39ff14', textShadow: '0 0 10px #39ff14' }}>
                        {emissionRatePs > 1000 ? '> 1 ns' : `${emissionRatePs.toFixed(3)} ps`}
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div className="ava-s1-canvas-wrap">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="ava-s1-canvas"
                />
            </div>

            {/* Bottom Panel - Sliders */}
            <div className="ava-s1-bottom-panel" style={{ flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', padding: '0 20px', gap: '40px' }}>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#00f0ff' }}>
                            <span>Volumen Modal (V)</span>
                            <span>{v} nm³</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="1000" 
                            value={v} 
                            onChange={(e) => setV(+e.target.value)} 
                            disabled={won}
                            style={{ cursor: won ? 'not-allowed' : 'pointer' }}
                        />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ffd700' }}>
                            <span>Factor de Calidad (Q)</span>
                            <span>{q}</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="10000" 
                            step="10"
                            value={q} 
                            onChange={(e) => setQ(+e.target.value)} 
                            disabled={won}
                            style={{ cursor: won ? 'not-allowed' : 'pointer' }}
                        />
                    </div>

                </div>

                <div className={`ava-s1-status ${won ? 'status-win' : (isTrapped ? 'status-error' : '')}`} style={{ width: '100%', textAlign: 'center' }}>
                    {won ? '✓ TRANSMISIÓN A VELOCIDAD CUÁNTICA LOGRADA' : (isTrapped ? '⚠ FOTÓN ATRAPADO: Sobre-resonancia (Reducí V o bajá Q)' : 'Maximizá Fp ajustando V y Q')}
                </div>
            </div>
        </div>
    );
}
