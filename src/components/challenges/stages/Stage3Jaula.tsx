'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface Stage3Props {
    onWin: (xp: number) => void;
}

// Heisenberg: Δx * Δp >= ħ/2
const HBAR = 1.055e-34;
const ELECTRON_MASS = 9.109e-31;
const KB = 1.381e-23;

export default function Stage3Jaula({ onWin }: Stage3Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [trapWidth, setTrapWidth] = useState(80); // slider 0-100 → maps to nm
    const [cryoLevel, setCryoLevel] = useState(20); // 0=off, 100=max cooling
    const [won, setWon] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [sweetSpotTime, setSweetSpotTime] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameOverReason, setGameOverReason] = useState('');
    const animRef = useRef<number>(0);
    const sweetSpotTimerRef = useRef(0);
    const particlePosRef = useRef({ x: 350, y: 175, vx: 0, vy: 0 });

    // Map slider to Δx in nm (linear, more intuitive)
    // 0 = 0.1nm (very tight), 100 = 20nm (very wide)
    const deltaXnm = 0.1 + (trapWidth / 100) * 19.9;
    const deltaXm = deltaXnm * 1e-9;

    // Heisenberg: Δp_min = ħ / (2·Δx)
    const deltaPmin = HBAR / (2 * deltaXm);
    const deltaV = deltaPmin / ELECTRON_MASS;
    const kineticEnergy = 0.5 * ELECTRON_MASS * deltaV * deltaV;
    const rawTemp = (2 * kineticEnergy) / (3 * KB);

    // Cryo-cooling reduces effective temperature
    const cryoReduction = (cryoLevel / 100) * 0.7; // max 70% reduction
    const effectiveTemp = rawTemp * (1 - cryoReduction);

    // Normalized danger levels
    const MAX_SAFE_TEMP = 500; // Kelvin equivalent threshold
    const thermalDanger = Math.min(100, (effectiveTemp / MAX_SAFE_TEMP) * 100);

    // Escape probability: higher if trap is wide
    const ESCAPE_THRESHOLD_NM = 8;
    const fugaProbability = Math.min(100, Math.max(0, ((deltaXnm - ESCAPE_THRESHOLD_NM) / 12) * 100));

    // Sweet spot: Δx between 2 and 5 nm AND thermal danger < 60
    const inSweetSpot = deltaXnm >= 2 && deltaXnm <= 5 && thermalDanger < 60 && fugaProbability < 30;

    // Danger states
    const isTooCramped = thermalDanger >= 95;
    const isTooOpen = fugaProbability >= 90;

    // START button — don't auto-run
    const handleStart = () => {
        setGameStarted(true);
        sweetSpotTimerRef.current = 0;
        setSweetSpotTime(0);
        particlePosRef.current = { x: 350, y: 175, vx: 0, vy: 0 };
    };

    const handleRetry = () => {
        setGameOver(false);
        setGameOverReason('');
        setTrapWidth(80);
        setCryoLevel(20);
        sweetSpotTimerRef.current = 0;
        setSweetSpotTime(0);
        particlePosRef.current = { x: 350, y: 175, vx: 0, vy: 0 };
        setGameStarted(false);
    };

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
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, W, H);

            // Box dimensions proportional to Δx
            const boxWidthPx = Math.max(20, Math.min(500, (deltaXnm / 20) * 500));
            const boxX = (W - boxWidthPx) / 2;
            const boxY = 50;
            const boxH = H - 100;

            // Wall color based on danger
            const wallColor = isTooCramped ? '#ff0000' : inSweetSpot ? '#00ff88' : '#00ccff';
            const wallGlow = isTooCramped ? 30 : inSweetSpot ? 15 : 8;

            // Draw walls
            ctx.shadowColor = wallColor;
            ctx.shadowBlur = wallGlow;
            ctx.strokeStyle = wallColor;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(boxX, boxY); ctx.lineTo(boxX, boxY + boxH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(boxX + boxWidthPx, boxY); ctx.lineTo(boxX + boxWidthPx, boxY + boxH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(boxX, boxY); ctx.lineTo(boxX + boxWidthPx, boxY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(boxX, boxY + boxH); ctx.lineTo(boxX + boxWidthPx, boxY + boxH); ctx.stroke();
            ctx.shadowBlur = 0;

            // Box fill
            ctx.fillStyle = isTooCramped ? 'rgba(255,0,0,0.05)' : inSweetSpot ? 'rgba(0,255,136,0.03)' : 'rgba(0,200,255,0.02)';
            ctx.fillRect(boxX, boxY, boxWidthPx, boxH);

            // Particle movement — speed proportional to uncertainty
            if (gameStarted && !gameOver && !won) {
                const speed = Math.min(8, Math.max(0.5, deltaV / 1e6 * 0.00002));
                particle.vx += (Math.random() - 0.5) * speed * 2;
                particle.vy += (Math.random() - 0.5) * speed * 2;
                particle.vx *= 0.93;
                particle.vy *= 0.93;
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Bounce
                if (particle.x < boxX + 8) { particle.x = boxX + 8; particle.vx = Math.abs(particle.vx) * 1.2; }
                if (particle.x > boxX + boxWidthPx - 8) { particle.x = boxX + boxWidthPx - 8; particle.vx = -Math.abs(particle.vx) * 1.2; }
                if (particle.y < boxY + 8) { particle.y = boxY + 8; particle.vy = Math.abs(particle.vy) * 1.2; }
                if (particle.y > boxY + boxH - 8) { particle.y = boxY + boxH - 8; particle.vy = -Math.abs(particle.vy) * 1.2; }
            } else if (!gameStarted) {
                // Before start: particle gently floats in center
                particle.x = W / 2 + Math.sin(frame * 0.03) * 20;
                particle.y = H / 2 + Math.cos(frame * 0.04) * 15;
            }

            // Particle trail
            ctx.fillStyle = 'rgba(255, 200, 0, 0.12)';
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
            const thermoX = W - 55;
            const thermoY = 55;
            const thermoH = H - 120;
            const thermoW = 18;

            ctx.fillStyle = '#111';
            ctx.fillRect(thermoX, thermoY, thermoW, thermoH);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(thermoX, thermoY, thermoW, thermoH);

            const thermoFill = Math.min(1, thermalDanger / 100);
            const fillH = thermoFill * thermoH;
            const tGrad = ctx.createLinearGradient(0, thermoY + thermoH - fillH, 0, thermoY + thermoH);
            tGrad.addColorStop(0, thermalDanger > 70 ? '#ff0000' : '#ff8800');
            tGrad.addColorStop(1, '#880000');
            ctx.fillStyle = tGrad;
            ctx.fillRect(thermoX, thermoY + thermoH - fillH, thermoW, fillH);

            // Danger zone line on thermometer
            const dangerLineY = thermoY + thermoH - (60 / 100) * thermoH;
            ctx.strokeStyle = '#ff444488';
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(thermoX - 3, dangerLineY); ctx.lineTo(thermoX + thermoW + 3, dangerLineY); ctx.stroke();
            ctx.setLineDash([]);

            ctx.font = '6px "Press Start 2P", monospace';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('TEMP', thermoX + thermoW / 2, thermoY - 8);
            ctx.fillText('(Δp)', thermoX + thermoW / 2, thermoY - 0);

            // Cryo indicator (left side)
            const cryoX = 15;
            const cryoY = 55;
            const cryoH = thermoH;
            const cryoW = 18;
            ctx.fillStyle = '#111';
            ctx.fillRect(cryoX, cryoY, cryoW, cryoH);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(cryoX, cryoY, cryoW, cryoH);

            const cryoFill = cryoLevel / 100;
            const cryoFillH = cryoFill * cryoH;
            const cGrad = ctx.createLinearGradient(0, cryoY + cryoH - cryoFillH, 0, cryoY + cryoH);
            cGrad.addColorStop(0, '#00ccff');
            cGrad.addColorStop(1, '#003366');
            ctx.fillStyle = cGrad;
            ctx.fillRect(cryoX, cryoY + cryoH - cryoFillH, cryoW, cryoFillH);

            ctx.font = '6px "Press Start 2P", monospace';
            ctx.fillStyle = '#00aacc';
            ctx.textAlign = 'center';
            ctx.fillText('CRYO', cryoX + cryoW / 2, cryoY - 8);
            ctx.fillText('SYS', cryoX + cryoW / 2, cryoY - 0);

            // Sweet spot indicator
            if (inSweetSpot) {
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(boxX - 4, boxY - 4, boxWidthPx + 8, boxH + 8);
                ctx.setLineDash([]);
            }

            // Delta-x label
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText(`Δx = ${deltaXnm.toFixed(1)} nm`, W / 2, H - 12);

            frame++;
            animRef.current = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animRef.current);
    }, [trapWidth, cryoLevel, deltaXnm, deltaV, thermalDanger, isTooCramped, inSweetSpot, gameStarted, gameOver, won]);

    // Sweet spot timer & game over logic (only when game is started)
    useEffect(() => {
        if (!gameStarted || won || gameOver) return;

        const interval = setInterval(() => {
            if (isTooCramped) {
                setGameOver(true);
                setGameOverReason('¡EXPLOSIÓN TÉRMICA! La energía de punto cero destruyó la jaula. Necesitás más enfriamiento o una trampa más ancha.');
                return;
            }
            if (isTooOpen) {
                setGameOver(true);
                setGameOverReason('¡FUGA DE PARTÍCULA! La trampa era demasiado grande. La toxina escapó. Reducí el ancho.');
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
                sweetSpotTimerRef.current = Math.max(0, sweetSpotTimerRef.current - 0.15);
                setSweetSpotTime(sweetSpotTimerRef.current);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [inSweetSpot, isTooCramped, isTooOpen, won, gameOver, gameStarted, onWin]);

    // Feedback
    let feedbackClass = 'sqo-feedback-info';
    let feedbackMsg = 'Ajustá el ancho de la trampa y el cryo-system. Buscá el sweet spot.';
    if (!gameStarted) {
        feedbackMsg = '⬆ Configurá la trampa y presioná ACTIVAR. El objetivo: mantener Δx entre 2-5 nm con temperatura estable.';
    } else if (isTooCramped) {
        feedbackClass = 'sqo-feedback-danger';
        feedbackMsg = '⚠ ¡PELIGRO! Temperatura crítica. Subí el cryo o ensanchá la jaula.';
    } else if (isTooOpen) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = '⚠ Trampa demasiado grande. La partícula se puede escapar.';
    } else if (inSweetSpot) {
        feedbackClass = 'sqo-feedback-success';
        feedbackMsg = `✓ ¡SWEET SPOT! Δx=${deltaXnm.toFixed(1)}nm, T estable. Mantenelo 5s...`;
    } else if (thermalDanger > 50) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = `Temperatura subiendo (${thermalDanger.toFixed(0)}%). Subí el cryo-system o ensanchá un poco.`;
    } else if (deltaXnm > 5 && deltaXnm < 8) {
        feedbackClass = 'sqo-feedback-info';
        feedbackMsg = 'Trampa un poco grande. Reducila un poco para estabilizar.';
    }

    const shouldShake = isTooCramped || thermalDanger > 80;

    return (
        <div className={`sqo-game-area ${shouldShake ? 'sqo-shake' : ''}`}>
            <div className="sqo-canvas-wrapper" style={{ position: 'relative' }}>
                <canvas ref={canvasRef} width={700} height={350} className="sqo-canvas" />

                {/* Start overlay */}
                {!gameStarted && !gameOver && (
                    <div className="sqo-start-overlay">
                        <div className="sqo-start-info">
                            <div style={{ fontSize: '8px', marginBottom: '8px', color: '#00ccff' }}>HEISENBERG: Δx · Δp ≥ ħ/2</div>
                            <div style={{ fontSize: '7px', color: '#aaa', marginBottom: '12px', lineHeight: '1.6' }}>
                                Atrapá la bio-toxina ajustando el ANCHO de la trampa<br />
                                y el CRYO-SYSTEM para controlar la temperatura.<br />
                                Sweet Spot: Δx entre 2-5 nm con temperatura baja.
                            </div>
                            <button className="sqo-btn-retro" onClick={handleStart}>
                                ⚡ ACTIVAR TRAMPA
                            </button>
                        </div>
                    </div>
                )}

                {/* Game Over */}
                {gameOver && (
                    <div className="sqo-gameover-overlay">
                        <div className="sqo-gameover-title">GAME OVER</div>
                        <div className="sqo-gameover-msg">{gameOverReason}</div>
                        <button className="sqo-btn-retry" onClick={handleRetry}>↻ REINTENTAR</button>
                    </div>
                )}
            </div>

            {/* Sweet Spot Timer */}
            {inSweetSpot && !won && !gameOver && gameStarted && (
                <div className="sqo-sweet-spot-timer">
                    <span className="sqo-sweet-spot-label">ESTABILIZANDO...</span>
                    <div className="sqo-sweet-spot-bar">
                        <div className="sqo-sweet-spot-fill" style={{ width: `${(sweetSpotTime / 5) * 100}%` }} />
                    </div>
                    <span className="sqo-bar-value">{sweetSpotTime.toFixed(1)}/5s</span>
                </div>
            )}

            <div className="sqo-status-row">
                <div className="sqo-status-item">
                    <span className="sqo-status-label">PROB. FUGA</span>
                    <div className="sqo-bar-container">
                        <div className="sqo-bar-fill sqo-bar-red" style={{ width: `${fugaProbability}%` }} />
                    </div>
                    <span className="sqo-bar-value">{Math.floor(fugaProbability)}%</span>
                </div>
                <div className="sqo-status-item">
                    <span className="sqo-status-label">TEMP (eff)</span>
                    <div className="sqo-bar-container">
                        <div className={`sqo-bar-fill ${thermalDanger > 70 ? 'sqo-bar-red' : thermalDanger > 40 ? 'sqo-bar-yellow' : 'sqo-bar-blue'}`}
                            style={{ width: `${thermalDanger}%` }} />
                    </div>
                    <span className="sqo-bar-value">{thermalDanger.toFixed(0)}%</span>
                </div>
            </div>

            <div className={`sqo-feedback ${feedbackClass}`}>{feedbackMsg}</div>

            <div className="sqo-controls">
                <div className="sqo-control-row">
                    <span className="sqo-control-label">ANCHO TRAMPA (Δx)</span>
                    <div className="sqo-slider-container">
                        <input type="range" min="0" max="100" value={trapWidth}
                            onChange={e => { if (!won && !gameOver) setTrapWidth(Number(e.target.value)); }}
                            className="sqo-slider" disabled={won || gameOver} />
                        <div className="sqo-slider-labels"><span>0.1 nm</span><span>~10 nm</span><span>20 nm</span></div>
                    </div>
                    <span className="sqo-control-value">{deltaXnm.toFixed(1)} nm</span>
                </div>
                <div className="sqo-control-row">
                    <span className="sqo-control-label">CRYO-SYSTEM</span>
                    <div className="sqo-slider-container">
                        <input type="range" min="0" max="100" value={cryoLevel}
                            onChange={e => { if (!won && !gameOver) setCryoLevel(Number(e.target.value)); }}
                            className="sqo-slider sqo-slider-cryo" disabled={won || gameOver} />
                        <div className="sqo-slider-labels"><span>OFF</span><span>MEDIO</span><span>MÁXIMO</span></div>
                    </div>
                    <span className="sqo-control-value">{cryoLevel}%</span>
                </div>
                <div className="sqo-control-row" style={{ justifyContent: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '7px', color: '#666' }}>Δx·Δp ≥ ħ/2</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>Heisenberg</span>
                    <span style={{ fontSize: '7px', color: inSweetSpot ? '#00ff88' : '#666' }}>Sweet: 2–5 nm + T baja</span>
                </div>
            </div>
        </div>
    );
}
