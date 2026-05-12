'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface Stage1Props {
    onWin: (xp: number) => void;
}

// Typewriter hook
function useTypewriter(text: string, speed: number = 40) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        setDisplayed('');
        setDone(false);
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) {
                clearInterval(interval);
                setDone(true);
            }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);

    return { displayed, done };
}

// Physics constants
const WORK_FUNCTION = 2.3; // eV
const PLANCK = 6.626e-34;
const EV_TO_J = 1.602e-19;
const C = 3e8;

// Map slider position (0-100) to frequency/wavelength/energy
function sliderToFrequency(val: number): { frequency: number; wavelength: number; energy: number; colorName: string; rgb: string } {
    // Slider 0 = deep red (400 THz), slider 100 = UV (900 THz)
    const freqTHz = 400 + (val / 100) * 500; // 400 to 900 THz
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

const STORY = "Satélite climático sin energía. Panel solar experimental detectado. Tu misión: arrancar electrones del panel para recargar la batería usando el láser de la estación.";

export default function Stage1SOS({ onWin }: Stage1Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [intensity, setIntensity] = useState(50);
    const [colorSlider, setColorSlider] = useState(20); // Start on red
    const [battery, setBattery] = useState(0);
    const [won, setWon] = useState(false);
    const animRef = useRef<number>(0);
    const batteryRef = useRef(0);
    const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; type: 'bounce' | 'electron' }>>([]);

    const { displayed: storyText, done: storyDone } = useTypewriter(STORY, 30);

    const freqData = sliderToFrequency(colorSlider);
    const isAboveThreshold = freqData.energy > WORK_FUNCTION;

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
        const starSeed = 42;
        for (let i = 0; i < 60; i++) {
            const sx = ((i * 137 + starSeed) % W);
            const sy = ((i * 97 + starSeed * 3) % H);
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

        // Solar panel
        ctx.fillStyle = '#1a2a4a';
        ctx.fillRect(satX - 10, satY - 50, 20, 30);
        ctx.strokeStyle = '#3366aa';
        ctx.lineWidth = 1;
        ctx.strokeRect(satX - 10, satY - 50, 20, 30);
        // Panel grid
        for (let py = 0; py < 3; py++) {
            ctx.beginPath();
            ctx.moveTo(satX - 10, satY - 50 + py * 10);
            ctx.lineTo(satX + 10, satY - 50 + py * 10);
            ctx.strokeStyle = '#4488cc';
            ctx.stroke();
        }

        // Antenna
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(satX, satY - 20);
        ctx.lineTo(satX, satY - 60);
        ctx.stroke();
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(satX, satY - 60, 3, 0, Math.PI * 2);
        ctx.fill();

        // Laser gun (left side)
        const laserX = W * 0.12;
        const laserY = H * 0.4;
        ctx.fillStyle = '#445';
        ctx.fillRect(laserX - 15, laserY - 10, 40, 20);
        ctx.fillStyle = freqData.rgb;
        ctx.fillRect(laserX + 25, laserY - 5, 10, 10);

        // Label
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('LÁSER', laserX + 10, laserY + 35);

        // Laser beam
        const beamStartX = laserX + 35;
        const beamEndX = satX - 10;
        const beamY = laserY;

        ctx.globalAlpha = 0.2 + (intensity / 100) * 0.6;
        ctx.strokeStyle = freqData.rgb;
        ctx.lineWidth = 2 + (intensity / 100) * 4;
        ctx.shadowColor = freqData.rgb;
        ctx.shadowBlur = 15 + (intensity / 100) * 15;
        ctx.beginPath();
        ctx.moveTo(beamStartX, beamY);
        ctx.lineTo(beamEndX, satY - 35);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Photon dots along beam
        const now = Date.now() / 500;
        const numPhotons = Math.floor(intensity / 10);
        for (let p = 0; p < numPhotons; p++) {
            const t = ((now + p * 0.3) % 1);
            const px = beamStartX + (beamEndX - beamStartX) * t;
            const py = beamY + (satY - 35 - beamY) * t;
            ctx.fillStyle = freqData.rgb;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Particles (bouncing photons or electrons)
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
            const part = particles[i];
            part.x += part.vx;
            part.y += part.vy;
            part.life -= 1;

            if (part.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

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
                // Electrons flying off
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
                // Photons bouncing
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

        // Battery bar (bottom)
        const batX = W * 0.15;
        const batW = W * 0.7;
        const batY = H - 40;
        const batH = 18;

        ctx.fillStyle = '#111';
        ctx.fillRect(batX, batY, batW, batH);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(batX, batY, batW, batH);

        // Fill
        const fillW = (batteryRef.current / 100) * batW;
        const grad = ctx.createLinearGradient(batX, 0, batX + fillW, 0);
        grad.addColorStop(0, '#006600');
        grad.addColorStop(1, '#00ff00');
        ctx.fillStyle = grad;
        ctx.fillRect(batX, batY, fillW, batH);

        // Battery text
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`BATERÍA: ${Math.floor(batteryRef.current)}%`, W / 2, batY - 8);

        // Panel label
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#666';
        ctx.fillText('PANEL SOLAR', satX, satY + 35);

        animRef.current = requestAnimationFrame(draw);
    }, [intensity, colorSlider, freqData, isAboveThreshold]);

    // Battery charging logic
    useEffect(() => {
        if (won) return;
        const interval = setInterval(() => {
            if (isAboveThreshold) {
                const chargeRate = (intensity / 100) * 2; // up to 2% per tick
                batteryRef.current = Math.min(100, batteryRef.current + chargeRate);
                setBattery(batteryRef.current);
                if (batteryRef.current >= 100) {
                    setWon(true);
                    onWin(50); // 50 XP for stage 1
                }
            }
        }, 100);
        return () => clearInterval(interval);
    }, [intensity, isAboveThreshold, won, onWin]);

    // Animation loop
    useEffect(() => {
        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [draw]);

    // Feedback message
    let feedbackClass = 'sqo-feedback-info';
    let feedbackMsg = 'Ajustá el color y la intensidad del láser para recargar el satélite.';
    if (!isAboveThreshold && intensity > 30) {
        feedbackClass = 'sqo-feedback-warning';
        feedbackMsg = 'Los fotones no tienen suficiente energía individual. ¡Probá otro color!';
    } else if (isAboveThreshold && intensity > 0) {
        feedbackClass = 'sqo-feedback-success';
        feedbackMsg = `¡Efecto fotoeléctrico activo! E=${freqData.energy.toFixed(2)} eV > φ=${WORK_FUNCTION} eV. Cargando...`;
    }

    return (
        <div className="sqo-game-area">
            {/* Typewriter Story */}
            <div className="sqo-typewriter">
                <div className="sqo-typewriter-text">
                    {storyText}
                    {!storyDone && <span className="sqo-typewriter-cursor" />}
                </div>
            </div>

            {/* Canvas */}
            <div className="sqo-canvas-wrapper">
                <canvas ref={canvasRef} width={700} height={350} className="sqo-canvas" />
            </div>

            {/* Status */}
            <div className="sqo-status-row">
                <div className="sqo-status-item">
                    <span className="sqo-status-label">BATERÍA</span>
                    <div className="sqo-bar-container">
                        <div className="sqo-bar-fill sqo-bar-green" style={{ width: `${battery}%` }} />
                    </div>
                    <span className="sqo-bar-value">{Math.floor(battery)}%</span>
                </div>
                <div className="sqo-status-item">
                    <span className="sqo-status-label">ENERGÍA</span>
                    <div className="sqo-bar-container">
                        <div
                            className={`sqo-bar-fill ${isAboveThreshold ? 'sqo-bar-blue' : 'sqo-bar-red'}`}
                            style={{ width: `${Math.min(100, (freqData.energy / 5) * 100)}%` }}
                        />
                    </div>
                    <span className="sqo-bar-value">{freqData.energy.toFixed(1)}eV</span>
                </div>
            </div>

            {/* Feedback */}
            <div className={`sqo-feedback ${feedbackClass}`}>
                {feedbackMsg}
            </div>

            {/* Controls */}
            <div className="sqo-controls">
                <div className="sqo-control-row">
                    <span className="sqo-control-label">INTENSIDAD (Fotones)</span>
                    <div className="sqo-slider-container">
                        <input
                            type="range" min="1" max="100" value={intensity}
                            onChange={e => setIntensity(Number(e.target.value))}
                            className="sqo-slider"
                        />
                        <div className="sqo-slider-labels">
                            <span>1</span><span>50</span><span>100</span>
                        </div>
                    </div>
                    <span className="sqo-control-value">{intensity}</span>
                </div>
                <div className="sqo-control-row">
                    <span className="sqo-control-label">COLOR DEL LÁSER (ν)</span>
                    <div className="sqo-slider-container">
                        <input
                            type="range" min="0" max="100" value={colorSlider}
                            onChange={e => setColorSlider(Number(e.target.value))}
                            className="sqo-slider"
                            style={{
                                background: `linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00cc00, #0000ff, #8800ff, #cc00ff)`,
                            }}
                        />
                        <div className="sqo-slider-labels">
                            <span>ROJO</span><span>VERDE</span><span>UV</span>
                        </div>
                    </div>
                    <span className="sqo-control-value" style={{ color: freqData.rgb }}>{freqData.colorName}</span>
                </div>
                <div className="sqo-control-row" style={{ justifyContent: 'center', gap: '24px' }}>
                    <span style={{ fontSize: '7px', color: '#666' }}>φ (Función de Trabajo) = {WORK_FUNCTION} eV</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>λ = {freqData.wavelength.toFixed(0)} nm</span>
                    <span style={{ fontSize: '7px', color: '#666' }}>ν = {freqData.frequency.toFixed(0)} THz</span>
                </div>
            </div>
        </div>
    );
}
