'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface Stage3Props {
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

// Heisenberg: Δx * Δp >= ħ/2
const HBAR = 1.055e-34;
const ELECTRON_MASS = 9.109e-31;
const KB = 1.381e-23; // Boltzmann

const STORY = "Debemos aislar la Bio-Toxina. Diseñá una trampa nanométrica, pero cuidado: el universo prohíbe el encierro perfecto. Controlá la incertidumbre para no desencadenar una explosión térmica.";

// Sweet spot: between 1 and 5 nm
const SWEET_MIN = 0.8;
const SWEET_MAX = 5;

export default function Stage3Jaula({ onWin }: Stage3Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [trapWidth, setTrapWidth] = useState(50); // slider 0-100 maps to 0.01nm-100nm
    const [won, setWon] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [gameOverReason, setGameOverReason] = useState('');
    const [sweetSpotTime, setSweetSpotTime] = useState(0);
    const animRef = useRef<number>(0);
    const sweetSpotTimerRef = useRef(0);
    const particlePosRef = useRef({ x: 350, y: 175, vx: 0, vy: 0 });

    const { displayed: storyText, done: storyDone } = useTypewriter(STORY, 30);

    // Map slider (0-100) to Δx in nm (logarithmic)
    // 0 => 0.01nm, 50 => ~1nm, 100 => 100nm
    const deltaXnm = Math.pow(10, -2 + (trapWidth / 100) * 4); // 0.01 to 100nm
    const deltaXm = deltaXnm * 1e-9;

    // Heisenberg uncertainty in momentum
    const deltaPmin = HBAR / (2 * deltaXm);
    // Uncertainty velocity
    const deltaV = deltaPmin / ELECTRON_MASS;
    // "Temperature" indicator (kinetic energy)
    const kineticEnergy = 0.5 * ELECTRON_MASS * deltaV * deltaV;
    const tempEquiv = (2 * kineticEnergy) / (3 * KB); // Temperature equivalent

    // Danger levels
    const fugaProbability = Math.min(100, Math.max(0, (deltaXnm - 10) * 2)); // >10nm = escape risk
    const thermalDanger = Math.min(100, Math.max(0, (1 / deltaXnm) * 5)); // tiny = thermal explosion

    // Is in sweet spot?
    const inSweetSpot = deltaXnm >= SWEET_MIN && deltaXnm <= SWEET_MAX;

    // Is dangerous?
    const isTooCramped = deltaXnm < 0.05;
    const isTooOpen = fugaProbability >= 95;

    // Canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        let frame = 0;

        const particle = particlePosRef.current;

        const animate = () => {
            ctx.clearRect(0, 0, W, H);

            // Background
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, W, H);

            // Calculate box dimensions
            const boxWidthPx = Math.max(10, Math.min(500, (deltaXnm / 100) * 500));
            const boxX = (W - boxWidthPx) / 2;
            const boxY = 50;
            const boxH = H - 100;

            // Laser walls
            const wallGlow = isTooCramped ? 30 : 8;
            const wallColor = isTooCramped ? '#ff0000' : '#00ccff';

            // Wall glow
            ctx.shadowColor = wallColor;
            ctx.shadowBlur = wallGlow;
            ctx.strokeStyle = wallColor;
            ctx.lineWidth = 3;
            // Left wall
            ctx.beginPath();
            ctx.moveTo(boxX, boxY);
            ctx.lineTo(boxX, boxY + boxH);
            ctx.stroke();
            // Right wall
            ctx.beginPath();
            ctx.moveTo(boxX + boxWidthPx, boxY);
            ctx.lineTo(boxX + boxWidthPx, boxY + boxH);
            ctx.stroke();
            // Top/bottom
            ctx.beginPath();
            ctx.moveTo(boxX, boxY);
            ctx.lineTo(boxX + boxWidthPx, boxY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(boxX, boxY + boxH);
            ctx.lineTo(boxX + boxWidthPx, boxY + boxH);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Box fill
            ctx.fillStyle = isTooCramped
                ? `rgba(255, 0, 0, 0.03)`
                : `rgba(0, 200, 255, 0.02)`;
            ctx.fillRect(boxX, boxY, boxWidthPx, boxH);

            // Particle movement - speed proportional to Δp
            const speed = Math.min(15, deltaV / 1e6 * 0.00001);
            particle.vx += (Math.random() - 0.5) * speed * 2;
            particle.vy += (Math.random() - 0.5) * speed * 2;

            // Damping
            particle.vx *= 0.95;
            particle.vy *= 0.95;

            particle.x += particle.vx;
            particle.y += particle.vy;

            // Bounce off walls
            if (particle.x < boxX + 8) { particle.x = boxX + 8; particle.vx = Math.abs(particle.vx); }
            if (particle.x > boxX + boxWidthPx - 8) { particle.x = boxX + boxWidthPx - 8; particle.vx = -Math.abs(particle.vx); }
            if (particle.y < boxY + 8) { particle.y = boxY + 8; particle.vy = Math.abs(particle.vy); }
            if (particle.y > boxY + boxH - 8) { particle.y = boxY + boxH - 8; particle.vy = -Math.abs(particle.vy); }

            // Draw particle trail
            ctx.fillStyle = `rgba(255, 200, 0, 0.15)`;
            for (let t = 0; t < 5; t++) {
                const trailX = particle.x - particle.vx * t * 2;
                const trailY = particle.y - particle.vy * t * 2;
                ctx.beginPath();
                ctx.arc(trailX, trailY, 4 - t * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw particle
            const particleColor = isTooCramped ? '#ff3333' : inSweetSpot ? '#00ff88' : '#ffcc00';
            ctx.fillStyle = particleColor;
            ctx.shadowColor = particleColor;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Thermometer (right side)
            const thermoX = W - 50;
            const thermoY = 60;
            const thermoH = H - 120;
            const thermoW = 20;

            ctx.fillStyle = '#111';
            ctx.fillRect(thermoX, thermoY, thermoW, thermoH);
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.strokeRect(thermoX, thermoY, thermoW, thermoH);

            // Fill
            const thermoFill = Math.min(1, thermalDanger / 100);
            const fillH = thermoFill * thermoH;
            const thermoGrad = ctx.createLinearGradient(0, thermoY + thermoH - fillH, 0, thermoY + thermoH);
            thermoGrad.addColorStop(0, '#ff0000');
            thermoGrad.addColorStop(1, '#880000');
            ctx.fillStyle = thermoGrad;
            ctx.fillRect(thermoX, thermoY + thermoH - fillH, thermoW, fillH);

            // Thermometer label
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('TEMP', thermoX + thermoW / 2, thermoY - 5);

            // Danger markers
            if (thermalDanger > 80) {
                ctx.fillStyle = '#ff0000';
                ctx.font = '8px "Press Start 2P", monospace';
                ctx.fillText('⚠', thermoX + thermoW / 2, thermoY + thermoH + 15);
            }

            // Sweet spot indicator
            if (inSweetSpot) {
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(boxX - 4, boxY - 4, boxWidthPx + 8, boxH + 8);
                ctx.setLineDash([]);
            }

            // Labels
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText(`Δx = ${deltaXnm.toFixed(2)} nm`, W / 2, H - 15);

            frame++;
            animRef.current = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animRef.current);
    }, [trapWidth, deltaXnm, deltaV, thermalDanger, isTooCramped, inSweetSpot]);

    // Sweet spot timer & game over logic
    useEffect(() => {
        if (won || gameOver) return;

        const interval = setInterval(() => {
            if (isTooCramped) {
                setGameOver(true);
                setGameOverReason('¡EXPLOSIÓN TÉRMICA! La energía de punto cero destruyó la jaula. Δx demasiado pequeño.');
                return;
            }

            if (isTooOpen) {
                setGameOver(true);
                setGameOverReason('¡FUGA DE PARTÍCULA! La trampa era demasiado grande. La toxina escapó.');
                return;
            }

            if (inSweetSpot) {
                sweetSpotTimerRef.current += 0.1;
                setSweetSpotTime(sweetSpotTimerRef.current);
                if (sweetSpotTimerRef.current >= 5) {
                    setWon(true);
                    onWin(70);
                }
            } else {
                sweetSpotTimerRef.current = Math.max(0, sweetSpotTimerRef.current - 0.2);
                setSweetSpotTime(sweetSpotTimerRef.current);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [inSweetSpot, isTooCramped, isTooOpen, won, gameOver, onWin]);

    const handleRetry = () => {
        setGameOver(false);
        setGameOverReason('');
        setTrapWidth(50);
        sweetSpotTimerRef.current = 0;
        setSweetSpotTime(0);
        particlePosRef.current = { x: 350, y: 175, vx: 0, vy: 0 };
    };

    // Feedback
    let feedbackClass = 'sqo-feedback-info';
    let feedbackMsg = 'Ajustá el ancho de la trampa. Ni muy grande ni muy chica.';
    if (isTooCramped) {
        feedbackClass = 'sqo-feedback-danger';
        feedbackMsg = '⚠ ¡PELIGRO! Δx → 0 dispara energía de punto cero. ¡Abrí la jaula!';
    } else if (isTooOpen) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = '⚠ Trampa demasiado grande. Alta probabilidad de fuga.';
    } else if (inSweetSpot) {
        feedbackClass = 'sqo-feedback-success';
        feedbackMsg = '✓ ¡Sweet Spot! Mantenelo estable...';
    } else if (thermalDanger > 50) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = 'Cuidado, la temperatura sube. Δp está creciendo.';
    }

    const shouldShake = isTooCramped || thermalDanger > 80;
    const shouldGlitch = isTooCramped;

    return (
        <div className={`sqo-game-area ${shouldShake ? 'sqo-shake' : ''} ${shouldGlitch ? 'sqo-glitch' : ''}`}>
            {/* Story */}
            <div className="sqo-typewriter">
                <div className="sqo-typewriter-text">
                    {storyText}
                    {!storyDone && <span className="sqo-typewriter-cursor" />}
                </div>
            </div>

            {/* Canvas */}
            <div className="sqo-canvas-wrapper" style={{ position: 'relative' }}>
                <canvas ref={canvasRef} width={700} height={350} className="sqo-canvas" />

                {/* Game Over Overlay */}
                {gameOver && (
                    <div className="sqo-gameover-overlay">
                        <div className="sqo-gameover-title">GAME OVER</div>
                        <div className="sqo-gameover-msg">{gameOverReason}</div>
                        <button className="sqo-btn-retry" onClick={handleRetry}>
                            ↻ REINTENTAR
                        </button>
                    </div>
                )}
            </div>

            {/* Sweet Spot Timer */}
            {inSweetSpot && !won && !gameOver && (
                <div className="sqo-sweet-spot-timer">
                    <span className="sqo-sweet-spot-label">ESTABILIZANDO...</span>
                    <div className="sqo-sweet-spot-bar">
                        <div className="sqo-sweet-spot-fill" style={{ width: `${(sweetSpotTime / 5) * 100}%` }} />
                    </div>
                    <span className="sqo-bar-value">{sweetSpotTime.toFixed(1)}/5s</span>
                </div>
            )}

            {/* Status */}
            <div className="sqo-status-row">
                <div className="sqo-status-item">
                    <span className="sqo-status-label">PROB. FUGA</span>
                    <div className="sqo-bar-container">
                        <div
                            className="sqo-bar-fill sqo-bar-red"
                            style={{ width: `${fugaProbability}%` }}
                        />
                    </div>
                    <span className="sqo-bar-value">{Math.floor(fugaProbability)}%</span>
                </div>
                <div className="sqo-status-item">
                    <span className="sqo-status-label">TEMP (Δp)</span>
                    <div className="sqo-bar-container">
                        <div
                            className={`sqo-bar-fill ${thermalDanger > 70 ? 'sqo-bar-red' : 'sqo-bar-yellow'}`}
                            style={{ width: `${thermalDanger}%` }}
                        />
                    </div>
                    <span className="sqo-bar-value">{thermalDanger.toFixed(0)}%</span>
                </div>
            </div>

            {/* Feedback */}
            <div className={`sqo-feedback ${feedbackClass}`}>
                {feedbackMsg}
            </div>

            {/* Controls */}
            <div className="sqo-controls">
                <div className="sqo-control-row">
                    <span className="sqo-control-label">ANCHO TRAMPA (Δx)</span>
                    <div className="sqo-slider-container">
                        <input
                            type="range" min="0" max="100" value={trapWidth}
                            onChange={e => { if (!won && !gameOver) setTrapWidth(Number(e.target.value)); }}
                            className="sqo-slider"
                            disabled={won || gameOver}
                        />
                        <div className="sqo-slider-labels">
                            <span>0.01 nm</span><span>~1 nm</span><span>100 nm</span>
                        </div>
                    </div>
                    <span className="sqo-control-value">{deltaXnm.toFixed(2)} nm</span>
                </div>
                <div className="sqo-control-row" style={{ justifyContent: 'center', gap: '24px' }}>
                    <span style={{ fontSize: '7px', color: '#666' }}>Δx·Δp ≥ ħ/2</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>Heisenberg</span>
                    <span style={{ fontSize: '7px', color: inSweetSpot ? '#00ff88' : '#666' }}>
                        Sweet Spot: {SWEET_MIN}–{SWEET_MAX} nm
                    </span>
                </div>
            </div>
        </div>
    );
}
