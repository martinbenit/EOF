'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import Stage1SOS from './stages/Stage1SOS';
import Stage2Huracan from './stages/Stage2Huracan';
import Stage3Jaula from './stages/Stage3Jaula';
import Stage4Pincel from './stages/Stage4Pincel';
import './salto-cuantico.css';

interface HintData {
    text: string;
    cost: number;
}

const STAGE_HINTS: Record<number, HintData[]> = {
    1: [
        { text: "La física clásica te diría que subas la intensidad al máximo, pero acá rigen las leyes cuánticas...", cost: 10 },
        { text: "Recordá a Einstein: un fotón azul tiene más energía (billete grande) que uno rojo (billete chico). Cambiá el color. También el material del panel afecta la Función de Trabajo.", cost: 20 },
    ],
    2: [
        { text: "Si usás la materia como onda, tenés que hacer que su longitud sea más chiquita que el virus. Pero la apertura del haz importa.", cost: 10 },
        { text: "De Broglie dijo que λ es inversamente proporcional a la velocidad. ¡Dale máxima potencia al acelerador! Y cerrá la apertura para enfocar bien.", cost: 20 },
    ],
    3: [
        { text: "No podés acorralar a una partícula sin alterar su velocidad. Buscá el equilibrio entre posición y momento.", cost: 10 },
        { text: "Δx chico = Δp grande = explosión. Δx grande = fuga. Buscá el rango medio (~2-4 nm) y bajá la temperatura del cryo-system.", cost: 20 },
    ],
    4: [
        { text: "En nanotecnología, el tamaño del pozo define la energía. Pero la masa efectiva del material también importa.", cost: 10 },
        { text: "Para sacar un fotón azul, la diferencia entre escalones E₂-E₁ debe coincidir con ~2.5-2.8 eV. Ajustá L y m* juntos.", cost: 20 },
    ],
};

const STAGE_TITLES = [
    'S.O.S. en el Vacío',
    'El Ojo del Huracán',
    'La Jaula de Cristal',
    'El Pincel Nanométrico',
];

const STAGE_ICONS = ['🚀', '🌍', '⚡', '🧬'];

// Characters for narrative
const CHARACTERS = {
    dra: { name: 'Dra. Curie', icon: '👩‍🔬', color: '#00ff88' },
    capitan: { name: 'Capitán Planck', icon: '🧑‍🚀', color: '#00ccff' },
    ia: { name: 'QUBIT-7', icon: '🤖', color: '#ffd700' },
};

interface DialogLine {
    character: keyof typeof CHARACTERS;
    text: string;
}

const STAGE_INTROS: Record<number, DialogLine[]> = {
    1: [
        { character: 'capitan', text: "Aquí Capitán Planck. El satélite climático TERRA-9 perdió energía. Sin él, no podemos detectar la fuente de contaminación." },
        { character: 'dra', text: "El panel solar del satélite es experimental. Funciona por efecto fotoeléctrico. Necesitamos fotones con suficiente energía para arrancar electrones." },
        { character: 'ia', text: "ALERTA: Subir la intensidad no sirve si la frecuencia es baja. La energía de cada fotón importa. Seleccioná el material del panel y ajustá el color del láser." },
    ],
    2: [
        { character: 'capitan', text: "TERRA-9 detectó un micro-contaminante, pero es demasiado pequeño para microscopios ópticos. Necesitamos un TEM." },
        { character: 'dra', text: "Vamos a usar electrones como ondas. De Broglie nos enseñó que toda partícula tiene una longitud de onda asociada. Cuanta más energía, más corta la onda." },
        { character: 'ia', text: "PARÁMETROS: Ajustá el voltaje del acelerador Y la apertura del condensador. Ambos afectan la resolución final de la imagen." },
    ],
    3: [
        { character: 'dra', text: "Identificamos la Bio-Toxina. Debemos atraparla en una nano-trampa magnética. Pero Heisenberg nos pone un límite." },
        { character: 'ia', text: "AVISO: Confinar una partícula (Δx pequeño) dispara la incertidumbre en momento (Δp grande). Eso genera calor. El cryo-system ayuda, pero tiene un límite." },
        { character: 'capitan', text: "Encontrá el sweet-spot y mantenelo estable 5 segundos. Si la temperatura sube demasiado... boom. Si la jaula es muy grande... se escapa." },
    ],
    4: [
        { character: 'dra', text: "¡Toxina contenida! Los médicos necesitan un biomarcador fluorescente AZUL para localizar células infectadas. Vamos a forjar un Quantum Dot." },
        { character: 'ia', text: "El Quantum Dot es un pozo de potencial infinito. La emisión depende del tamaño L y la masa efectiva m* del material. Ecuación de Schrödinger: Eₙ = n²h²/(8m*L²)." },
        { character: 'capitan', text: "Necesitamos emisión AZUL (450-495 nm). Ajustá tanto el tamaño del QD como el material semiconductor. ¡La humanidad depende de vos!" },
    ],
};

const VICTORY_DIALOGS: Record<number, DialogLine[]> = {
    1: [
        { character: 'capitan', text: "¡Satélite reiniciado! Batería al 100%. Escáner atmosférico en línea." },
        { character: 'dra', text: "Detectamos una firma molecular desconocida en la atmósfera. Es un patógeno artificial. Necesitamos verlo de cerca." },
    ],
    2: [
        { character: 'dra', text: "¡Imagen capturada en HD cuántico! Es una bio-toxina radioactiva con estructura cristalina. Inestable y peligrosa." },
        { character: 'ia', text: "ANÁLISIS: La toxina muta cada 30 minutos. Debemos aislarla YA para sintetizar la cura." },
    ],
    3: [
        { character: 'capitan', text: "¡Toxina atrapada! La nano-jaula se mantiene estable. ¡Heisenberg está de nuestro lado!" },
        { character: 'dra', text: "Excelente. Ahora necesitamos un marcador fluorescente para que los médicos localicen las células infectadas en el cuerpo humano." },
    ],
    4: [
        { character: 'dra', text: "¡BIOMARCADOR AZUL sintetizado! Emisión perfecta en el rango visible. Los médicos ya pueden rastrear la infección." },
        { character: 'capitan', text: "Misión cumplida. Gracias a la mecánica cuántica, salvamos al planeta. Operación Salto Cuántico: ¡EXITOSA!" },
        { character: 'ia', text: "REPORTE FINAL: Todos los módulos cuánticos operativos. La humanidad está a salvo. Buen trabajo, Agente Cuántico." },
    ],
};

export default function OperacionSaltoCuantico() {
    const { session, refreshProfile } = useAuth();
    const [currentStage, setCurrentStage] = useState(1);
    const [xp, setXp] = useState(100);
    const [showVictoryModal, setShowVictoryModal] = useState(false);
    const [victoryXP, setVictoryXP] = useState(0);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [hintsRevealed, setHintsRevealed] = useState<Record<number, number[]>>({});
    const [showHintMenu, setShowHintMenu] = useState(false);
    const [totalXpEarned, setTotalXpEarned] = useState(0);
    const [showIntro, setShowIntro] = useState(true);
    const [introLine, setIntroLine] = useState(0);
    const [dialogLine, setDialogLine] = useState(0);
    const [stageXPs, setStageXPs] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const startTimeRef = useRef(Date.now());

    // Auto-advance intro dialog
    const introLines = STAGE_INTROS[currentStage] || [];
    const victoryLines = VICTORY_DIALOGS[currentStage] || [];

    const handleNextIntroLine = () => {
        if (introLine < introLines.length - 1) {
            setIntroLine(prev => prev + 1);
        } else {
            setShowIntro(false);
        }
    };

    const handleNextDialogLine = () => {
        if (dialogLine < victoryLines.length - 1) {
            setDialogLine(prev => prev + 1);
        }
    };

    const handleStageWin = useCallback((earnedXP: number) => {
        setVictoryXP(earnedXP);
        setXp(prev => prev + earnedXP);
        setTotalXpEarned(prev => prev + earnedXP);
        setStageXPs(prev => [...prev, earnedXP]);
        setDialogLine(0);
        setShowVictoryModal(true);
    }, []);

    const handleNextStage = useCallback(async () => {
        setShowVictoryModal(false);
        if (currentStage >= 4) {
            setGameCompleted(true);
            // Save progress to DB
            setSaving(true);
            setSaveError('');
            if (session) {
                try {
                    const finalXP = totalXpEarned + victoryXP;
                    const totalScore = Math.min(100, Math.round(finalXP / 2.6));
                    const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
                    const totalHints = Object.values(hintsRevealed).reduce((sum, arr) => sum + arr.length, 0);

                    const res = await fetch('/api/progress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            challengeId: 'salto-cuantico',
                            score: totalScore,
                            xpEarned: finalXP,
                            timeSeconds: totalTime,
                            hintsUsed: totalHints
                        })
                    });
                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || 'Error saving');
                    }
                    await refreshProfile();
                } catch (err: any) {
                    console.error('Failed to save progress:', err);
                    setSaveError(err.message || 'Error al guardar progreso');
                }
            }
            setSaving(false);
        } else {
            setCurrentStage(prev => prev + 1);
            setShowIntro(true);
            setIntroLine(0);
        }
    }, [currentStage, session, totalXpEarned, victoryXP, hintsRevealed, refreshProfile]);

    const handleBuyHint = useCallback((hintIndex: number) => {
        const hints = STAGE_HINTS[currentStage];
        if (!hints || hintIndex >= hints.length) return;
        const alreadyRevealed = hintsRevealed[currentStage] || [];
        if (alreadyRevealed.includes(hintIndex)) return;
        const cost = hints[hintIndex].cost;
        if (xp < cost) return;
        setXp(prev => prev - cost);
        setHintsRevealed(prev => ({
            ...prev,
            [currentStage]: [...(prev[currentStage] || []), hintIndex],
        }));
    }, [currentStage, hintsRevealed, xp]);

    const handleRestart = useCallback(() => {
        setCurrentStage(1);
        setXp(100);
        setShowVictoryModal(false);
        setGameCompleted(false);
        setHintsRevealed({});
        setShowHintMenu(false);
        setTotalXpEarned(0);
        setShowIntro(true);
        setIntroLine(0);
        setDialogLine(0);
        setStageXPs([]);
        startTimeRef.current = Date.now();
    }, []);

    const revealedForStage = hintsRevealed[currentStage] || [];
    const stageHints = STAGE_HINTS[currentStage] || [];

    // ──── GAME COMPLETED SCREEN ────
    if (gameCompleted) {
        const finalXP = xp;
        const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
        const totalHints = Object.values(hintsRevealed).reduce((sum, arr) => sum + arr.length, 0);
        const grade = finalXP >= 300 ? 'S' : finalXP >= 250 ? 'A' : finalXP >= 200 ? 'B' : 'C';
        const gradeColors: Record<string, string> = { S: '#ffd700', A: '#00ff88', B: '#00ccff', C: '#ff8800' };

        return (
            <div className="sqo-container">
                <div className="sqo-crt">
                    <div className="sqo-completed-screen">
                        <div className="sqo-fireworks">
                            {Array.from({ length: 25 }).map((_, i) => (
                                <div key={i} className="sqo-firework-particle" style={{
                                    '--delay': `${Math.random() * 3}s`,
                                    '--x': `${Math.random() * 100}%`,
                                    '--y': `${Math.random() * 100}%`,
                                    '--color': ['#ff0', '#0ff', '#f0f', '#0f0', '#f00', '#00f'][Math.floor(Math.random() * 6)],
                                    '--size': `${4 + Math.random() * 6}px`,
                                } as React.CSSProperties} />
                            ))}
                        </div>

                        {/* Badge */}
                        <div className="sqo-badge-container">
                            <div className="sqo-badge-glow" />
                            <div className="sqo-badge">
                                <span className="sqo-badge-icon">🛡️</span>
                                <span className="sqo-badge-text">AGENTE CUÁNTICO</span>
                            </div>
                        </div>

                        <h1 className="sqo-completed-title sqo-blink-slow">
                            ★ MISIÓN COMPLETADA ★
                        </h1>
                        <div className="sqo-completed-subtitle">OPERACIÓN SALTO CUÁNTICO — LA HUMANIDAD ESTÁ A SALVO</div>

                        {/* Narrative Outro */}
                        <div className="sqo-outro-narrative">
                            <div className="sqo-dialog-box" style={{ borderColor: CHARACTERS.dra.color }}>
                                <span className="sqo-dialog-icon">{CHARACTERS.dra.icon}</span>
                                <div className="sqo-dialog-content">
                                    <span className="sqo-dialog-name" style={{ color: CHARACTERS.dra.color }}>{CHARACTERS.dra.name}</span>
                                    <p className="sqo-dialog-text">Gracias a tu dominio de la mecánica cuántica, neutralizamos la amenaza. Cada descubrimiento de la física fue una herramienta para salvar vidas. ¡Sos un verdadero Agente Cuántico!</p>
                                </div>
                            </div>
                        </div>

                        {/* Grade */}
                        <div className="sqo-grade-display">
                            <div className="sqo-grade-label">CLASIFICACIÓN</div>
                            <div className="sqo-grade-value" style={{ color: gradeColors[grade], textShadow: `0 0 20px ${gradeColors[grade]}` }}>{grade}</div>
                        </div>

                        {/* Score Summary */}
                        <div className="sqo-final-score">
                            <div className="sqo-final-score-label">SCORE FINAL</div>
                            <div className="sqo-final-score-value">{finalXP} XP</div>
                        </div>

                        {/* Stage breakdown */}
                        <div className="sqo-completed-stages">
                            {STAGE_TITLES.map((title, i) => (
                                <div key={i} className="sqo-completed-stage-item">
                                    <span className="sqo-completed-stage-icon">{STAGE_ICONS[i]}</span>
                                    <span className="sqo-completed-stage-name">STAGE {i + 1}: {title}</span>
                                    <span className="sqo-completed-xp">+{stageXPs[i] || 0} XP</span>
                                    <span className="sqo-completed-check">✓</span>
                                </div>
                            ))}
                        </div>

                        {/* Stats */}
                        <div className="sqo-final-stats">
                            <div className="sqo-final-stat">
                                <span className="sqo-final-stat-label">TIEMPO</span>
                                <span className="sqo-final-stat-value">{Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}</span>
                            </div>
                            <div className="sqo-final-stat">
                                <span className="sqo-final-stat-label">PISTAS</span>
                                <span className="sqo-final-stat-value">{totalHints}</span>
                            </div>
                            <div className="sqo-final-stat">
                                <span className="sqo-final-stat-label">XP INICIAL</span>
                                <span className="sqo-final-stat-value">100</span>
                            </div>
                        </div>

                        {/* Save status */}
                        {saving && <div className="sqo-save-status">💾 GUARDANDO PROGRESO...</div>}
                        {saveError && <div className="sqo-save-status sqo-save-error">⚠ {saveError}</div>}
                        {!saving && !saveError && <div className="sqo-save-status sqo-save-ok">✓ PROGRESO GUARDADO EN TU PERFIL</div>}

                        <button className="sqo-btn-retro sqo-blink-slow" onClick={handleRestart}>
                            ▶ JUGAR DE NUEVO
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sqo-container">
            <div className="sqo-crt">
                {/* Header HUD */}
                <div className="sqo-hud">
                    <div className="sqo-hud-title">OPERACIÓN SALTO CUÁNTICO</div>
                    <div className="sqo-hud-stats">
                        <div className="sqo-hud-stat">
                            <span className="sqo-hud-label">STAGE</span>
                            <span className="sqo-hud-value">{currentStage}/4</span>
                        </div>
                        <div className="sqo-hud-divider">│</div>
                        <div className="sqo-hud-stat">
                            <span className="sqo-hud-label">XP</span>
                            <span className="sqo-hud-value sqo-xp-glow">{xp}</span>
                        </div>
                    </div>
                </div>

                {/* Stage Title Bar */}
                <div className="sqo-stage-bar">
                    <span className="sqo-stage-icon">{STAGE_ICONS[currentStage - 1]}</span>
                    <span className="sqo-stage-name">STAGE {currentStage}: {STAGE_TITLES[currentStage - 1]}</span>
                    {!showIntro && (
                        <button className="sqo-hint-btn" onClick={() => setShowHintMenu(!showHintMenu)}>
                            ? PISTA
                        </button>
                    )}
                </div>

                {/* ── INTRO DIALOG ── */}
                {showIntro && (
                    <div className="sqo-intro-panel">
                        <div className="sqo-intro-title">BRIEFING — STAGE {currentStage}</div>
                        {introLines.slice(0, introLine + 1).map((line, idx) => {
                            const char = CHARACTERS[line.character];
                            return (
                                <div key={idx} className="sqo-dialog-box" style={{ borderColor: char.color, animationDelay: `${idx * 0.2}s` }}>
                                    <span className="sqo-dialog-icon">{char.icon}</span>
                                    <div className="sqo-dialog-content">
                                        <span className="sqo-dialog-name" style={{ color: char.color }}>{char.name}</span>
                                        <p className="sqo-dialog-text">{line.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                        <button className="sqo-btn-retro" onClick={handleNextIntroLine} style={{ marginTop: '12px', alignSelf: 'center' }}>
                            {introLine < introLines.length - 1 ? '▶ SIGUIENTE' : '🎮 ¡EMPEZAR STAGE!'}
                        </button>
                    </div>
                )}

                {/* Hint Menu */}
                {showHintMenu && !showIntro && (
                    <div className="sqo-hint-menu">
                        <div className="sqo-hint-menu-title">SISTEMA DE PISTAS</div>
                        {stageHints.map((hint, idx) => {
                            const isRevealed = revealedForStage.includes(idx);
                            const canAfford = xp >= hint.cost;
                            return (
                                <div key={idx} className="sqo-hint-item">
                                    <div className="sqo-hint-header">
                                        <span>PISTA {idx + 1}</span>
                                        <span className="sqo-hint-cost">{isRevealed ? '✓ REVELADA' : `−${hint.cost} XP`}</span>
                                    </div>
                                    {isRevealed ? (
                                        <div className="sqo-hint-text">{hint.text}</div>
                                    ) : (
                                        <button
                                            className={`sqo-btn-hint-buy ${!canAfford ? 'sqo-btn-disabled' : ''}`}
                                            onClick={() => handleBuyHint(idx)}
                                            disabled={!canAfford}
                                        >
                                            {canAfford ? '💡 COMPRAR PISTA' : '❌ XP INSUFICIENTE'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        <button className="sqo-btn-close-hints" onClick={() => setShowHintMenu(false)}>CERRAR ✕</button>
                    </div>
                )}

                {/* Stage Content */}
                {!showIntro && (
                    <div className="sqo-stage-content">
                        {currentStage === 1 && <Stage1SOS onWin={handleStageWin} />}
                        {currentStage === 2 && <Stage2Huracan onWin={handleStageWin} />}
                        {currentStage === 3 && <Stage3Jaula onWin={handleStageWin} />}
                        {currentStage === 4 && <Stage4Pincel onWin={handleStageWin} />}
                    </div>
                )}

                {/* Victory Modal */}
                {showVictoryModal && (
                    <div className="sqo-modal-overlay">
                        <div className="sqo-modal">
                            <div className="sqo-modal-stars">★ ★ ★</div>
                            <h2 className="sqo-modal-title">¡STAGE {currentStage} COMPLETADO!</h2>
                            {/* Victory Dialog */}
                            <div className="sqo-victory-dialog">
                                {victoryLines.slice(0, dialogLine + 1).map((line, idx) => {
                                    const char = CHARACTERS[line.character];
                                    return (
                                        <div key={idx} className="sqo-dialog-box sqo-dialog-box-small" style={{ borderColor: char.color }}>
                                            <span className="sqo-dialog-icon">{char.icon}</span>
                                            <div className="sqo-dialog-content">
                                                <span className="sqo-dialog-name" style={{ color: char.color }}>{char.name}</span>
                                                <p className="sqo-dialog-text">{line.text}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {dialogLine < victoryLines.length - 1 && (
                                    <button className="sqo-btn-dialog-next" onClick={handleNextDialogLine}>▶ SIGUIENTE</button>
                                )}
                            </div>
                            <div className="sqo-modal-xp">
                                <span className="sqo-modal-xp-label">XP GANADOS</span>
                                <span className="sqo-modal-xp-value">+{victoryXP}</span>
                            </div>
                            {dialogLine >= victoryLines.length - 1 && (
                                <button className="sqo-btn-retro sqo-blink-slow" onClick={handleNextStage}>
                                    {currentStage >= 4 ? '🏆 VER RESULTADOS FINALES' : '▶ PASAR AL SIGUIENTE NIVEL'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
