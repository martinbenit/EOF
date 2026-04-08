// ============================================
// Sincronía Maxwell — Poynting Vector Physics
// ============================================

export const TICK_RATE = 20;          // 20 Hz
export const HOLD_DURATION = 3;       // seconds at >95% to win
export const E_MAX = 1;              // normalized
export const B_MAX = 1;              // normalized

/**
 * Calculate the Poynting vector magnitude (normalized 0–1)
 *
 * S = E_max * B_max * cos(phaseShift) * sin(relativeAngle)
 *
 * Maximum when phaseShift = 0° (in phase) and relativeAngle = 90° (perpendicular)
 */
export function calculatePoynting(phaseShiftDeg: number, relativeAngleDeg: number): number {
    const phaseRad = (phaseShiftDeg * Math.PI) / 180;
    const angleRad = (relativeAngleDeg * Math.PI) / 180;
    return Math.max(0, E_MAX * B_MAX * Math.cos(phaseRad) * Math.sin(angleRad));
}

/**
 * Get power percentage (0-100)
 */
export function getPowerPercent(phaseShiftDeg: number, relativeAngleDeg: number): number {
    return Math.round(calculatePoynting(phaseShiftDeg, relativeAngleDeg) * 100);
}

/**
 * Get zone classification based on power
 */
export function getZone(power: number): 'critical' | 'low' | 'good' | 'optimal' {
    if (power >= 95) return 'optimal';
    if (power >= 70) return 'good';
    if (power >= 30) return 'low';
    return 'critical';
}

/**
 * Get zone color
 */
export function getZoneColor(zone: string): string {
    switch (zone) {
        case 'optimal': return '#00ff88';
        case 'good': return '#ffd700';
        case 'low': return '#ff8800';
        case 'critical': return '#ff4444';
        default: return '#666';
    }
}

export interface PoyntingState {
    phaseShift: number;       // degrees 0-180
    relativeAngle: number;    // degrees 0-180
    power: number;            // 0-100
    holdTime: number;         // seconds held above 95%
    elapsed: number;          // total seconds elapsed
    won: boolean;
    isFinished: boolean;
    ticks: number;
}

export function createInitialPoyntingState(): PoyntingState {
    return {
        phaseShift: 90,       // start misaligned
        relativeAngle: 45,    // start non-perpendicular
        power: 0,
        holdTime: 0,
        elapsed: 0,
        won: false,
        isFinished: false,
        ticks: 0,
    };
}

export function stepPoynting(
    state: PoyntingState,
    phaseShift: number,
    relativeAngle: number
): PoyntingState {
    const ticks = state.ticks + 1;
    const elapsed = ticks / TICK_RATE;
    const power = getPowerPercent(phaseShift, relativeAngle);

    let holdTime = state.holdTime;
    if (power >= 95) {
        holdTime += 1 / TICK_RATE;
    } else {
        holdTime = Math.max(0, holdTime - 0.5 / TICK_RATE); // slowly decay
    }

    const won = holdTime >= HOLD_DURATION;

    return {
        phaseShift,
        relativeAngle,
        power,
        holdTime,
        elapsed,
        won,
        isFinished: won,
        ticks,
    };
}

/**
 * Calculate final score based on how quickly they achieved sync
 */
export function calculatePoyntingScore(state: PoyntingState): { score: number; efficiency: number } {
    if (!state.won) {
        const partialCredit = Math.min(state.holdTime / HOLD_DURATION, 0.9);
        return { score: Math.round(partialCredit * 50), efficiency: partialCredit * 0.5 };
    }

    // Score based on time to win (faster = better)
    // Perfect: under 5s → 100%
    // Good: 5-15s → 90-70%
    // Slow: 15-30s → 70-50%
    const t = state.elapsed;
    let score: number;
    if (t <= 5) score = 100;
    else if (t <= 15) score = 100 - (t - 5) * 2;         // 100→80
    else if (t <= 30) score = 80 - (t - 15) * 1;          // 80→65
    else score = Math.max(50, 65 - (t - 30) * 0.5);       // 65→50

    score = Math.round(Math.max(50, score));
    const efficiency = score / 100;

    return { score, efficiency };
}
