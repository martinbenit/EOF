'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    COATING_MATERIALS, getCoating,
    getReflectancePercent, getTransmittancePercent,
    isWinCondition, calculateFresnelScore,
    N_AIR, N_SILICON, IDEAL_N,
} from '@/lib/physics/fresnel';
import { calculateChallengeResult } from '@/lib/gamification';
import { ChallengeResult } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import styles from './ChallengeSimulation.module.css';

const FRESNEL_HINTS = [
    "La reflectancia a incidencia normal se calcula con R = ((n₁ - n₂)/(n₁ + n₂))². Sin recubrimiento, la pérdida es alta.",
    "Un recubrimiento antirreflejo ideal tiene un índice de refracción n = √(n_aire × n_silicio). Calculá ese valor.",
    "√(1.0 × 3.5) ≈ 1.87. El material cuyo n se acerque más a 1.87 minimizará la reflexión.",
    "MgF₂ tiene n = 1.38, que es el más cercano a √3.5 entre las opciones disponibles. Probalo.",
    "¡Seleccioná MgF₂! Con n = 1.38 lográs la menor reflectancia posible con estos materiales.",
];

export default function FresnelChallenge() {
    const { session, refreshProfile } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);

    const [selectedCoating, setSelectedCoating] = useState('none');
    const [completed, setCompleted] = useState(false);
    const [won, setWon] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);
    const [attempts, setAttempts] = useState(0);

    const [hintsUsed, setHintsUsed] = useState(0);
    const [showHint, setShowHint] = useState<string | null>(null);

    const sessionRef = useRef(session);
    sessionRef.current = session;
    const hintsUsedRef = useRef(hintsUsed);
    hintsUsedRef.current = hintsUsed;
    const coatingRef = useRef(selectedCoating);
    coatingRef.current = selectedCoating;

    const WIDTH = 700;
    const HEIGHT = 500;

    const reflectance = getReflectancePercent(selectedCoating);
    const transmittance = getTransmittancePercent(selectedCoating);
    const isWin = isWinCondition(selectedCoating);

    // ---- Canvas Drawing ----
    const drawFrame = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
        const W = WIDTH;
        const H = HEIGHT;
        ctx.clearRect(0, 0, W, H);

        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, 'rgba(5, 3, 20, 1)');
        bg.addColorStop(1, 'rgba(10, 8, 30, 1)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const centerX = W / 2;
        const coatingId = coatingRef.current;
        const coating = getCoating(coatingId);
        const R = getReflectancePercent(coatingId) / 100;
        const T = 1 - R;
        const hasCoating = coatingId !== 'none';

        // ---- Layout zones ----
        const airZoneY = 0;
        const coatingY = 200;
        const coatingH = hasCoating ? 40 : 0;
        const siliconY = coatingY + coatingH;
        const siliconH = H - siliconY;

        // ---- Air zone ----
        ctx.fillStyle = 'rgba(20, 30, 60, 0.3)';
        ctx.fillRect(0, airZoneY, W, coatingY);
        ctx.fillStyle = 'rgba(100, 150, 200, 0.3)';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`AIRE  (n = ${N_AIR})`, 12, 20);

        // ---- Coating layer ----
        if (hasCoating) {
            ctx.fillStyle = coating.color + '33';
            ctx.fillRect(centerX - 140, coatingY, 280, coatingH);
            ctx.strokeStyle = coating.color + '88';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - 140, coatingY, 280, coatingH);

            ctx.fillStyle = coating.color;
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${coating.name}  (n = ${coating.n})`, centerX, coatingY + coatingH / 2 + 4);
        }

        // ---- Silicon substrate ----
        const siGrad = ctx.createLinearGradient(0, siliconY, 0, H);
        siGrad.addColorStop(0, 'rgba(60, 60, 90, 0.8)');
        siGrad.addColorStop(1, 'rgba(40, 40, 70, 0.9)');
        ctx.fillStyle = siGrad;
        ctx.fillRect(centerX - 140, siliconY, 280, siliconH);
        ctx.strokeStyle = 'rgba(100, 100, 160, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 140, siliconY, 280, siliconH);

        // Silicon label
        ctx.fillStyle = 'rgba(150, 150, 220, 0.7)';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`PANEL DE SILICIO  (n = ${N_SILICON})`, centerX, siliconY + 30);

        // Solar cell grid pattern
        ctx.strokeStyle = 'rgba(100, 100, 180, 0.15)';
        ctx.lineWidth = 1;
        for (let gx = centerX - 130; gx < centerX + 140; gx += 20) {
            ctx.beginPath(); ctx.moveTo(gx, siliconY + 5); ctx.lineTo(gx, H - 5); ctx.stroke();
        }
        for (let gy = siliconY + 20; gy < H; gy += 20) {
            ctx.beginPath(); ctx.moveTo(centerX - 135, gy); ctx.lineTo(centerX + 135, gy); ctx.stroke();
        }

        // ---- Light rays ----
        const wavePhase = time * 0.05;
        const incidentThickness = 6;
        const reflectedThickness = Math.max(1, incidentThickness * R * 2.5);
        const transmittedThickness = Math.max(1, incidentThickness * T * 1.5);

        // Surface point
        const surfaceY = hasCoating ? coatingY : siliconY;
        const hitX = centerX;
        const hitY = surfaceY;

        // --- Incident ray (yellow, from top) ---
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
        ctx.lineWidth = incidentThickness;
        ctx.beginPath();
        ctx.moveTo(hitX, 0);
        ctx.lineTo(hitX, hitY);
        ctx.stroke();

        // Wavefronts on incident ray
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 200, 0.3)';
        ctx.lineWidth = 1;
        for (let wy = 0; wy < hitY; wy += 25) {
            const wOff = (wy + wavePhase * 10) % 25;
            if (wOff < 3) {
                ctx.beginPath();
                ctx.moveTo(hitX - 15, wy);
                ctx.lineTo(hitX + 15, wy);
                ctx.stroke();
            }
        }

        // --- Reflected ray (red-orange, going up-right) ---
        if (R > 0.005) {
            const refEndX = hitX + 120;
            const refEndY = Math.max(10, hitY - 150);

            ctx.shadowColor = '#ff6644';
            ctx.shadowBlur = 8 * R;
            ctx.strokeStyle = `rgba(255, 100, 68, ${Math.min(0.9, R * 2 + 0.1)})`;
            ctx.lineWidth = reflectedThickness;
            ctx.beginPath();
            ctx.moveTo(hitX, hitY);
            ctx.lineTo(refEndX, refEndY);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Reflected label
            ctx.fillStyle = `rgba(255, 100, 68, ${Math.min(0.9, R * 2 + 0.2)})`;
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`Reflejado: ${(R * 100).toFixed(1)}%`, refEndX + 5, refEndY + 5);

            // Loss indicator
            if (R > 0.1) {
                ctx.fillStyle = 'rgba(255, 68, 68, 0.7)';
                ctx.font = 'bold 13px "Inter", sans-serif';
                ctx.fillText('⚠ LUZ PERDIDA', refEndX + 5, refEndY + 22);
            }
        }

        // --- Transmitted ray (green, going down into silicon) ---
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10 * T;
        ctx.strokeStyle = `rgba(0, 255, 136, ${Math.min(0.9, T + 0.1)})`;
        ctx.lineWidth = transmittedThickness;
        ctx.beginPath();
        ctx.moveTo(hitX, hitY + (hasCoating ? coatingH : 0));
        ctx.lineTo(hitX, Math.min(H - 20, hitY + (hasCoating ? coatingH : 0) + 200));
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Transmitted label
        ctx.fillStyle = `rgba(0, 255, 136, ${Math.min(0.9, T + 0.1)})`;
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Transmitido: ${(T * 100).toFixed(1)}%`, hitX + 15, hitY + (hasCoating ? coatingH : 0) + 40);

        ctx.fillStyle = 'rgba(0, 255, 136, 0.5)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('→ Energía capturada', hitX + 15, hitY + (hasCoating ? coatingH : 0) + 56);

        // ---- Surface interaction sparkle ----
        const sparkAlpha = Math.sin(time * 0.08) * 0.3 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 200, ${sparkAlpha})`;
        ctx.beginPath();
        ctx.arc(hitX, hitY, 5, 0, Math.PI * 2);
        ctx.fill();

        // ---- Interface label ----
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(centerX - 200, hitY);
        ctx.lineTo(centerX - 150, hitY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX + 150, hitY);
        ctx.lineTo(centerX + 200, hitY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('Interfaz ─', centerX - 155, hitY + 4);

        // ---- Win celebration ----
        if (R < 0.05) {
            for (let i = 0; i < 12; i++) {
                const sparkAngle = (time * 0.015 + i * Math.PI / 6) % (Math.PI * 2);
                const sparkR = 60 + Math.sin(time * 0.008 + i) * 15;
                const sx = hitX + Math.cos(sparkAngle) * sparkR;
                const sy = (hitY + (hasCoating ? coatingH / 2 : 0)) + Math.sin(sparkAngle) * sparkR * 0.6;
                ctx.fillStyle = `rgba(0, 255, 136, ${Math.sin(time * 0.006 + i) * 0.3 + 0.3})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ---- Formula display ----
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('R = ((n₁ - n₂)/(n₁ + n₂))²', W - 12, H - 12);
    }, []);

    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let t = 0;
        const animate = () => {
            t++;
            drawFrame(ctx, t);
            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [drawFrame]);

    // ---- Apply coating ----
    const applyCoating = (coatingId: string) => {
        if (completed) return;
        setSelectedCoating(coatingId);
        setAttempts(prev => prev + 1);
    };

    useEffect(() => {
        if (completed || !isWin) return;
        // Auto-win when the right coating is selected
        finishGame();
    }, [isWin, completed]);

    const finishGame = async () => {
        setCompleted(true);
        setWon(true);

        const currentSession = sessionRef.current;
        const currentHints = hintsUsedRef.current;
        const coatingId = coatingRef.current;

        const { score, efficiency } = calculateFresnelScore(coatingId);
        const challengeResult = calculateChallengeResult('fresnel', score, efficiency, 0, currentHints);
        setResult(challengeResult);

        if (currentSession) {
            try {
                const res = await fetch('/api/progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentSession.access_token}`
                    },
                    body: JSON.stringify({
                        challengeId: 'fresnel',
                        score,
                        xpEarned: challengeResult.totalXP,
                        timeSeconds: 0,
                        hintsUsed: currentHints
                    })
                });
                if (!res.ok) console.error('Progress API error:', res.status);
                refreshProfile();
            } catch (err) {
                console.error('Failed to save progress:', err);
            }
        }
    };

    const resetChallenge = () => {
        cancelAnimationFrame(animRef.current);
        setSelectedCoating('none');
        setCompleted(false);
        setWon(false);
        setResult(null);
        setAttempts(0);
        setHintsUsed(0);
        setShowHint(null);
    };

    const requestHint = () => {
        if (hintsUsed < FRESNEL_HINTS.length) {
            setShowHint(FRESNEL_HINTS[hintsUsed]);
            setHintsUsed(prev => prev + 1);
        }
    };

    // Zone color for reflectance meter
    const meterColor = reflectance < 5 ? '#00ff88' : reflectance < 15 ? '#ffd700' : reflectance < 25 ? '#ff8800' : '#ff4444';

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
                            🛡️ ¡Reflexión Anulada!
                        </motion.div>
                    )}
                </div>

                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 8px 0', lineHeight: '1.4' }}>
                        <strong>Ecuaciones de Fresnel:</strong> La reflectancia a incidencia normal es R = ((n₁ − n₂)/(n₁ + n₂))².
                        Un recubrimiento antirreflejo ideal tiene n = √(n_aire × n_sustrato).
                    </p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <span><span style={{ color: '#ffd700' }}>━</span> Incidente</span>
                        <span><span style={{ color: '#ff6644' }}>━</span> Reflejado</span>
                        <span><span style={{ color: '#00ff88' }}>━</span> Transmitido</span>
                    </div>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <h3 className={styles.controlTitle}>⚙️ Controles</h3>

                {/* Giant Reflectance Meter */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel} style={{ textAlign: 'center', display: 'block' }}>
                        Reflectancia (Luz Perdida)
                    </label>
                    <div style={{
                        textAlign: 'center',
                        fontSize: '3rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: meterColor,
                        textShadow: `0 0 20px ${meterColor}44`,
                        lineHeight: 1.1,
                        margin: '8px 0',
                    }}>
                        {reflectance.toFixed(1)}%
                    </div>
                    <div style={{
                        position: 'relative',
                        height: '16px',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        {/* 5% target line */}
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: '5%', width: '2px',
                            background: 'rgba(0, 255, 136, 0.4)',
                            zIndex: 1,
                        }} />
                        <div style={{
                            position: 'absolute', top: '2px', bottom: '2px', left: '2px',
                            width: `${Math.min(reflectance, 100)}%`,
                            maxWidth: 'calc(100% - 4px)',
                            background: `linear-gradient(90deg, ${meterColor}88, ${meterColor})`,
                            borderRadius: '6px',
                            transition: 'width 400ms ease, background 400ms ease',
                        }} />
                    </div>
                    <div className={styles.rangeLabels} style={{ marginTop: '4px' }}>
                        <span style={{ color: '#00ff88' }}>0%</span>
                        <span style={{ color: '#00ff88', fontSize: '0.7rem' }}>Meta: &lt;5%</span>
                        <span style={{ color: '#ff4444' }}>30%+</span>
                    </div>
                </div>

                {/* Transmittance */}
                <div style={{
                    textAlign: 'center', padding: '8px 12px',
                    background: 'rgba(0, 255, 136, 0.04)',
                    border: '1px solid rgba(0, 255, 136, 0.15)',
                    borderRadius: '10px', marginBottom: '12px',
                }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Energía Capturada</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#00ff88', fontFamily: 'var(--font-mono)' }}>
                        {transmittance.toFixed(1)}%
                    </div>
                </div>

                {/* Coating Selector */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>Material del Recubrimiento:</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {COATING_MATERIALS.map(mat => {
                            const isSelected = selectedCoating === mat.id;
                            const matR = getReflectancePercent(mat.id);
                            const isBest = matR < 5;
                            return (
                                <button
                                    key={mat.id}
                                    onClick={() => applyCoating(mat.id)}
                                    disabled={completed}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 14px',
                                        background: isSelected
                                            ? (isBest ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255,255,255,0.06)')
                                            : 'rgba(255,255,255,0.02)',
                                        border: isSelected
                                            ? `2px solid ${isBest ? '#00ff88' : 'rgba(255,255,255,0.3)'}`
                                            : '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px',
                                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                                        cursor: completed ? 'not-allowed' : 'pointer',
                                        textAlign: 'left',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: isSelected ? 700 : 500 }}>
                                            {isSelected && '▸ '}{mat.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>
                                            {mat.description}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.8rem',
                                        color: mat.id === 'none' ? 'var(--text-muted)' : mat.color,
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        marginLeft: '12px',
                                    }}>
                                        n = {mat.n}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Info box */}
                <div style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(100, 100, 255, 0.05)',
                    border: '1px solid rgba(100, 100, 255, 0.15)',
                    fontSize: '0.8rem', color: 'var(--text-secondary)',
                    lineHeight: 1.5, marginBottom: '12px',
                }}>
                    <strong style={{ color: 'var(--text-primary)' }}>n ideal = √(n_aire × n_Si) = √{N_SILICON} ≈ {IDEAL_N.toFixed(2)}</strong><br />
                    El material cuyo n se acerque más a este valor dará la menor reflexión.
                </div>

                {/* Formula */}
                <div className={styles.formulaBox} style={{ borderColor: 'rgba(200, 180, 255, 0.2)', background: 'rgba(200, 180, 255, 0.04)' }}>
                    <span className={styles.formulaLabel}>Fresnel (incidencia normal)</span>
                    <span className={styles.formula} style={{ color: '#c8b4ff' }}>R = ((n₁ − n₂) / (n₁ + n₂))²</span>
                </div>

                {/* Buttons */}
                <div className={styles.buttonGroup}>
                    <button className="btn btn-secondary" onClick={resetChallenge} style={{ width: '100%' }}>
                        🔄 Reiniciar
                    </button>
                </div>

                {/* Hints */}
                {!completed && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pistas ({hintsUsed}/{FRESNEL_HINTS.length})</span>
                            <button className="btn btn-ghost btn-sm" onClick={requestHint} disabled={hintsUsed >= FRESNEL_HINTS.length}>
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
                        style={{ borderColor: 'rgba(0,255,136,0.3)', background: 'rgba(0,255,136,0.06)' }}
                    >
                        <h4 className={styles.resultTitle} style={{ color: '#00ff88' }}>
                            🎉 ¡Reflexión Anulada! Escudo Activado
                        </h4>
                        <p className={styles.resultFeedback}>
                            Seleccionaste {getCoating(selectedCoating).name} (n={getCoating(selectedCoating).n}) como recubrimiento antirreflejo.
                            La reflectancia bajó a {reflectance.toFixed(1)}%, maximizando la energía capturada por el panel solar.
                        </p>
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
                        <div className={styles.achievements}>
                            <span className={styles.achievementLabel}>🏆 Logros desbloqueados:</span>
                            <span className="badge badge-gold">🛡️ Alquimista de la Luz</span>
                        </div>
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
