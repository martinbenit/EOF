'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { calculateChallengeResult } from '@/lib/gamification';
import { useAuth } from '@/lib/auth';
import { useChallengeSession } from '@/hooks/useChallengeSession';
import styles from './ChallengeSimulation.module.css';

const HINTS = [
    "Aunque el Campo Magnético B sea cero fuera de un solenoide ideal, el Potencial Vector A NO lo es. ¡Ese es el origen del efecto Aharonov-Bohm!",
    "La energía almacenada aumenta con el cuadrado de la corriente (I²), pero el costo sube linealmente con el radio (R).",
    "Busca un equilibrio: aumentar mucho el radio dispara el Potencial A en el exterior, poniendo en riesgo el sensor cuántico."
];

export default function SMESForgeChallenge() {
    const { session, refreshProfile } = useAuth();

    // Sliders
    const [radius, setRadius] = useState(1.0); // 0.5 to 5.0 meters
    const [current, setCurrent] = useState(0); // 0 to 1000 A

    const [completed, setCompleted] = useState(false);
    const [totalScore, setTotalScore] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");

    const { timeSeconds, formattedTime, hintsUsed, showHint, requestHint, stopTimer, resetSession, totalHints } = useChallengeSession(HINTS);

    // Physics constants (abstracted for gameplay)
    // Energy U = C1 * R * I^2. Target U = 1000
    const U = 5 * radius * Math.pow(current / 100, 2);

    // Vector Potential A at the sensor outside (fixed distance d=10). A = C2 * I * R^2 / d.
    const A = 2 * (current / 100) * Math.pow(radius, 2);

    // Cost = Material (R) + Power Source (I)
    const cost = Math.floor(100 * radius + 0.5 * current);

    // Constraints
    const TARGET_U = 1000;
    const MAX_SAFE_A = 50;

    // Visual progress
    const uPercent = Math.min(100, (U / TARGET_U) * 100);
    const aPercent = Math.min(100, (A / MAX_SAFE_A) * 100);

    const checkWinCondition = async () => {
        if (A >= MAX_SAFE_A) {
            setErrorMessage("¡Sensor Cuántico Destruido! El Potencial Vector A superó el límite seguro.");
            return;
        }

        if (U >= TARGET_U) {
            setErrorMessage("");
            setCompleted(true);
            stopTimer();

            // Score is based on minimizing cost. Lower cost = Higher Score.
            // Minimum theoretical cost: 
            // U = 5 * R * (I/100)^2 >= 1000 => R * I^2 = 2,000,000
            // A = 2 * (I/100) * R^2 < 50 => I * R^2 < 2500
            // Score formula arbitrary: max 100, scales down with cost.
            const score = Math.max(0, 100 - (cost - 500) / 10);
            setTotalScore(Math.floor(score));

            const challengeResult = calculateChallengeResult('smes-forge', score, 800, timeSeconds, hintsUsed); // maxXP = 800

            if (session) {
                try {
                    await fetch('/api/progress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            challengeId: 'smes-forge',
                            score: Math.floor(score),
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
        } else {
            setErrorMessage("La energía almacenada no es suficiente. Alcanza la meta de 1000 MJ.");
        }
    };

    const handleReset = () => {
        setRadius(1.0);
        setCurrent(0);
        setCompleted(false);
        setErrorMessage("");
        resetSession();
    };

    return (
        <div className={styles.simulation}>
            <div className={styles.canvasSection}>
                <div className={styles.canvasWrapper} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a', border: '2px solid #333', borderRadius: '8px', minHeight: '450px', position: 'relative', overflow: 'hidden' }}>

                    {/* Ring Visualization */}
                    <motion.div
                        animate={{
                            width: radius * 60,
                            height: radius * 60,
                            boxShadow: `0 0 ${current / 10}px ${current / 20}px rgba(0, 255, 170, 0.4)`
                        }}
                        style={{
                            borderRadius: '50%',
                            border: '10px solid #00ffaa',
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {/* Magnetic Field Inside - B differs from 0 */}
                        <motion.div
                            animate={{ opacity: current > 0 ? 0.3 + (current / 1000) * 0.7 : 0 }}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,170,0.8) 0%, rgba(0,0,0,0) 70%)' }}
                        />
                    </motion.div>

                    {/* Sensor Marker */}
                    <div style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', textAlign: 'center' }}>
                        <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: A >= MAX_SAFE_A ? '#ff0055' : '#8b5cf6',
                            boxShadow: `0 0 10px ${A >= MAX_SAFE_A ? '#ff0055' : '#8b5cf6'}`,
                            margin: '0 auto 5px auto'
                        }} />
                        <span style={{ fontSize: '0.8rem', color: '#fff', fontFamily: 'monospace' }}>Sensor<br />Cuántico</span>
                        <div style={{ fontSize: '0.7rem', color: A >= MAX_SAFE_A ? '#ff0055' : '#aaa' }}>
                            A = {A.toFixed(1)}
                        </div>
                    </div>

                    {/* Energy Output Marker */}
                    <div style={{ position: 'absolute', top: '20px', left: '20px', fontFamily: 'monospace', color: '#00ffaa' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Energía Almacenada: {U.toFixed(0)} / {TARGET_U} MJ</div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '5px' }}>Presupuesto Estimado: ${cost} K</div>
                    </div>

                    {/* Alerts */}
                    {A >= MAX_SAFE_A && !completed && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', bottom: '20px', color: '#ff0055', fontWeight: 'bold', background: 'rgba(255,0,0,0.2)', padding: '10px 20px', borderRadius: '8px', border: '1px solid #ff0055' }}>
                            ⚠️ PELIGRO: El Potencial Vector A exterior destruirá el sensor.
                        </motion.div>
                    )}

                    {completed && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,255,170,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', backdropFilter: 'blur(4px)' }}>
                            <h2 style={{ color: '#fff', fontSize: '2rem', textShadow: '2px 2px 0 #0fa' }}>¡FORJA CRÍTICA ESTABLE!</h2>
                            <p style={{ color: '#fff', fontSize: '1.2rem', margin: '10px 0' }}>Score (Eficiencia Económica): {totalScore}</p>
                        </div>
                    )}
                </div>

                <div className={styles.canvasLegend}>
                    <p style={{ margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        <strong>Super-Batería Magnética (SMES)</strong>: Almacena al menos {TARGET_U} MJ de energía magnética en el interior del toroide (B ≠ 0).
                        Pero ten cuidado: aunque <strong>B = 0</strong> en el exterior, el <strong>Potencial Vector A</strong> no lo es debido al efecto Efecto Aharonov-Bohm. Si <code>A &ge; {MAX_SAFE_A}</code>, el sensor cuántico exterior colapsará.
                    </p>
                </div>
            </div>

            <div className={styles.controlPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 className={styles.controlTitle} style={{ margin: 0 }}>⚙️ Parámetros de Diseño</h3>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--neon-cyan)', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '4px' }}>
                        ⏱ {formattedTime}
                    </div>
                </div>

                {errorMessage && (
                    <div style={{ color: '#ff0055', marginBottom: '15px', fontSize: '0.9rem', padding: '10px', background: 'rgba(255,0,0,0.1)', borderLeft: '4px solid #ff0055' }}>
                        {errorMessage}
                    </div>
                )}

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Radio del Toroide (R): <span className="font-mono">{radius.toFixed(1)} m</span>
                    </label>
                    <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={radius}
                        onChange={(e) => setRadius(parseFloat(e.target.value))}
                        disabled={completed}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Mayor radio almacena más energía, pero expande el campo A en el exterior y aumenta el costo.</div>
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        Corriente Inyectada (I): <span className="font-mono">{current} A</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={current}
                        onChange={(e) => setCurrent(parseInt(e.target.value))}
                        disabled={completed}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Mayor corriente aumenta u = B²/2μ₀ cuadráticamente.</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span>Carga de Energía (U)</span>
                        <span style={{ color: uPercent >= 100 ? '#00ffaa' : '#fff' }}>{U.toFixed(0)} / {TARGET_U} MJ</span>
                    </div>
                    <div style={{ height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#00ffaa', width: `${uPercent}%`, transition: 'width 0.3s' }} />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span>Límite de Alarma (Potencial A)</span>
                        <span style={{ color: aPercent >= 100 ? '#ff0055' : '#fff' }}>{A.toFixed(1)} / {MAX_SAFE_A} limit</span>
                    </div>
                    <div style={{ height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: aPercent >= 100 ? '#ff0055' : '#8b5cf6', width: `${aPercent}%`, transition: 'width 0.3s' }} />
                    </div>
                </div>

                <div className={styles.buttonGroup}>
                    {!completed ? (
                        <button className="btn btn-primary" onClick={checkWinCondition} style={{ width: '100%', fontSize: '1.1rem', padding: '12px' }}>
                            ⚡ ACTIVAR BOBINA SMES
                        </button>
                    ) : (
                        <button className="btn btn-secondary" onClick={handleReset} style={{ width: '100%' }}>
                            🔄 Diseñar Otra Vez
                        </button>
                    )}
                </div>

                {!completed && (
                    <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Consultoría ({hintsUsed}/{totalHints})</span>
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
            </div>
        </div>
    );
}
