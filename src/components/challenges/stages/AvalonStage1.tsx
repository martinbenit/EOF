'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type NanoType = 'sphere' | 'triangle';

interface NanoParticle {
    id: number;
    type: NanoType;
    x: number;
    y: number;
}

interface Props {
    onWin: (xp: number) => void;
}

const CANVAS_W = 700;
const CANVAS_H = 420;
const PARTICLE_R = 22;
const VIRUS_R = 12;
const PX_PER_NM = 2.5;
const MAX_PARTICLES = 6;
const WIN_K = 5000;

function getTriangleTip(p: NanoParticle, toward: NanoParticle): { x: number; y: number } {
    const angle = Math.atan2(toward.y - p.y, toward.x - p.x);
    return { x: p.x + PARTICLE_R * Math.cos(angle), y: p.y + PARTICLE_R * Math.sin(angle) };
}

function getTriangleVertices(p: NanoParticle, tipAngle: number): { x: number; y: number }[] {
    const r = PARTICLE_R;
    return [
        { x: p.x + r * Math.cos(tipAngle), y: p.y + r * Math.sin(tipAngle) },
        { x: p.x + r * Math.cos(tipAngle + (2.3)), y: p.y + r * Math.sin(tipAngle + (2.3)) },
        { x: p.x + r * Math.cos(tipAngle - (2.3)), y: p.y + r * Math.sin(tipAngle - (2.3)) },
    ];
}

function calcKFactor(structures: NanoParticle[]): { k: number; bestPair: [number, number] | null; gapPx: number } {
    if (structures.length === 0) return { k: 1, bestPair: null, gapPx: Infinity };
    if (structures.length === 1) return { k: 10, bestPair: null, gapPx: Infinity };

    let maxK = 10;
    let bestPair: [number, number] | null = null;
    let bestGapPx = Infinity;

    for (let i = 0; i < structures.length; i++) {
        for (let j = i + 1; j < structures.length; j++) {
            const a = structures[i];
            const b = structures[j];
            const centerDist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

            let gapPx: number;
            if (a.type === 'triangle' && b.type === 'triangle') {
                const tipA = getTriangleTip(a, b);
                const tipB = getTriangleTip(b, a);
                gapPx = Math.sqrt((tipA.x - tipB.x) ** 2 + (tipA.y - tipB.y) ** 2);
            } else {
                gapPx = centerDist - 2 * PARTICLE_R;
            }

            if (gapPx < 1) gapPx = 1;
            const gapNm = gapPx / PX_PER_NM;

            let k: number;
            if (a.type === 'triangle' && b.type === 'triangle') {
                // Bowtie nanoantenna — lightning rod effect
                k = Math.min(10000, 45000 / Math.pow(Math.max(gapNm, 0.4), 2));
            } else if (a.type === 'sphere' && b.type === 'sphere') {
                // Sphere dimer
                k = Math.min(100, 8000 / Math.pow(Math.max(gapNm, 1), 3));
            } else {
                // Mixed — moderate enhancement
                k = Math.min(300, 3000 / Math.pow(Math.max(gapNm, 0.8), 2));
            }

            if (k > maxK) {
                maxK = k;
                bestPair = [i, j];
                bestGapPx = gapPx;
            }
        }
    }
    return { k: Math.round(maxK), bestPair, gapPx: bestGapPx };
}

function isVirusInGap(virusPos: { x: number; y: number }, structures: NanoParticle[], bestPair: [number, number] | null): boolean {
    if (!bestPair) return false;
    const a = structures[bestPair[0]];
    const b = structures[bestPair[1]];
    const gapCenterX = (a.x + b.x) / 2;
    const gapCenterY = (a.y + b.y) / 2;
    const dist = Math.sqrt((virusPos.x - gapCenterX) ** 2 + (virusPos.y - gapCenterY) ** 2);
    return dist < 25;
}

function kToLogPercent(k: number): number {
    // Log scale: 1 → 0%, 10 → 25%, 100 → 50%, 1000 → 75%, 10000 → 100%
    if (k <= 1) return 0;
    return Math.min(100, (Math.log10(k) / 4) * 100);
}

function kToClass(k: number): string {
    if (k >= 5000) return 'k-max';
    if (k >= 500) return 'k-high';
    if (k >= 50) return 'k-mid';
    return 'k-low';
}

export default function AvalonStage1({ onWin }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [structures, setStructures] = useState<NanoParticle[]>([]);
    const [virusPos, setVirusPos] = useState({ x: CANVAS_W * 0.3, y: CANVAS_H * 0.5 });
    const [selectedTool, setSelectedTool] = useState<NanoType | null>(null);
    const [dragging, setDragging] = useState<{ type: 'particle' | 'virus'; index: number } | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [kFactor, setKFactor] = useState(1);
    const [virusInGap, setVirusInGap] = useState(false);
    const [won, setWon] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showWinMsg, setShowWinMsg] = useState(false);
    const nextIdRef = useRef(1);
    const animRef = useRef(0);
    const timeRef = useRef(0);

    // Recalculate K when structures or virus change
    useEffect(() => {
        const { k, bestPair, gapPx } = calcKFactor(structures);
        setKFactor(k);
        const inGap = isVirusInGap(virusPos, structures, bestPair);
        setVirusInGap(inGap);

        if (k >= WIN_K && inGap && !won) {
            setWon(true);
            setShowWinMsg(true);
            setTimeout(() => {
                onWin(150);
            }, 2000);
        }
    }, [structures, virusPos, won, onWin]);

    // Canvas mouse helpers
    const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (won) return;
        const pos = getCanvasPos(e);

        // Check virus hit
        const vDist = Math.sqrt((pos.x - virusPos.x) ** 2 + (pos.y - virusPos.y) ** 2);
        if (vDist < VIRUS_R + 8) {
            setDragging({ type: 'virus', index: -1 });
            setDragOffset({ x: virusPos.x - pos.x, y: virusPos.y - pos.y });
            setSelectedTool(null);
            return;
        }

        // Check particle hit
        for (let i = structures.length - 1; i >= 0; i--) {
            const p = structures[i];
            const d = Math.sqrt((pos.x - p.x) ** 2 + (pos.y - p.y) ** 2);
            if (d < PARTICLE_R + 5) {
                setDragging({ type: 'particle', index: i });
                setDragOffset({ x: p.x - pos.x, y: p.y - pos.y });
                setSelectedTool(null);
                return;
            }
        }

        // Place new particle if tool selected
        if (selectedTool && structures.length < MAX_PARTICLES) {
            const newP: NanoParticle = {
                id: nextIdRef.current++,
                type: selectedTool,
                x: pos.x,
                y: pos.y,
            };
            setStructures(prev => [...prev, newP]);
        }
    }, [won, structures, virusPos, selectedTool, getCanvasPos]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getCanvasPos(e);
        setMousePos(pos);

        if (!dragging) return;

        const nx = Math.max(PARTICLE_R, Math.min(CANVAS_W - PARTICLE_R, pos.x + dragOffset.x));
        const ny = Math.max(PARTICLE_R, Math.min(CANVAS_H - PARTICLE_R, pos.y + dragOffset.y));

        if (dragging.type === 'virus') {
            setVirusPos({ x: nx, y: ny });
        } else {
            setStructures(prev => prev.map((p, i) =>
                i === dragging.index ? { ...p, x: nx, y: ny } : p
            ));
        }
    }, [dragging, dragOffset, getCanvasPos]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    const handleClear = useCallback(() => {
        setStructures([]);
        setWon(false);
        setShowWinMsg(false);
    }, []);

    // ---- Canvas Rendering ----
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let running = true;
        const render = () => {
            if (!running) return;
            timeRef.current += 0.02;
            const t = timeRef.current;

            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

            // --- Background substrate ---
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            // Hexagonal grid
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
            ctx.lineWidth = 0.5;
            const gridSize = 30;
            for (let row = 0; row < CANVAS_H / gridSize + 1; row++) {
                for (let col = 0; col < CANVAS_W / gridSize + 1; col++) {
                    const cx = col * gridSize + (row % 2 ? gridSize / 2 : 0);
                    const cy = row * gridSize;
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i - Math.PI / 6;
                        const vx = cx + 15 * Math.cos(angle);
                        const vy = cy + 15 * Math.sin(angle);
                        if (i === 0) ctx.moveTo(vx, vy);
                        else ctx.lineTo(vx, vy);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            }

            // Substrate label
            ctx.font = '10px "Share Tech Mono", monospace';
            ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
            ctx.fillText('SUSTRATO Au — MICROSCOPÍA SERS', 12, CANVAS_H - 12);

            // --- Field effects between close pairs ---
            const { bestPair, gapPx } = calcKFactor(structures);
            if (bestPair !== null) {
                const a = structures[bestPair[0]];
                const b = structures[bestPair[1]];
                const gapCX = (a.x + b.x) / 2;
                const gapCY = (a.y + b.y) / 2;
                const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

                // Field glow between particles
                const intensity = Math.min(1, 200 / (gapPx + 5));
                const glowR = 20 + intensity * 40;
                const grad = ctx.createRadialGradient(gapCX, gapCY, 0, gapCX, gapCY, glowR);

                if (kFactor >= WIN_K) {
                    grad.addColorStop(0, `rgba(57, 255, 20, ${0.5 + Math.sin(t * 4) * 0.2})`);
                    grad.addColorStop(0.5, `rgba(0, 240, 255, ${0.3 * intensity})`);
                    grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
                } else if (kFactor >= 100) {
                    grad.addColorStop(0, `rgba(0, 240, 255, ${0.4 * intensity})`);
                    grad.addColorStop(0.5, `rgba(0, 240, 255, ${0.15 * intensity})`);
                    grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
                } else {
                    grad.addColorStop(0, `rgba(0, 240, 255, ${0.15 * intensity})`);
                    grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(gapCX - glowR, gapCY - glowR, glowR * 2, glowR * 2);

                // Field lines
                if (kFactor >= 50) {
                    const numLines = Math.min(8, Math.floor(kFactor / 100) + 2);
                    ctx.strokeStyle = `rgba(0, 240, 255, ${Math.min(0.4, intensity * 0.3)})`;
                    ctx.lineWidth = 1;
                    const angle = Math.atan2(b.y - a.y, b.x - a.x);
                    const perpAngle = angle + Math.PI / 2;
                    for (let i = 0; i < numLines; i++) {
                        const offset = (i - numLines / 2) * 6;
                        const startX = a.x + PARTICLE_R * Math.cos(angle) + offset * Math.cos(perpAngle);
                        const startY = a.y + PARTICLE_R * Math.sin(angle) + offset * Math.sin(perpAngle);
                        const endX = b.x - PARTICLE_R * Math.cos(angle) + offset * Math.cos(perpAngle);
                        const endY = b.y - PARTICLE_R * Math.sin(angle) + offset * Math.sin(perpAngle);

                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        // Animated wave
                        const midX = (startX + endX) / 2;
                        const midY = (startY + endY) / 2;
                        const wave = Math.sin(t * 3 + i) * 5;
                        ctx.quadraticCurveTo(midX + wave * Math.cos(perpAngle), midY + wave * Math.sin(perpAngle), endX, endY);
                        ctx.stroke();
                    }
                }

                // Hot spot marker
                if (kFactor >= 100) {
                    ctx.beginPath();
                    ctx.arc(gapCX, gapCY, 4 + Math.sin(t * 5) * 2, 0, Math.PI * 2);
                    ctx.fillStyle = kFactor >= WIN_K ? '#39ff14' : '#00f0ff';
                    ctx.globalAlpha = 0.6 + Math.sin(t * 5) * 0.3;
                    ctx.fill();
                    ctx.globalAlpha = 1;

                    // "HOT SPOT" label
                    if (kFactor >= 500) {
                        ctx.font = '8px "Share Tech Mono", monospace';
                        ctx.fillStyle = `rgba(0, 240, 255, ${0.5 + Math.sin(t * 3) * 0.3})`;
                        ctx.textAlign = 'center';
                        ctx.fillText('HOT SPOT', gapCX, gapCY - 15);
                        ctx.textAlign = 'left';
                    }
                }
            }

            // --- Draw nanostructures ---
            structures.forEach((p, idx) => {
                // Find the closest other particle for triangle orientation
                let closestAngle = 0;
                let closestDist = Infinity;
                structures.forEach((other, oi) => {
                    if (oi === idx) return;
                    const d = Math.sqrt((p.x - other.x) ** 2 + (p.y - other.y) ** 2);
                    if (d < closestDist) {
                        closestDist = d;
                        closestAngle = Math.atan2(other.y - p.y, other.x - p.x);
                    }
                });

                if (p.type === 'sphere') {
                    // Gold sphere with radial gradient
                    const grad = ctx.createRadialGradient(p.x - 5, p.y - 5, 2, p.x, p.y, PARTICLE_R);
                    grad.addColorStop(0, '#ffe680');
                    grad.addColorStop(0.4, '#ffd700');
                    grad.addColorStop(0.8, '#b8860b');
                    grad.addColorStop(1, '#8b6508');
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, PARTICLE_R, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();

                    // Glow
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, PARTICLE_R + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(t * 2 + idx) * 0.1})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Label
                    ctx.font = '7px "Share Tech Mono", monospace';
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
                    ctx.textAlign = 'center';
                    ctx.fillText('Au ⊙', p.x, p.y + PARTICLE_R + 14);
                    ctx.textAlign = 'left';
                } else {
                    // Triangle — auto-orient toward closest particle
                    const tipAngle = structures.length > 1 ? closestAngle : 0;
                    const verts = getTriangleVertices(p, tipAngle);

                    // Gold triangle fill
                    ctx.beginPath();
                    ctx.moveTo(verts[0].x, verts[0].y);
                    ctx.lineTo(verts[1].x, verts[1].y);
                    ctx.lineTo(verts[2].x, verts[2].y);
                    ctx.closePath();

                    const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, PARTICLE_R);
                    grad.addColorStop(0, '#ffe680');
                    grad.addColorStop(0.5, '#ffd700');
                    grad.addColorStop(1, '#b8860b');
                    ctx.fillStyle = grad;
                    ctx.fill();

                    // Glow outline
                    ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + Math.sin(t * 2 + idx) * 0.15})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Tip glow (lightning rod effect)
                    const tipGlow = ctx.createRadialGradient(verts[0].x, verts[0].y, 0, verts[0].x, verts[0].y, 10);
                    tipGlow.addColorStop(0, `rgba(255, 255, 200, ${0.5 + Math.sin(t * 4 + idx) * 0.2})`);
                    tipGlow.addColorStop(1, 'rgba(255, 255, 200, 0)');
                    ctx.fillStyle = tipGlow;
                    ctx.fillRect(verts[0].x - 10, verts[0].y - 10, 20, 20);

                    // Label
                    ctx.font = '7px "Share Tech Mono", monospace';
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
                    ctx.textAlign = 'center';
                    ctx.fillText('Au ▲', p.x, p.y + PARTICLE_R + 14);
                    ctx.textAlign = 'left';
                }
            });

            // --- Draw virus ---
            const virusPulse = 1 + Math.sin(t * 3) * 0.15;
            // Outer glow
            const vGlow = ctx.createRadialGradient(virusPos.x, virusPos.y, 0, virusPos.x, virusPos.y, VIRUS_R * 2.5);
            vGlow.addColorStop(0, 'rgba(255, 50, 80, 0.25)');
            vGlow.addColorStop(1, 'rgba(255, 50, 80, 0)');
            ctx.fillStyle = vGlow;
            ctx.fillRect(virusPos.x - 30, virusPos.y - 30, 60, 60);

            ctx.beginPath();
            ctx.arc(virusPos.x, virusPos.y, VIRUS_R * virusPulse, 0, Math.PI * 2);
            const vGrad = ctx.createRadialGradient(virusPos.x - 2, virusPos.y - 2, 1, virusPos.x, virusPos.y, VIRUS_R);
            vGrad.addColorStop(0, '#ff6688');
            vGrad.addColorStop(0.5, '#ff2244');
            vGrad.addColorStop(1, '#aa0020');
            ctx.fillStyle = vGrad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 100, 120, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Virus spikes
            for (let i = 0; i < 8; i++) {
                const sAngle = (Math.PI * 2 / 8) * i + t * 0.5;
                const sx = virusPos.x + (VIRUS_R + 4) * Math.cos(sAngle);
                const sy = virusPos.y + (VIRUS_R + 4) * Math.sin(sAngle);
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ff4466';
                ctx.fill();
            }

            // Label
            ctx.font = '7px "Share Tech Mono", monospace';
            ctx.fillStyle = 'rgba(255, 100, 120, 0.8)';
            ctx.textAlign = 'center';
            ctx.fillText('PROTEÍNA VIRAL', virusPos.x, virusPos.y + VIRUS_R + 14);
            ctx.textAlign = 'left';

            // --- Ghost cursor ---
            if (selectedTool && !dragging) {
                ctx.globalAlpha = 0.4;
                if (selectedTool === 'sphere') {
                    ctx.beginPath();
                    ctx.arc(mousePos.x, mousePos.y, PARTICLE_R, 0, Math.PI * 2);
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else {
                    const verts = getTriangleVertices({ id: 0, type: 'triangle', x: mousePos.x, y: mousePos.y }, 0);
                    ctx.beginPath();
                    ctx.moveTo(verts[0].x, verts[0].y);
                    ctx.lineTo(verts[1].x, verts[1].y);
                    ctx.lineTo(verts[2].x, verts[2].y);
                    ctx.closePath();
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                ctx.globalAlpha = 1;
            }

            // --- Win overlay ---
            if (showWinMsg) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                ctx.font = '16px "Share Tech Mono", monospace';
                ctx.fillStyle = '#39ff14';
                ctx.textAlign = 'center';
                ctx.fillText('¡LSPR MÁXIMO!', CANVAS_W / 2, CANVAS_H / 2 - 15);
                ctx.font = '11px "Share Tech Mono", monospace';
                ctx.fillStyle = '#00f0ff';
                ctx.fillText('Proteína viral detectada — Señal Raman amplificada', CANVAS_W / 2, CANVAS_H / 2 + 15);
                ctx.textAlign = 'left';
            }

            animRef.current = requestAnimationFrame(render);
        };

        animRef.current = requestAnimationFrame(render);
        return () => {
            running = false;
            cancelAnimationFrame(animRef.current);
        };
    }, [structures, virusPos, kFactor, selectedTool, mousePos, dragging, won, showWinMsg]);

    const gapNm = (() => {
        const { bestPair, gapPx } = calcKFactor(structures);
        if (!bestPair) return null;
        return (gapPx / PX_PER_NM).toFixed(1);
    })();

    const statusText = won
        ? '✓ SEÑAL DETECTADA — LSPR ACTIVADO'
        : kFactor >= WIN_K && !virusInGap
            ? '⚠ K alto — Colocá el virus en el Hot Spot'
            : kFactor >= 100
                ? 'Amplificación parcial — Optimizá la nanoantena'
                : structures.length === 0
                    ? 'Seleccioná una herramienta y colocá nanopartículas'
                    : 'Acercá las partículas para crear un Hot Spot';

    return (
        <div className="ava-s1-game">
            {/* Toolbar */}
            <div className="ava-s1-toolbar">
                <span className="ava-s1-toolbar-label">HERRAMIENTAS:</span>
                <button
                    className={`ava-s1-tool-btn ${selectedTool === 'sphere' ? 'active' : ''}`}
                    onClick={() => setSelectedTool(selectedTool === 'sphere' ? null : 'sphere')}
                    disabled={won}
                >
                    🔵 Esfera (20nm)
                </button>
                <button
                    className={`ava-s1-tool-btn ${selectedTool === 'triangle' ? 'active' : ''}`}
                    onClick={() => setSelectedTool(selectedTool === 'triangle' ? null : 'triangle')}
                    disabled={won}
                >
                    🔺 Triángulo Bowtie (20nm)
                </button>
                <button className="ava-s1-tool-btn tool-clear" onClick={handleClear} disabled={won}>
                    🧹 Limpiar
                </button>
                <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#5a8a8a' }}>
                    {structures.length}/{MAX_PARTICLES} partículas
                </span>
            </div>

            {/* Canvas */}
            <div className={`ava-s1-canvas-wrap ${dragging ? 'dragging' : ''}`}>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="ava-s1-canvas"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>

            {/* Info Row */}
            <div className="ava-s1-info-row">
                <div className="ava-s1-info-item">
                    <span>PARTÍCULAS:</span>
                    <span className="ava-s1-info-value">{structures.filter(s => s.type === 'sphere').length} esferas, {structures.filter(s => s.type === 'triangle').length} triángulos</span>
                </div>
                {gapNm && (
                    <div className="ava-s1-info-item">
                        <span>GAP:</span>
                        <span className="ava-s1-info-value">{gapNm} nm</span>
                    </div>
                )}
                <div className="ava-s1-info-item">
                    <span>VIRUS EN GAP:</span>
                    <span className="ava-s1-info-value" style={{ color: virusInGap ? '#39ff14' : '#ff4444' }}>
                        {virusInGap ? '✓ SÍ' : '✗ NO'}
                    </span>
                </div>
            </div>

            {/* K-Factor Meter */}
            <div className="ava-s1-bottom-panel">
                <div className="ava-s1-kmeter">
                    <div className="ava-s1-kmeter-label">
                        <span>FACTOR DE AMPLIFICACIÓN (K)</span>
                        <span className="ava-s1-kmeter-value">
                            K = {kFactor >= 1000 ? kFactor.toLocaleString() : kFactor}
                        </span>
                    </div>
                    <div className="ava-s1-kmeter-bar">
                        <div
                            className={`ava-s1-kmeter-fill ${kToClass(kFactor)}`}
                            style={{ width: `${kToLogPercent(kFactor)}%` }}
                        />
                    </div>
                    <div className="ava-s1-kmeter-marks">
                        <span>1</span>
                        <span>10</span>
                        <span>100</span>
                        <span>1K</span>
                        <span>10K</span>
                    </div>
                </div>

                <div className={`ava-s1-status ${won ? 'status-win' : ''}`}>
                    {statusText}
                </div>
            </div>
        </div>
    );
}
