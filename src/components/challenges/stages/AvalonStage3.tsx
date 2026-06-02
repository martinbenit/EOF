'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
    onWin: (xp: number) => void;
}

const CANVAS_W = 600;
const CANVAS_H = 480;
const SUBSTRATE_Y = 200;
const RECEIVER_Y = 400;
const RECEIVER_X = 300;
const RECEIVER_W = 60; // 270 to 330
const PILLAR_X = [150, 225, 300, 375, 450];
const K_FACTOR = 1.8; 

export default function AvalonStage3({ onWin }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [widths, setWidths] = useState<number[]>([50, 50, 50, 50, 50]);
    const [won, setWon] = useState(false);
    const [showWinMsg, setShowWinMsg] = useState(false);
    const animRef = useRef(0);
    const timeRef = useRef(0);

    const updateWidth = (idx: number, val: number) => {
        if (won) return;
        setWidths(prev => {
            const next = [...prev];
            next[idx] = val;
            return next;
        });
    };

    // Check Win Condition
    useEffect(() => {
        if (won) return;
        const dPhi: number[] = [];
        dPhi[0] = widths[1] - widths[0];
        dPhi[1] = (widths[2] - widths[0]) / 2;
        dPhi[2] = (widths[3] - widths[1]) / 2;
        dPhi[3] = (widths[4] - widths[2]) / 2;
        dPhi[4] = widths[4] - widths[3];

        const targets = PILLAR_X.map((x, i) => x + K_FACTOR * dPhi[i]);
        const isWin = targets.every(tx => Math.abs(tx - RECEIVER_X) <= RECEIVER_W / 2);
        
        if (isWin) {
            setWon(true);
            setTimeout(() => setShowWinMsg(true), 1500);
            setTimeout(() => onWin(200), 4000); 
        }
    }, [widths, won, onWin]);

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

            // Calculate Phase gradient
            const dPhi: number[] = [];
            dPhi[0] = widths[1] - widths[0];
            dPhi[1] = (widths[2] - widths[0]) / 2;
            dPhi[2] = (widths[3] - widths[1]) / 2;
            dPhi[3] = (widths[4] - widths[2]) / 2;
            dPhi[4] = widths[4] - widths[3];

            const targets = PILLAR_X.map((x, i) => x + K_FACTOR * dPhi[i]);

            // Draw Sun rays (incoming)
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.lineDashOffset = -t * 20;
            PILLAR_X.forEach((x) => {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, SUBSTRATE_Y - 15);
                ctx.stroke();
            });
            ctx.setLineDash([]);

            // Draw Substrate
            ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
            ctx.fillRect(100, SUBSTRATE_Y, 400, 10);
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 1;
            ctx.strokeRect(100, SUBSTRATE_Y, 400, 10);

            // Draw Pillars
            PILLAR_X.forEach((x, i) => {
                const w = widths[i] * 0.4; // 10 to 100 -> 4px to 40px
                ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
                ctx.fillRect(x - w / 2, SUBSTRATE_Y - 30, w, 30);
                ctx.strokeStyle = '#00f0ff';
                ctx.strokeRect(x - w / 2, SUBSTRATE_Y - 30, w, 30);
                
                // Phase value label
                ctx.fillStyle = '#00f0ff';
                ctx.font = '10px "Share Tech Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`Φ:${widths[i]}`, x, SUBSTRATE_Y - 40);
            });

            // Draw Receiver
            ctx.fillStyle = '#222';
            ctx.fillRect(RECEIVER_X - RECEIVER_W / 2, RECEIVER_Y, RECEIVER_W, 20);
            ctx.strokeStyle = won ? '#39ff14' : '#ff0040';
            ctx.lineWidth = 2;
            ctx.strokeRect(RECEIVER_X - RECEIVER_W / 2, RECEIVER_Y, RECEIVER_W, 20);
            ctx.fillStyle = won ? '#39ff14' : '#ff0040';
            ctx.textAlign = 'center';
            ctx.fillText('RECEPTOR', RECEIVER_X, RECEIVER_Y + 14);

            // Draw Focused Rays
            targets.forEach((targetX, i) => {
                const isHit = Math.abs(targetX - RECEIVER_X) <= RECEIVER_W / 2;
                ctx.beginPath();
                ctx.moveTo(PILLAR_X[i], SUBSTRATE_Y + 10);
                ctx.lineTo(targetX, RECEIVER_Y);
                
                // Ray color depending on hit
                if (won) {
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 3 + Math.sin(t * 10) * 1;
                } else if (isHit) {
                    ctx.strokeStyle = '#39ff14';
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = 'rgba(255, 0, 64, 0.6)';
                    ctx.lineWidth = 1;
                }
                ctx.stroke();

                // Sparkles at the end
                if (won || isHit) {
                    ctx.fillStyle = won ? '#ffd700' : '#39ff14';
                    ctx.beginPath();
                    ctx.arc(targetX, RECEIVER_Y, 4 + Math.random() * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Energy Level UI on Canvas
            const hits = targets.filter(tx => Math.abs(tx - RECEIVER_X) <= RECEIVER_W / 2).length;
            const energyPct = Math.round((hits / 5) * 100);
            
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(20, 20, 140, 40);
            ctx.strokeStyle = '#00f0ff';
            ctx.strokeRect(20, 20, 140, 40);
            ctx.fillStyle = '#00f0ff';
            ctx.textAlign = 'left';
            ctx.fillText(`ENERGÍA: ${energyPct}%`, 30, 45);

            // Win message overlay
            if (showWinMsg) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                ctx.font = '22px "Share Tech Mono", monospace';
                ctx.fillStyle = '#ffd700';
                ctx.textAlign = 'center';
                ctx.fillText('¡METALENTE CALIBRADA!', CANVAS_W / 2, CANVAS_H / 2 - 15);
                ctx.font = '14px "Share Tech Mono", monospace';
                ctx.fillStyle = '#39ff14';
                ctx.fillText('Energía restaurada. Iniciando ignición.', CANVAS_W / 2, CANVAS_H / 2 + 15);
                ctx.textAlign = 'left';
            }

            animRef.current = requestAnimationFrame(render);
        };
        
        animRef.current = requestAnimationFrame(render);
        return () => {
            running = false;
            cancelAnimationFrame(animRef.current);
        };
    }, [widths, won, showWinMsg]);

    return (
        <div className="ava-s1-game">
            {/* Toolbar */}
            <div className="ava-s1-toolbar">
                <span className="ava-s1-toolbar-label">CONTROL DE METASUPERFICIE:</span>
                <span style={{ fontSize: '10px', color: '#5a8a8a', marginLeft: 'auto' }}>
                    Ajustá el grosor para variar el gradiente de fase.
                </span>
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
            <div className="ava-s1-bottom-panel" style={{ flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', padding: '0 20px' }}>
                    {widths.map((w, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', color: '#00f0ff' }}>Pilar {i+1}</span>
                            <input 
                                type="range" 
                                min="10" 
                                max="100" 
                                value={w} 
                                onChange={(e) => updateWidth(i, +e.target.value)} 
                                disabled={won}
                                style={{ cursor: won ? 'not-allowed' : 'pointer' }}
                            />
                            <span style={{ fontSize: '12px', color: '#39ff14' }}>{w} nm</span>
                        </div>
                    ))}
                </div>

                <div className={`ava-s1-status ${won ? 'status-win' : ''}`} style={{ width: '100%', textAlign: 'center' }}>
                    {won ? '✓ ENFOQUE ÓPTIMO ALCANZADO' : 'Modificá los pilares para crear un perfil de lente hiperbólico'}
                </div>
            </div>
        </div>
    );
}
