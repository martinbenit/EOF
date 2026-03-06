'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    createParticle,
    createDefaultLorentzParams,
    stepParticle,
    distanceToTarget,
    calculateLorentzScore,
} from '@/lib/physics/lorentz';
import { calculateChallengeResult } from '@/lib/gamification';
import { Particle, LorentzParams, ChallengeResult } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useChallengeSession } from '@/hooks/useChallengeSession';
import styles from './ChallengeSimulation.module.css';

const LORENTZ_HINTS = [
    "Recuerda la regla de la mano derecha: el pulgar indica la velocidad, el índice el campo magnético, y el dedo medio la fuerza (para cargas positivas).",
    "Si el campo magnético Bz es positivo, saldrá de la pantalla. Si es negativo, entrará.",
    "Para llegar al objetivo más rápido, mantén el campo magnético bajo hasta que estés alineado, o usa un campo fuerte para curvar rápidamente."
];

export default function LorentzChallenge() {
    const { session, refreshProfile } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);

    const [params, setParams] = useState<LorentzParams>(createDefaultLorentzParams());
    const [particle, setParticle] = useState<Particle>(createParticle(createDefaultLorentzParams()));
    const [running, setRunning] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);
    const [hitTarget, setHitTarget] = useState(false);

    const { timeSeconds, formattedTime, hintsUsed, showHint, requestHint, stopTimer, resetSession, totalHints } = useChallengeSession(LORENTZ_HINTS);

    const WIDTH = 800;
    const HEIGHT = 450;
    const TARGET_RADIUS = 25;

    const particleRef = useRef(particle);
    particleRef.current = particle;

    const paramsRef = useRef(params);
    paramsRef.current = params;

    const drawFrame = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Background grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < WIDTH; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
        }
        for (let y = 0; y < HEIGHT; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
        }

        // B-field arrows
        const bz = paramsRef.current.bField.z;
        ctx.fillStyle = bz > 0 ? 'rgba(0,240,255,0.08)' : 'rgba(255,0,170,0.08)';
        for (let x = 30; x < WIDTH; x += 80) {
            for (let y = 30; y < HEIGHT; y += 80) {
                ctx.beginPath();
                ctx.arc(x, y, 3 + Math.abs(bz) * 1.5, 0, Math.PI * 2);
                ctx.fill();
                if (bz > 0) {
                    // Dot (field out of screen)
                    ctx.fillStyle = 'rgba(0,240,255,0.15)';
                    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = bz > 0 ? 'rgba(0,240,255,0.08)' : 'rgba(255,0,170,0.08)';
                } else if (bz < 0) {
                    // Cross (field into screen)
                    ctx.strokeStyle = 'rgba(255,0,170,0.15)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke();
                    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
                    ctx.lineWidth = 1;
                }
            }
        }

        // Target
        const t = paramsRef.current.targetPosition;
        ctx.beginPath();
        ctx.arc(t.x, t.y, TARGET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,255,136,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,255,136,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Target crosshair
        ctx.strokeStyle = 'rgba(0,255,136,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(t.x - 10, t.y); ctx.lineTo(t.x + 10, t.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(t.x, t.y - 10); ctx.lineTo(t.x, t.y + 10); ctx.stroke();

        // Trail
        if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
                const alpha = i / p.trail.length;
                ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.6})`;
                ctx.lineWidth = 1 + alpha * 2;
                ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.stroke();
        }

        // Particle
        const glow = ctx.createRadialGradient(p.position.x, p.position.y, 0, p.position.x, p.position.y, 18);
        glow.addColorStop(0, 'rgba(0, 240, 255, 0.8)');
        glow.addColorStop(0.5, 'rgba(0, 240, 255, 0.2)');
        glow.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Velocity vector
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.position.x, p.position.y);
        ctx.lineTo(p.position.x + p.velocity.x * 12, p.position.y + p.velocity.y * 12);
        ctx.stroke();

        // Info overlay
        ctx.fillStyle = 'rgba(240,240,255,0.7)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(`Bz = ${paramsRef.current.bField.z.toFixed(1)} T`, 12, 22);
        ctx.fillText(`v = (${p.velocity.x.toFixed(1)}, ${p.velocity.y.toFixed(1)})`, 12, 38);
        ctx.fillText(`pos = (${p.position.x.toFixed(0)}, ${p.position.y.toFixed(0)})`, 12, 54);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawFrame(ctx, particle);
    }, [particle, drawFrame]);

    const startSimulation = useCallback(() => {
        setRunning(true);
        setCompleted(false);
        setResult(null);
        setHitTarget(false);
        const newParticle = createParticle(paramsRef.current);
        setParticle(newParticle);
        particleRef.current = newParticle;

        let p = newParticle;
        let steps = 0;
        const maxSteps = 3000;

        const animate = () => {
            p = stepParticle(p, paramsRef.current.bField, 0.15);
            steps++;

            const dist = distanceToTarget(p, paramsRef.current.targetPosition);
            const oob = p.position.x < -50 || p.position.x > WIDTH + 50 || p.position.y < -50 || p.position.y > HEIGHT + 50;

            if (dist < TARGET_RADIUS) {
                setHitTarget(true);
                setParticle(p);
                finishChallenge(p, true);
                return;
            }

            if (oob || steps >= maxSteps) {
                setParticle(p);
                finishChallenge(p, false);
                return;
            }

            setParticle(p);
            particleRef.current = p;
            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
    }, []);

    const finishChallenge = async (p: Particle, hit: boolean) => {
        setRunning(false);
        setCompleted(true);
        stopTimer();

        const dist = distanceToTarget(p, paramsRef.current.targetPosition);
        const { score, efficiency } = calculateLorentzScore(paramsRef.current, dist, hit);
        const challengeResult = calculateChallengeResult('lorentz', score, efficiency, timeSeconds, hintsUsed);
        setResult(challengeResult);

        // Save progress to DB
        if (hit && session) {
            try {
                await fetch('/api/progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        challengeId: 'lorentz',
                        score,
                        xpEarned: challengeResult.totalXP,
                        timeSeconds,
                        hintsUsed
                    })
                });
                refreshProfile(); // update user XP in context
            } catch (err) {
                console.error('Failed to save progress:', err);
            }
        }
    };

    const resetChallenge = () => {
        cancelAnimationFrame(animRef.current);
        setRunning(false);
        setCompleted(false);
        setResult(null);
        setHitTarget(false);
        const newParams = createDefaultLorentzParams();
        setParams(newParams);
        setParticle(createParticle(newParams));
        resetSession();
    };

    useEffect(() => {
        return () => cancelAnimationFrame(animRef.current);
    }, []);

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
                    {hitTarget && (
                        <motion.div
                            className={styles.hitOverlay}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                            🎯 ¡Impacto!
                        </motion.div>
                    )}
                </div>

                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        <strong>La Fuerza de Lorentz</strong> describe cómo una partícula cargada se mueve en presencia de un campo eléctrico y magnético.
                        En este simulador, controlas un campo magnético tridimensional alineado en el eje Z (B_z) y la velocidad inicial (v_0) de un protón
                        (carga positiva). Tu objetivo es predecir y manipular la trayectoria curva que adopta la partícula para que impacte el objetivo.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
                        <span><span style={{ color: '#00f0ff' }}>●</span> Protón (+1e)</span>
                        <span><span style={{ color: '#00ff88' }}>◎</span> Objetivo</span>
                        <span><span style={{ color: '#ffd700' }}>→</span> Velocidad</span>
                    </div>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 className={styles.controlTitle} style={{ margin: 0 }}>⚙️ Controles</h3>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--neon-cyan)', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '4px' }}>
                        ⏱ {formattedTime}
                    </div>
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Campo Magnético Bz: <span className="font-mono">{params.bField.z.toFixed(1)} T</span>
                    </label>
                    <input
                        type="range"
                        min="-8"
                        max="8"
                        step="0.1"
                        value={params.bField.z}
                        onChange={(e) =>
                            setParams((p) => ({ ...p, bField: { ...p.bField, z: parseFloat(e.target.value) } }))
                        }
                        disabled={running}
                    />
                    <div className={styles.rangeLabels}><span>-8 T</span><span>0</span><span>+8 T</span></div>
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Velocidad inicial vx: <span className="font-mono">{params.initialVelocity.x.toFixed(1)}</span>
                    </label>
                    <input
                        type="range"
                        min="0.5"
                        max="8"
                        step="0.1"
                        value={params.initialVelocity.x}
                        onChange={(e) =>
                            setParams((p) => ({
                                ...p,
                                initialVelocity: { ...p.initialVelocity, x: parseFloat(e.target.value) },
                            }))
                        }
                        disabled={running}
                    />
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Velocidad inicial vy: <span className="font-mono">{params.initialVelocity.y.toFixed(1)}</span>
                    </label>
                    <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.1"
                        value={params.initialVelocity.y}
                        onChange={(e) =>
                            setParams((p) => ({
                                ...p,
                                initialVelocity: { ...p.initialVelocity, y: parseFloat(e.target.value) },
                            }))
                        }
                        disabled={running}
                    />
                </div>

                <div className={styles.formulaBox}>
                    <span className={styles.formulaLabel}>Fuerza de Lorentz</span>
                    <span className={styles.formula}>F⃗ = q(v⃗ × B⃗)</span>
                </div>

                <div className={styles.buttonGroup}>
                    {!running && !completed && (
                        <button className="btn btn-primary" onClick={startSimulation} style={{ width: '100%' }}>
                            ▶ Lanzar Partícula
                        </button>
                    )}
                    {running && (
                        <button className="btn btn-secondary" onClick={() => { cancelAnimationFrame(animRef.current); setRunning(false); }} style={{ width: '100%' }}>
                            ⏸ Detener
                        </button>
                    )}
                    {completed && (
                        <button className="btn btn-secondary" onClick={resetChallenge} style={{ width: '100%' }}>
                            🔄 Reiniciar
                        </button>
                    )}
                </div>

                {!completed && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pistas ({hintsUsed}/{totalHints})</span>
                            <button className="btn btn-ghost btn-sm" onClick={requestHint} disabled={hintsUsed >= totalHints}>
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

                {result && (
                    <motion.div
                        className={styles.resultPanel}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h4 className={styles.resultTitle}>Resultados</h4>
                        <p className={styles.resultFeedback}>{result.feedback}</p>
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
                        {result.achievementsUnlocked.length > 0 && (
                            <div className={styles.achievements}>
                                <span className={styles.achievementLabel}>🏆 Logros desbloqueados:</span>
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
