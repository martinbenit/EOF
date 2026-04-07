'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    createInitialFaradayState,
    stepFaraday,
    calculateFaradayScore,
    getZoneColor,
    getVoltageFillRatio,
    FARADAY_CONSTANT,
    GREEN_MIN,
    GREEN_MAX,
    MAX_VOLTAGE,
    GAME_DURATION,
    TICK_RATE,
    LENZ_FRICTION_COEFF,
    FaradayState,
} from '@/lib/physics/faraday';
import { calculateChallengeResult } from '@/lib/gamification';
import { ChallengeResult } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import styles from './ChallengeSimulation.module.css';

const FARADAY_HINTS = [
    "La Ley de Faraday dice que el voltaje inducido es proporcional a la rapidez con que cambia el flujo magnético. ¡Mové el imán más rápido!",
    "La Ley de Lenz indica que la corriente inducida se opone al cambio que la produce. Por eso sentís resistencia al mover el slider.",
    "Mantené el voltaje en la zona verde (2–4V) para cargar la batería de forma estable. ¡Evitá la sobrecarga!",
];

export default function FaradayChallenge() {
    const { session, refreshProfile } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [gameState, setGameState] = useState<FaradayState>(createInitialFaradayState());
    const [sliderValue, setSliderValue] = useState(0);
    const [running, setRunning] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);
    const [won, setWon] = useState(false);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

    // Hints
    const [hintsUsed, setHintsUsed] = useState(0);
    const [showHint, setShowHint] = useState<string | null>(null);

    const sliderRef = useRef(sliderValue);
    sliderRef.current = sliderValue;

    const stateRef = useRef(gameState);
    stateRef.current = gameState;

    const WIDTH = 800;
    const HEIGHT = 450;

    // ---- Canvas Drawing ----
    const drawFrame = useCallback((ctx: CanvasRenderingContext2D, state: FaradayState, time: number) => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        bgGrad.addColorStop(0, 'rgba(10, 8, 30, 1)');
        bgGrad.addColorStop(1, 'rgba(15, 12, 40, 1)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < WIDTH; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
        }
        for (let y = 0; y < HEIGHT; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
        }

        const centerX = WIDTH / 2;
        const centerY = HEIGHT / 2;

        // ---- Draw Coil (solenoid wireframe) ----
        const coilX = centerX;
        const coilY = centerY;
        const coilWidth = 120;
        const coilHeight = 160;
        const numLoops = 8;

        // Coil body outline
        ctx.strokeStyle = 'rgba(120, 180, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(coilX - coilWidth / 2, coilY - coilHeight / 2, coilWidth, coilHeight, 8);
        ctx.stroke();

        // Coil windings
        const glowing = state.zone === 'optimal';
        for (let i = 0; i < numLoops; i++) {
            const loopY = coilY - coilHeight / 2 + (coilHeight / (numLoops + 1)) * (i + 1);
            const pulse = glowing ? Math.sin(time * 0.005 + i * 0.5) * 0.3 + 0.7 : 0.4;
            ctx.strokeStyle = glowing
                ? `rgba(0, 255, 136, ${pulse})`
                : `rgba(100, 160, 255, ${0.3 + i * 0.03})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(coilX, loopY, coilWidth / 2 + 8, 6, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Coil label
        ctx.fillStyle = 'rgba(100, 160, 255, 0.6)';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ESPIRA', coilX, coilY + coilHeight / 2 + 20);

        // ---- Draw Magnet ----
        const magnetSpeed = Math.abs(state.velocity);
        // Magnet oscillates horizontally based on velocity
        const magnetOffset = state.magnetPosition * 180;
        const magnetX = coilX + magnetOffset;
        const magnetY = coilY;
        const magnetW = 80;
        const magnetH = 36;

        // Magnet shadow/glow
        if (magnetSpeed > 1) {
            const glowIntensity = Math.min(magnetSpeed / 10, 1);
            ctx.shadowColor = state.zone === 'overload' ? '#ff4444' : '#00f0ff';
            ctx.shadowBlur = 15 * glowIntensity;
        }

        // N pole (red)
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath();
        ctx.roundRect(magnetX - magnetW / 2, magnetY - magnetH / 2, magnetW / 2, magnetH, [8, 0, 0, 8]);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', magnetX - magnetW / 4, magnetY + 6);

        // S pole (blue)
        ctx.fillStyle = '#4d9fff';
        ctx.beginPath();
        ctx.roundRect(magnetX, magnetY - magnetH / 2, magnetW / 2, magnetH, [0, 8, 8, 0]);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('S', magnetX + magnetW / 4, magnetY + 6);

        ctx.shadowBlur = 0;

        // ---- Magnetic Field Lines ----
        if (magnetSpeed > 0.5) {
            const numLines = 5;
            const alpha = Math.min(magnetSpeed / 8, 0.6);
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < numLines; i++) {
                const spread = (i - numLines / 2 + 0.5) * 14;
                ctx.beginPath();
                // Lines from N pole curving to S pole
                const startX = magnetX - magnetW / 2 - 5;
                const endX = magnetX + magnetW / 2 + 5;
                const curveHeight = 30 + Math.abs(spread) * 1.5;
                ctx.moveTo(startX, magnetY + spread * 0.3);
                ctx.quadraticCurveTo(
                    magnetX, magnetY - curveHeight + spread,
                    endX, magnetY + spread * 0.3
                );
                ctx.stroke();
            }
        }

        // ---- Induced current sparks (when optimal) ----
        if (state.zone === 'optimal') {
            for (let i = 0; i < 6; i++) {
                const sparkAngle = (time * 0.003 + i * Math.PI / 3) % (Math.PI * 2);
                const sparkR = coilWidth / 2 + 20 + Math.sin(time * 0.01 + i) * 8;
                const sparkX = coilX + Math.cos(sparkAngle) * sparkR;
                const sparkY = coilY + Math.sin(sparkAngle) * (coilHeight / 2 + 10);
                const sparkAlpha = Math.sin(time * 0.008 + i) * 0.4 + 0.4;

                ctx.fillStyle = `rgba(0, 255, 136, ${sparkAlpha})`;
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ---- Overload warning flashes ----
        if (state.zone === 'overload') {
            const flash = Math.sin(time * 0.02) * 0.15 + 0.1;
            ctx.fillStyle = `rgba(255, 68, 68, ${flash})`;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
            ctx.font = 'bold 18px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ SOBRECARGA TÉRMICA', centerX, 35);
        }

        // ---- Heart/Pacemaker icon (bottom-right) ----
        const heartX = WIDTH - 80;
        const heartY = HEIGHT - 60;
        const heartPulse = state.zone === 'optimal'
            ? 1 + Math.sin(time * 0.015) * 0.15
            : 1;
        ctx.save();
        ctx.translate(heartX, heartY);
        ctx.scale(heartPulse, heartPulse);
        ctx.font = '36px serif';
        ctx.textAlign = 'center';
        ctx.fillText('❤️', 0, 12);
        ctx.restore();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NANO-MARCAPASOS', heartX, heartY + 30);

        // ---- Info overlay ----
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(240,240,255,0.7)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(`v = ${state.velocity.toFixed(1)}`, 12, 22);
        ctx.fillText(`ε = ${state.voltage.toFixed(2)} V`, 12, 38);
        ctx.fillText(`Zona: ${state.zone === 'optimal' ? '✅ Óptima' : state.zone === 'overload' ? '🔴 Sobrecarga' : '🟡 Baja'}`, 12, 54);
    }, []);

    // ---- Animation loop (just for drawing) ----
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

    // ---- Game loop (physics ticks) ----
    const startGame = useCallback(() => {
        setRunning(true);
        setCompleted(false);
        setResult(null);
        setWon(false);
        setTimeLeft(GAME_DURATION);
        const freshState = createInitialFaradayState();
        setGameState(freshState);
        stateRef.current = freshState;
        setSliderValue(0);

        let localTicks = 0;

        tickRef.current = setInterval(() => {
            localTicks++;
            const currentSlider = sliderRef.current;

            // Apply Lenz friction to slider value
            const frictionedVelocity = currentSlider * (1 - LENZ_FRICTION_COEFF * Math.abs(currentSlider));

            const newState = stepFaraday(stateRef.current, frictionedVelocity);
            stateRef.current = newState;
            setGameState(newState);

            // Update timer
            const elapsed = localTicks / TICK_RATE;
            setTimeLeft(Math.max(0, GAME_DURATION - elapsed));

            // Apply Lenz friction visually — pull slider toward center
            setSliderValue(prev => {
                const decay = prev * 0.97; // gentle pull toward 0
                return Math.abs(decay) < 0.05 ? 0 : decay;
            });

            if (newState.isFinished) {
                if (tickRef.current) clearInterval(tickRef.current);
                finishGame(newState);
            }
        }, 1000 / TICK_RATE);
    }, []);

    const finishGame = async (finalState: FaradayState) => {
        setRunning(false);
        setCompleted(true);
        setWon(finalState.won);

        const { score, efficiency } = calculateFaradayScore(finalState);
        const challengeResult = calculateChallengeResult('faraday', score, efficiency, GAME_DURATION, hintsUsed);
        setResult(challengeResult);

        // Save progress to DB
        if (finalState.won && session) {
            try {
                await fetch('/api/progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        challengeId: 'faraday',
                        score,
                        xpEarned: challengeResult.totalXP,
                        timeSeconds: GAME_DURATION,
                        hintsUsed
                    })
                });
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
        setSliderValue(0);
        setTimeLeft(GAME_DURATION);
        setHintsUsed(0);
        setShowHint(null);
        const freshState = createInitialFaradayState();
        setGameState(freshState);
        stateRef.current = freshState;
    };

    const requestHint = () => {
        if (hintsUsed < FARADAY_HINTS.length) {
            setShowHint(FARADAY_HINTS[hintsUsed]);
            setHintsUsed(prev => prev + 1);
        }
    };

    useEffect(() => {
        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
            cancelAnimationFrame(animRef.current);
        };
    }, []);

    const zoneColor = getZoneColor(gameState.zone);
    const voltageFill = getVoltageFillRatio(gameState.voltage);

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
                            ❤️‍🔥 ¡Marcapasos Cargado!
                        </motion.div>
                    )}
                </div>

                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        <strong>Ley de Faraday:</strong> Al mover un imán a través de una espira conductora, se induce un voltaje proporcional
                        a la velocidad del cambio de flujo magnético (ε = −dΦ/dt). La <strong>Ley de Lenz</strong> establece que la corriente
                        inducida genera un campo que se opone al cambio, simulado aquí como una fricción en el slider.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
                        <span><span style={{ color: '#ff4d6d' }}>■</span> Polo N</span>
                        <span><span style={{ color: '#4d9fff' }}>■</span> Polo S</span>
                        <span><span style={{ color: '#00ff88' }}>●</span> Corriente inducida</span>
                        <span>❤️ Nano-Marcapasos</span>
                    </div>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 className={styles.controlTitle} style={{ margin: 0 }}>⚙️ Controles</h3>
                    <div style={{
                        fontSize: '1.2rem',
                        fontFamily: 'monospace',
                        color: timeLeft < 10 ? '#ff4444' : 'var(--neon-cyan)',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        animation: timeLeft < 10 && running ? 'pulse 0.5s infinite' : 'none'
                    }}>
                        ⏱ {Math.ceil(timeLeft)}s
                    </div>
                </div>

                {/* Voltage Gauge */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Voltaje Inducido (ε): <span className="font-mono" style={{ color: zoneColor }}>{gameState.voltage.toFixed(2)} V</span>
                    </label>
                    <div style={{
                        position: 'relative',
                        height: '24px',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        {/* Zone markers */}
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: `${(GREEN_MIN / MAX_VOLTAGE) * 100}%`,
                            width: `${((GREEN_MAX - GREEN_MIN) / MAX_VOLTAGE) * 100}%`,
                            background: 'rgba(0, 255, 136, 0.1)',
                            borderLeft: '1px solid rgba(0,255,136,0.3)',
                            borderRight: '1px solid rgba(0,255,136,0.3)',
                        }} />
                        {/* Fill bar */}
                        <div style={{
                            position: 'absolute', top: '2px', bottom: '2px', left: '2px',
                            width: `${voltageFill * 100}%`,
                            maxWidth: 'calc(100% - 4px)',
                            background: `linear-gradient(90deg, ${zoneColor}88, ${zoneColor})`,
                            borderRadius: '10px',
                            transition: 'width 50ms ease, background 200ms ease',
                            boxShadow: `0 0 10px ${zoneColor}44`,
                        }} />
                    </div>
                    <div className={styles.rangeLabels}>
                        <span style={{ color: '#ffaa00' }}>Baja</span>
                        <span style={{ color: '#00ff88' }}>Óptima (2–4V)</span>
                        <span style={{ color: '#ff4444' }}>Sobrecarga</span>
                    </div>
                </div>

                {/* Slider: Magnet Speed */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Velocidad del Imán (v): <span className="font-mono">{sliderValue.toFixed(1)}</span>
                    </label>
                    <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.1"
                        value={sliderValue}
                        onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                        disabled={!running}
                        style={{ cursor: running ? 'grab' : 'not-allowed' }}
                    />
                    <div className={styles.rangeLabels}>
                        <span>-10 (← rápido)</span>
                        <span>0</span>
                        <span>(rápido →) +10</span>
                    </div>
                </div>

                {/* Battery Progress */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Batería del Marcapasos: <span className="font-mono" style={{ color: gameState.battery >= 100 ? '#00ff88' : gameState.battery > 50 ? '#ffaa00' : '#ff6b6b' }}>{gameState.battery.toFixed(1)}%</span>
                    </label>
                    <div style={{
                        position: 'relative',
                        height: '28px',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <div style={{
                            position: 'absolute', top: '2px', bottom: '2px', left: '2px',
                            width: `${gameState.battery}%`,
                            maxWidth: 'calc(100% - 4px)',
                            background: gameState.battery >= 80
                                ? 'linear-gradient(90deg, #00ff88, #00ffaa)'
                                : gameState.battery >= 40
                                    ? 'linear-gradient(90deg, #ffaa00, #ffd700)'
                                    : 'linear-gradient(90deg, #ff4444, #ff6b6b)',
                            borderRadius: '12px',
                            transition: 'width 50ms ease',
                            boxShadow: gameState.battery >= 80 ? '0 0 12px rgba(0,255,136,0.4)' : 'none',
                        }} />
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'white',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            ❤️ {gameState.battery.toFixed(0)}%
                        </div>
                    </div>
                </div>

                {/* Formula */}
                <div className={styles.formulaBox} style={{ borderColor: 'rgba(255, 77, 109, 0.2)', background: 'rgba(255, 77, 109, 0.04)' }}>
                    <span className={styles.formulaLabel}>Ley de Faraday</span>
                    <span className={styles.formula} style={{ color: '#ff4d6d' }}>ε = −dΦ/dt</span>
                </div>

                {/* Buttons */}
                <div className={styles.buttonGroup}>
                    {!running && !completed && (
                        <button className="btn btn-primary" onClick={startGame} style={{ width: '100%' }}>
                            ▶ Iniciar Generador
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
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pistas ({hintsUsed}/{FARADAY_HINTS.length})</span>
                            <button className="btn btn-ghost btn-sm" onClick={requestHint} disabled={hintsUsed >= FARADAY_HINTS.length}>
                                💡 Pedir Pista (-15% XP)
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
                                    🎉 ¡Éxito! Nano-Marcapasos Cargado
                                </h4>
                                <p className={styles.resultFeedback}>
                                    ¡Generaste suficiente energía para salvar una vida! Dominaste la inducción electromagnética.
                                </p>
                            </>
                        ) : (
                            <>
                                <h4 className={styles.resultTitle}>⏱️ Tiempo agotado</h4>
                                <p className={styles.resultFeedback}>
                                    La batería llegó al {gameState.battery.toFixed(0)}%. Intentá mantener el voltaje en la zona verde por más tiempo.
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
                                <span className="badge badge-gold">🔋 Bio-Electricista</span>
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
