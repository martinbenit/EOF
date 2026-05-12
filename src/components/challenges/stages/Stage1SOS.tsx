'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface Stage1Props {
    onWin: (xp: number) => void;
}

// Physics constants
const PLANCK = 6.626e-34;
const EV_TO_J = 1.602e-19;
const C = 3e8;

// Panel materials with different work functions
const PANEL_MATERIALS = [
    { name: 'CESIO', workFunction: 2.1, color: '#cc8800' },
    { name: 'SODIO', workFunction: 2.3, color: '#bbbbbb' },
    { name: 'ZINC', workFunction: 4.3, color: '#6688aa' },
    { name: 'PLATINO', workFunction: 5.6, color: '#aaaacc' },
];

function sliderToFrequency(val: number): { frequency: number; wavelength: number; energy: number; colorName: string; rgb: string } {
    const freqTHz = 400 + (val / 100) * 500;
    const freqHz = freqTHz * 1e12;
    const wavelengthNm = (C / freqHz) * 1e9;
    const energyJ = PLANCK * freqHz;
    const energyEV = energyJ / EV_TO_J;

    let colorName = '';
    let rgb = '';
    if (wavelengthNm > 620) { colorName = 'ROJO'; rgb = '#ff2200'; }
    else if (wavelengthNm > 590) { colorName = 'NARANJA'; rgb = '#ff8800'; }
    else if (wavelengthNm > 570) { colorName = 'AMARILLO'; rgb = '#ffdd00'; }
    else if (wavelengthNm > 495) { colorName = 'VERDE'; rgb = '#00cc44'; }
    else if (wavelengthNm > 450) { colorName = 'AZUL'; rgb = '#0044ff'; }
    else if (wavelengthNm > 380) { colorName = 'VIOLETA'; rgb = '#8800ff'; }
    else { colorName = 'UV'; rgb = '#cc00ff'; }

    return { frequency: freqTHz, wavelength: wavelengthNm, energy: energyEV, colorName, rgb };
}

export default function Stage1SOS({ onWin }: Stage1Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [intensity, setIntensity] = useState(50);
    const [colorSlider, setColorSlider] = useState(20);
    const [materialIndex, setMaterialIndex] = useState(1); // Start on Sodium
    const [battery, setBattery] = useState(0);
    const [won, setWon] = useState(false);
    const animRef = useRef<number>(0);
    const batteryRef = useRef(0);
    const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; type: 'bounce' | 'electron' }>>([]);

    const freqData = sliderToFrequency(colorSlider);
    const material = PANEL_MATERIALS[materialIndex];
    const isAboveThreshold = freqData.energy > material.workFunction;
    const excessEnergy = isAboveThreshold ? freqData.energy - material.workFunction : 0;

    // Animation
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        // Background: space
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, W, H);

        // Stars
        for (let i = 0; i < 60; i++) {
            const sx = ((i * 137 + 42) % W);
            const sy = ((i * 97 + 126) % H);
            const brightness = 0.3 + (i % 5) * 0.15;
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.fillRect(sx, sy, 1, 1);
        }

        // Satellite body (right side)
        const satX = W * 0.7;
        const satY = H * 0.4;
        ctx.fillStyle = '#334';
        ctx.fillRect(satX - 30, satY - 20, 60, 40);
        ctx.strokeStyle = '#556';
        ctx.lineWidth = 2;
        ctx.strokeRect(satX - 30, satY - 20, 60, 40);

        // Solar panel — changes color based on material
        ctx.fillStyle = material.color + '44';
        ctx.fillRect(satX - 14, satY - 55, 28, 35);
        ctx.strokeStyle = material.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(satX - 14, satY - 55, 28, 35);
        // Panel grid
        ctx.strokeStyle = material.color + '88';
        ctx.lineWidth = 1;
        for (let py = 0; py < 3; py++) {
            ctx.beginPath();
            ctx.moveTo(satX - 14, satY - 55 + py * 12);
            ctx.lineTo(satX + 14, satY - 55 + py * 12);
            ctx.stroke();
        }

        // Panel material label
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillStyle = material.color;
        ctx.textAlign = 'center';
        ctx.fillText(material.name, satX, satY - 58);

        // Antenna
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(satX, satY - 20);
        ctx.lineTo(satX, satY - 68);
        ctx.stroke();
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(satX, satY - 68, 3, 0, Math.PI * 2);
        ctx.fill();

        // Laser gun (left side)
        const laserX = W * 0.12;
        const laserY = H * 0.4;
        ctx.fillStyle = '#445';
        ctx.fillRect(laserX - 15, laserY - 10, 40, 20);
        ctx.fillStyle = freqData.rgb;
        ctx.fillRect(laserX + 25, laserY - 5, 10, 10);

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('LÁSER', laserX + 10, laserY + 35);

        // Laser beam
        const beamStartX = laserX + 35;
        const beamEndX = satX - 14;

        ctx.globalAlpha = 0.2 + (intensity / 100) * 0.6;
        ctx.strokeStyle = freqData.rgb;
        ctx.lineWidth = 2 + (intensity / 100) * 4;
        ctx.shadowColor = freqData.rgb;
        ctx.shadowBlur = 15 + (intensity / 100) * 15;
        ctx.beginPath();
        ctx.moveTo(beamStartX, laserY);
        ctx.lineTo(beamEndX, satY - 37);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Photon dots along beam
        const now = Date.now() / 500;
        const numPhotons = Math.floor(intensity / 10);
        for (let p = 0; p < numPhotons; p++) {
            const t = ((now + p * 0.3) % 1);
            const px = beamStartX + (beamEndX - beamStartX) * t;
            const py = laserY + (satY - 37 - laserY) * t;
            ctx.fillStyle = freqData.rgb;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Particles
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
            const part = particles[i];
            part.x += part.vx;
            part.y += part.vy;
            part.life -= 1;
            if (part.life <= 0) { particles.splice(i, 1); continue; }
            ctx.fillStyle = part.type === 'bounce'
                ? `rgba(255, 100, 0, ${part.life / 30})`
                : `rgba(0, 200, 255, ${part.life / 30})`;
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.type === 'electron' ? 3 : 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Spawn particles
        if (Math.random() < 0.3) {
            if (isAboveThreshold) {
                for (let i = 0; i < Math.ceil(intensity / 30); i++) {
                    particles.push({
                        x: satX - 5 + Math.random() * 10,
                        y: satY - 45 + Math.random() * 20,
                        vx: 1 + Math.random() * 3,
                        vy: -2 + Math.random() * 4,
                        life: 20 + Math.random() * 15,
                        type: 'electron',
                    });
                }
            } else {
                for (let i = 0; i < 2; i++) {
                    particles.push({
                        x: satX - 5 + Math.random() * 10,
                        y: satY - 40,
                        vx: -2 + Math.random() * 4,
                        vy: -1 - Math.random() * 3,
                        life: 15 + Math.random() * 10,
                        type: 'bounce',
                    });
                }
            }
        }

        // Work function threshold line
        const wfBarX = W - 55;
        const wfBarH = H - 100;
        const wfBarY = 40;
        ctx.fillStyle = '#111';
        ctx.fillRect(wfBarX, wfBarY, 20, wfBarH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(wfBarX, wfBarY, 20, wfBarH);

        // Energy fill
        const maxEV = 6;
        const energyFill = Math.min(1, freqData.energy / maxEV);
        const fillH = energyFill * wfBarH;
        const eGrad = ctx.createLinearGradient(0, wfBarY + wfBarH - fillH, 0, wfBarY + wfBarH);
        eGrad.addColorStop(0, freqData.rgb);
        eGrad.addColorStop(1, freqData.rgb + '44');
        ctx.fillStyle = eGrad;
        ctx.fillRect(wfBarX, wfBarY + wfBarH - fillH, 20, fillH);

        // Work function line
        const wfY = wfBarY + wfBarH - (material.workFunction / maxEV) * wfBarH;
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(wfBarX - 5, wfY);
        ctx.lineTo(wfBarX + 25, wfY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff4444';
        ctx.textAlign = 'center';
        ctx.fillText('φ', wfBarX + 10, wfY - 5);

        // Battery bar (bottom)
        const batX = W * 0.15;
        const batW = W * 0.5;
        const batY = H - 35;
        const batH = 16;

        ctx.fillStyle = '#111';
        ctx.fillRect(batX, batY, batW, batH);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(batX, batY, batW, batH);
        const fillW = (batteryRef.current / 100) * batW;
        const grad = ctx.createLinearGradient(batX, 0, batX + fillW, 0);
        grad.addColorStop(0, '#006600');
        grad.addColorStop(1, '#00ff00');
        ctx.fillStyle = grad;
        ctx.fillRect(batX, batY, fillW, batH);

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`BATERÍA: ${Math.floor(batteryRef.current)}%`, batX + batW / 2, batY - 6);

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#666';
        ctx.fillText('PANEL SOLAR', satX, satY + 32);

        animRef.current = requestAnimationFrame(draw);
    }, [intensity, colorSlider, freqData, isAboveThreshold, material]);

    // Battery charging logic — charge rate depends on excess energy AND intensity
    useEffect(() => {
        if (won) return;
        const interval = setInterval(() => {
            if (isAboveThreshold) {
                // Charge rate = intensity * excess energy factor
                const efficiencyFactor = Math.min(2, excessEnergy / 2);
                const chargeRate = (intensity / 100) * efficiencyFactor * 1.5;
                batteryRef.current = Math.min(100, batteryRef.current + chargeRate);
                setBattery(batteryRef.current);
                if (batteryRef.current >= 100) {
                    setWon(true);
                    onWin(50);
                }
            }
        }, 100);
        return () => clearInterval(interval);
    }, [intensity, isAboveThreshold, excessEnergy, won, onWin]);

    // Animation loop
    useEffect(() => {
        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [draw]);

    // Feedback
    let feedbackClass = 'sqo-feedback-info';
    let feedbackMsg = `Material: ${material.name} (φ=${material.workFunction}eV). Ajustá color, intensidad y material.`;
    if (!isAboveThreshold && intensity > 30) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = `E=${freqData.energy.toFixed(2)}eV < φ=${material.workFunction}eV. ¡Sin efecto fotoeléctrico! Cambiá el color o el material.`;
    } else if (isAboveThreshold && intensity > 0) {
        feedbackClass = 'sqo-feedback-success';
        feedbackMsg = `¡Efecto fotoeléctrico! E=${freqData.energy.toFixed(2)}eV > φ=${material.workFunction}eV. Exceso: ${excessEnergy.toFixed(2)}eV → cargando...`;
    }

    return (
        <div className="sqo-game-area">
            <div className="sqo-canvas-wrapper">
                <canvas ref={canvasRef} width={700} height={350} className="sqo-canvas" />
            </div>

            <div className="sqo-status-row">
                <div className="sqo-status-item">
                    <span className="sqo-status-label">BATERÍA</span>
                    <div className="sqo-bar-container">
                        <div className="sqo-bar-fill sqo-bar-green" style={{ width: `${battery}%` }} />
                    </div>
                    <span className="sqo-bar-value">{Math.floor(battery)}%</span>
                </div>
                <div className="sqo-status-item">
                    <span className="sqo-status-label">ENERGÍA FOTÓN</span>
                    <div className="sqo-bar-container">
                        <div className={`sqo-bar-fill ${isAboveThreshold ? 'sqo-bar-blue' : 'sqo-bar-red'}`}
                            style={{ width: `${Math.min(100, (freqData.energy / 6) * 100)}%` }} />
                    </div>
                    <span className="sqo-bar-value">{freqData.energy.toFixed(1)}eV</span>
                </div>
            </div>

            <div className={`sqo-feedback ${feedbackClass}`}>{feedbackMsg}</div>

            <div className="sqo-controls">
                {/* Material Selector — Knob/Dial style */}
                <div className="sqo-control-row">
                    <span className="sqo-control-label">MATERIAL PANEL</span>
                    <div className="sqo-knob-group">
                        {PANEL_MATERIALS.map((mat, idx) => (
                            <button
                                key={idx}
                                className={`sqo-knob-btn ${idx === materialIndex ? 'sqo-knob-active' : ''}`}
                                onClick={() => { if (!won) setMaterialIndex(idx); }}
                                style={{ '--knob-color': mat.color } as React.CSSProperties}
                                disabled={won}
                            >
                                <span className="sqo-knob-label">{mat.name}</span>
                                <span className="sqo-knob-val">φ={mat.workFunction}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="sqo-control-row">
                    <span className="sqo-control-label">COLOR LÁSER (ν)</span>
                    <div className="sqo-slider-container">
                        <input type="range" min="0" max="100" value={colorSlider}
                            onChange={e => setColorSlider(Number(e.target.value))}
                            className="sqo-slider"
                            style={{ background: `linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00cc00, #0000ff, #8800ff, #cc00ff)` }}
                            disabled={won} />
                        <div className="sqo-slider-labels"><span>ROJO</span><span>VERDE</span><span>UV</span></div>
                    </div>
                    <span className="sqo-control-value" style={{ color: freqData.rgb }}>{freqData.colorName}</span>
                </div>
                <div className="sqo-control-row">
                    <span className="sqo-control-label">INTENSIDAD</span>
                    <div className="sqo-slider-container">
                        <input type="range" min="1" max="100" value={intensity}
                            onChange={e => setIntensity(Number(e.target.value))}
                            className="sqo-slider" disabled={won} />
                        <div className="sqo-slider-labels"><span>1</span><span>50</span><span>100</span></div>
                    </div>
                    <span className="sqo-control-value">{intensity}</span>
                </div>
                <div className="sqo-control-row" style={{ justifyContent: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '7px', color: '#666' }}>φ ({material.name}) = {material.workFunction} eV</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>λ = {freqData.wavelength.toFixed(0)} nm</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>ν = {freqData.frequency.toFixed(0)} THz</span>
                </div>
            </div>
        </div>
    );
}
