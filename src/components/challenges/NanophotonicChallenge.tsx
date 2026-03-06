'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    createDefaultNanophotonicParams,
    plasmonResonanceWavelength,
    diffractionLimit,
    nearFieldEnhancement,
    braggCondition,
    antennaEfficiency,
    calculateNanophotonicScore,
} from '@/lib/physics/nanophotonic';
import { calculateChallengeResult } from '@/lib/gamification';
import { NanophotonicParams, ChallengeResult } from '@/lib/types';
import styles from './ChallengeSimulation.module.css';

export default function NanophotonicChallenge() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [params, setParams] = useState<NanophotonicParams>(createDefaultNanophotonicParams());
    const [completed, setCompleted] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);

    const WIDTH = 800;
    const HEIGHT = 450;

    const materialColors: Record<string, string> = {
        gold: '#ffd700',
        silver: '#c0c0c0',
        aluminum: '#8899aa',
    };

    const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Background
        ctx.fillStyle = '#060610';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const centerX = WIDTH / 2;
        const centerY = HEIGHT / 2 - 20;
        const matColor = materialColors[params.material];
        const eff = antennaEfficiency(params);
        const enhancement = nearFieldEnhancement(params.material, params.particleSize, params.wavelength);
        const resonanceWl = plasmonResonanceWavelength(params.material, params.particleSize, 1.0);

        // Draw nanoparticle array (metasurface)
        const spacing = Math.max(30, params.particleSpacing / 5);
        const particleR = Math.max(5, params.particleSize / 10);
        const gridCols = Math.floor((WIDTH - 100) / spacing);
        const gridRows = 3;
        const startX = centerX - (gridCols * spacing) / 2;
        const startY = centerY - (gridRows * spacing) / 2;

        // Light beam (incoming from top)
        const beamGradient = ctx.createLinearGradient(centerX, 0, centerX, startY);
        beamGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        beamGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.04)`);
        beamGradient.addColorStop(1, `rgba(255, 255, 255, 0.08)`);

        ctx.fillStyle = beamGradient;
        ctx.beginPath();
        ctx.moveTo(centerX - 100, 0);
        ctx.lineTo(centerX + 100, 0);
        ctx.lineTo(centerX + 40, startY);
        ctx.lineTo(centerX - 40, startY);
        ctx.closePath();
        ctx.fill();

        // Draw wavefronts
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let y = 30; y < startY; y += 30) {
            ctx.beginPath();
            const waveWidth = 100 - (y / startY) * 60;
            ctx.moveTo(centerX - waveWidth, y);
            ctx.lineTo(centerX + waveWidth, y);
            ctx.stroke();
        }

        // Nanoparticles
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const px = startX + col * spacing + spacing / 2;
                const py = startY + row * spacing + spacing / 2;

                // Near-field glow
                const glowRadius = particleR * (2 + enhancement * 0.3);
                const glow = ctx.createRadialGradient(px, py, particleR, px, py, glowRadius);
                const glowAlpha = Math.min(0.3, eff.resonanceMatch * 0.3);
                glow.addColorStop(0, `${matColor}${Math.round(glowAlpha * 255).toString(16).padStart(2, '0')}`);
                glow.addColorStop(0.5, `${matColor}11`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
                ctx.fill();

                // Particle
                const particleGrad = ctx.createRadialGradient(px - 2, py - 2, 0, px, py, particleR);
                particleGrad.addColorStop(0, matColor);
                particleGrad.addColorStop(0.7, matColor + 'cc');
                particleGrad.addColorStop(1, matColor + '66');
                ctx.fillStyle = particleGrad;
                ctx.beginPath();
                ctx.arc(px, py, particleR, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Near-field concentrated spot (below the array)
        const spotY = startY + gridRows * spacing + 40;
        const spotRadius = 10 + eff.fieldConfinement * 40;
        const spotGrad = ctx.createRadialGradient(centerX, spotY, 0, centerX, spotY, spotRadius);
        const spotAlpha = eff.efficiency;
        spotGrad.addColorStop(0, `rgba(255, 255, 255, ${spotAlpha * 0.8})`);
        spotGrad.addColorStop(0.3, `${matColor}${Math.round(spotAlpha * 180).toString(16).padStart(2, '0')}`);
        spotGrad.addColorStop(0.6, `${matColor}22`);
        spotGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(centerX, spotY, spotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Diffraction limit indicator
        const diffLimit = diffractionLimit(params.wavelength, 1.4);
        const diffLimitPx = diffLimit / 4; // Scale
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX, spotY, diffLimitPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Intensity profile (right side)
        const profX = WIDTH - 160;
        const profW = 120;
        const profH = 200;
        const profY = 40;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(profX, profY, profW, profH);

        ctx.fillStyle = 'rgba(240,240,255,0.5)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Perfil de Intensidad', profX + profW / 2, profY - 6);

        // Draw intensity profile
        ctx.beginPath();
        for (let i = 0; i <= profW; i++) {
            const x = (i - profW / 2) / (profW / 4);
            const gaussian = Math.exp(-x * x / (0.5 + eff.fieldConfinement));
            const drawY = profY + profH - gaussian * (profH - 10);
            if (i === 0) ctx.moveTo(profX + i, drawY);
            else ctx.lineTo(profX + i, drawY);
        }
        ctx.strokeStyle = matColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = matColor;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Efficiency meter (bottom left)
        const meterX = 20;
        const meterY = HEIGHT - 80;
        const meterW = 150;
        const meterH = 16;

        ctx.fillStyle = 'rgba(240,240,255,0.5)';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Eficiencia de Antena', meterX, meterY - 8);

        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(meterX, meterY, meterW, meterH);

        const effWidth = meterW * eff.efficiency;
        const effGrad = ctx.createLinearGradient(meterX, 0, meterX + meterW, 0);
        effGrad.addColorStop(0, '#ff6b2b');
        effGrad.addColorStop(0.5, '#ffd700');
        effGrad.addColorStop(1, '#00ff88');
        ctx.fillStyle = effGrad;
        ctx.fillRect(meterX, meterY, effWidth, meterH);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(`${(eff.efficiency * 100).toFixed(0)}%`, meterX + meterW + 8, meterY + 13);

        // Info labels
        ctx.fillStyle = 'rgba(240,240,255,0.6)';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`λ_res = ${resonanceWl.toFixed(0)} nm`, 12, 22);
        ctx.fillText(`λ_bragg = ${braggCondition(params.particleSpacing, 1).toFixed(0)} nm`, 12, 38);
        ctx.fillText(`d_lim = ${diffLimit.toFixed(0)} nm`, 12, 54);
        ctx.fillText(`↑enh = ${enhancement.toFixed(1)}×`, 12, 70);
    }, [params]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawFrame(ctx);
    }, [drawFrame]);

    const eff = antennaEfficiency(params);
    const resonanceWl = plasmonResonanceWavelength(params.material, params.particleSize, 1.0);
    const diffLimit = diffractionLimit(params.wavelength, 1.4);
    const braggWl = braggCondition(params.particleSpacing, 1);
    const enhancement = nearFieldEnhancement(params.material, params.particleSize, params.wavelength);

    const submitAnswer = () => {
        const { score, efficiency } = calculateNanophotonicScore(params);
        const challengeResult = calculateChallengeResult('nanophotonic', score, efficiency);
        setResult(challengeResult);
        setCompleted(true);
    };

    const resetChallenge = () => {
        setParams(createDefaultNanophotonicParams());
        setCompleted(false);
        setResult(null);
    };

    return (
        <div className={styles.simulation}>
            <div className={styles.canvasSection}>
                <div className={styles.canvasWrapper}>
                    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={styles.canvas} />
                </div>
                <div className={styles.canvasLegend}>
                    <span>Gold circles: nanopartículas</span>
                    <span>Red dashed: límite de difracción</span>
                    <span>Glow: campo cercano amplificado</span>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <h3 className={styles.controlTitle}>⚙️ Controles</h3>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>Material</label>
                    <div className={styles.materialButtons}>
                        {(['gold', 'silver', 'aluminum'] as const).map((mat) => (
                            <button
                                key={mat}
                                className={`${styles.materialBtn} ${params.material === mat ? styles.materialBtnActive : ''}`}
                                onClick={() => setParams((p) => ({ ...p, material: mat }))}
                            >
                                {mat === 'gold' ? '🥇 Au' : mat === 'silver' ? '🥈 Ag' : '🔩 Al'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Tamaño de partícula: <span className="font-mono">{params.particleSize} nm</span>
                    </label>
                    <input
                        type="range" min="20" max="200" step="5"
                        value={params.particleSize}
                        onChange={(e) => setParams((p) => ({ ...p, particleSize: parseInt(e.target.value) }))}
                    />
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Espaciado: <span className="font-mono">{params.particleSpacing} nm</span>
                    </label>
                    <input
                        type="range" min="50" max="500" step="10"
                        value={params.particleSpacing}
                        onChange={(e) => setParams((p) => ({ ...p, particleSpacing: parseInt(e.target.value) }))}
                    />
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Longitud de onda: <span className="font-mono">{params.wavelength} nm</span>
                    </label>
                    <input
                        type="range" min="300" max="900" step="5"
                        value={params.wavelength}
                        onChange={(e) => setParams((p) => ({ ...p, wavelength: parseInt(e.target.value) }))}
                    />
                </div>

                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>λ Resonancia</span>
                        <span className={styles.infoItemValue}>{resonanceWl.toFixed(0)} nm</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>λ Bragg</span>
                        <span className={styles.infoItemValue}>{braggWl.toFixed(0)} nm</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>d Difracción</span>
                        <span className={styles.infoItemValue}>{diffLimit.toFixed(0)} nm</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Enhancement</span>
                        <span className={styles.infoItemValue}>{enhancement.toFixed(1)}×</span>
                    </div>
                </div>

                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Res. Match</span>
                        <span className={styles.infoItemValue} style={{ color: eff.resonanceMatch > 0.7 ? '#00ff88' : '#ff6b2b' }}>
                            {(eff.resonanceMatch * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoItemLabel}>Confinamiento</span>
                        <span className={styles.infoItemValue}>{(eff.fieldConfinement * 100).toFixed(0)}%</span>
                    </div>
                </div>

                <div className={styles.formulaBox}>
                    <span className={styles.formulaLabel}>Límite de difracción</span>
                    <span className={styles.formula}>d = λ / (2n·sinθ)</span>
                </div>

                <div className={styles.buttonGroup}>
                    {!completed ? (
                        <button className="btn btn-primary" onClick={submitAnswer} style={{ width: '100%' }}>
                            ✅ Evaluar Diseño
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
                            <div className={styles.resultStat}><span>Score</span><strong>{result.score}%</strong></div>
                            <div className={styles.resultStat}><span>XP Base</span><strong>+{result.baseXP}</strong></div>
                            <div className={styles.resultStat}><span>Bonus</span><strong>+{result.bonusXP}</strong></div>
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
