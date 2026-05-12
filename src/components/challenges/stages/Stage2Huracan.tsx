'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface Stage2Props {
    onWin: (xp: number) => void;
}

function useTypewriter(text: string, speed: number = 40) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    useEffect(() => {
        setDisplayed('');
        setDone(false);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) { clearInterval(interval); setDone(true); }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);
    return { displayed, done };
}

// De Broglie physics
const H_PLANCK = 6.626e-34;
const ELECTRON_MASS = 9.109e-31;
const EV_TO_J = 1.602e-19;

function deBroglieWavelength(voltageKV: number): number {
    // λ = h / sqrt(2 * m * e * V)
    const V = voltageKV * 1000; // convert kV to V
    if (V <= 0) return 1000;
    const p = Math.sqrt(2 * ELECTRON_MASS * EV_TO_J * V);
    const lambda = H_PLANCK / p; // in meters
    return lambda * 1e12; // in pm (picometers)
}

const STORY = "Satélite detectó un micro-contaminante. Los microscopios ópticos fallan por el límite de difracción. Debes ensamblar un Microscopio Electrónico (TEM) para ver la forma del virus mutante ajustando la onda de materia.";

const VICTORY_THRESHOLD_KV = 150; // Victory at ~150 kV

// Pixel art virus pattern (8x8 grid)
const VIRUS_PATTERN = [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,2,1,0],
    [1,2,3,2,2,3,2,1],
    [1,2,2,2,2,2,2,1],
    [1,2,2,3,3,2,2,1],
    [1,2,2,2,2,2,2,1],
    [0,1,2,2,2,2,1,0],
    [0,0,1,1,1,1,0,0],
];

const VIRUS_COLORS = ['transparent', '#00aa44', '#33ff66', '#ffffff'];

export default function Stage2Huracan({ onWin }: Stage2Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const waveCanvasRef = useRef<HTMLCanvasElement>(null);
    const [voltage, setVoltage] = useState(5); // kV
    const [won, setWon] = useState(false);
    const animRef = useRef<number>(0);

    const { displayed: storyText, done: storyDone } = useTypewriter(STORY, 30);

    const lambda = deBroglieWavelength(voltage);
    // Blur: inversely related to voltage. At 0kV => max blur, at 200kV => 0
    const blurAmount = Math.max(0, 20 - (voltage / 200) * 20);
    const isResolved = voltage >= VICTORY_THRESHOLD_KV;

    // Check for victory
    useEffect(() => {
        if (isResolved && !won) {
            setWon(true);
            onWin(60);
        }
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

        // Grid lines (oscilloscope)
        ctx.strokeStyle = 'rgba(0, 180, 100, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = 0; y < H; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Cross-hairs
        ctx.strokeStyle = 'rgba(0, 200, 100, 0.15)';
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();

        // Draw virus pixelated
        const pixelSize = 16;
        const startX = (W - VIRUS_PATTERN[0].length * pixelSize) / 2;
        const startY = (H - VIRUS_PATTERN.length * pixelSize) / 2;

        // Apply blur via filter
        ctx.filter = `blur(${blurAmount}px)`;
        
        for (let row = 0; row < VIRUS_PATTERN.length; row++) {
            for (let col = 0; col < VIRUS_PATTERN[row].length; col++) {
                const val = VIRUS_PATTERN[row][col];
                if (val > 0) {
                    ctx.fillStyle = VIRUS_COLORS[val];
                    ctx.fillRect(startX + col * pixelSize, startY + row * pixelSize, pixelSize, pixelSize);
                }
            }
        }

        // Additional virus details (tentacles/spikes)
        const cx = W / 2;
        const cy = H / 2;
        ctx.fillStyle = '#22aa55';
        const spikePositions = [
            [-60, -50], [60, -50], [-60, 50], [60, 50],
            [0, -70], [0, 70], [-75, 0], [75, 0],
            [-45, -65], [45, -65], [-45, 65], [45, 65],
        ];
        spikePositions.forEach(([sx, sy]) => {
            ctx.beginPath();
            ctx.arc(cx + sx, cy + sy, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.filter = 'none';

        // Frame border (oscilloscope)
        ctx.strokeStyle = '#1a4a2a';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);

        // Label
        if (isResolved) {
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillStyle = '#00ff88';
            ctx.textAlign = 'center';
            ctx.fillText('BIO-TOXINA RADIOACTIVA', W / 2, H - 15);
            ctx.fillText('IDENTIFICADA', W / 2, H - 3);
        } else {
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = '#336644';
            ctx.textAlign = 'center';
            ctx.fillText('RESOLUCIÓN INSUFICIENTE', W / 2, H - 8);
        }
    }, [voltage, blurAmount, isResolved]);

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

            // De Broglie wave
            // Higher voltage = shorter wavelength = more oscillations
            const waveFreq = 0.02 + (voltage / 200) * 0.4; // spatial freq
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

            // Labels
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

    return (
        <div className="sqo-game-area">
            {/* Story */}
            <div className="sqo-typewriter">
                <div className="sqo-typewriter-text">
                    {storyText}
                    {!storyDone && <span className="sqo-typewriter-cursor" />}
                </div>
            </div>

            {/* Oscilloscope / Virus View */}
            <div className="sqo-canvas-wrapper">
                <canvas ref={canvasRef} width={700} height={300} className="sqo-canvas" />
            </div>

            {/* Wave Display */}
            <div className="sqo-canvas-wrapper" style={{ borderTop: '1px solid #1a4a2a' }}>
                <canvas ref={waveCanvasRef} width={700} height={60} className="sqo-canvas" />
            </div>

            {/* Status */}
            <div className="sqo-status-row">
                <div className="sqo-status-item">
                    <span className="sqo-status-label">RESOLUCIÓN</span>
                    <div className="sqo-bar-container">
                        <div
                            className={`sqo-bar-fill ${isResolved ? 'sqo-bar-green' : 'sqo-bar-blue'}`}
                            style={{ width: `${Math.min(100, (voltage / VICTORY_THRESHOLD_KV) * 100)}%` }}
                        />
                    </div>
                    <span className="sqo-bar-value">{isResolved ? 'HD' : `${Math.floor((voltage / VICTORY_THRESHOLD_KV) * 100)}%`}</span>
                </div>
                <div className="sqo-status-item">
                    <span className="sqo-status-label">λ DE BROGLIE</span>
                    <div className="sqo-bar-container">
                        <div
                            className="sqo-bar-fill sqo-bar-yellow"
                            style={{ width: `${Math.max(5, 100 - (voltage / 200) * 100)}%` }}
                        />
                    </div>
                    <span className="sqo-bar-value">{lambda.toFixed(0)}pm</span>
                </div>
            </div>

            {/* Feedback */}
            <div className={`sqo-feedback ${isResolved ? 'sqo-feedback-success' : voltage > 50 ? 'sqo-feedback-info' : 'sqo-feedback-warning'}`}>
                {isResolved
                    ? '¡Imagen nítida! Bio-Toxina Radioactiva identificada.'
                    : voltage > 50
                        ? `Mejorando resolución... λ = ${lambda.toFixed(1)} pm. Seguí aumentando.`
                        : 'Longitud de onda muy larga. Aumentá el voltaje para reducir λ.'}
            </div>

            {/* Controls */}
            <div className="sqo-controls">
                <div className="sqo-control-row">
                    <span className="sqo-control-label">VOLTAJE ACELERADOR</span>
                    <div className="sqo-slider-container">
                        <input
                            type="range" min="1" max="200" value={voltage}
                            onChange={e => { if (!won) setVoltage(Number(e.target.value)); }}
                            className="sqo-slider"
                            disabled={won}
                        />
                        <div className="sqo-slider-labels">
                            <span>1 kV</span><span>100 kV</span><span>200 kV</span>
                        </div>
                    </div>
                    <span className="sqo-control-value">{voltage} kV</span>
                </div>
                <div className="sqo-control-row" style={{ justifyContent: 'center', gap: '24px' }}>
                    <span style={{ fontSize: '7px', color: '#666' }}>λ = h / (m·v)</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>De Broglie: λ = h / √(2·m·e·V)</span>
                </div>
            </div>
        </div>
    );
}
