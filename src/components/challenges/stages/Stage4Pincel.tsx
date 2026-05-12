'use client';

import { useRef, useEffect, useState } from 'react';

interface Stage4Props {
    onWin: (xp: number) => void;
}

const H_PLANCK = 6.626e-34;
const ELECTRON_MASS = 9.109e-31;
const EV_TO_J = 1.602e-19;
const C = 3e8;

// Semiconductor materials with different effective masses
const QD_MATERIALS = [
    { name: 'CdSe', effectiveMass: 0.13, color: '#ff8800' },
    { name: 'InP', effectiveMass: 0.077, color: '#00cc88' },
    { name: 'PbS', effectiveMass: 0.085, color: '#8866cc' },
    { name: 'ZnO', effectiveMass: 0.24, color: '#cccccc' },
];

function energyLevel(n: number, L_nm: number, mEff: number): number {
    const L = L_nm * 1e-9;
    const m = mEff * ELECTRON_MASS;
    const E = (n * n * H_PLANCK * H_PLANCK) / (8 * m * L * L);
    return E / EV_TO_J;
}

function energyToWavelength(deltaE_eV: number): number {
    if (deltaE_eV <= 0) return 10000;
    const E_J = deltaE_eV * EV_TO_J;
    const lambda = (H_PLANCK * C) / E_J;
    return lambda * 1e9;
}

function wavelengthToColor(nm: number): string {
    if (nm < 380) return '#8800ff';
    if (nm < 420) return '#4400cc';
    if (nm < 450) return '#0000ff';
    if (nm < 495) return '#00ccff';
    if (nm < 520) return '#00ff44';
    if (nm < 565) return '#88ff00';
    if (nm < 590) return '#ffff00';
    if (nm < 625) return '#ff8800';
    if (nm < 700) return '#ff0000';
    return '#880000';
}

function wavelengthToName(nm: number): string {
    if (nm < 380) return 'ULTRAVIOLETA';
    if (nm < 450) return 'VIOLETA';
    if (nm < 495) return 'AZUL';
    if (nm < 565) return 'VERDE';
    if (nm < 590) return 'AMARILLO';
    if (nm < 625) return 'NARANJA';
    if (nm < 700) return 'ROJO';
    return 'INFRARROJO';
}

const BLUE_MIN = 440;
const BLUE_MAX = 500;

export default function Stage4Pincel({ onWin }: Stage4Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dotSize, setDotSize] = useState(8);
    const [materialIndex, setMaterialIndex] = useState(0);
    const [won, setWon] = useState(false);
    const [stableTime, setStableTime] = useState(0);
    const stableTimerRef = useRef(0);
    const animRef = useRef<number>(0);

    const material = QD_MATERIALS[materialIndex];
    const E1 = energyLevel(1, dotSize, material.effectiveMass);
    const E2 = energyLevel(2, dotSize, material.effectiveMass);
    const E3 = energyLevel(3, dotSize, material.effectiveMass);
    const deltaE = E2 - E1;
    const emittedWavelength = energyToWavelength(deltaE);
    const emittedColor = wavelengthToColor(emittedWavelength);
    const colorName = wavelengthToName(emittedWavelength);
    const isBlue = emittedWavelength >= BLUE_MIN && emittedWavelength <= BLUE_MAX;

    // Stable timer
    useEffect(() => {
        if (won) return;
        const interval = setInterval(() => {
            if (isBlue) {
                stableTimerRef.current += 0.1;
                setStableTime(stableTimerRef.current);
                if (stableTimerRef.current >= 3) {
                    setWon(true);
                    onWin(80);
                }
            } else {
                stableTimerRef.current = Math.max(0, stableTimerRef.current - 0.2);
                setStableTime(stableTimerRef.current);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [isBlue, won, onWin]);

    // Canvas drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        let frame = 0;

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, W, H);

            // === LEFT: Potential Well with energy levels ===
            const wellX = 60;
            const wellW = 220;
            const wellTop = 40;
            const wellBottom = H - 50;
            const wellH = wellBottom - wellTop;

            // Well walls
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#8b5cf6';
            ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.moveTo(wellX, wellTop - 10); ctx.lineTo(wellX, wellBottom); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(wellX, wellBottom); ctx.lineTo(wellX + wellW, wellBottom); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(wellX + wellW, wellBottom); ctx.lineTo(wellX + wellW, wellTop - 10); ctx.stroke();
            ctx.shadowBlur = 0;

            // Inside fill
            ctx.fillStyle = 'rgba(139, 92, 246, 0.03)';
            ctx.fillRect(wellX, wellTop, wellW, wellH);

            // Energy levels (E1, E2, E3) — ANIMATED, positions change with dotSize and material
            const maxE = E3 * 1.2; // Scale based on actual E3
            const eScale = maxE > 0 ? (wellH - 30) / maxE : 1;

            for (let n = 1; n <= 3; n++) {
                const E = energyLevel(n, dotSize, material.effectiveMass);
                const levelY = wellBottom - E * eScale - 10;

                // Clamp to visible range
                const clampedY = Math.max(wellTop + 5, Math.min(wellBottom - 5, levelY));

                const isActive = n <= 2;
                ctx.strokeStyle = isActive ? '#00f0ff' : 'rgba(255,255,255,0.15)';
                ctx.lineWidth = isActive ? 2 : 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(wellX + 5, clampedY);
                ctx.lineTo(wellX + wellW - 5, clampedY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Label
                ctx.font = '8px "Press Start 2P", monospace';
                ctx.fillStyle = isActive ? '#00f0ff' : '#444';
                ctx.textAlign = 'right';
                ctx.fillText(`E${n}`, wellX - 8, clampedY + 4);
                ctx.textAlign = 'left';
                ctx.fillText(`${E.toFixed(2)}eV`, wellX + wellW + 8, clampedY + 4);

                // Wavefunction
                if (isActive) {
                    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    for (let px = 0; px <= wellW; px++) {
                        const xRatio = px / wellW;
                        const psi = Math.sin(n * Math.PI * xRatio);
                        const drawY = clampedY - psi * 15;
                        if (px === 0) ctx.moveTo(wellX + px, drawY);
                        else ctx.lineTo(wellX + px, drawY);
                    }
                    ctx.stroke();
                }
            }

            // Transition arrow E2 → E1
            const e1Y = Math.max(wellTop + 5, Math.min(wellBottom - 5, wellBottom - E1 * eScale - 10));
            const e2Y = Math.max(wellTop + 5, Math.min(wellBottom - 5, wellBottom - E2 * eScale - 10));

            ctx.strokeStyle = emittedColor;
            ctx.lineWidth = 3;
            ctx.shadowColor = emittedColor;
            ctx.shadowBlur = 10;
            const arrowX = wellX + wellW / 2;
            ctx.beginPath();
            ctx.moveTo(arrowX, e2Y);
            ctx.lineTo(arrowX, e1Y);
            ctx.stroke();
            // Arrow head
            ctx.fillStyle = emittedColor;
            ctx.beginPath();
            ctx.moveTo(arrowX, e1Y);
            ctx.lineTo(arrowX - 5, e1Y - 8);
            ctx.lineTo(arrowX + 5, e1Y - 8);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Wavy photon
            ctx.strokeStyle = emittedColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const photonStartX = arrowX + 15;
            const photonY = (e1Y + e2Y) / 2;
            for (let i = 0; i < 30; i++) {
                const px = photonStartX + i * 3;
                const py = photonY + Math.sin(i * 0.6 + frame * 0.1) * 6;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Well width label
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText(`L=${dotSize.toFixed(1)}nm`, wellX + wellW / 2, wellBottom + 18);
            ctx.fillText(`ΔE=${deltaE.toFixed(2)}eV`, wellX + wellW / 2, wellBottom + 32);

            // Material label
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillStyle = material.color;
            ctx.fillText(`${material.name} (m*=${material.effectiveMass}mₑ)`, wellX + wellW / 2, wellTop - 5);

            // === RIGHT: Medicine Flask ===
            const flaskX = W - 180;
            const flaskY = H / 2 - 60;

            // Flask body
            ctx.fillStyle = 'rgba(30, 30, 50, 0.8)';
            ctx.beginPath();
            ctx.moveTo(flaskX, flaskY);
            ctx.lineTo(flaskX - 30, flaskY + 100);
            ctx.lineTo(flaskX - 30, flaskY + 130);
            ctx.lineTo(flaskX + 80, flaskY + 130);
            ctx.lineTo(flaskX + 80, flaskY + 100);
            ctx.lineTo(flaskX + 50, flaskY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#556';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Liquid
            const liquidLevel = flaskY + 60;
            ctx.fillStyle = emittedColor;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(flaskX - 18, liquidLevel);
            ctx.lineTo(flaskX - 28, flaskY + 128);
            ctx.lineTo(flaskX + 78, flaskY + 128);
            ctx.lineTo(flaskX + 68, liquidLevel);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;

            // Glow
            const glowIntensity = 0.15 + Math.sin(frame * 0.05) * 0.08;
            ctx.shadowColor = emittedColor;
            ctx.shadowBlur = 25;
            ctx.fillStyle = emittedColor;
            ctx.globalAlpha = glowIntensity;
            ctx.beginPath();
            ctx.arc(flaskX + 25, flaskY + 95, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Photons
            for (let p = 0; p < 6; p++) {
                const angle = (frame * 0.03 + p * (Math.PI * 2 / 6));
                const dist = 40 + Math.sin(frame * 0.05 + p) * 15;
                const px = flaskX + 25 + Math.cos(angle) * dist;
                const py = flaskY + 95 + Math.sin(angle) * dist;
                const alpha = 0.5 + Math.sin(frame * 0.1 + p * 2) * 0.3;
                ctx.fillStyle = emittedColor;
                ctx.globalAlpha = alpha;
                ctx.fillRect(px - 2, py - 2, 4, 4);
                ctx.globalAlpha = 1;
            }

            // Flask labels
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = emittedColor;
            ctx.textAlign = 'center';
            ctx.shadowColor = emittedColor;
            ctx.shadowBlur = 8;
            ctx.fillText(colorName, flaskX + 25, flaskY + 155);
            ctx.shadowBlur = 0;

            // Target
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = '#3366ff';
            ctx.fillText('🎯 TARGET: AZUL', flaskX + 25, flaskY - 20);
            ctx.fillText(`(${BLUE_MIN}-${BLUE_MAX} nm)`, flaskX + 25, flaskY - 8);

            // Wavelength display
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillStyle = emittedColor;
            ctx.textAlign = 'center';
            ctx.shadowColor = emittedColor;
            ctx.shadowBlur = 8;
            ctx.fillText(`λ = ${emittedWavelength.toFixed(0)} nm`, W / 2, 25);
            ctx.shadowBlur = 0;

            frame++;
            animRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animRef.current);
    }, [dotSize, materialIndex, deltaE, E1, E2, E3, emittedWavelength, emittedColor, colorName, material]);

    // Feedback
    let feedbackClass = 'sqo-feedback-info';
    let feedbackMsg = `Material: ${material.name}. Emisión ${colorName} (λ=${emittedWavelength.toFixed(0)}nm). Ajustá L y material.`;
    if (isBlue) {
        feedbackClass = 'sqo-feedback-success';
        feedbackMsg = `¡Emisión AZUL! λ=${emittedWavelength.toFixed(0)}nm. Estabilizando biomarcador...`;
    } else if (emittedWavelength > 600) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = `Emisión ${colorName} (${emittedWavelength.toFixed(0)}nm). QD muy grande o m* muy alta. Achicá L o cambiá material.`;
    } else if (emittedWavelength < 440) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = `Emisión ${colorName} (${emittedWavelength.toFixed(0)}nm). Pasaste de azul. Agrandá L o probá otro material.`;
    }

    return (
        <div className="sqo-game-area">
            <div className="sqo-canvas-wrapper">
                <canvas ref={canvasRef} width={700} height={350} className="sqo-canvas" />
            </div>

            {/* Blue timer */}
            {isBlue && !won && (
                <div className="sqo-sweet-spot-timer">
                    <span className="sqo-sweet-spot-label">ESTABILIZANDO AZUL...</span>
                    <div className="sqo-sweet-spot-bar">
                        <div className="sqo-sweet-spot-fill" style={{
                            width: `${(stableTime / 3) * 100}%`,
                            background: 'linear-gradient(90deg, #0044ff, #00ccff)',
                            boxShadow: '0 0 8px rgba(0, 100, 255, 0.5)',
                        }} />
                    </div>
                    <span className="sqo-bar-value">{stableTime.toFixed(1)}/3s</span>
                </div>
            )}

            <div className="sqo-status-row">
                <div className="sqo-status-item">
                    <span className="sqo-status-label">EMISIÓN</span>
                    <div className="sqo-bar-container">
                        <div className="sqo-bar-fill" style={{
                            width: `${Math.min(100, Math.max(5, ((780 - emittedWavelength) / 400) * 100))}%`,
                            background: `linear-gradient(90deg, ${emittedColor}, ${emittedColor}88)`,
                            boxShadow: `0 0 8px ${emittedColor}`,
                        }} />
                    </div>
                    <span className="sqo-bar-value" style={{ color: emittedColor }}>{emittedWavelength.toFixed(0)}nm</span>
                </div>
                <div className="sqo-status-item">
                    <span className="sqo-status-label">ΔE</span>
                    <div className="sqo-bar-container">
                        <div className="sqo-bar-fill sqo-bar-blue" style={{ width: `${Math.min(100, deltaE * 10)}%` }} />
                    </div>
                    <span className="sqo-bar-value">{deltaE.toFixed(1)}eV</span>
                </div>
            </div>

            <div className={`sqo-feedback ${feedbackClass}`}>{feedbackMsg}</div>

            <div className="sqo-controls">
                {/* Material Selector */}
                <div className="sqo-control-row">
                    <span className="sqo-control-label">MATERIAL QD</span>
                    <div className="sqo-knob-group">
                        {QD_MATERIALS.map((mat, idx) => (
                            <button
                                key={idx}
                                className={`sqo-knob-btn ${idx === materialIndex ? 'sqo-knob-active' : ''}`}
                                onClick={() => { if (!won) setMaterialIndex(idx); }}
                                style={{ '--knob-color': mat.color } as React.CSSProperties}
                                disabled={won}
                            >
                                <span className="sqo-knob-label">{mat.name}</span>
                                <span className="sqo-knob-val">m*={mat.effectiveMass}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="sqo-control-row">
                    <span className="sqo-control-label">TAMAÑO QD (L)</span>
                    <div className="sqo-slider-container">
                        <input type="range" min="1" max="10" step="0.1" value={dotSize}
                            onChange={e => { if (!won) setDotSize(Number(e.target.value)); }}
                            className="sqo-slider" disabled={won} />
                        <div className="sqo-slider-labels"><span>1 nm</span><span>5 nm</span><span>10 nm</span></div>
                    </div>
                    <span className="sqo-control-value">{dotSize.toFixed(1)} nm</span>
                </div>
                <div className="sqo-control-row" style={{ justifyContent: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '7px', color: '#666' }}>Eₙ = n²h²/(8m*L²)</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>Schrödinger (Pozo Infinito)</span>
                    <span style={{ fontSize: '7px', color: material.color }}>{material.name} QD</span>
                </div>
            </div>
        </div>
    );
}
