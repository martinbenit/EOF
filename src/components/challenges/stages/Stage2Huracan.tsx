'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface Stage2Props {
    onWin: (xp: number) => void;
}

// De Broglie physics
const H_PLANCK = 6.626e-34;
const ELECTRON_MASS = 9.109e-31;
const EV_TO_J = 1.602e-19;

function deBroglieWavelength(voltageKV: number): number {
    const V = voltageKV * 1000;
    if (V <= 0) return 1000;
    const p = Math.sqrt(2 * ELECTRON_MASS * EV_TO_J * V);
    const lambda = H_PLANCK / p;
    return lambda * 1e12; // pm
}

// Pixel art virus pattern (10x10)
const VIRUS_PATTERN = [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,2,2,2,2,1,0,0],
    [0,1,2,3,2,2,3,2,1,0],
    [1,2,2,2,2,2,2,2,2,1],
    [1,2,3,2,3,3,2,3,2,1],
    [1,2,3,2,3,3,2,3,2,1],
    [1,2,2,2,2,2,2,2,2,1],
    [0,1,2,3,2,2,3,2,1,0],
    [0,0,1,2,2,2,2,1,0,0],
    [0,0,0,1,1,1,1,0,0,0],
];

const VIRUS_COLORS = ['transparent', '#00aa44', '#33ff66', '#ffffff'];

export default function Stage2Huracan({ onWin }: Stage2Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const waveCanvasRef = useRef<HTMLCanvasElement>(null);
    const [voltage, setVoltage] = useState(5);
    const [aperture, setAperture] = useState(80); // 0-100, 100=wide open, 0=fully closed
    const [won, setWon] = useState(false);
    const [stableTime, setStableTime] = useState(0);
    const stableTimerRef = useRef(0);
    const animRef = useRef<number>(0);

    const lambda = deBroglieWavelength(voltage);
    // Blur depends on BOTH voltage (wavelength) AND aperture
    // Small aperture = better focus but needs more voltage
    // Large aperture = more noise
    const voltageBlur = Math.max(0, 15 - (voltage / 200) * 15);
    const apertureNoise = aperture / 100 * 8; // wide aperture = noise
    const apertureBonus = (100 - aperture) / 100 * 5; // closed aperture = sharper but dimmer
    const totalBlur = Math.max(0, voltageBlur + apertureNoise - apertureBonus);
    const brightness = 0.3 + (aperture / 100) * 0.7; // wider aperture = brighter

    // Victory: blur < 2 AND voltage >= 120
    const isResolved = totalBlur < 2 && voltage >= 120;

    // Stable timer for victory
    useEffect(() => {
        if (won) return;
        const interval = setInterval(() => {
            if (isResolved) {
                stableTimerRef.current += 0.1;
                setStableTime(stableTimerRef.current);
                if (stableTimerRef.current >= 2) {
                    setWon(true);
                    onWin(60);
                }
            } else {
                stableTimerRef.current = Math.max(0, stableTimerRef.current - 0.3);
                setStableTime(stableTimerRef.current);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [isResolved, won, onWin]);

    // Draw virus canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Oscilloscope background
        ctx.fillStyle = '#030812';
        ctx.fillRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = 'rgba(0, 180, 100, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 30) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Cross-hairs
        ctx.strokeStyle = 'rgba(0, 200, 100, 0.15)';
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

        // Apply blur + brightness
        ctx.filter = `blur(${totalBlur}px) brightness(${brightness})`;

        // Draw virus
        const pixelSize = 14;
        const startX = (W - VIRUS_PATTERN[0].length * pixelSize) / 2;
        const startY = (H - VIRUS_PATTERN.length * pixelSize) / 2;

        for (let row = 0; row < VIRUS_PATTERN.length; row++) {
            for (let col = 0; col < VIRUS_PATTERN[row].length; col++) {
                const val = VIRUS_PATTERN[row][col];
                if (val > 0) {
                    ctx.fillStyle = VIRUS_COLORS[val];
                    ctx.fillRect(startX + col * pixelSize, startY + row * pixelSize, pixelSize, pixelSize);
                }
            }
        }

        // Spikes
        const cx = W / 2;
        const cy = H / 2;
        ctx.fillStyle = '#22aa55';
        const spikePositions = [
            [-65, -55], [65, -55], [-65, 55], [65, 55],
            [0, -75], [0, 75], [-80, 0], [80, 0],
            [-50, -70], [50, -70], [-50, 70], [50, 70],
        ];
        spikePositions.forEach(([sx, sy]) => {
            ctx.beginPath();
            ctx.arc(cx + sx, cy + sy, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.filter = 'none';

        // Aperture ring overlay (vignette based on aperture)
        const apertureRadius = 60 + (aperture / 100) * 120;
        const vGrad = ctx.createRadialGradient(cx, cy, apertureRadius * 0.8, cx, cy, apertureRadius * 1.3);
        vGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vGrad.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, W, H);

        // Frame
        ctx.strokeStyle = '#1a4a2a';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);

        if (isResolved) {
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillStyle = '#00ff88';
            ctx.textAlign = 'center';
            ctx.fillText('BIO-TOXINA IDENTIFICADA', W / 2, H - 15);
        } else {
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = '#336644';
            ctx.textAlign = 'center';
            ctx.fillText(totalBlur > 8 ? 'MUY BORROSO' : totalBlur > 4 ? 'MEJORANDO...' : 'CASI NÍTIDO', W / 2, H - 8);
        }
    }, [voltage, aperture, totalBlur, brightness, isResolved]);

    // Draw wave animation
    useEffect(() => {
        const canvas = waveCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        const drawWave = () => {
            const W = canvas.width;
            const H = canvas.height;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, W, H);

            const waveFreq = 0.02 + (voltage / 200) * 0.4;
            const amplitude = 15;
            const phase = frame * 0.05;

            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            for (let x = 0; x < W; x++) {
                const y = H / 2 + Math.sin(x * waveFreq + phase) * amplitude;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = '#00aacc';
            ctx.textAlign = 'left';
            ctx.fillText(`λ = ${lambda.toFixed(1)} pm`, 10, 15);
            ctx.textAlign = 'right';
            ctx.fillText('ONDA DE MATERIA (e⁻)', W - 10, 15);

            frame++;
            animRef.current = requestAnimationFrame(drawWave);
        };

        drawWave();
        return () => cancelAnimationFrame(animRef.current);
    }, [voltage, lambda]);

    // Feedback
    let feedbackClass = 'sqo-feedback-info';
    let feedbackMsg = `Voltaje: ${voltage}kV | Apertura: ${aperture}%. Ajustá ambos para resolver.`;
    if (isResolved) {
        feedbackClass = 'sqo-feedback-success';
        feedbackMsg = '¡Imagen nítida! Estabilizando identificación...';
    } else if (voltage > 100 && totalBlur > 5) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = `Buen voltaje, pero la apertura genera ruido. Cerrala un poco.`;
    } else if (voltage < 50) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = 'λ muy larga. Aumentá el voltaje para reducirla.';
    }

    return (
        <div className="sqo-game-area">
            <div className="sqo-canvas-wrapper">
                <canvas ref={canvasRef} width={700} height={300} className="sqo-canvas" />
            </div>
            <div className="sqo-canvas-wrapper" style={{ borderTop: '1px solid #1a4a2a' }}>
                <canvas ref={waveCanvasRef} width={700} height={60} className="sqo-canvas" />
            </div>

            {/* Resolve timer */}
            {isResolved && !won && (
                <div className="sqo-sweet-spot-timer">
                    <span className="sqo-sweet-spot-label">IDENTIFICANDO...</span>
                    <div className="sqo-sweet-spot-bar">
                        <div className="sqo-sweet-spot-fill" style={{ width: `${(stableTime / 2) * 100}%` }} />
                    </div>
                    <span className="sqo-bar-value">{stableTime.toFixed(1)}/2s</span>
                </div>
            )}

            <div className="sqo-status-row">
                <div className="sqo-status-item">
                    <span className="sqo-status-label">RESOLUCIÓN</span>
                    <div className="sqo-bar-container">
                        <div className={`sqo-bar-fill ${isResolved ? 'sqo-bar-green' : 'sqo-bar-blue'}`}
                            style={{ width: `${Math.min(100, Math.max(5, 100 - totalBlur * 5))}%` }} />
                    </div>
                    <span className="sqo-bar-value">{isResolved ? 'HD' : `${Math.floor(Math.max(0, 100 - totalBlur * 5))}%`}</span>
                </div>
                <div className="sqo-status-item">
                    <span className="sqo-status-label">λ DE BROGLIE</span>
                    <div className="sqo-bar-container">
                        <div className="sqo-bar-fill sqo-bar-yellow"
                            style={{ width: `${Math.max(5, 100 - (voltage / 200) * 100)}%` }} />
                    </div>
                    <span className="sqo-bar-value">{lambda.toFixed(0)}pm</span>
                </div>
            </div>

            <div className={`sqo-feedback ${feedbackClass}`}>{feedbackMsg}</div>

            <div className="sqo-controls">
                <div className="sqo-control-row">
                    <span className="sqo-control-label">VOLTAJE ACELERADOR</span>
                    <div className="sqo-slider-container">
                        <input type="range" min="1" max="200" value={voltage}
                            onChange={e => { if (!won) setVoltage(Number(e.target.value)); }}
                            className="sqo-slider" disabled={won} />
                        <div className="sqo-slider-labels"><span>1 kV</span><span>100 kV</span><span>200 kV</span></div>
                    </div>
                    <span className="sqo-control-value">{voltage} kV</span>
                </div>
                <div className="sqo-control-row">
                    <span className="sqo-control-label">APERTURA CONDENSADOR</span>
                    <div className="sqo-slider-container">
                        <input type="range" min="5" max="100" value={aperture}
                            onChange={e => { if (!won) setAperture(Number(e.target.value)); }}
                            className="sqo-slider" disabled={won} />
                        <div className="sqo-slider-labels"><span>CERRADO</span><span>MEDIO</span><span>ABIERTO</span></div>
                    </div>
                    <span className="sqo-control-value">{aperture}%</span>
                </div>
                <div className="sqo-control-row" style={{ justifyContent: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '7px', color: '#666' }}>λ = h / √(2·m·e·V)</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>Apertura: brillo vs nitidez</span>
                </div>
            </div>
        </div>
    );
}
