'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import AvalonStage1 from './stages/AvalonStage1';
import AvalonStage2 from './stages/AvalonStage2';
import AvalonStage3 from './stages/AvalonStage3';
import AvalonStage4 from './stages/AvalonStage4';
import './avalon.css';

interface HintData {
    text: string;
    cost: number;
}

const STAGE_HINTS: Record<number, HintData[]> = {
    1: [
        { text: "Una partícula sola no sirve. El campo electromagnético se multiplica exponencialmente en la brecha (Gap) entre dos partículas muy juntas.", cost: 10 },
        { text: "La carga se acumula en las puntas (efecto pararrayos). Uní dos triángulos enfrentados por las puntas y poné el virus justo en el medio.", cost: 20 },
    ],
    2: [
        { text: "La periodicidad perfecta prohíbe el paso de la luz (Bandgap). Si eliminas una fila de pilares, la luz se verá obligada a viajar por ese canal.", cost: 10 },
        { text: "Hacé clic en los pilares para borrarlos. Trazá un camino en forma de 'L' desde el láser hasta el sensor. ¡No temas a las curvas agudas, el cristal la guiará!", cost: 20 },
    ],
    3: [
        { text: "La lente de cristal curva la luz porque es más gruesa en el centro. Imitá eso variando el diámetro de los nanopilares.", cost: 10 },
        { text: "Hacé que el pilar del centro tenga el grosor máximo, y reducí el grosor simétricamente hacia los bordes. Esto creará el gradiente de fase necesario.", cost: 20 },
    ],
    4: [
        { text: "Purcell descubrió que un átomo emite fotones más rápido si lo estrangulás espacialmente. Bajá el Volumen Modal (V) al mínimo.", cost: 10 },
        { text: "Una vez estrangulado (V mínimo), subí el factor de Calidad (Q) para crear una resonancia perfecta, pero si lo subís demasiado sin achicar V, el fotón rebotará sin salir.", cost: 20 },
    ],
};

const STAGE_TITLES = [
    'El Centinela de Sangre',
    'El Arquitecto de Fotones',
    'El Manto Invisible',
    'Operación Fénix',
];

const STAGE_ICONS = ['🔬', '💎', '🫥', '🔥'];

const CHARACTERS = {
    feynman: { name: 'Dr. Feynman', icon: '👨‍🔬', color: '#00f0ff' },
    nano9: { name: 'NANO-9', icon: '🤖', color: '#39ff14' },
    capitan: { name: 'Cpt. Ávalon', icon: '🧑‍🚀', color: '#ffd700' },
};

interface DialogLine {
    character: keyof typeof CHARACTERS;
    text: string;
}

const STAGE_INTROS: Record<number, DialogLine[]> = {
    1: [
        { character: 'capitan', text: "Atención, Agente. Detectamos una variante viral indetectable por métodos convencionales. Es invisible a todo escáner estándar." },
        { character: 'feynman', text: "Usaremos Resonancia Plasmónica de Superficie Localizada (LSPR). Las nanopartículas de oro concentran la luz en puntos minúsculos — los Hot Spots — amplificando la señal Raman de la proteína viral." },
        { character: 'nano9', text: "PROTOCOLO: Colocá nanopartículas de Au en el sustrato. Dos triángulos enfrentados (Bowtie) crean el campo más intenso. Posicioná la proteína en el Gap para amplificar su señal." },
    ],
    2: [
        { character: 'capitan', text: "Análisis in-situ del agua de red. Guía el láser de prueba por el chip nanofluídico doblándolo a 90° sin perder intensidad de luz." },
        { character: 'feynman', text: "Estamos usando un Cristal Fotónico 2D de pilares de silicio. Su periodicidad crea un Bandgap que bloquea totalmente nuestra luz láser." },
        { character: 'nano9', text: "PROTOCOLO: Hacé clic para eliminar pilares y crear 'defectos'. La luz fluirá a través del canal de pilares eliminados." },
    ],
    3: [
        { character: 'capitan', text: "Sin energía en la base. Usa la óptica plana para crear una Metasuperficie (Metalente) que enfoque la luz solar en el nano-receptor termoeléctrico." },
        { character: 'feynman', text: "Las metalentes usan arreglos de nanoestructuras para retrasar la fase de la luz. Ajustando el diámetro de cada pilar, controlamos hacia dónde se curva el rayo." },
        { character: 'nano9', text: "PROTOCOLO: Ajustá los diámetros para crear un perfil de fase hiperbólico (mayor retraso en el centro). Concentrá toda la luz en el receptor." },
    ],
    4: [
        { character: 'capitan', text: "Hay que transmitir los datos de la cura por encriptación cuántica. Maximiza la Tasa de Emisión Espontánea de nuestro Punto Cuántico para disparar fotones individuales." },
        { character: 'feynman', text: "Para acelerar la emisión, usaremos el Efecto Purcell. Un átomo dentro de una cavidad resonante emite luz mucho más rápido si ajustás la cavidad." },
        { character: 'nano9', text: "PROTOCOLO: Reducí el Volumen Modal (V) para confinar el átomo, y aumentá el Factor de Calidad (Q). ¡Cuidado con el régimen de acoplamiento fuerte!" },
    ],
};

const VICTORY_DIALOGS: Record<number, DialogLine[]> = {
    1: [
        { character: 'feynman', text: "¡Señal Raman amplificada 10,000x! La proteína viral es claramente visible. La plasmónica es pura magia de la nanofotónica." },
        { character: 'nano9', text: "ANÁLISIS COMPLETO: Proteína spike-X identificada. Frecuencia de resonancia registrada. Pasando datos al módulo de filtrado." },
    ],
    2: [
        { character: 'feynman', text: "¡Guía de onda perfecta! Doblamos la luz 90 grados sin pérdidas. El análisis toxicológico del agua está completo." },
        { character: 'nano9', text: "ANÁLISIS: Trazas virales encontradas en la red de distribución. Procediendo a aislar el perímetro." },
    ],
    3: [
        { character: 'feynman', text: "¡Metalente calibrada! Hemos logrado enfocar todos los rayos perfectamente usando óptica plana. Eficiencia térmica al máximo." },
        { character: 'nano9', text: "SISTEMA: Energía restaurada en un 100%. Sistemas de soporte vital en línea. Iniciando Protocolo Fénix." },
    ],
    4: [
        { character: 'feynman', text: "¡Efecto Purcell extremo! El emisor está disparando fotones individuales a un ritmo de picosegundos." },
        { character: 'nano9', text: "ENCRIPTACIÓN CUÁNTICA: Completada. Los datos de la cura se han transmitido a la flota global con seguridad inquebrantable." },
        { character: 'capitan', text: "El mundo entero está recibiendo la cura. Hemos salvado a millones gracias a la nanotecnología. ¡Proyecto Ávalon completado con éxito!" },
    ],
};

export default function ProyectoAvalon() {
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
            setSaving(true);
            setSaveError('');
            if (session) {
                try {
                    const finalXP = totalXpEarned + victoryXP;
                    const totalScore = Math.min(100, Math.round(finalXP / 3.2));
                    const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
                    const totalHints = Object.values(hintsRevealed).reduce((sum, arr) => sum + arr.length, 0);

                    const res = await fetch('/api/progress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            challengeId: 'avalon',
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
        const grade = finalXP >= 350 ? 'S' : finalXP >= 280 ? 'A' : finalXP >= 220 ? 'B' : 'C';
        const gradeColors: Record<string, string> = { S: '#ffd700', A: '#39ff14', B: '#00f0ff', C: '#ff8800' };

        return (
            <div className="ava-container">
                <div className="ava-crt">
                    <div className="ava-completed-screen">
                        <div className="ava-fireworks">
                            {Array.from({ length: 25 }).map((_, i) => (
                                <div key={i} className="ava-firework-particle" style={{
                                    '--delay': `${Math.random() * 3}s`,
                                    '--x': `${Math.random() * 100}%`,
                                    '--y': `${Math.random() * 100}%`,
                                    '--color': ['#00f0ff', '#39ff14', '#ffd700', '#ff3366', '#c8b4ff', '#ff8800'][Math.floor(Math.random() * 6)],
                                    '--size': `${3 + Math.random() * 5}px`,
                                } as React.CSSProperties} />
                            ))}
                        </div>

                        <div className="ava-badge-container">
                            <div className="ava-badge-glow" />
                            <div className="ava-badge">
                                <span className="ava-badge-icon">🧬</span>
                                <span className="ava-badge-text">REDENTOR NANOFOTÓNICO</span>
                            </div>
                        </div>

                        <h1 className="ava-completed-title ava-blink-slow">
                            ★ MISIÓN COMPLETADA ★
                        </h1>
                        <div className="ava-completed-subtitle">PROYECTO ÁVALON — LA HUMANIDAD ESTÁ A SALVO</div>

                        <div className="ava-outro-narrative">
                            <div className="ava-dialog-box" style={{ borderColor: CHARACTERS.feynman.color }}>
                                <span className="ava-dialog-icon">{CHARACTERS.feynman.icon}</span>
                                <div className="ava-dialog-content">
                                    <span className="ava-dialog-name" style={{ color: CHARACTERS.feynman.color }}>{CHARACTERS.feynman.name}</span>
                                    <p className="ava-dialog-text">Desde la plasmónica hasta la terapia fototérmica, cada herramienta de la nanofotónica fue clave para salvar vidas. ¡Sos un verdadero Redentor Nanofotónico!</p>
                                </div>
                            </div>
                        </div>

                        <div className="ava-grade-display">
                            <div className="ava-grade-label">CLASIFICACIÓN</div>
                            <div className="ava-grade-value" style={{ color: gradeColors[grade], textShadow: `0 0 25px ${gradeColors[grade]}` }}>{grade}</div>
                        </div>

                        <div className="ava-final-score">
                            <div className="ava-final-score-label">SCORE FINAL</div>
                            <div className="ava-final-score-value">{finalXP} XP</div>
                        </div>

                        <div className="ava-completed-stages">
                            {STAGE_TITLES.map((title, i) => (
                                <div key={i} className="ava-completed-stage-item">
                                    <span className="ava-completed-stage-icon">{STAGE_ICONS[i]}</span>
                                    <span className="ava-completed-stage-name">STAGE {i + 1}: {title}</span>
                                    <span className="ava-completed-xp">+{stageXPs[i] || 0} XP</span>
                                    <span className="ava-completed-check">✓</span>
                                </div>
                            ))}
                        </div>

                        <div className="ava-final-stats">
                            <div className="ava-final-stat">
                                <span className="ava-final-stat-label">TIEMPO</span>
                                <span className="ava-final-stat-value">{Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}</span>
                            </div>
                            <div className="ava-final-stat">
                                <span className="ava-final-stat-label">PISTAS</span>
                                <span className="ava-final-stat-value">{totalHints}</span>
                            </div>
                            <div className="ava-final-stat">
                                <span className="ava-final-stat-label">XP INICIAL</span>
                                <span className="ava-final-stat-value">100</span>
                            </div>
                        </div>

                        {saving && <div className="ava-save-status">💾 GUARDANDO PROGRESO...</div>}
                        {saveError && <div className="ava-save-status ava-save-error">⚠ {saveError}</div>}
                        {!saving && !saveError && <div className="ava-save-status ava-save-ok">✓ PROGRESO GUARDADO EN TU PERFIL</div>}

                        <button className="ava-btn-holo ava-blink-slow" onClick={handleRestart}>
                            ▶ JUGAR DE NUEVO
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ava-container">
            <div className="ava-crt">
                {/* HUD Header */}
                <div className="ava-hud">
                    <div className="ava-hud-title">PROYECTO ÁVALON</div>
                    <div className="ava-hud-stats">
                        <div className="ava-hud-stat">
                            <span className="ava-hud-label">STAGE</span>
                            <span className="ava-hud-value">{currentStage}/4</span>
                        </div>
                        <div className="ava-hud-divider">│</div>
                        <div className="ava-hud-stat">
                            <span className="ava-hud-label">XP</span>
                            <span className="ava-hud-value ava-xp-glow">{xp}</span>
                        </div>
                    </div>
                </div>

                {/* Stage Title Bar */}
                <div className="ava-stage-bar">
                    <span className="ava-stage-icon">{STAGE_ICONS[currentStage - 1]}</span>
                    <span className="ava-stage-name">STAGE {currentStage}: {STAGE_TITLES[currentStage - 1]}</span>
                    {!showIntro && (
                        <button className="ava-hint-btn" onClick={() => setShowHintMenu(!showHintMenu)}>
                            ? BASE DE DATOS
                        </button>
                    )}
                </div>

                {/* Intro Briefing */}
                {showIntro && (
                    <div className="ava-intro-panel">
                        <div className="ava-intro-title">BRIEFING — STAGE {currentStage}</div>
                        {introLines.slice(0, introLine + 1).map((line, idx) => {
                            const char = CHARACTERS[line.character];
                            return (
                                <div key={idx} className="ava-dialog-box" style={{ borderColor: char.color, animationDelay: `${idx * 0.2}s` }}>
                                    <span className="ava-dialog-icon">{char.icon}</span>
                                    <div className="ava-dialog-content">
                                        <span className="ava-dialog-name" style={{ color: char.color }}>{char.name}</span>
                                        <p className="ava-dialog-text">{line.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                        <button className="ava-btn-holo" onClick={handleNextIntroLine} style={{ marginTop: '12px', alignSelf: 'center' }}>
                            {introLine < introLines.length - 1 ? '▶ SIGUIENTE' : '🎮 ¡INICIAR STAGE!'}
                        </button>
                    </div>
                )}

                {/* Hint Menu */}
                {showHintMenu && !showIntro && (
                    <div className="ava-hint-menu">
                        <div className="ava-hint-menu-title">BASE DE DATOS — SISTEMA DE PISTAS</div>
                        {stageHints.map((hint, idx) => {
                            const isRevealed = revealedForStage.includes(idx);
                            const canAfford = xp >= hint.cost;
                            return (
                                <div key={idx} className="ava-hint-item">
                                    <div className="ava-hint-header">
                                        <span>PISTA {idx + 1}</span>
                                        <span className="ava-hint-cost">{isRevealed ? '✓ REVELADA' : `−${hint.cost} XP`}</span>
                                    </div>
                                    {isRevealed ? (
                                        <div className="ava-hint-text">{hint.text}</div>
                                    ) : (
                                        <button
                                            className={`ava-btn-hint-buy ${!canAfford ? 'ava-btn-disabled' : ''}`}
                                            onClick={() => handleBuyHint(idx)}
                                            disabled={!canAfford}
                                        >
                                            {canAfford ? '💡 COMPRAR PISTA' : '❌ XP INSUFICIENTE'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        <button className="ava-btn-close-hints" onClick={() => setShowHintMenu(false)}>CERRAR ✕</button>
                    </div>
                )}

                {/* Stage Content */}
                {!showIntro && (
                    <div className="ava-stage-content">
                        {currentStage === 1 && <AvalonStage1 onWin={handleStageWin} />}
                        {currentStage === 2 && <AvalonStage2 onWin={handleStageWin} />}
                        {currentStage === 3 && <AvalonStage3 onWin={handleStageWin} />}
                        {currentStage === 4 && <AvalonStage4 onWin={handleStageWin} />}
                    </div>
                )}

                {/* Victory Modal */}
                {showVictoryModal && (
                    <div className="ava-modal-overlay">
                        <div className="ava-modal">
                            <div className="ava-modal-stars">★ ★ ★</div>
                            <h2 className="ava-modal-title">SISTEMA DESBLOQUEADO</h2>
                            <div className="ava-modal-subtitle">STAGE {currentStage} COMPLETADO</div>

                            <div className="ava-victory-dialog">
                                {victoryLines.slice(0, dialogLine + 1).map((line, idx) => {
                                    const char = CHARACTERS[line.character];
                                    return (
                                        <div key={idx} className="ava-dialog-box ava-dialog-box-small" style={{ borderColor: char.color }}>
                                            <span className="ava-dialog-icon">{char.icon}</span>
                                            <div className="ava-dialog-content">
                                                <span className="ava-dialog-name" style={{ color: char.color }}>{char.name}</span>
                                                <p className="ava-dialog-text">{line.text}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {dialogLine < victoryLines.length - 1 && (
                                    <button className="ava-btn-dialog-next" onClick={handleNextDialogLine}>▶ SIGUIENTE</button>
                                )}
                            </div>

                            <div className="ava-modal-xp">
                                <span className="ava-modal-xp-label">XP GANADOS</span>
                                <span className="ava-modal-xp-value">+{victoryXP}</span>
                            </div>

                            {dialogLine >= victoryLines.length - 1 && (
                                <button className="ava-btn-holo ava-blink-slow" onClick={handleNextStage}>
                                    {currentStage >= 4 ? '🏆 VER RESULTADOS FINALES' : '▶ AVANZAR'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
