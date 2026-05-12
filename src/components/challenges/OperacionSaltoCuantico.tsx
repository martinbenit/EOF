'use client';

import { useState, useCallback } from 'react';
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
        { text: "Recordá a Einstein: un fotón azul tiene más energía (billete grande) que uno rojo (billete chico). Cambiá el color.", cost: 20 },
    ],
    2: [
        { text: "Si usás la materia como onda, tenés que hacer que su longitud sea más chiquita que el virus.", cost: 10 },
        { text: "De Broglie dijo que λ es inversamente proporcional a la velocidad. ¡Dale máxima potencia al acelerador!", cost: 20 },
    ],
    3: [
        { text: "No podés acorralar a una partícula sin alterar su velocidad. Buscá el equilibrio.", cost: 10 },
        { text: "Si Δx es casi cero, la energía de punto cero (Δp) destruye la jaula. Dejala respirar un poco en un tamaño intermedio.", cost: 20 },
    ],
    4: [
        { text: "No hace falta cambiar el químico. En nanotecnología, el tamaño define la energía.", cost: 10 },
        { text: "Para sacar un fotón azul (mucha energía), la diferencia entre los escalones debe ser enorme. Apretá las paredes al máximo.", cost: 20 },
    ],
};

const STAGE_TITLES = [
    'S.O.S. en el Vacío',
    'El Ojo del Huracán',
    'La Jaula de Cristal',
    'El Pincel Nanométrico',
];

const STAGE_ICONS = ['🚀', '🌍', '⚡', '🧬'];

const VICTORY_MESSAGES = [
    '¡Satélite reiniciado! Detectando contaminante atmosférico...',
    '¡Imagen capturada en HD cuántico! La toxina es inestable.',
    '¡Toxina estabilizada! Se requieren biomarcadores para la cura.',
    '¡Biomarcador Azul forjado! La humanidad está a salvo.',
];

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

    const handleStageWin = useCallback((earnedXP: number) => {
        setVictoryXP(earnedXP);
        setXp(prev => prev + earnedXP);
        setTotalXpEarned(prev => prev + earnedXP);
        setShowVictoryModal(true);
    }, []);

    const handleNextStage = useCallback(async () => {
        setShowVictoryModal(false);
        if (currentStage >= 4) {
            setGameCompleted(true);
            // Save progress to DB
            if (session) {
                try {
                    const totalScore = Math.min(100, Math.round((totalXpEarned + victoryXP) / 5));
                    await fetch('/api/progress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            challengeId: 'salto-cuantico',
                            score: totalScore,
                            xpEarned: totalXpEarned + victoryXP,
                            timeSeconds: 0,
                            hintsUsed: Object.values(hintsRevealed).reduce((sum, arr) => sum + arr.length, 0)
                        })
                    });
                    refreshProfile();
                } catch (err) {
                    console.error('Failed to save progress:', err);
                }
            }
        } else {
            setCurrentStage(prev => prev + 1);
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
    }, []);

    const revealedForStage = hintsRevealed[currentStage] || [];
    const stageHints = STAGE_HINTS[currentStage] || [];

    // Game Completed Screen
    if (gameCompleted) {
        return (
            <div className="sqo-container">
                <div className="sqo-crt">
                    <div className="sqo-completed-screen">
                        <div className="sqo-fireworks">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <div key={i} className="sqo-firework-particle" style={{
                                    '--delay': `${Math.random() * 3}s`,
                                    '--x': `${Math.random() * 100}%`,
                                    '--y': `${Math.random() * 100}%`,
                                    '--color': ['#ff0', '#0ff', '#f0f', '#0f0', '#f00', '#00f'][Math.floor(Math.random() * 6)],
                                    '--size': `${4 + Math.random() * 6}px`,
                                } as React.CSSProperties} />
                            ))}
                        </div>
                        <h1 className="sqo-completed-title sqo-blink">
                            ★ JUEGO COMPLETADO ★
                        </h1>
                        <div className="sqo-completed-subtitle">OPERACIÓN SALTO CUÁNTICO</div>
                        <div className="sqo-final-score">
                            <div className="sqo-final-score-label">SCORE FINAL</div>
                            <div className="sqo-final-score-value">{xp} XP</div>
                        </div>
                        <div className="sqo-completed-stages">
                            {STAGE_TITLES.map((title, i) => (
                                <div key={i} className="sqo-completed-stage-item">
                                    <span className="sqo-completed-stage-icon">{STAGE_ICONS[i]}</span>
                                    <span className="sqo-completed-stage-name">STAGE {i + 1}: {title}</span>
                                    <span className="sqo-completed-check">✓</span>
                                </div>
                            ))}
                        </div>
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
                    <div className="sqo-hud-title">
                        OPERACIÓN SALTO CUÁNTICO
                    </div>
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
                    <button
                        className="sqo-hint-btn"
                        onClick={() => setShowHintMenu(!showHintMenu)}
                    >
                        ? PISTA
                    </button>
                </div>

                {/* Hint Menu */}
                {showHintMenu && (
                    <div className="sqo-hint-menu">
                        <div className="sqo-hint-menu-title">SISTEMA DE PISTAS</div>
                        {stageHints.map((hint, idx) => {
                            const isRevealed = revealedForStage.includes(idx);
                            const canAfford = xp >= hint.cost;
                            return (
                                <div key={idx} className="sqo-hint-item">
                                    <div className="sqo-hint-header">
                                        <span>PISTA {idx + 1}</span>
                                        <span className="sqo-hint-cost">
                                            {isRevealed ? '✓ REVELADA' : `−${hint.cost} XP`}
                                        </span>
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
                        <button className="sqo-btn-close-hints" onClick={() => setShowHintMenu(false)}>
                            CERRAR ✕
                        </button>
                    </div>
                )}

                {/* Stage Content */}
                <div className="sqo-stage-content">
                    {currentStage === 1 && <Stage1SOS onWin={handleStageWin} />}
                    {currentStage === 2 && <Stage2Huracan onWin={handleStageWin} />}
                    {currentStage === 3 && <Stage3Jaula onWin={handleStageWin} />}
                    {currentStage === 4 && <Stage4Pincel onWin={handleStageWin} />}
                </div>

                {/* Victory Modal */}
                {showVictoryModal && (
                    <div className="sqo-modal-overlay">
                        <div className="sqo-modal">
                            <div className="sqo-modal-stars">★ ★ ★</div>
                            <h2 className="sqo-modal-title">¡STAGE {currentStage} COMPLETADO!</h2>
                            <p className="sqo-modal-message">{VICTORY_MESSAGES[currentStage - 1]}</p>
                            <div className="sqo-modal-xp">
                                <span className="sqo-modal-xp-label">XP GANADOS</span>
                                <span className="sqo-modal-xp-value">+{victoryXP}</span>
                            </div>
                            <button className="sqo-btn-retro sqo-blink-slow" onClick={handleNextStage}>
                                {currentStage >= 4 ? '🏆 VER PUNTUACIÓN FINAL' : '▶ PASAR AL SIGUIENTE NIVEL'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
