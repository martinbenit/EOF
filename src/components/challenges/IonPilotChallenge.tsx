'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { calculateChallengeResult } from '@/lib/gamification';
import { useAuth } from '@/lib/auth';
import { useChallengeSession } from '@/hooks/useChallengeSession';
import styles from './ChallengeSimulation.module.css';

const HINTS = [
    "Recuerda la fuerza de Lorentz: F = q(v × B). Para una carga positiva moviéndose a la derecha (v), un campo saliente (B) la desvía hacia abajo.",
    "Un campo entrante desvía a la carga hacia arriba.",
    "Aplica ráfagas cortas de campo para girar y luego apágalo para avanzar en línea recta."
];

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    trail: { x: number; y: number }[];
}

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

const LEVELS = [
    {
        v0: 2,
        walls: [
            { x: 300, y: 0, w: 40, h: 200 },
            { x: 300, y: 250, w: 40, h: 200 },
        ],
        target: { x: 700, y: 225, r: 30 }
    },
    {
        v0: 3,
        walls: [
            { x: 200, y: 0, w: 40, h: 250 },
            { x: 450, y: 200, w: 40, h: 250 },
        ],
        target: { x: 700, y: 225, r: 30 }
    },
    {
        v0: 4.5,
        walls: [
            { x: 200, y: 0, w: 40, h: 280 },
            { x: 350, y: 170, w: 40, h: 280 },
            { x: 500, y: 0, w: 40, h: 280 },
        ],
        target: { x: 700, y: 225, r: 30 }
    }
];

export default function IonPilotChallenge() {
    const { session, refreshProfile } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);

    const [currentLevel, setCurrentLevel] = useState(0);
    const [running, setRunning] = useState(false);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'crashed' | 'level_cleared' | 'game_won'>('idle');
    const [attempts, setAttempts] = useState(1);
    const [totalScore, setTotalScore] = useState(0);

    // Controls
    const [bOut, setBOut] = useState(0); // Campo saliente (+z)
    const [bIn, setBIn] = useState(0);   // Campo entrante (-z)

    const netB = bOut - bIn;

    const { timeSeconds, formattedTime, hintsUsed, showHint, requestHint, stopTimer, resetSession, totalHints } = useChallengeSession(HINTS);

    const WIDTH = 800;
    const HEIGHT = 450;
    const PARTICLE_R = 8;

    const particleRef = useRef<Particle>({ x: 50, y: 225, vx: 2, vy: 0, trail: [] });
    const netBRef = useRef(0);
    netBRef.current = netB;

    const drawFrame = useCallback((ctx: CanvasRenderingContext2D, p: Particle, levelIdx: number) => {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // 8-bit grid background
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.strokeStyle = '#00f0ff22';
        ctx.lineWidth = 1;
        for (let x = 0; x < WIDTH; x += 20) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
        }
        for (let y = 0; y < HEIGHT; y += 20) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
        }

        const levelParams = LEVELS[levelIdx];

        // Draw Walls (Retro style)
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;
        levelParams.walls.forEach(w => {
            ctx.fillRect(w.x, w.y, w.w, w.h);
            // pixel border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x, w.y, w.w, w.h);
        });
        ctx.shadowBlur = 0;

        // Draw Target
        const t = levelParams.target;
        ctx.fillStyle = '#00ffaa33';
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#00ffaa';
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#00ffaa';
        ctx.font = '14px "Press Start 2P", monospace, sans-serif'; // Retro font fallback
        ctx.fillText("META", t.x - 20, t.y + 5);

        // Draw Trail
        if (p.trail.length > 0) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
                ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            ctx.strokeStyle = '#00f0ff66';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw Particle (Ion)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(p.x, p.y, PARTICLE_R, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath(); ctx.arc(p.x, p.y, PARTICLE_R - 3, 0, Math.PI * 2); ctx.fill();

        // Plus sign
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x - 3, p.y); ctx.lineTo(p.x + 3, p.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 3); ctx.lineTo(p.x, p.y + 3); ctx.stroke();

        // Field indicator full screen overlay effect
        const b = netBRef.current;
        if (b > 0) {
            ctx.fillStyle = '#00f0ff08';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.fillStyle = '#00f0ff44';
            ctx.font = '20px monospace';
            ctx.fillText("⊙ B Saliente", 20, 30);
        } else if (b < 0) {
            ctx.fillStyle = '#ff00aa08';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.fillStyle = '#ff00aa44';
            ctx.font = '20px monospace';
            ctx.fillText("⊗ B Entrante", 20, 30);
        }

    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!running) {
            drawFrame(ctx, particleRef.current, currentLevel);
        }
    }, [currentLevel, drawFrame, running, bIn, bOut]); // Re-draw on idle if controls change

    const checkCollision = (p: Particle, levelIdx: number) => {
        const walls = LEVELS[levelIdx].walls;
        for (let w of walls) {
            // Circle-AABB simple collision
            let testX = p.x;
            let testY = p.y;
            if (p.x < w.x) testX = w.x; else if (p.x > w.x + w.w) testX = w.x + w.w;
            if (p.y < w.y) testY = w.y; else if (p.y > w.y + w.h) testY = w.y + w.h;

            let distX = p.x - testX;
            let distY = p.y - testY;
            let distance = Math.sqrt((distX * distX) + (distY * distY));
            if (distance <= PARTICLE_R) return true;
        }
        if (p.y < 0 || p.y > HEIGHT || p.x < 0 || p.x > WIDTH) return true; // Bounds
        return false;
    };

    const startGame = () => {
        setRunning(true);
        setGameState('playing');

        let p = { x: 50, y: 225, vx: LEVELS[currentLevel].v0, vy: 0, trail: [] as { x: number, y: number }[] };
        particleRef.current = p;

        let lastTime = performance.now();

        const animate = (time: number) => {
            const dt = Math.min((time - lastTime) / 1000, 0.05); // cap dt
            lastTime = time;

            // Physics Update
            // q = 1, m = 1 -> a = v x B. 
            // In 2D: B is along Z. Net B = B_z.
            // v x B = (vx i + vy j) x (Bz k) = -vx Bz j + vy Bz i
            // ax = vy * Bz
            // ay = -vx * Bz
            const b = netBRef.current;
            p.vx += p.vy * b * dt * 20;
            p.vy += -p.vx * b * dt * 20;

            // Enforce constant speed to make it manageable
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const targetSpeed = LEVELS[currentLevel].v0 * 50;
            p.vx = (p.vx / speed) * targetSpeed;
            p.vy = (p.vy / speed) * targetSpeed;

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.trail.length === 0 || Math.hypot(p.trail[p.trail.length - 1].x - p.x, p.trail[p.trail.length - 1].y - p.y) > 5) {
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > 200) p.trail.shift();
            }

            particleRef.current = p;

            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) drawFrame(ctx, p, currentLevel);
            }

            // Check Win/Loss
            const t = LEVELS[currentLevel].target;
            const distToTarget = Math.hypot(p.x - t.x, p.y - t.y);
            if (distToTarget < t.r) {
                handleWin();
                return;
            }

            if (checkCollision(p, currentLevel)) {
                handleCrash();
                return;
            }

            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
    };

    const handleCrash = () => {
        setRunning(false);
        setGameState('crashed');
        setAttempts(a => a + 1);
        setBIn(0);
        setBOut(0);
    };

    const handleWin = async () => {
        setRunning(false);

        // Calculate score for this level
        const levelXP = 50;
        const multiplier = attempts === 1 ? 2 : 1; // Double XP if 1st attempt
        const wonXP = levelXP * multiplier;
        setTotalScore(s => s + wonXP);

        if (currentLevel < LEVELS.length - 1) {
            setGameState('level_cleared');
        } else {
            setGameState('game_won');
            stopTimer();

            // Finish Challenge
            const finalScore = 100;
            const finalXP = totalScore + wonXP;
            const challengeResult = calculateChallengeResult('ion-pilot', finalScore, finalXP, timeSeconds, hintsUsed);

            if (session) {
                try {
                    await fetch('/api/progress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            challengeId: 'ion-pilot',
                            score: finalScore,
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
        }
    };

    const nextLevel = () => {
        setCurrentLevel(c => c + 1);
        setAttempts(1);
        setBIn(0);
        setBOut(0);
        setGameState('idle');
        particleRef.current = { x: 50, y: 225, vx: LEVELS[currentLevel + 1].v0, vy: 0, trail: [] };

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) drawFrame(ctx, particleRef.current, currentLevel + 1);
        }
    };

    const retryLevel = () => {
        setBIn(0);
        setBOut(0);
        setGameState('idle');
        particleRef.current = { x: 50, y: 225, vx: LEVELS[currentLevel].v0, vy: 0, trail: [] };
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) drawFrame(ctx, particleRef.current, currentLevel);
        }
    };

    useEffect(() => {
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    return (
        <div className={styles.simulation}>
            <div className={styles.canvasSection}>
                <div className={styles.canvasWrapper} style={{ fontFamily: 'monospace' }}>
                    <canvas
                        ref={canvasRef}
                        width={WIDTH}
                        height={HEIGHT}
                        className={styles.canvas}
                        style={{ border: '4px solid #333', borderRadius: '8px' }}
                    />

                    {/* Game Overlays */}
                    {gameState === 'crashed' && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <h2 style={{ color: '#fff', fontSize: '2rem', textShadow: '2px 2px 0 #f00' }}>¡CHOQUE!</h2>
                            <p style={{ color: '#fff', marginBottom: '20px' }}>El ión tocó una pared.</p>
                            <button className="btn btn-primary" onClick={retryLevel}>Reintentar Nivel</button>
                        </div>
                    )}
                    {gameState === 'level_cleared' && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,255,170,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <h2 style={{ color: '#fff', fontSize: '2rem', textShadow: '2px 2px 0 #0fa' }}>¡NIVEL {currentLevel + 1} SUPERADO!</h2>
                            <p style={{ color: '#fff', marginBottom: '20px' }}>XP Acumulada: {totalScore}</p>
                            <button className="btn btn-primary" onClick={nextLevel}>Siguiente Nivel</button>
                        </div>
                    )}
                    {gameState === 'game_won' && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,240,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <h2 style={{ color: '#fff', fontSize: '2rem', textShadow: '2px 2px 0 #0ff' }}>¡LABERINTO COMPLETADO!</h2>
                            <p style={{ color: '#fff', fontSize: '1.2rem', margin: '10px 0' }}>Has dominado la Fuerza de Lorentz.</p>
                            <p style={{ color: '#ffd700', fontSize: '1.5rem', fontWeight: 'bold' }}>XP Final: {totalScore}</p>
                        </div>
                    )}
                </div>

                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        <strong>Piloto de Iones</strong>: Estás controlando un ión de sodio (+). Usa la Regla de la Mano Derecha para predecir hacia dónde girará el ión al aplicar un Campo Magnético (B).
                    </p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
                        <span>Nivel: {currentLevel + 1} / 3</span>
                        <span>Multiplicador actual: x{attempts === 1 ? 2 : 1}</span>
                    </div>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 className={styles.controlTitle} style={{ margin: 0 }}>⚙️ Panel de Control</h3>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--neon-cyan)', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '4px' }}>
                        ⏱ {formattedTime}
                    </div>
                </div>

                <div className={styles.controlGroup} style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                    <label className={styles.controlLabel} style={{ color: '#00f0ff' }}>
                        Campo B Saliente (⊙): <span className="font-mono">{bOut.toFixed(1)} T</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={bOut}
                        disabled={bIn > 0} // Exclusive
                        onChange={(e) => {
                            setBOut(parseFloat(e.target.value));
                            setBIn(0);
                        }}
                    />
                </div>

                <div className={styles.controlGroup} style={{ background: 'rgba(255, 0, 170, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255, 0, 170, 0.3)' }}>
                    <label className={styles.controlLabel} style={{ color: '#ff00aa' }}>
                        Campo B Entrante (⊗): <span className="font-mono">{bIn.toFixed(1)} T</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={bIn}
                        disabled={bOut > 0} // Exclusive
                        onChange={(e) => {
                            setBIn(parseFloat(e.target.value));
                            setBOut(0);
                        }}
                    />
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '20px' }}>
                    * El ión avanza automáticamente. Aplica campo para curvar su trayectoria. F = q(v × B).
                </p>

                <div className={styles.buttonGroup}>
                    {gameState === 'idle' && (
                        <button className="btn btn-primary" onClick={startGame} style={{ width: '100%', fontSize: '1.2rem', padding: '15px' }}>
                            🚀 INICIAR NIVEL {currentLevel + 1}
                        </button>
                    )}
                </div>

                {gameState !== 'game_won' && (
                    <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pistas ({hintsUsed}/{totalHints})</span>
                            <button className="btn btn-ghost btn-sm" onClick={requestHint} disabled={hintsUsed >= totalHints}>
                                💡 Comprar Pista (-15% XP)
                            </button>
                        </div>
                        {showHint && (
                            <div style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255,215,0,0.3)', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', color: '#ffd700' }}>
                                💡 {showHint}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
