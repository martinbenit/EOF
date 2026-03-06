'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    energyLevel,
    transitionWavelength,
    wavefunction,
    getVisibleTransitions,
    heisenbergUncertainty,
    calculateQuantumScore,
    createDefaultQuantumParams,
    wavelengthToRGB,
} from '@/lib/physics/quantum';
import { calculateChallengeResult } from '@/lib/gamification';
import { QuantumParams, ChallengeResult } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useChallengeSession } from '@/hooks/useChallengeSession';
import styles from './ChallengeSimulation.module.css';

const QUANTUM_HINTS = [
    "La energía de cada nivel depende de Eₙ = n²π²ħ²/(2mL²). Un pozo más ancho (L mayor) reduce la energía y junta los niveles.",
    "Para emitir fotones de menor energía (rojo, infrarrojo), necesitas que las diferencias de energía entre niveles sean más pequeñas (pozo ancho).",
    "Busca la transición entre n=2 y n=1 o n=3 y n=2 y ajusta el ancho L milímetro a milímetro hasta acercarte al Target."
];

export default function QuantumChallenge() {
    const { session, refreshProfile } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [params, setParams] = useState<QuantumParams>(createDefaultQuantumParams());
    const [completed, setCompleted] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);
    const [selectedTransition, setSelectedTransition] = useState<{ nUpper: number; nLower: number }>({ nUpper: 2, nLower: 1 });

    const { timeSeconds, formattedTime, hintsUsed, showHint, requestHint, stopTimer, resetSession, totalHints } = useChallengeSession(QUANTUM_HINTS);

    const WIDTH = 800;
    const HEIGHT = 450;

    const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        const wellX = 200;
        const wellWidth = 300;
        const wellTop = 60;
        const wellBottom = HEIGHT - 60;
        const wellHeight = wellBottom - wellTop;

        // Background
        ctx.fillStyle = 'rgba(6, 6, 15, 1)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Potential well walls
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.lineWidth = 3;
        // Left wall
        ctx.beginPath();
        ctx.moveTo(wellX, wellTop - 20);
        ctx.lineTo(wellX, wellBottom);
        ctx.stroke();
        // Bottom
        ctx.beginPath();
        ctx.moveTo(wellX, wellBottom);
        ctx.lineTo(wellX + wellWidth, wellBottom);
        ctx.stroke();
        // Right wall
        ctx.beginPath();
        ctx.moveTo(wellX + wellWidth, wellBottom);
        ctx.lineTo(wellX + wellWidth, wellTop - 20);
        ctx.stroke();

        // Outside potential walls
        ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
        ctx.fillRect(0, wellTop - 20, wellX, wellBottom - wellTop + 20);
        ctx.fillRect(wellX + wellWidth, wellTop - 20, WIDTH - wellX - wellWidth, wellBottom - wellTop + 20);

        // Well width label
        ctx.fillStyle = 'rgba(240,240,255,0.5)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`L = ${params.wellWidth.toFixed(1)} nm`, wellX + wellWidth / 2, wellBottom + 25);

        // Energy levels and wavefunctions
        const maxE = energyLevel(4, params.wellWidth);
        const eScale = (wellHeight - 40) / maxE;

        for (let n = 1; n <= 4; n++) {
            const E = energyLevel(n, params.wellWidth);
            const levelY = wellBottom - E * eScale - 10;

            // Energy level line
            const isSelected = n === selectedTransition.nUpper || n === selectedTransition.nLower;
            ctx.strokeStyle = isSelected ? 'rgba(0, 240, 255, 0.7)' : 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(wellX, levelY);
            ctx.lineTo(wellX + wellWidth, levelY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Level label
            ctx.fillStyle = isSelected ? '#00f0ff' : 'rgba(240,240,255,0.4)';
            ctx.font = isSelected ? 'bold 11px "JetBrains Mono", monospace' : '11px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`E${n} = ${E.toFixed(2)} eV`, wellX + wellWidth + 10, levelY + 4);
            ctx.textAlign = 'right';
            ctx.fillText(`n=${n}`, wellX - 10, levelY + 4);

            // Wavefunction ψ_n(x)
            ctx.beginPath();
            const amplitude = 30;
            for (let px = 0; px <= wellWidth; px++) {
                const x = (px / wellWidth) * params.wellWidth;
                const psi = wavefunction(n, x, params.wellWidth);
                const normPsi = psi * Math.sqrt(params.wellWidth) / Math.sqrt(2);
                const drawY = levelY - normPsi * amplitude;
                if (px === 0) ctx.moveTo(wellX + px, drawY);
                else ctx.lineTo(wellX + px, drawY);
            }
            ctx.strokeStyle = isSelected ? 'rgba(0, 240, 255, 0.5)' : 'rgba(139, 92, 246, 0.2)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.stroke();
        }

        // Transition arrow
        const upperE = energyLevel(selectedTransition.nUpper, params.wellWidth);
        const lowerE = energyLevel(selectedTransition.nLower, params.wellWidth);
        const upperY = wellBottom - upperE * eScale - 10;
        const lowerY = wellBottom - lowerE * eScale - 10;

        const wl = transitionWavelength(selectedTransition.nUpper, selectedTransition.nLower, params.wellWidth);
        const rgb = wavelengthToRGB(wl);
        const photonColor = wl >= 380 && wl <= 780
            ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
            : 'rgba(100, 100, 100, 0.5)';

        // Arrow
        ctx.strokeStyle = photonColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = photonColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(wellX + wellWidth / 2 + 40, upperY);
        ctx.lineTo(wellX + wellWidth / 2 + 40, lowerY);
        ctx.stroke();
        // Arrow head
        ctx.fillStyle = photonColor;
        ctx.beginPath();
        ctx.moveTo(wellX + wellWidth / 2 + 40, lowerY);
        ctx.lineTo(wellX + wellWidth / 2 + 34, lowerY - 10);
        ctx.lineTo(wellX + wellWidth / 2 + 46, lowerY - 10);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Photon wavy line
        ctx.strokeStyle = photonColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const photonStartX = wellX + wellWidth / 2 + 55;
        const photonY = (upperY + lowerY) / 2;
        for (let i = 0; i < 60; i++) {
            const px = photonStartX + i * 2;
            const py = photonY + Math.sin(i * 0.5) * 8;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Wavelength label
        ctx.fillStyle = photonColor;
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`λ = ${wl.toFixed(0)} nm`, photonStartX + 10, photonY - 18);

        // Target wavelength indicator
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(`🎯 Target: ${params.targetWavelength} nm`, 12, 24);

        // Spectrum bar at bottom
        const specX = 50;
        const specW = WIDTH - 100;
        const specY = HEIGHT - 25;
        const specH = 10;

        for (let px = 0; px < specW; px++) {
            const wl2 = 380 + (px / specW) * 400;
            const c = wavelengthToRGB(wl2);
            ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
            ctx.fillRect(specX + px, specY, 1, specH);
        }

        // Target marker on spectrum
        const targetPos = specX + ((params.targetWavelength - 380) / 400) * specW;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(targetPos, specY - 6);
        ctx.lineTo(targetPos - 4, specY - 1);
        ctx.lineTo(targetPos + 4, specY - 1);
        ctx.closePath();
        ctx.fill();

        // Current emission marker
        const emissionPos = specX + ((wl - 380) / 400) * specW;
        if (wl >= 380 && wl <= 780) {
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.moveTo(emissionPos, specY + specH + 6);
            ctx.lineTo(emissionPos - 4, specY + specH + 1);
            ctx.lineTo(emissionPos + 4, specY + specH + 1);
            ctx.closePath();
            ctx.fill();
        }

        ctx.textAlign = 'left';
    }, [params, selectedTransition]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawFrame(ctx);
    }, [drawFrame]);

    const emittedWl = transitionWavelength(selectedTransition.nUpper, selectedTransition.nLower, params.wellWidth);
    const rgb = wavelengthToRGB(emittedWl);
    const emittedColor = emittedWl >= 380 && emittedWl <= 780
        ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
        : '#666';
    const transitions = getVisibleTransitions(params.wellWidth);
    const heis = heisenbergUncertainty(params.wellWidth);

    const submitAnswer = async () => {
        stopTimer();
        const { score, efficiency } = calculateQuantumScore(params, emittedWl);
        const challengeResult = calculateChallengeResult('quantum', score, efficiency, timeSeconds, hintsUsed);
        setResult(challengeResult);
        setCompleted(true);

        if (session) {
            try {
                await fetch('/api/progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        challengeId: 'quantum',
                        score,
                        xpEarned: challengeResult.totalXP,
                        timeSeconds,
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
        setParams(createDefaultQuantumParams());
        setSelectedTransition({ nUpper: 2, nLower: 1 });
        setCompleted(false);
        setResult(null);
        resetSession();
    };

    return (
        <div className={styles.simulation}>
            <div className={styles.canvasSection}>
                <div className={styles.canvasWrapper}>
                    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />
                </div>
                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        Un <strong>Pozo de Potencial Cuántico</strong> confina una partícula (ej. un electrón), restringiendo sus energías a valores discretos o "cuantizados" (Eₙ).
                        Cuando un electrón "salta" de un nivel energético superior a uno inferior, emite un fotón cuya energía coincide con la diferencia (ΔE).
                        En <em>Puntos Cuánticos</em> o materiales semiconductores, ajustar el ancho del pozo (L) permite sintonizar el color (longitud de onda λ) del fotón emitido.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
                        <span>🎯 Objetivo a Sintonizar</span>
                        <span>▼ Fotón de Emisión Resultante</span>
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
                        Ancho del pozo (L): <span className="font-mono">{params.wellWidth.toFixed(1)} nm</span>
                    </label>
                    <input
                        type="range" min="1" max="15" step="0.1"
                        value={params.wellWidth}
                        onChange={(e) => setParams((p) => ({ ...p, wellWidth: parseFloat(e.target.value) }))}
                    />
                    <div className={styles.rangeLabels}><span>1 nm</span><span>8</span><span>15 nm</span></div>
                </div>

                <div className={styles.mediumSelector}>
                    <label className={styles.controlLabel}>Transición</label>
                    <select
                        value={`${selectedTransition.nUpper}-${selectedTransition.nLower}`}
                        onChange={(e) => {
                            const [u, l] = e.target.value.split('-').map(Number);
                            setSelectedTransition({ nUpper: u, nLower: l });
                        }}
                    >
                        {transitions.map((t) => (
                            <option key={`${t.nUpper}-${t.nLower}`} value={`${t.nUpper}-${t.nLower}`}>
                                n={t.nUpper} → n={t.nLower} ({t.wavelength.toFixed(0)} nm) {t.visible ? '🌈' : '🔇'}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.colorPreview}>
                    <div className={styles.colorSwatch} style={{ background: emittedColor, color: emittedColor }} />
                    <div className={styles.colorInfo}>
                        <span className={styles.colorLabel}>Fotón Emitido</span>
                        <span className={styles.colorValue}>{emittedWl.toFixed(0)} nm</span>
                    </div>
                </div>

                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Target</span>
                        <span className={styles.infoItemValue}>{params.targetWavelength} nm</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Diferencia</span>
                        <span className={styles.infoItemValue} style={{
                            color: Math.abs(emittedWl - params.targetWavelength) < 20 ? '#00ff88' : '#ff6b2b'
                        }}>
                            {Math.abs(emittedWl - params.targetWavelength).toFixed(0)} nm
                        </span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>ΔxΔp</span>
                        <span className={styles.infoItemValue}>{(heis.product * 1e34).toFixed(2)} ×10⁻³⁴</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Heisenberg</span>
                        <span className={styles.infoItemValue} style={{ color: heis.satisfiesLimit ? '#00ff88' : '#ff6b2b' }}>
                            {heis.satisfiesLimit ? '✅' : '❌'}
                        </span>
                    </div>
                </div>

                <div className={styles.formulaBox}>
                    <span className={styles.formulaLabel}>Energía del pozo</span>
                    <span className={styles.formula}>Eₙ = n²π²ħ²/(2mL²)</span>
                </div>

                <div className={styles.buttonGroup}>
                    {!completed ? (
                        <button className="btn btn-primary" onClick={submitAnswer} style={{ width: '100%' }}>
                            ✅ Verificar Sintonización
                        </button>
                    ) : (
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
                    <motion.div className={styles.resultPanel} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h4 className={styles.resultTitle}>Resultados</h4>
                        <p className={styles.resultFeedback}>{result.feedback}</p>
                        <div className={styles.resultStats}>
                            <div className={styles.resultStat}><span>Score</span><strong>{result.score}%</strong></div>
                            <div className={styles.resultStat}><span>XP Base</span><strong>+{result.baseXP}</strong></div>
                            <div className={styles.resultStat}><span>Bonus</span><strong>+{result.bonusXP}</strong></div>
                            <div className={styles.resultStat} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
                                <span style={{ color: 'var(--neon-gold)' }}>⭐ XP Total</span>
                                <strong style={{ color: 'var(--neon-gold)', fontSize: '1.2rem' }}>+{result.totalXP}</strong>
                            </div>
                        </div>
                        {result.achievementsUnlocked.length > 0 && (
                            <div className={styles.achievements}>
                                <span className={styles.achievementLabel}>🏆 Logros:</span>
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
