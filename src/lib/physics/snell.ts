// ============================================
// Francotirador Fotónico — Snell's Law Ray Tracer
// ============================================

export interface Material {
    id: string;
    name: string;
    n: number;       // index of refraction
    color: string;
    alpha: number;    // canvas fill alpha
}

export const MATERIALS: Material[] = [
    { id: 'air',     name: 'Aire',     n: 1.0,  color: '#aaddff', alpha: 0.05 },
    { id: 'water',   name: 'Agua',     n: 1.33, color: '#4488ff', alpha: 0.25 },
    { id: 'glass',   name: 'Vidrio',   n: 1.5,  color: '#88ccff', alpha: 0.35 },
    { id: 'diamond', name: 'Diamante', n: 2.42, color: '#ccaaff', alpha: 0.45 },
];

export function getMaterial(id: string): Material {
    return MATERIALS.find(m => m.id === id) || MATERIALS[0];
}

// ---- Grid / Block system ----

export const GRID_COLS = 10;
export const GRID_ROWS = 8;
export const CELL_SIZE = 60;
export const CANVAS_W = GRID_COLS * CELL_SIZE;  // 600
export const CANVAS_H = GRID_ROWS * CELL_SIZE;  // 480

export interface PlacedBlock {
    col: number;
    row: number;
    materialId: string;
}

// ---- Predefined obstacles (healthy tissue) ----
export interface Obstacle {
    col: number;
    row: number;
    w: number;   // width in cells
    h: number;   // height in cells
}

// Level definition
export const TISSUE_OBSTACLES: Obstacle[] = [
    { col: 2, row: 3, w: 2, h: 1 },
    { col: 6, row: 4, w: 2, h: 1 },
    { col: 4, row: 5, w: 1, h: 1 },
];

export const LASER_COL = 5;   // top-center column
export const LASER_ROW = 0;   // top row

export const TARGET_COL = 7;  // bottom-right area
export const TARGET_ROW = 7;  // bottom row

// ---- Ray tracing ----

export interface RaySegment {
    x1: number; y1: number;
    x2: number; y2: number;
    medium: string;   // material the ray travels through
}

export interface RayTraceResult {
    segments: RaySegment[];
    hitTarget: boolean;
    hitTissue: boolean;
    exitedCanvas: boolean;
    totalRefractions: number;
}

/**
 * Get the material at a given pixel position based on placed blocks.
 * Default medium is air.
 */
function getMediumAt(x: number, y: number, blocks: PlacedBlock[]): string {
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    for (const b of blocks) {
        if (b.col === col && b.row === row) return b.materialId;
    }
    return 'air';
}

/**
 * Check if a position is inside a tissue obstacle
 */
function isInTissue(x: number, y: number): boolean {
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    for (const obs of TISSUE_OBSTACLES) {
        if (col >= obs.col && col < obs.col + obs.w &&
            row >= obs.row && row < obs.row + obs.h) {
            return true;
        }
    }
    return false;
}

/**
 * Check if position is on the target
 */
function isOnTarget(x: number, y: number): boolean {
    const cx = (TARGET_COL + 0.5) * CELL_SIZE;
    const cy = (TARGET_ROW + 0.5) * CELL_SIZE;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    return dist < CELL_SIZE * 0.4;
}

/**
 * Trace a ray from the laser through placed blocks using Snell's Law.
 *
 * The ray advances in small steps. When it crosses a cell boundary where
 * the medium changes, we apply Snell's law to compute the new angle.
 */
export function traceRay(laserAngleDeg: number, blocks: PlacedBlock[]): RayTraceResult {
    const segments: RaySegment[] = [];
    const angleRad = ((laserAngleDeg + 90) * Math.PI) / 180; // 0° = straight down
    
    let x = (LASER_COL + 0.5) * CELL_SIZE;
    let y = (LASER_ROW + 0.5) * CELL_SIZE + 10;
    let dx = Math.cos(angleRad);
    let dy = Math.sin(angleRad);

    let currentMedium = getMediumAt(x, y, blocks);
    let segStartX = x;
    let segStartY = y;
    let totalRefractions = 0;
    let hitTarget = false;
    let hitTissue = false;
    let exitedCanvas = false;

    const STEP = 1.0;      // pixel step
    const MAX_STEPS = 5000; // safety limit

    for (let step = 0; step < MAX_STEPS; step++) {
        const nx = x + dx * STEP;
        const ny = y + dy * STEP;

        // Check bounds
        if (nx < 0 || nx >= CANVAS_W || ny < 0 || ny >= CANVAS_H) {
            segments.push({ x1: segStartX, y1: segStartY, x2: x, y2: y, medium: currentMedium });
            exitedCanvas = true;
            break;
        }

        // Check tissue
        if (isInTissue(nx, ny)) {
            segments.push({ x1: segStartX, y1: segStartY, x2: nx, y2: ny, medium: currentMedium });
            hitTissue = true;
            break;
        }

        // Check target
        if (isOnTarget(nx, ny)) {
            segments.push({ x1: segStartX, y1: segStartY, x2: nx, y2: ny, medium: currentMedium });
            hitTarget = true;
            break;
        }

        // Check medium change
        const newMedium = getMediumAt(nx, ny, blocks);
        if (newMedium !== currentMedium) {
            // Save current segment
            segments.push({ x1: segStartX, y1: segStartY, x2: x, y2: y, medium: currentMedium });

            // Apply Snell's law
            const n1 = getMaterial(currentMedium).n;
            const n2 = getMaterial(newMedium).n;

            // Determine the surface normal based on which cell edge was crossed
            const oldCol = Math.floor(x / CELL_SIZE);
            const oldRow = Math.floor(y / CELL_SIZE);
            const newCol = Math.floor(nx / CELL_SIZE);
            const newRow = Math.floor(ny / CELL_SIZE);

            let normalX = 0;
            let normalY = 0;
            if (newCol !== oldCol) normalX = newCol > oldCol ? 1 : -1;
            if (newRow !== oldRow) normalY = newRow > oldRow ? 1 : -1;

            // If both changed (corner hit), pick the major axis
            if (normalX !== 0 && normalY !== 0) {
                if (Math.abs(dx) > Math.abs(dy)) normalY = 0;
                else normalX = 0;
            }

            const normLen = Math.sqrt(normalX * normalX + normalY * normalY);
            if (normLen > 0) {
                normalX /= normLen;
                normalY /= normLen;
            }

            // Angle of incidence (relative to normal)
            const dot = dx * normalX + dy * normalY;
            const cosTheta1 = Math.abs(dot);
            const sinTheta1 = Math.sqrt(1 - cosTheta1 * cosTheta1);
            const sinTheta2 = (n1 / n2) * sinTheta1;

            if (sinTheta2 > 1) {
                // Total internal reflection
                if (normalX !== 0) dx = -dx;
                else dy = -dy;
            } else {
                // Refraction using vector form
                const cosTheta2 = Math.sqrt(1 - sinTheta2 * sinTheta2);
                const ratio = n1 / n2;
                const sign = dot < 0 ? 1 : -1;

                dx = ratio * dx + (ratio * cosTheta1 - cosTheta2) * normalX * sign;
                dy = ratio * dy + (ratio * cosTheta1 - cosTheta2) * normalY * sign;

                // Normalize direction
                const len = Math.sqrt(dx * dx + dy * dy);
                dx /= len;
                dy /= len;

                totalRefractions++;
            }

            currentMedium = newMedium;
            segStartX = x;
            segStartY = y;
        }

        x = nx;
        y = ny;
    }

    return { segments, hitTarget, hitTissue, exitedCanvas, totalRefractions };
}

// ---- Scoring ----

export function calculateSnellScore(
    result: RayTraceResult,
    blocksUsed: number,
    shotsUsed: number
): { score: number; efficiency: number } {
    if (!result.hitTarget) {
        return { score: 0, efficiency: 0 };
    }

    // Base: 100% for hitting target
    let score = 100;

    // Block efficiency bonus: fewer blocks = higher score
    // Optimal: 2 blocks, every extra block -5%
    const optimalBlocks = 2;
    if (blocksUsed > optimalBlocks) {
        score -= (blocksUsed - optimalBlocks) * 5;
    }

    // Shot efficiency: first shot = best, -10% per extra shot
    if (shotsUsed > 1) {
        score -= (shotsUsed - 1) * 10;
    }

    score = Math.max(40, Math.min(100, score));
    const efficiency = score / 100;

    return { score: Math.round(score), efficiency };
}
