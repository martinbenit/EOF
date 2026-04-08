'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    MATERIALS, getMaterial, PlacedBlock,
    GRID_COLS, GRID_ROWS, CELL_SIZE, CANVAS_W, CANVAS_H,
    TISSUE_OBSTACLES, LASER_COL, LASER_ROW, TARGET_COL, TARGET_ROW,
    traceRay, calculateSnellScore, RayTraceResult,
} from '@/lib/physics/snell';
import { calculateChallengeResult } from '@/lib/gamification';
import { ChallengeResult } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import styles from './ChallengeSimulation.module.css';

const SNELL_HINTS = [
    "La Ley de Snell dice: n₁·sin(θ₁) = n₂·sin(θ₂). Cuando la luz pasa a un medio más denso, se acerca a la normal.",
    "Colocá un bloque de material entre el láser y el target para desviar el rayo. Un material con n alto (como Diamante) desvía más.",
    "Si el rayo no llega al target, probá cambiar el ángulo del láser. Pequeños ajustes hacen una gran diferencia.",
    "La reflexión interna total ocurre cuando la luz pasa de un medio denso a uno menos denso con ángulo mayor al crítico.",
    "Solución: Colocá un bloque de Vidrio o Diamante para que el rayo se refracte hacia el target. Ajustá el ángulo del láser para compensar.",
];

export default function SnellChallenge() {
    const { session, refreshProfile } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);

    const [blocks, setBlocks] = useState<PlacedBlock[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
    const [laserAngle, setLaserAngle] = useState(0);
    const [rayResult, setRayResult] = useState<RayTraceResult | null>(null);
    const [isFired, setIsFired] = useState(false);
    const [shotsUsed, setShotsUsed] = useState(0);

    const [completed, setCompleted] = useState(false);
    const [won, setWon] = useState(false);
    const [result, setResult] = useState<ChallengeResult | null>(null);

    const [hintsUsed, setHintsUsed] = useState(0);
    const [showHint, setShowHint] = useState<string | null>(null);

    const sessionRef = useRef(session);
    sessionRef.current = session;
    const hintsUsedRef = useRef(hintsUsed);
    hintsUsedRef.current = hintsUsed;

    const blocksRef = useRef(blocks);
    blocksRef.current = blocks;
    const laserAngleRef = useRef(laserAngle);
    laserAngleRef.current = laserAngle;
    const rayResultRef = useRef(rayResult);
    rayResultRef.current = rayResult;
    const isFiredRef = useRef(isFired);
    isFiredRef.current = isFired;

    // ---- Canvas Drawing ----
    const drawFrame = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
        const W = CANVAS_W;
        const H = CANVAS_H;
        ctx.clearRect(0, 0, W, H);

        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, 'rgba(8, 6, 28, 1)');
        bg.addColorStop(1, 'rgba(12, 10, 35, 1)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= GRID_COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * CELL_SIZE, 0); ctx.lineTo(c * CELL_SIZE, H); ctx.stroke();
        }
        for (let r = 0; r <= GRID_ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * CELL_SIZE); ctx.lineTo(W, r * CELL_SIZE); ctx.stroke();
        }

        // ---- Tissue obstacles ----
        for (const obs of TISSUE_OBSTACLES) {
            const x = obs.col * CELL_SIZE;
            const y = obs.row * CELL_SIZE;
            const w = obs.w * CELL_SIZE;
            const h = obs.h * CELL_SIZE;

            ctx.fillStyle = 'rgba(255, 80, 80, 0.12)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

            // Cross pattern
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.2)';
            ctx.lineWidth = 1;
            for (let ix = 0; ix < obs.w; ix++) {
                for (let iy = 0; iy < obs.h; iy++) {
                    const cx = (obs.col + ix) * CELL_SIZE;
                    const cy = (obs.row + iy) * CELL_SIZE;
                    ctx.beginPath();
                    ctx.moveTo(cx + 10, cy + 10);
                    ctx.lineTo(cx + CELL_SIZE - 10, cy + CELL_SIZE - 10);
                    ctx.moveTo(cx + CELL_SIZE - 10, cy + 10);
                    ctx.lineTo(cx + 10, cy + CELL_SIZE - 10);
                    ctx.stroke();
                }
            }

            ctx.fillStyle = 'rgba(255, 80, 80, 0.5)';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('TEJIDO', x + w / 2, y + h / 2 + 3);
        }

        // ---- Placed blocks ----
        const currentBlocks = blocksRef.current;
        for (const block of currentBlocks) {
            const mat = getMaterial(block.materialId);
            const x = block.col * CELL_SIZE;
            const y = block.row * CELL_SIZE;

            ctx.fillStyle = mat.color + Math.round(mat.alpha * 255).toString(16).padStart(2, '0');
            ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

            ctx.strokeStyle = mat.color + '88';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

            ctx.fillStyle = mat.color;
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(mat.name, x + CELL_SIZE / 2, y + CELL_SIZE / 2 - 4);
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(`n=${mat.n}`, x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 10);
        }

        // ---- Laser emitter ----
        const lx = (LASER_COL + 0.5) * CELL_SIZE;
        const ly = (LASER_ROW + 0.5) * CELL_SIZE;
        const ang = laserAngleRef.current;

        // Emitter body
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(lx, ly, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 68, 68, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Aim line
        const aimRad = ((ang + 90) * Math.PI) / 180;
        const aimLen = 25;
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + Math.cos(aimRad) * aimLen, ly + Math.sin(aimRad) * aimLen);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255, 68, 68, 0.8)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LÁSER', lx, ly - 18);

        // ---- Target (virus) ----
        const tx = (TARGET_COL + 0.5) * CELL_SIZE;
        const ty = (TARGET_ROW + 0.5) * CELL_SIZE;
        const targetHit = rayResultRef.current?.hitTarget || false;

        const pulse = targetHit ? 1 : (Math.sin(time * 0.03) * 0.2 + 0.8);

        if (targetHit) {
            ctx.beginPath();
            ctx.arc(tx, ty, 24, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
            ctx.fill();
        }

        // Virus body
        ctx.beginPath();
        ctx.arc(tx, ty, 14 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = targetHit ? '#00ff88' : 'rgba(180, 0, 200, 0.7)';
        ctx.fill();
        ctx.strokeStyle = targetHit ? 'rgba(0, 255, 136, 0.8)' : 'rgba(200, 0, 220, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Spikes
        for (let i = 0; i < 6; i++) {
            const spAngle = (i * Math.PI * 2) / 6 + time * 0.01;
            const sx = tx + Math.cos(spAngle) * 18 * pulse;
            const sy = ty + Math.sin(spAngle) * 18 * pulse;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fillStyle = targetHit ? '#00ff88' : 'rgba(180, 0, 200, 0.5)';
            ctx.fill();
        }

        ctx.fillStyle = targetHit ? '#00ff88' : 'rgba(200, 0, 220, 0.7)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(targetHit ? '💥 ELIMINADO' : '🦠 VIRUS', tx, ty + 30);

        // ---- Ray trace visualization ----
        const result = rayResultRef.current;
        if (result && isFiredRef.current) {
            for (let i = 0; i < result.segments.length; i++) {
                const seg = result.segments[i];
                const progress = Math.min(1, (time * 0.15 - i * 5) / 20);
                if (progress <= 0) continue;

                const endX = seg.x1 + (seg.x2 - seg.x1) * Math.min(progress, 1);
                const endY = seg.y1 + (seg.y2 - seg.y1) * Math.min(progress, 1);

                // Glow
                ctx.shadowColor = result.hitTarget ? '#00ff88' : '#ff4444';
                ctx.shadowBlur = 8;

                ctx.strokeStyle = result.hitTarget
                    ? 'rgba(0, 255, 136, 0.9)'
                    : result.hitTissue
                        ? 'rgba(255, 68, 68, 0.9)'
                        : 'rgba(255, 200, 50, 0.9)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                ctx.shadowBlur = 0;

                // Refraction point marker
                if (i > 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.beginPath();
                    ctx.arc(seg.x1, seg.y1, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Hit tissue indicator
            if (result.hitTissue) {
                const lastSeg = result.segments[result.segments.length - 1];
                ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
                ctx.font = 'bold 14px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('✖ TEJIDO DAÑADO', lastSeg.x2, lastSeg.y2 - 15);
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

    // ---- Interaction ----
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (completed) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const col = Math.floor(mx / CELL_SIZE);
        const row = Math.floor(my / CELL_SIZE);

        if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

        // Can't place on laser or target
        if (col === LASER_COL && row === LASER_ROW) return;
        if (col === TARGET_COL && row === TARGET_ROW) return;

        // Can't place on tissue
        for (const obs of TISSUE_OBSTACLES) {
            if (col >= obs.col && col < obs.col + obs.w &&
                row >= obs.row && row < obs.row + obs.h) return;
        }

        // If clicking on existing block, remove it
        const existingIdx = blocks.findIndex(b => b.col === col && b.row === row);
        if (existingIdx >= 0) {
            setBlocks(prev => prev.filter((_, i) => i !== existingIdx));
            setIsFired(false);
            setRayResult(null);
            return;
        }

        // Place selected material
        if (selectedMaterial) {
            setBlocks(prev => [...prev, { col, row, materialId: selectedMaterial }]);
            setIsFired(false);
            setRayResult(null);
        }
    };

    const fireLaser = () => {
        const result = traceRay(laserAngle, blocks);
        setRayResult(result);
        setIsFired(true);
        setShotsUsed(prev => prev + 1);

        if (result.hitTarget) {
            finishGame(result);
        }
    };

    const finishGame = async (traceResult: RayTraceResult) => {
        setCompleted(true);
        setWon(true);

        const currentSession = sessionRef.current;
        const currentHints = hintsUsedRef.current;

        const { score, efficiency } = calculateSnellScore(traceResult, blocks.length, shotsUsed + 1);
        const challengeResult = calculateChallengeResult('snell', score, efficiency, 0, currentHints);
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
                        challengeId: 'snell',
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
        setBlocks([]);
        setSelectedMaterial(null);
        setLaserAngle(0);
        setRayResult(null);
        setIsFired(false);
        setShotsUsed(0);
        setCompleted(false);
        setWon(false);
        setResult(null);
        setHintsUsed(0);
        setShowHint(null);
    };

    const requestHint = () => {
        if (hintsUsed < SNELL_HINTS.length) {
            setShowHint(SNELL_HINTS[hintsUsed]);
            setHintsUsed(prev => prev + 1);
        }
    };

    return (
        <div className={styles.simulation}>
            <div className={styles.canvasSection}>
                <div className={styles.canvasWrapper}>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        className={styles.canvas}
                        onClick={handleCanvasClick}
                        style={{ cursor: selectedMaterial ? 'crosshair' : 'pointer' }}
                    />
                    {won && (
                        <motion.div
                            className={styles.hitOverlay}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            style={{ color: '#00ff88', textShadow: '0 0 30px rgba(0, 255, 136, 0.8)' }}
                        >
                            🎯 ¡Blanco Perfecto!
                        </motion.div>
                    )}
                </div>

                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 8px 0', lineHeight: '1.4' }}>
                        <strong>Ley de Snell:</strong> n₁·sin(θ₁) = n₂·sin(θ₂). Al cambiar de medio, el rayo se desvía.
                        Seleccioná un material, hacé clic en la grilla para colocarlo, y disparalo para eliminar el virus.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <span>🔴 Láser</span>
                        <span>🦠 Virus (target)</span>
                        <span><span style={{ color: '#ff5050' }}>✖</span> Tejido sano</span>
                        <span>📦 Clic = colocar / quitar bloque</span>
                    </div>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <h3 className={styles.controlTitle}>⚙️ Controles</h3>

                {/* Material Palette */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>Bloques de Material (clic para seleccionar):</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {MATERIALS.filter(m => m.id !== 'air').map(mat => (
                            <button
                                key={mat.id}
                                onClick={() => setSelectedMaterial(selectedMaterial === mat.id ? null : mat.id)}
                                disabled={completed}
                                style={{
                                    padding: '10px 12px',
                                    background: selectedMaterial === mat.id
                                        ? mat.color + '33'
                                        : 'rgba(255,255,255,0.03)',
                                    border: selectedMaterial === mat.id
                                        ? `2px solid ${mat.color}`
                                        : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    color: mat.color,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div>{mat.name}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
                                    n = {mat.n}
                                </div>
                            </button>
                        ))}
                    </div>
                    {selectedMaterial && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', marginTop: '6px' }}>
                            ✅ {getMaterial(selectedMaterial).name} seleccionado — hacé clic en la grilla
                        </div>
                    )}
                </div>

                {/* Block count */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Bloques colocados: <span className="font-mono" style={{ color: blocks.length <= 2 ? '#00ff88' : blocks.length <= 4 ? '#ffd700' : '#ff8800' }}>{blocks.length}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>(menos bloques = más XP)</span>
                    </label>
                </div>

                {/* Laser Angle */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Ángulo del Láser: <span className="font-mono">{laserAngle}°</span>
                    </label>
                    <input
                        type="range"
                        min="-80"
                        max="80"
                        step="1"
                        value={laserAngle}
                        onChange={(e) => {
                            setLaserAngle(parseInt(e.target.value));
                            if (isFired) {
                                setIsFired(false);
                                setRayResult(null);
                            }
                        }}
                        disabled={completed}
                    />
                    <div className={styles.rangeLabels}>
                        <span>-80° (←)</span>
                        <span>0° (↓)</span>
                        <span>(→) +80°</span>
                    </div>
                </div>

                {/* Ray info */}
                {rayResult && (
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: rayResult.hitTarget ? 'rgba(0,255,136,0.06)' : rayResult.hitTissue ? 'rgba(255,68,68,0.06)' : 'rgba(255,200,50,0.06)',
                        border: `1px solid ${rayResult.hitTarget ? 'rgba(0,255,136,0.2)' : rayResult.hitTissue ? 'rgba(255,68,68,0.2)' : 'rgba(255,200,50,0.2)'}`,
                        fontSize: '0.85rem',
                    }}>
                        {rayResult.hitTarget && <div style={{ color: '#00ff88' }}>✅ ¡Rayo impacta en el virus!</div>}
                        {rayResult.hitTissue && <div style={{ color: '#ff4444' }}>❌ El rayo dañó tejido sano. Reajustá bloques o ángulo.</div>}
                        {rayResult.exitedCanvas && !rayResult.hitTarget && !rayResult.hitTissue && (
                            <div style={{ color: '#ffc832' }}>⚠️ El rayo salió del área. Probá un ángulo diferente.</div>
                        )}
                        <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                            Refracciones: {rayResult.totalRefractions} | Disparos: {shotsUsed}
                        </div>
                    </div>
                )}

                {/* Formula */}
                <div className={styles.formulaBox} style={{ borderColor: 'rgba(255, 200, 50, 0.2)', background: 'rgba(255, 200, 50, 0.04)' }}>
                    <span className={styles.formulaLabel}>Ley de Snell</span>
                    <span className={styles.formula} style={{ color: '#ffc832' }}>n₁ · sin(θ₁) = n₂ · sin(θ₂)</span>
                </div>

                {/* Buttons */}
                <div className={styles.buttonGroup}>
                    {!completed && (
                        <button className="btn btn-primary" onClick={fireLaser} style={{ width: '100%' }}>
                            🔫 Disparar Láser
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={resetChallenge} style={{ width: '100%' }}>
                        🔄 Reiniciar
                    </button>
                </div>

                {/* Hints */}
                {!completed && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pistas ({hintsUsed}/{SNELL_HINTS.length})</span>
                            <button className="btn btn-ghost btn-sm" onClick={requestHint} disabled={hintsUsed >= SNELL_HINTS.length}>
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
                            🎉 ¡Blanco Perfecto! Virus Eliminado
                        </h4>
                        <p className={styles.resultFeedback}>
                            Usaste la Ley de Snell para guiar el rayo láser a través de los materiales y destruir el virus.
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
                            <div className={styles.resultStat}>
                                <span>Bloques usados</span>
                                <strong>{blocks.length}</strong>
                            </div>
                            <div className={styles.resultStat} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
                                <span style={{ color: 'var(--neon-gold)' }}>⭐ XP Total</span>
                                <strong style={{ color: 'var(--neon-gold)', fontSize: '1.2rem' }}>+{result.totalXP}</strong>
                            </div>
                        </div>
                        <div className={styles.achievements}>
                            <span className={styles.achievementLabel}>🏆 Logros desbloqueados:</span>
                            <span className="badge badge-gold">🎯 Francotirador Fotónico</span>
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
