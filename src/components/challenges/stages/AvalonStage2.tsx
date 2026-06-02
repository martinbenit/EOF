'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
    onWin: (xp: number) => void;
}

const CANVAS_W = 600;
const CANVAS_H = 480;
const GRID_SIZE = 10;
const CELL_SIZE = 40;
const OFFSET_X = 100;
const OFFSET_Y = 20;
const E_ROW = 2; 
const S_COL = 7; 

type PathPoint = { r: number; c: number };

export default function AvalonStage2({ onWin }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [grid, setGrid] = useState<boolean[][]>(() => 
        Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(true))
    );
    const [isShooting, setIsShooting] = useState(false);
    const [laserPath, setLaserPath] = useState<PathPoint[]>([]);
    const [won, setWon] = useState(false);
    const [showWinMsg, setShowWinMsg] = useState(false);
    
    const laserProgressRef = useRef(0);
    const animRef = useRef(0);
    const timeRef = useRef(0);

    const togglePillar = (r: number, c: number) => {
        if (isShooting || won) return;
        setGrid(prev => {
            const next = prev.map(row => [...row]);
            next[r][c] = !next[r][c];
            return next;
        });
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (x >= OFFSET_X && x < OFFSET_X + GRID_SIZE * CELL_SIZE &&
            y >= OFFSET_Y && y < OFFSET_Y + GRID_SIZE * CELL_SIZE) {
            const c = Math.floor((x - OFFSET_X) / CELL_SIZE);
            const r = Math.floor((y - OFFSET_Y) / CELL_SIZE);
            togglePillar(r, c);
        }
    };

    const calcLaserPath = (currentGrid: boolean[][]) => {
        let r = E_ROW;
        let c = 0;
        let dir = [0, 1]; // moving right
        let path: PathPoint[] = [];
        let isWon = false;

        if (currentGrid[r][c] === true) {
            return { path, isWon: false };
        }

        let steps = 0;
        while (steps < 200) {
            steps++;
            path.push({r, c});
            
            if (r === GRID_SIZE - 1 && c === S_COL) {
                isWon = true; 
                break;
            }

            let nextR = r + dir[0];
            let nextC = c + dir[1];
            let canGoStraight = nextR >= 0 && nextR < GRID_SIZE && nextC >= 0 && nextC < GRID_SIZE && !currentGrid[nextR][nextC];

            if (canGoStraight) {
                r = nextR;
                c = nextC;
            } else {
                let turn1 = [dir[1], -dir[0]]; 
                let turn2 = [-dir[1], dir[0]]; 

                let next1R = r + turn1[0]; let next1C = c + turn1[1];
                let can1 = next1R >= 0 && next1R < GRID_SIZE && next1C >= 0 && next1C < GRID_SIZE && !currentGrid[next1R][next1C];

                let next2R = r + turn2[0]; let next2C = c + turn2[1];
                let can2 = next2R >= 0 && next2R < GRID_SIZE && next2C >= 0 && next2C < GRID_SIZE && !currentGrid[next2R][next2C];

                if (can1 && !can2) {
                    dir = turn1;
                    r = next1R;
                    c = next1C;
                } else if (!can1 && can2) {
                    dir = turn2;
                    r = next2R;
                    c = next2C;
                } else {
                    break; 
                }
            }
        }
        return { path, isWon };
    };

    const handleShoot = () => {
        if (isShooting || won) return;
        const { path, isWon } = calcLaserPath(grid);
        setLaserPath(path);
        setWon(isWon);
        laserProgressRef.current = 0;
        setIsShooting(true);
    };

    const handleReset = () => {
        setIsShooting(false);
        setLaserPath([]);
        laserProgressRef.current = 0;
        setWon(false);
        setShowWinMsg(false);
    };

    const handleClearGrid = () => {
        setGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(true)));
        handleReset();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let running = true;
        const render = () => {
            if (!running) return;
            timeRef.current += 0.05;
            const t = timeRef.current;

            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            
            // BG
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            // Draw Emitter
            const emY = OFFSET_Y + E_ROW * CELL_SIZE;
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.fillRect(20, emY + 5, 80, 30);
            ctx.strokeRect(20, emY + 5, 80, 30);
            ctx.fillStyle = '#00f0ff';
            ctx.font = '10px "Share Tech Mono", monospace';
            ctx.fillText('EMISOR', 35, emY + 25);
            // Emitter port
            ctx.fillStyle = isShooting ? '#ff0040' : '#440010';
            ctx.fillRect(100, emY + 15, 10, 10);

            // Draw Sensor
            const sensX = OFFSET_X + S_COL * CELL_SIZE;
            const sensY = OFFSET_Y + GRID_SIZE * CELL_SIZE;
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 2;
            ctx.fillRect(sensX - 10, sensY + 10, 60, 30);
            ctx.strokeRect(sensX - 10, sensY + 10, 60, 30);
            ctx.fillStyle = '#39ff14';
            ctx.fillText('SENSOR', sensX + 2, sensY + 30);
            // Sensor port
            ctx.fillStyle = (won && laserProgressRef.current >= laserPath.length) ? '#ff0040' : '#0a2a0a';
            ctx.fillRect(sensX + 15, sensY, 10, 10);

            // Draw Grid
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const cx = OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2;
                    const cy = OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;

                    // Defect glow
                    if (!grid[r][c]) {
                        ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
                        ctx.fillRect(OFFSET_X + c * CELL_SIZE, OFFSET_Y + r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }

                    if (grid[r][c]) {
                        // Pillar
                        const grad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, CELL_SIZE / 2 - 4);
                        grad.addColorStop(0, '#888');
                        grad.addColorStop(1, '#333');
                        ctx.beginPath();
                        ctx.arc(cx, cy, CELL_SIZE / 2 - 4, 0, Math.PI * 2);
                        ctx.fillStyle = grad;
                        ctx.fill();
                        ctx.strokeStyle = '#555';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // Draw Laser
            if (isShooting) {
                if (laserProgressRef.current < laserPath.length) {
                    laserProgressRef.current += 0.5;
                } else if (won && !showWinMsg) {
                    setShowWinMsg(true);
                    setTimeout(() => onWin(150), 2000);
                }

                ctx.beginPath();
                ctx.moveTo(110, emY + 20);
                
                if (laserPath.length === 0) {
                    // Bounces at first column
                    ctx.lineTo(OFFSET_X, emY + 20);
                } else {
                    let lastX = 110;
                    let lastY = emY + 20;
                    
                    for (let i = 0; i < Math.floor(laserProgressRef.current); i++) {
                        const p = laserPath[i];
                        const cx = OFFSET_X + p.c * CELL_SIZE + CELL_SIZE / 2;
                        const cy = OFFSET_Y + p.r * CELL_SIZE + CELL_SIZE / 2;
                        ctx.lineTo(cx, cy);
                        lastX = cx;
                        lastY = cy;
                    }
                    
                    if (Math.floor(laserProgressRef.current) < laserPath.length) {
                        const idx = Math.floor(laserProgressRef.current);
                        const p = laserPath[idx];
                        const targetX = OFFSET_X + p.c * CELL_SIZE + CELL_SIZE / 2;
                        const targetY = OFFSET_Y + p.r * CELL_SIZE + CELL_SIZE / 2;
                        const frac = laserProgressRef.current % 1;
                        const px = lastX + (targetX - lastX) * frac;
                        const py = lastY + (targetY - lastY) * frac;
                        ctx.lineTo(px, py);
                    } else if (won) {
                        ctx.lineTo(sensX + 20, sensY);
                    }
                }
                
                // Outer glow
                ctx.strokeStyle = 'rgba(255, 0, 64, 0.4)';
                ctx.lineWidth = 12 + Math.sin(t * 10) * 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();

                // Core beam
                ctx.strokeStyle = '#ff3366';
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Win message overlay
            if (showWinMsg) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                ctx.font = '18px "Share Tech Mono", monospace';
                ctx.fillStyle = '#39ff14';
                ctx.textAlign = 'center';
                ctx.fillText('¡GUÍA DE ONDA PERFECTA!', CANVAS_W / 2, CANVAS_H / 2 - 15);
                ctx.font = '12px "Share Tech Mono", monospace';
                ctx.fillStyle = '#00f0ff';
                ctx.fillText('Análisis toxicológico completo', CANVAS_W / 2, CANVAS_H / 2 + 15);
                ctx.textAlign = 'left';
            }

            animRef.current = requestAnimationFrame(render);
        };
        
        animRef.current = requestAnimationFrame(render);
        return () => {
            running = false;
            cancelAnimationFrame(animRef.current);
        };
    }, [grid, isShooting, laserPath, won, showWinMsg, onWin]);

    return (
        <div className="ava-s1-game">
            {/* Toolbar */}
            <div className="ava-s1-toolbar">
                <span className="ava-s1-toolbar-label">CONTROLES:</span>
                <button
                    className="ava-s1-tool-btn tool-virus"
                    onClick={handleShoot}
                    disabled={isShooting || won}
                >
                    🔴 DISPARAR LÁSER
                </button>
                <button
                    className="ava-s1-tool-btn"
                    onClick={handleReset}
                    disabled={!isShooting || won}
                >
                    ⏹ DETENER / RECALIBRAR
                </button>
                <button className="ava-s1-tool-btn tool-clear" onClick={handleClearGrid} disabled={isShooting || won}>
                    🧹 RESETEAR MATRIZ
                </button>
                <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#5a8a8a' }}>
                    Clic en pilares para crear defectos
                </span>
            </div>

            {/* Canvas */}
            <div className="ava-s1-canvas-wrap">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="ava-s1-canvas"
                    onClick={handleCanvasClick}
                />
            </div>

            {/* Bottom Panel */}
            <div className="ava-s1-bottom-panel">
                <div className="ava-s1-kmeter">
                    <div className="ava-s1-kmeter-label">
                        <span>ESTADO DEL LÁSER</span>
                        <span className="ava-s1-kmeter-value">
                            {won ? 'TRANSMISIÓN 100%' : (isShooting ? 'DIFRACCIÓN / PÉRDIDA' : 'ESPERANDO')}
                        </span>
                    </div>
                </div>

                <div className={`ava-s1-status ${won ? 'status-win' : ''}`}>
                    {won ? '✓ RUTA ESTABLECIDA' : (isShooting ? '⚠ Señal perdida en el cristal' : 'Trazá un camino al sensor')}
                </div>
            </div>
        </div>
    );
}
