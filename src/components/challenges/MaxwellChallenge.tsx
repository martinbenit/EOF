'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    createDefaultMaxwellParams,
    criticalAngle,
    fresnelCoefficients,
    isTotalInternalReflection,
    evanescentDecayLength,
    calculateMaxwellScore,
    MEDIA_PRESETS,
    wavelengthToColor,
} from '@/lib/physics/maxwell';
import { calculateChallengeResult } from '@/lib/gamification';
import { MaxwellParams, ChallengeResult } from '@/lib/types';
import styles from './ChallengeSimulation.module.css';

export default function MaxwellChallenge() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [params, setParams] = useState<MaxwellParams>(createDefaultMaxwellParams());
    const [completed, setCompleted] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);

    const WIDTH = 800;
    const HEIGHT = 450;
    const INTERFACE_Y = HEIGHT / 2;

    const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Medium 1 (top) — denser
        ctx.fillStyle = 'rgba(20, 20, 60, 0.9)';
        ctx.fillRect(0, 0, WIDTH, INTERFACE_Y);

        // Medium 2 (bottom) — lighter
        ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
        ctx.fillRect(0, INTERFACE_Y, WIDTH, HEIGHT - INTERFACE_Y);

        // Interface line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, INTERFACE_Y);
        ctx.lineTo(WIDTH, INTERFACE_Y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Normal line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(WIDTH / 2, 0);
        ctx.lineTo(WIDTH / 2, HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);

        const angleRad = (params.incidenceAngle * Math.PI) / 180;
        const hitX = WIDTH / 2;
        const hitY = INTERFACE_Y;
        const rayLen = 250;
        const color = wavelengthToColor(params.wavelength);

        // Incident ray
        const inStartX = hitX - Math.sin(angleRad) * rayLen;
        const inStartY = hitY - Math.cos(angleRad) * rayLen;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(inStartX, inStartY);
        ctx.lineTo(hitX, hitY);
        ctx.stroke();

        // Draw arrow on incident ray
        const midX1 = (inStartX + hitX) / 2;
        const midY1 = (inStartY + hitY) / 2;
        drawArrow(ctx, midX1, midY1, angleRad, color);

        // Reflected ray
        const refEndX = hitX + Math.sin(angleRad) * rayLen;
        const refEndY = hitY - Math.cos(angleRad) * rayLen;
        const fresnel = fresnelCoefficients(params.n1, params.n2, angleRad);

        ctx.globalAlpha = Math.max(0.2, fresnel.R);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 + fresnel.R * 2;
        ctx.beginPath();
        ctx.moveTo(hitX, hitY);
        ctx.lineTo(refEndX, refEndY);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // TIR check
        const tirActive = isTotalInternalReflection(params.n1, params.n2, angleRad);

        if (!tirActive) {
            // Refracted ray
            const sinT = (params.n1 / params.n2) * Math.sin(angleRad);
            if (Math.abs(sinT) < 1) {
                const transmitAngle = Math.asin(sinT);
                const transEndX = hitX + Math.sin(transmitAngle) * rayLen;
                const transEndY = hitY + Math.cos(transmitAngle) * rayLen;

                ctx.globalAlpha = Math.max(0.15, fresnel.T);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2 + fresnel.T * 2;
                ctx.beginPath();
                ctx.moveTo(hitX, hitY);
                ctx.lineTo(transEndX, transEndY);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        } else {
            // Evanescent wave
            const decay = evanescentDecayLength(params.n1, params.n2, angleRad, params.wavelength);
            const waveAmplitude = 40;
            const waveFreq = 0.04;

            ctx.beginPath();
            for (let y = 0; y < HEIGHT - INTERFACE_Y; y++) {
                const envelope = Math.exp(-y / (decay * 5));
                const wave = Math.sin(y * waveFreq * Math.PI * 2) * waveAmplitude * envelope;
                const x = hitX + wave;
                if (y === 0) ctx.moveTo(x, INTERFACE_Y + y);
                else ctx.lineTo(x, INTERFACE_Y + y);
            }
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // TIR indicator
            ctx.fillStyle = 'rgba(0, 255, 136, 0.12)';
            ctx.fillRect(0, 0, WIDTH, INTERFACE_Y);
        }

        ctx.shadowBlur = 0;

        // Labels
        ctx.fillStyle = 'rgba(240,240,255,0.6)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(`n₁ = ${params.n1.toFixed(2)}`, 12, 24);
        ctx.fillText(`n₂ = ${params.n2.toFixed(2)}`, 12, INTERFACE_Y + 24);
        ctx.fillText(`θᵢ = ${params.incidenceAngle.toFixed(1)}°`, 12, 44);

        const crit = criticalAngle(params.n1, params.n2);
        if (crit !== null) {
            ctx.fillText(`θc = ${((crit * 180) / Math.PI).toFixed(1)}°`, 12, 64);
        }

        ctx.fillText(`R = ${(fresnel.R * 100).toFixed(1)}%`, WIDTH - 100, 24);
        ctx.fillText(`T = ${(fresnel.T * 100).toFixed(1)}%`, WIDTH - 100, 44);

        if (tirActive) {
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.fillText('🔒 REFLEXIÓN INTERNA TOTAL', WIDTH / 2 - 130, 30);
        }
    }, [params]);

    function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-5, 4);
        ctx.lineTo(5, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawFrame(ctx);
    }, [drawFrame]);

    const submitAnswer = () => {
        const angleRad = (params.incidenceAngle * Math.PI) / 180;
        const tirActive = isTotalInternalReflection(params.n1, params.n2, angleRad);
        const crit = criticalAngle(params.n1, params.n2);
        const critDeg = crit !== null ? (crit * 180) / Math.PI : 90;
        const anglePrecision = Math.abs(params.incidenceAngle - critDeg);

        const { score, efficiency } = calculateMaxwellScore(params, tirActive, anglePrecision);
        const challengeResult = calculateChallengeResult('maxwell', score, efficiency);
        setResult(challengeResult);
        setCompleted(true);
    };

    const resetChallenge = () => {
        setParams(createDefaultMaxwellParams());
        setCompleted(false);
        setResult(null);
    };

    const crit = criticalAngle(params.n1, params.n2);
    const angleRad = (params.incidenceAngle * Math.PI) / 180;
    const tirActive = isTotalInternalReflection(params.n1, params.n2, angleRad);
    const fresnel = fresnelCoefficients(params.n1, params.n2, angleRad);

    return (
        <div className={styles.simulation}>
            <div className={styles.canvasSection}>
                <div className={styles.canvasWrapper}>
                    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />
                </div>
                <div className={styles.canvasLegend}>
                    <span>Medio superior: n₁ (más denso)</span>
                    <span>Medio inferior: n₂ (menos denso)</span>
                    <span>Línea punteada: normal</span>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <h3 className={styles.controlTitle}>⚙️ Controles</h3>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Ángulo de incidencia: <span className="font-mono">{params.incidenceAngle.toFixed(1)}°</span>
                    </label>
                    <input
                        type="range" min="0" max="89" step="0.5"
                        value={params.incidenceAngle}
                        onChange={(e) => setParams((p) => ({ ...p, incidenceAngle: parseFloat(e.target.value) }))}
                    />
                    <div className={styles.rangeLabels}><span>0°</span><span>45°</span><span>89°</span></div>
                </div>

                <div className={styles.mediumSelector}>
                    <label className={styles.controlLabel}>Medio 1 (superior)</label>
                    <select
                        value={params.n1}
                        onChange={(e) => setParams((p) => ({ ...p, n1: parseFloat(e.target.value) }))}
                    >
                        {Object.entries(MEDIA_PRESETS).map(([name, n]) => (
                            <option key={`m1-${name}`} value={n}>{name} (n={n})</option>
                        ))}
                    </select>
                </div>

                <div className={styles.mediumSelector}>
                    <label className={styles.controlLabel}>Medio 2 (inferior)</label>
                    <select
                        value={params.n2}
                        onChange={(e) => setParams((p) => ({ ...p, n2: parseFloat(e.target.value) }))}
                    >
                        {Object.entries(MEDIA_PRESETS).map(([name, n]) => (
                            <option key={`m2-${name}`} value={n}>{name} (n={n})</option>
                        ))}
                    </select>
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Longitud de onda: <span className="font-mono">{params.wavelength} nm</span>
                    </label>
                    <input
                        type="range" min="380" max="780" step="5"
                        value={params.wavelength}
                        onChange={(e) => setParams((p) => ({ ...p, wavelength: parseInt(e.target.value) }))}
                    />
                </div>

                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Ángulo Crítico</span>
                        <span className={styles.infoItemValue}>
                            {crit !== null ? `${((crit * 180) / Math.PI).toFixed(1)}°` : 'N/A'}
                        </span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Reflectancia</span>
                        <span className={styles.infoItemValue}>{(fresnel.R * 100).toFixed(1)}%</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>TIR</span>
                        <span className={styles.infoItemValue} style={{ color: tirActive ? '#00ff88' : '#ff6b2b' }}>
                            {tirActive ? '✅ Activa' : '❌ No'}
                        </span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Transmitancia</span>
                        <span className={styles.infoItemValue}>{(fresnel.T * 100).toFixed(1)}%</span>
                    </div>
                </div>

                <div className={styles.formulaBox}>
                    <span className={styles.formulaLabel}>Ley de Snell</span>
                    <span className={styles.formula}>n₁ sin θ₁ = n₂ sin θ₂</span>
                </div>

                <div className={styles.buttonGroup}>
                    {!completed ? (
                        <button className="btn btn-primary" onClick={submitAnswer} style={{ width: '100%' }}>
                            ✅ Verificar Respuesta
                        </button>
                    ) : (
                        <button className="btn btn-secondary" onClick={resetChallenge} style={{ width: '100%' }}>
                            🔄 Reiniciar
                        </button>
                    )}
                </div>

                {result && (
                    <motion.div className={styles.resultPanel} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h4 className={styles.resultTitle}>Resultados</h4>
                        <p className={styles.resultFeedback}>{result.feedback}</p>
                        <div className={styles.resultStats}>
                            <div className={styles.resultStat}>
                                <span>Score</span><strong>{result.score}%</strong>
                            </div>
                            <div className={styles.resultStat}>
                                <span>XP Base</span><strong>+{result.baseXP}</strong>
                            </div>
                            <div className={styles.resultStat}>
                                <span>Bonus</span><strong>+{result.bonusXP}</strong>
                            </div>
                            <div className={styles.resultStat} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
                                <span style={{ color: 'var(--neon-gold)' }}>⭐ XP Total</span>
                                <strong style={{ color: 'var(--neon-gold)', fontSize: '1.2rem' }}>+{result.totalXP}</strong>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
