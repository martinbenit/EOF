'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    PHOTONIC_MATERIALS, getMaterial,
    calculateFresnel, isBrewsterWinCondition, calculateBrewsterScore,
    N_AIR, PolarizationType, getBrewsterAngleDeg
} from '@/lib/physics/fresnel';
import { calculateChallengeResult } from '@/lib/gamification';
import { ChallengeResult } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import styles from './ChallengeSimulation.module.css';

const BREWSTER_HINTS = [
    "Las ecuaciones de Fresnel muestran que la luz con polarización perpendicular ('s') nunca tiene pérdida cero. Probá cambiar la polarización a 'Paralela (p)'.",
    "Con polarización 'Paralela (p)', existe un ángulo de incidencia donde no hay luz reflejada. ¡Ese es el ángulo de Brewster!",
    "El Ángulo de Brewster se calcula con la fórmula: θ = arctan(n₂ / n₁). Como aquí n₁=1, simplemente es θ = arctan(n₂).",
    "Para el Vidrio (n=1.50), calculá arctan(1.50) en tu calculadora. Debería darte cerca de 56.3°.",
    "Buscá el ángulo exacto moviendo el slider muy despacio. Cuando la pérdida baje de 0.1%, habrás logrado el acoplamiento perfecto.",
];

export default function FresnelChallenge() {
    const { session, refreshProfile } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);

    const [selectedMaterialId, setSelectedMaterialId] = useState('polimero');
    const [thetaI, setThetaI] = useState<number>(45.0);
    const [polarization, setPolarization] = useState<PolarizationType>('s'); // Default to the trap
    
    const [completed, setCompleted] = useState(false);
    const [won, setWon] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);

    const [hintsUsed, setHintsUsed] = useState(0);
    const [showHint, setShowHint] = useState<string | null>(null);

    const sessionRef = useRef(session);
    sessionRef.current = session;
    const hintsUsedRef = useRef(hintsUsed);
    hintsUsedRef.current = hintsUsed;
    const materialRef = useRef(selectedMaterialId);
    materialRef.current = selectedMaterialId;
    const thetaIRef = useRef(thetaI);
    thetaIRef.current = thetaI;
    const polRef = useRef(polarization);
    polRef.current = polarization;

    const WIDTH = 700;
    const HEIGHT = 500;

    const currentMaterial = getMaterial(selectedMaterialId);
    const { R, T, thetaT_deg } = calculateFresnel(N_AIR, currentMaterial.n, thetaI, polarization);
    const R_percent = R * 100;
    const isWin = isBrewsterWinCondition(N_AIR, currentMaterial.n, thetaI, polarization);
    
    // Derived values for meters
    const transmittanceStr = (T * 100).toFixed(2);
    const reflectanceStr = R_percent.toFixed(2);

    // ---- Canvas Drawing ----
    const drawFrame = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
        const W = WIDTH;
        const H = HEIGHT;
        const hitX = W / 2;
        const hitY = H / 2;
        
        ctx.clearRect(0, 0, W, H);

        const mId = materialRef.current;
        const m = getMaterial(mId);
        const tI = thetaIRef.current;
        const p = polRef.current;
        
        const { R, T, thetaT_deg: tT } = calculateFresnel(N_AIR, m.n, tI, p);

        // ---- Layout zones ----
        // 1. Air Zone (Top Half)
        ctx.fillStyle = 'rgba(10, 15, 30, 1)';
        ctx.fillRect(0, 0, W, hitY);
        
        // Air Grid
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.05)';
        ctx.beginPath();
        for(let gx=0; gx<W; gx+=40){ ctx.moveTo(gx, 0); ctx.lineTo(gx, hitY); }
        for(let gy=0; gy<hitY; gy+=40){ ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
        ctx.stroke();

        ctx.fillStyle = 'rgba(150, 200, 255, 0.4)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`AIRE (n₁ = ${N_AIR.toFixed(1)})`, 20, 30);

        // 2. Photonic Chip Zone (Bottom Half)
        const chipGrad = ctx.createLinearGradient(0, hitY, 0, H);
        // Base color mixed with black
        chipGrad.addColorStop(0, `${m.color}22`);
        chipGrad.addColorStop(1, `${m.color}05`);
        ctx.fillStyle = chipGrad;
        ctx.fillRect(0, hitY, W, H / 2);

        // Chip Grid
        ctx.strokeStyle = `${m.color}15`;
        ctx.beginPath();
        for(let gx=0; gx<W; gx+=40){ ctx.moveTo(gx, hitY); ctx.lineTo(gx, H); }
        for(let gy=hitY; gy<H; gy+=40){ ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
        ctx.stroke();

        ctx.fillStyle = `${m.color}aa`;
        ctx.fillText(`CHIP FOTÓNICO: ${m.name.toUpperCase()} (n₂ = ${m.n.toFixed(2)})`, 20, hitY + 30);

        // ---- Interface line ----
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, hitY);
        ctx.lineTo(W, hitY);
        ctx.stroke();

        // ---- Normal line (vertical) ----
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(hitX, 0);
        ctx.lineTo(hitX, H);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('Normal', hitX + 10, 20);

        // ---- Ray rendering logic ----
        const len = 350; // length of rays
        
        // Math coordinates: angles from the Normal.
        // Incident (from Top Left)
        const incRad = tI * Math.PI / 180;
        const incDx = -Math.sin(incRad);
        const incDy = -Math.cos(incRad);
        const incStartX = hitX + incDx * len;
        const incStartY = hitY + incDy * len;

        // Reflected (to Top Right)
        const refDx = Math.sin(incRad);
        const refDy = -Math.cos(incRad);
        const refEndX = hitX + refDx * len;
        const refEndY = hitY + refDy * len;
        
        // Refracted (to Bottom Right)
        const refrRad = tT * Math.PI / 180;
        const refrDx = Math.sin(refrRad);
        const refrDy = Math.cos(refrRad); // positive Y is down in canvas
        const refrEndX = hitX + refrDx * len;
        const refrEndY = hitY + refrDy * len;

        // Visual styles map for Polarization
        const rayColor = p === 's' ? '#ff3366' : '#33ccff';
        const rayGlow = p === 's' ? 'rgba(255, 51, 102, 0.5)' : 'rgba(51, 204, 255, 0.5)';
        
        const baseThickness = 6;
        const wavePhase = (time * 2) % 20;

        // 1. Incident Ray
        ctx.shadowColor = rayColor;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = rayColor;
        ctx.lineWidth = baseThickness;
        ctx.beginPath();
        ctx.moveTo(incStartX, incStartY);
        ctx.lineTo(hitX, hitY);
        ctx.stroke();
        
        // Indicador de ángulo de incidencia
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(hitX, hitY, 60, -Math.PI/2 - incRad, -Math.PI/2, false);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`θi=${tI.toFixed(1)}°`, hitX - 30 * Math.sin(incRad/2) - 30, hitY - 60 * Math.cos(incRad/2) - 10);

        // 2. Refracted Ray
        const transThickness = Math.max(1, baseThickness * T);
        ctx.shadowColor = rayColor;
        ctx.shadowBlur = 10 * T;
        ctx.strokeStyle = `rgba(${p==='s'?'255,51,102':'51,204,255'}, ${0.3 + 0.7 * T})`;
        ctx.lineWidth = transThickness;
        ctx.beginPath();
        ctx.moveTo(hitX, hitY);
        ctx.lineTo(refrEndX, refrEndY);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(hitX, hitY, 50, Math.PI/2 - refrRad, Math.PI/2, true);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(`θt=${tT.toFixed(1)}°`, hitX + 20 * Math.sin(refrRad/2) + 10, hitY + 50 * Math.cos(refrRad/2) + 15);

        // 3. Reflected Ray
        if (R > 0.0005) {
            const refThickness = Math.max(1, baseThickness * (R * 2.5)); // Exaggerate slightly for visibility
            ctx.shadowColor = '#ff6644';
            ctx.shadowBlur = 15 * R;
            ctx.strokeStyle = `rgba(255, 102, 68, ${0.2 + 0.8 * R})`;
            ctx.lineWidth = refThickness;
            ctx.beginPath();
            ctx.moveTo(hitX, hitY);
            ctx.lineTo(refEndX, refEndY);
            ctx.stroke();
            
            // Reflected particle effect passing through
            ctx.shadowBlur = 0;
            for(let i=0; i<3; i++) {
                const pr = ((time * 3 + i * 100) % len) / len; // 0 to 1
                if (pr < 0.1) continue;
                const px = hitX + refDx * (len * pr);
                const py = hitY + refDy * (len * pr);
                ctx.fillStyle = `rgba(255, 150, 100, ${1 - pr})`;
                ctx.beginPath();
                ctx.arc(px, py, refThickness * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }

            // Reflected ray label
            ctx.fillStyle = `rgba(255, 100, 68, ${0.5 + 0.5 * R})`;
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.fillText(`Pérdida ${(R * 100).toFixed(2)}%`, hitX + refDx * 150 + 10, hitY + refDy * 150);
        }

        // ---- Sparkling hit point ----
        ctx.shadowBlur = 20;
        ctx.shadowColor = rayColor;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hitX, hitY, 4 + Math.sin(time * 0.1)*2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ---- Win sequence override ----
        if (R < 0.001) { // R < 0.1% essentially perfect Brewster matches
            ctx.fillStyle = `rgba(0, 255, 136, ${Math.abs(Math.sin(time * 0.05)) * 0.15})`;
            ctx.fillRect(0, 0, W, H);
            
            for(let i=0; i<8; i++){
                const ang = (time * 0.02 + i * Math.PI/4);
                const rx = hitX + Math.cos(ang) * 40;
                const ry = hitY + Math.sin(ang) * 40;
                ctx.fillStyle = '#00ff88';
                ctx.beginPath();
                ctx.arc(rx, ry, 2, 0, Math.PI*2);
                ctx.fill();
            }
        }
        
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

    useEffect(() => {
        if (completed || !isWin) return;
        // The win is detected. We should delay just slightly.
        const tId = setTimeout(() => finishGame(), 1000);
        return () => clearTimeout(tId);
    }, [isWin, completed]);

    const finishGame = async () => {
        setCompleted(true);
        setWon(true);

        const currentSession = sessionRef.current;
        const currentHints = hintsUsedRef.current;
        
        // R from refs to get snapshot at time of win
        const m = getMaterial(materialRef.current);
        const { R } = calculateFresnel(N_AIR, m.n, thetaIRef.current, polRef.current);

        const { score, efficiency } = calculateBrewsterScore(R, polRef.current, true);
        const challengeResult = calculateChallengeResult('fresnel', score, efficiency, 0, currentHints);
        // Add specific badge
        challengeResult.achievementsUnlocked = ["Maestro de la Luz"];
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
                        hintsUsed: currentHints,
                        bonusData: { badge: "Maestro de la Luz" }
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
        setCompleted(false);
        setWon(false);
        setResult(null);
        setHintsUsed(0);
        setShowHint(null);
        setThetaI(45);
        setPolarization('s');
    };

    const requestHint = () => {
        if (hintsUsed < BREWSTER_HINTS.length) {
            setShowHint(BREWSTER_HINTS[hintsUsed]);
            setHintsUsed(prev => prev + 1);
        }
    };

    const meterColor = Number(reflectanceStr) < 0.1 ? '#00ff88' : Number(reflectanceStr) < 5 ? '#ffd700' : Number(reflectanceStr) < 20 ? '#ff8800' : '#ff4444';

    return (
        <div className={styles.simulation}>
            <div className={styles.canvasSection}>
                <div className={styles.canvasWrapper}>
                    <canvas
                        ref={canvasRef}
                        width={WIDTH}
                        height={HEIGHT}
                        className={styles.canvas}
                        style={{ cursor: completed ? 'default' : 'crosshair' }}
                    />
                    {won && (
                        <motion.div
                            className={styles.hitOverlay}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            style={{ color: '#00ff88', textShadow: '0 0 30px rgba(0, 255, 136, 0.8)', fontSize: '2rem' }}
                        >
                            ¡Acoplamiento Perfecto!
                            <div style={{ fontSize: '1rem', marginTop: '10px', fontWeight: 'normal', opacity: 0.8 }}>
                                Ángulo de Brewster Detectado
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 8px 0', lineHeight: '1.4' }}>
                        <strong>Directriz:</strong> Configurá el láser para inyectar los datos en el {currentMaterial.name} sin que rebote la señal magnética. Encontrá la combinación exacta de Polarización y Ángulo para que <strong>Reflectancia = 0%</strong>.
                    </p>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <h3 className={styles.controlTitle}>⚙️ Calibración del Láser</h3>

                {/* Giant Reflectance Meter */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel} style={{ textAlign: 'center', display: 'block' }}>
                        Luz Reflejada (Pérdida)
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
                        {reflectanceStr}%
                    </div>
                </div>

                {/* Polarization Toggle */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>Polarización del Láser:</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <button
                            disabled={completed}
                            onClick={() => setPolarization('s')}
                            className={`btn ${polarization === 's' ? styles.btnActive : styles.btnInactive}`}
                            style={{ flex: 1, background: polarization === 's' ? '#ff3366' : 'rgba(255,255,255,0.05)' }}
                        >
                            Perpendicular (TE / s)
                        </button>
                        <button
                            disabled={completed}
                            onClick={() => setPolarization('p')}
                            className={`btn ${polarization === 'p' ? styles.btnActive : styles.btnInactive}`}
                            style={{ flex: 1, background: polarization === 'p' ? '#33ccff' : 'rgba(255,255,255,0.05)', color: polarization==='p' ? '#000': '#fff' }}
                        >
                            Paralela (TM / p)
                        </button>
                    </div>
                </div>

                {/* Material Dropdown */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>Material del Chip (n₂):</label>
                    <select
                        value={selectedMaterialId}
                        onChange={(e) => setSelectedMaterialId(e.target.value)}
                        disabled={completed}
                        className={styles.paramInput}
                        style={{ width: '100%', padding: '10px', fontSize: '1rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                    >
                        {PHOTONIC_MATERIALS.map(m => (
                            <option key={m.id} value={m.id} style={{ background: '#0a0a1a', color: '#fff' }}>
                                {m.name} (n = {m.n.toFixed(2)})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Incidence Angle Slider */}
                <div className={styles.controlGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label className={styles.controlLabel}>Ángulo de Incidencia (θi):</label>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{thetaI.toFixed(1)}°</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="89"
                        step="0.1"
                        value={thetaI}
                        onChange={(e) => setThetaI(Number(e.target.value))}
                        disabled={completed}
                        className={styles.rangeInput}
                        style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '5px', color: 'var(--text-muted)' }}>
                        <span>0° (Normal)</span>
                        <span>89° (Rasante)</span>
                    </div>
                </div>

                {/* Info Display Transmission */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.15)',
                    fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px'
                }}>
                    <span>Luz Transmitida:</span>
                    <strong style={{ color: '#00ff88', fontFamily: 'var(--font-mono)' }}>{transmittanceStr}%</strong>
                </div>

                {/* Buttons */}
                <div className={styles.buttonGroup}>
                    <button className="btn btn-secondary" onClick={resetChallenge} style={{ width: '100%' }}>
                        🔄 Reiniciar Sistema
                    </button>
                </div>

                {/* Hints */}
                {!completed && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pistas del Archivo ({hintsUsed}/{BREWSTER_HINTS.length})</span>
                            <button className="btn btn-ghost btn-sm" onClick={requestHint} disabled={hintsUsed >= BREWSTER_HINTS.length}>
                                💡 Decodificar Pista (-10% XP)
                            </button>
                        </div>
                        {showHint && (
                            <div style={{ 
                                background: 'rgba(0, 200, 255, 0.1)', 
                                border: '1px solid rgba(0, 200, 255, 0.3)', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                fontSize: '0.85rem', 
                                color: '#aaccff',
                                lineHeight: '1.5'
                            }}>
                                🤖 <strong>Terminal:</strong> {showHint}
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
                            🎉 ¡Misión Cumplida!
                        </h4>
                        <p className={styles.resultFeedback}>
                            Has encontrado el Ángulo de Brewster para el <strong>{currentMaterial.name} ({getBrewsterAngleDeg(N_AIR, currentMaterial.n).toFixed(2)}°)</strong> con polarización paralela. La transferencia de datos es perfecta.
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
                        {result.achievementsUnlocked.length > 0 && (
                            <div className={styles.achievements}>
                                <span className={styles.achievementLabel}>🏆 Logro desbloqueado:</span>
                                {result.achievementsUnlocked.map((a) => (
                                    <span key={a} className="badge badge-gold">🛡️ {a}</span>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
