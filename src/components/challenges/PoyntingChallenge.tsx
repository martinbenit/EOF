'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    createInitialPoyntingState,
    stepPoynting,
    calculatePoyntingScore,
    getPowerPercent,
    getZone,
    getZoneColor,
    TICK_RATE,
    HOLD_DURATION,
    PoyntingState,
} from '@/lib/physics/poynting';
import { calculateChallengeResult } from '@/lib/gamification';
import { ChallengeResult } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import styles from './ChallengeSimulation.module.css';

const POYNTING_HINTS = [
    "El Vector de Poynting S = E × B representa el flujo de energía electromagnética. Su dirección es perpendicular a ambos campos.",
    "Para maximizar S, los campos E y B deben estar en fase (Δφ = 0°). ¡Llevá el desfasaje a cero!",
    "Los campos E y B deben ser perpendiculares entre sí (θ = 90°) para máxima transferencia de energía.",
    "La fórmula es S = E·B·cos(Δφ)·sin(θ). Necesitás cos(0°)=1 y sin(90°)=1 simultáneamente.",
    "Ajustá primero el desfasaje a 0° y luego el ángulo a 90°. Mantené la potencia >95% por 3 segundos para ganar.",
];

export default function PoyntingChallenge() {
    const { session, refreshProfile } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [gameState, setGameState] = useState<PoyntingState>(createInitialPoyntingState());
    const [phaseSlider, setPhaseSlider] = useState(90);
    const [angleSlider, setAngleSlider] = useState(45);
    const [running, setRunning] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);
    const [won, setWon] = useState(false);

    const [hintsUsed, setHintsUsed] = useState(0);
    const [showHint, setShowHint] = useState<string | null>(null);

    // Refs to avoid stale closures
    const phaseRef = useRef(phaseSlider);
    phaseRef.current = phaseSlider;
    const angleRef = useRef(angleSlider);
    angleRef.current = angleSlider;
    const stateRef = useRef(gameState);
    stateRef.current = gameState;
    const sessionRef = useRef(session);
    sessionRef.current = session;
    const hintsUsedRef = useRef(hintsUsed);
    hintsUsedRef.current = hintsUsed;

    const WIDTH = 800;
    const HEIGHT = 450;

    // ---- Canvas Drawing ----
    const drawFrame = useCallback((ctx: CanvasRenderingContext2D, state: PoyntingState, time: number) => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        bgGrad.addColorStop(0, 'rgba(8, 6, 28, 1)');
        bgGrad.addColorStop(1, 'rgba(12, 10, 35, 1)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 1;
        for (let x = 0; x < WIDTH; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
        }
        for (let y = 0; y < HEIGHT; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
        }

        const centerY = HEIGHT / 2;
        const waveStartX = 60;
        const waveEndX = WIDTH - 160;
        const waveLen = waveEndX - waveStartX;
        const amplitude = 80;

        const phaseRad = (state.phaseShift * Math.PI) / 180;
        const angleRad = (state.relativeAngle * Math.PI) / 180;
        const waveSpeed = time * 0.04;

        // ---- Draw E field wave (red, vertical oscillation) ----
        ctx.strokeStyle = 'rgba(255, 80, 100, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = waveStartX; x <= waveEndX; x++) {
            const t = ((x - waveStartX) / waveLen) * Math.PI * 4 - waveSpeed;
            const y = centerY - Math.sin(t) * amplitude;
            if (x === waveStartX) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // E field arrows (vertical)
        ctx.strokeStyle = 'rgba(255, 80, 100, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const frac = (i + 0.5) / 10;
            const x = waveStartX + frac * waveLen;
            const t = frac * Math.PI * 4 - waveSpeed;
            const yOff = Math.sin(t) * amplitude;
            ctx.beginPath();
            ctx.moveTo(x, centerY);
            ctx.lineTo(x, centerY - yOff);
            ctx.stroke();
            // Arrowhead
            if (Math.abs(yOff) > 10) {
                const dir = yOff > 0 ? -1 : 1;
                ctx.beginPath();
                ctx.moveTo(x, centerY - yOff);
                ctx.lineTo(x - 3, centerY - yOff + dir * 8);
                ctx.moveTo(x, centerY - yOff);
                ctx.lineTo(x + 3, centerY - yOff + dir * 8);
                ctx.stroke();
            }
        }

        // ---- Draw B field wave (blue, "depth" oscillation with phase shift) ----
        // Simulate perpendicularity by drawing as a flattened sine (isometric feel)
        const bScale = Math.sin(angleRad); // visual scaling based on angle
        ctx.strokeStyle = 'rgba(80, 160, 255, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = waveStartX; x <= waveEndX; x++) {
            const t = ((x - waveStartX) / waveLen) * Math.PI * 4 - waveSpeed + phaseRad;
            // B oscillates in the "z" direction (simulated as slight vertical + horizontal offset)
            const bY = centerY + Math.sin(t) * amplitude * 0.35 * bScale;
            if (x === waveStartX) ctx.moveTo(x, bY);
            else ctx.lineTo(x, bY);
        }
        ctx.stroke();

        // B field arrows (horizontal-ish for isometric feel)
        ctx.strokeStyle = 'rgba(80, 160, 255, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const frac = (i + 0.5) / 10;
            const x = waveStartX + frac * waveLen;
            const t = frac * Math.PI * 4 - waveSpeed + phaseRad;
            const bDisp = Math.sin(t) * 30 * bScale;
            ctx.beginPath();
            ctx.moveTo(x, centerY);
            ctx.lineTo(x + bDisp, centerY + Math.abs(bDisp) * 0.4);
            ctx.stroke();
        }

        // ---- Propagation axis ----
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(waveStartX, centerY);
        ctx.lineTo(waveEndX + 40, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // ---- Poynting Vector Arrow (green) ----
        const poyntingMag = state.power / 100;
        const arrowLen = 30 + poyntingMag * 100;
        const arrowThickness = 2 + poyntingMag * 8;
        const arrowX = waveEndX - 20;
        const arrowAlpha = 0.3 + poyntingMag * 0.7;

        // Glow
        if (poyntingMag > 0.5) {
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = poyntingMag * 20;
        }

        ctx.strokeStyle = `rgba(0, 255, 136, ${arrowAlpha})`;
        ctx.fillStyle = `rgba(0, 255, 136, ${arrowAlpha})`;
        ctx.lineWidth = arrowThickness;
        ctx.beginPath();
        ctx.moveTo(arrowX, centerY);
        ctx.lineTo(arrowX + arrowLen, centerY);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(arrowX + arrowLen + 12, centerY);
        ctx.lineTo(arrowX + arrowLen - 4, centerY - arrowThickness * 1.5);
        ctx.lineTo(arrowX + arrowLen - 4, centerY + arrowThickness * 1.5);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // ---- Nanobot target ----
        const nanobotX = WIDTH - 80;
        const nanobotY = centerY;
        const isReceiving = state.power >= 95;

        // Nanobot glow
        if (isReceiving) {
            const pulse = Math.sin(time * 0.06) * 0.3 + 0.7;
            ctx.beginPath();
            ctx.arc(nanobotX, nanobotY, 30, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 136, ${pulse * 0.15})`;
            ctx.fill();

            // Energy beam connecting arrow to nanobot
            ctx.strokeStyle = `rgba(0, 255, 136, ${pulse * 0.3})`;
            ctx.lineWidth = arrowThickness * 0.6;
            ctx.beginPath();
            ctx.moveTo(arrowX + arrowLen + 12, centerY);
            ctx.lineTo(nanobotX - 20, nanobotY);
            ctx.stroke();
        }

        // Nanobot body
        ctx.fillStyle = isReceiving ? '#00ff88' : 'rgba(100, 120, 140, 0.6)';
        ctx.beginPath();
        ctx.arc(nanobotX, nanobotY, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isReceiving ? 'rgba(0, 255, 136, 0.8)' : 'rgba(100, 120, 140, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Antenna lines
        ctx.strokeStyle = isReceiving ? 'rgba(0, 255, 136, 0.6)' : 'rgba(100, 120, 140, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(nanobotX - 10, nanobotY - 14);
        ctx.lineTo(nanobotX - 16, nanobotY - 28);
        ctx.moveTo(nanobotX + 10, nanobotY - 14);
        ctx.lineTo(nanobotX + 16, nanobotY - 28);
        ctx.stroke();

        ctx.fillStyle = isReceiving ? '#00ff88' : 'rgba(150, 170, 190, 0.5)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NANOBOT', nanobotX, nanobotY + 32);

        // Won sparkle
        if (state.won) {
            for (let i = 0; i < 8; i++) {
                const sparkAngle = (time * 0.02 + i * Math.PI / 4) % (Math.PI * 2);
                const sparkR = 28 + Math.sin(time * 0.01 + i) * 6;
                const sx = nanobotX + Math.cos(sparkAngle) * sparkR;
                const sy = nanobotY + Math.sin(sparkAngle) * sparkR;
                ctx.fillStyle = `rgba(0, 255, 136, ${Math.sin(time * 0.008 + i) * 0.4 + 0.4})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ---- Labels ----
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255, 80, 100, 0.8)';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText('E (Campo Eléctrico)', waveStartX, 22);

        ctx.fillStyle = 'rgba(80, 160, 255, 0.8)';
        ctx.fillText('B (Campo Magnético)', waveStartX, 38);

        ctx.fillStyle = `rgba(0, 255, 136, ${arrowAlpha})`;
        ctx.fillText(`S (Poynting): ${state.power}%`, waveStartX, HEIGHT - 16);

        // Hold progress indicator
        if (state.holdTime > 0 && !state.won) {
            const holdFrac = Math.min(state.holdTime / HOLD_DURATION, 1);
            ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
            ctx.fillRect(waveStartX, HEIGHT - 8, (waveEndX - waveStartX) * holdFrac, 4);
            ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
            ctx.fillRect(waveStartX, HEIGHT - 8, (waveEndX - waveStartX) * holdFrac, 4);
        }
    }, []);

    // ---- Animation loop ----
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameTime = 0;
        const animate = () => {
            frameTime++;
            drawFrame(ctx, stateRef.current, frameTime);
            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animRef.current);
    }, [drawFrame]);

    // ---- Game loop ----
    const startGame = useCallback(() => {
        setRunning(true);
        setCompleted(false);
        setResult(null);
        setWon(false);
        setPhaseSlider(90);
        setAngleSlider(45);
        const fresh = createInitialPoyntingState();
        setGameState(fresh);
        stateRef.current = fresh;

        tickRef.current = setInterval(() => {
            const newState = stepPoynting(stateRef.current, phaseRef.current, angleRef.current);
            stateRef.current = newState;
            setGameState(newState);

            if (newState.isFinished) {
                if (tickRef.current) clearInterval(tickRef.current);
                finishGame(newState);
            }
        }, 1000 / TICK_RATE);
    }, []);

    const finishGame = async (finalState: PoyntingState) => {
        setRunning(false);
        setCompleted(true);
        setWon(finalState.won);

        const currentSession = sessionRef.current;
        const currentHints = hintsUsedRef.current;

        const { score, efficiency } = calculatePoyntingScore(finalState);
        const challengeResult = calculateChallengeResult('poynting', score, efficiency, Math.round(finalState.elapsed), currentHints);
        setResult(challengeResult);

        if (finalState.won && currentSession) {
            try {
                const res = await fetch('/api/progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentSession.access_token}`
                    },
                    body: JSON.stringify({
                        challengeId: 'poynting',
                        score,
                        xpEarned: challengeResult.totalXP,
                        timeSeconds: Math.round(finalState.elapsed),
                        hintsUsed: currentHints
                    })
                });
                if (!res.ok) console.error('Progress API error:', res.status, await res.text());
                refreshProfile();
            } catch (err) {
                console.error('Failed to save progress:', err);
            }
        }
    };

    const resetChallenge = () => {
        if (tickRef.current) clearInterval(tickRef.current);
        cancelAnimationFrame(animRef.current);
        setRunning(false);
        setCompleted(false);
        setResult(null);
        setWon(false);
        setPhaseSlider(90);
        setAngleSlider(45);
        setHintsUsed(0);
        setShowHint(null);
        const fresh = createInitialPoyntingState();
        setGameState(fresh);
        stateRef.current = fresh;
    };

    const requestHint = () => {
        if (hintsUsed < POYNTING_HINTS.length) {
            setShowHint(POYNTING_HINTS[hintsUsed]);
            setHintsUsed(prev => prev + 1);
        }
    };

    useEffect(() => {
        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
            cancelAnimationFrame(animRef.current);
        };
    }, []);

    const power = getPowerPercent(phaseSlider, angleSlider);
    const zone = getZone(power);
    const zoneColor = getZoneColor(zone);

    return (
        <div className={styles.simulation}>
            <div className={styles.canvasSection}>
                <div className={styles.canvasWrapper}>
                    <canvas
                        ref={canvasRef}
                        width={WIDTH}
                        height={HEIGHT}
                        className={styles.canvas}
                    />
                    {won && (
                        <motion.div
                            className={styles.hitOverlay}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            style={{ color: '#00ff88', textShadow: '0 0 30px rgba(0, 255, 136, 0.8)' }}
                        >
                            ⚡ ¡Rayo Forjado!
                        </motion.div>
                    )}
                </div>

                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        <strong>Vector de Poynting:</strong> S = E × B describe el flujo de energía electromagnética.
                        Para máxima transferencia, E y B deben estar <strong>en fase</strong> (Δφ = 0°)
                        y ser <strong>perpendiculares</strong> (θ = 90°).
                    </p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                        <span><span style={{ color: '#ff5064' }}>━</span> Campo E</span>
                        <span><span style={{ color: '#50a0ff' }}>━</span> Campo B</span>
                        <span><span style={{ color: '#00ff88' }}>➤</span> Vector S</span>
                        <span>🤖 Nanobot</span>
                    </div>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 className={styles.controlTitle} style={{ margin: 0 }}>⚙️ Controles</h3>
                    {running && (
                        <div style={{
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            color: 'var(--neon-cyan)',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '4px 12px',
                            borderRadius: '4px',
                        }}>
                            ⏱ {gameState.elapsed.toFixed(1)}s
                        </div>
                    )}
                </div>

                {/* Power Gauge */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Potencia Transmitida: <span className="font-mono" style={{ color: zoneColor, fontSize: '1.1rem', fontWeight: 700 }}>{power}%</span>
                    </label>
                    <div style={{
                        position: 'relative',
                        height: '28px',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        {/* 95% threshold marker */}
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: '95%',
                            width: '2px',
                            background: 'rgba(0, 255, 136, 0.5)',
                            zIndex: 1,
                        }} />
                        {/* Fill */}
                        <div style={{
                            position: 'absolute', top: '2px', bottom: '2px', left: '2px',
                            width: `${power}%`,
                            maxWidth: 'calc(100% - 4px)',
                            background: `linear-gradient(90deg, ${zoneColor}88, ${zoneColor})`,
                            borderRadius: '12px',
                            transition: 'width 80ms ease, background 200ms ease',
                            boxShadow: power >= 95 ? `0 0 12px ${zoneColor}66` : 'none',
                        }} />
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            fontSize: '0.75rem', fontWeight: 700, color: 'white',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)', fontFamily: 'var(--font-mono)',
                        }}>
                            {power}% {power >= 95 ? '✅' : ''}
                        </div>
                    </div>
                </div>

                {/* Hold Progress */}
                {running && gameState.holdTime > 0 && (
                    <div className={styles.controlGroup}>
                        <label className={styles.controlLabel}>
                            Mantenimiento (&gt;95%): <span className="font-mono" style={{ color: '#00ff88' }}>{gameState.holdTime.toFixed(1)}s / {HOLD_DURATION}s</span>
                        </label>
                        <div style={{
                            height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${(gameState.holdTime / HOLD_DURATION) * 100}%`,
                                background: 'linear-gradient(90deg, #00ff88, #00ffaa)',
                                borderRadius: '4px',
                                transition: 'width 80ms ease',
                            }} />
                        </div>
                    </div>
                )}

                {/* Phase Shift Slider */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Desfasaje (Δφ): <span className="font-mono" style={{ color: phaseSlider <= 10 ? '#00ff88' : phaseSlider <= 45 ? '#ffd700' : '#ff8800' }}>{phaseSlider}°</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="180"
                        step="1"
                        value={phaseSlider}
                        onChange={(e) => setPhaseSlider(parseInt(e.target.value))}
                        disabled={!running}
                        style={{ cursor: running ? 'grab' : 'not-allowed' }}
                    />
                    <div className={styles.rangeLabels}>
                        <span style={{ color: '#00ff88' }}>0° (en fase)</span>
                        <span>90°</span>
                        <span style={{ color: '#ff4444' }}>180° (antifase)</span>
                    </div>
                </div>

                {/* Relative Angle Slider */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Ángulo relativo E↔B (θ): <span className="font-mono" style={{ color: Math.abs(angleSlider - 90) <= 10 ? '#00ff88' : Math.abs(angleSlider - 90) <= 30 ? '#ffd700' : '#ff8800' }}>{angleSlider}°</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="180"
                        step="1"
                        value={angleSlider}
                        onChange={(e) => setAngleSlider(parseInt(e.target.value))}
                        disabled={!running}
                        style={{ cursor: running ? 'grab' : 'not-allowed' }}
                    />
                    <div className={styles.rangeLabels}>
                        <span style={{ color: '#ff4444' }}>0° (paralelos)</span>
                        <span style={{ color: '#00ff88' }}>90° (⊥)</span>
                        <span style={{ color: '#ff4444' }}>180° (anti‖)</span>
                    </div>
                </div>

                {/* Formula */}
                <div className={styles.formulaBox} style={{ borderColor: 'rgba(0, 200, 255, 0.2)', background: 'rgba(0, 200, 255, 0.04)' }}>
                    <span className={styles.formulaLabel}>Vector de Poynting</span>
                    <span className={styles.formula} style={{ color: '#00c8ff' }}>S = E × B = E·B·cos(Δφ)·sin(θ)</span>
                </div>

                {/* Buttons */}
                <div className={styles.buttonGroup}>
                    {!running && !completed && (
                        <button className="btn btn-primary" onClick={startGame} style={{ width: '100%' }}>
                            ▶ Forjar Rayo
                        </button>
                    )}
                    {running && (
                        <button className="btn btn-secondary" onClick={() => {
                            if (tickRef.current) clearInterval(tickRef.current);
                            finishGame(stateRef.current);
                        }} style={{ width: '100%' }}>
                            ⏸ Detener
                        </button>
                    )}
                    {completed && (
                        <button className="btn btn-secondary" onClick={resetChallenge} style={{ width: '100%' }}>
                            🔄 Reiniciar
                        </button>
                    )}
                </div>

                {/* Hints */}
                {!completed && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pistas ({hintsUsed}/{POYNTING_HINTS.length})</span>
                            <button className="btn btn-ghost btn-sm" onClick={requestHint} disabled={hintsUsed >= POYNTING_HINTS.length}>
                                💡 Pedir Pista (-10% XP)
                            </button>
                        </div>
                        {showHint && (
                            <div style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255,215,0,0.3)', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', color: '#ffd700' }}>
                                💡 {showHint}
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <motion.div
                        className={styles.resultPanel}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={won ? { borderColor: 'rgba(0,255,136,0.3)', background: 'rgba(0,255,136,0.06)' } : {}}
                    >
                        {won ? (
                            <>
                                <h4 className={styles.resultTitle} style={{ color: '#00ff88' }}>
                                    🎉 ¡Rayo Forjado! Nanobot Activado
                                </h4>
                                <p className={styles.resultFeedback}>
                                    ¡Sincronizaste los campos E y B perfectamente! El Vector de Poynting transmitió máxima energía al nanobot.
                                </p>
                            </>
                        ) : (
                            <>
                                <h4 className={styles.resultTitle}>⚡ Sincronización incompleta</h4>
                                <p className={styles.resultFeedback}>
                                    Mantené la potencia por encima del 95% durante {HOLD_DURATION} segundos. Ajustá Δφ → 0° y θ → 90° simultáneamente.
                                </p>
                            </>
                        )}
                        <div className={styles.resultStats}>
                            <div className={styles.resultStat}>
                                <span>Score</span>
                                <strong>{result.score}%</strong>
                            </div>
                            <div className={styles.resultStat}>
                                <span>XP Base</span>
                                <strong>+{result.baseXP}</strong>
                            </div>
                            <div className={styles.resultStat}>
                                <span>Bonus Eficiencia</span>
                                <strong>+{result.bonusXP}</strong>
                            </div>
                            <div className={styles.resultStat} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
                                <span style={{ color: 'var(--neon-gold)' }}>⭐ XP Total</span>
                                <strong style={{ color: 'var(--neon-gold)', fontSize: '1.2rem' }}>+{result.totalXP}</strong>
                            </div>
                        </div>
                        {won && (
                            <div className={styles.achievements}>
                                <span className={styles.achievementLabel}>🏆 Logros desbloqueados:</span>
                                <span className="badge badge-gold">⚡ Señor de las Ondas</span>
                            </div>
                        )}
                        {result.achievementsUnlocked.length > 0 && (
                            <div className={styles.achievements}>
                                {result.achievementsUnlocked.map((a) => (
                                    <span key={a} className="badge badge-gold">{a}</span>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
