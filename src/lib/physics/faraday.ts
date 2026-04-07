// ============================================
// EOF-Gamificado (EON) — Faraday / Lenz Physics
// ============================================

/**
 * Faraday Induction Simulator
 * 
 * Models a magnet moving through a coil.
 * Voltage is proportional to magnet speed (Faraday's Law: ε = -dΦ/dt ≈ k·v).
 * Lenz's Law is represented as a friction force opposing the magnet motion.
 */

// ---- Constants ----
export const FARADAY_CONSTANT = 0.5; // k: voltage per unit speed
export const GREEN_MIN = 2.0; // Volts — optimal zone lower bound
export const GREEN_MAX = 4.0; // Volts — optimal zone upper bound
export const MAX_VOLTAGE = 6.0; // Max possible voltage at max speed
export const GAME_DURATION = 30; // seconds
export const TICK_RATE = 20; // ticks per second
export const TOTAL_TICKS = GAME_DURATION * TICK_RATE;

// Battery deltas per tick
export const CHARGE_RATE = 1.0;       // +1% per tick in green zone
export const DISCHARGE_RATE = 0.5;    // -0.5% per tick in yellow/low zone
export const OVERLOAD_PENALTY = 5.0;  // -5% per tick in red/overload zone

// Lenz friction coefficient (0 to 1) — higher speed → stronger pull to center
export const LENZ_FRICTION_COEFF = 0.04;

// ---- Types ----
export type VoltageZone = 'low' | 'optimal' | 'overload';

export interface FaradayState {
    velocity: number;       // Current magnet velocity (slider value, 0–10)
    voltage: number;        // Induced EMF (Volts)
    battery: number;        // Battery charge percentage (0–100)
    zone: VoltageZone;      // Current voltage zone
    magnetPosition: number; // Normalized magnet position along coil (-1 to 1)
    ticksElapsed: number;   // Total ticks elapsed
    isFinished: boolean;    // Game over flag
    won: boolean;           // Did the player win?
}

// ---- Factory ----
export function createInitialFaradayState(): FaradayState {
    return {
        velocity: 0,
        voltage: 0,
        battery: 0,
        zone: 'low',
        magnetPosition: 0,
        ticksElapsed: 0,
        isFinished: false,
        won: false,
    };
}

// ---- Core physics ----

/**
 * Calculate induced voltage from magnet speed.
 * ε = k * |v|
 */
export function calculateVoltage(velocity: number): number {
    return FARADAY_CONSTANT * Math.abs(velocity);
}

/**
 * Classify voltage into zone.
 */
export function classifyZone(voltage: number): VoltageZone {
    if (voltage >= GREEN_MIN && voltage <= GREEN_MAX) return 'optimal';
    if (voltage > GREEN_MAX) return 'overload';
    return 'low';
}

/**
 * Calculate Lenz friction factor.
 * Returns how much the velocity should decay toward zero per tick.
 * Higher velocity → stronger friction (opposing force).
 */
export function lenzFriction(velocity: number): number {
    return velocity * (1 - LENZ_FRICTION_COEFF * Math.abs(velocity));
}

/**
 * Calculate battery delta for a given zone.
 */
export function batteryDelta(zone: VoltageZone): number {
    switch (zone) {
        case 'optimal': return CHARGE_RATE;
        case 'low': return -DISCHARGE_RATE;
        case 'overload': return -OVERLOAD_PENALTY;
    }
}

/**
 * Advance the simulation by one tick.
 * The velocity comes from the player's slider input (already with Lenz friction applied in UI).
 */
export function stepFaraday(state: FaradayState, playerVelocity: number): FaradayState {
    if (state.isFinished) return state;

    const velocity = playerVelocity;
    const voltage = calculateVoltage(velocity);
    const zone = classifyZone(voltage);
    const delta = batteryDelta(zone);
    const newBattery = Math.max(0, Math.min(100, state.battery + delta));
    const ticksElapsed = state.ticksElapsed + 1;

    // Magnet position oscillates based on velocity direction
    const magnetPosition = Math.sin(ticksElapsed * 0.15) * (Math.abs(velocity) / 10);

    const won = newBattery >= 100;
    const isFinished = won || ticksElapsed >= TOTAL_TICKS;

    return {
        velocity,
        voltage,
        battery: newBattery,
        zone,
        magnetPosition,
        ticksElapsed,
        isFinished,
        won,
    };
}

// ---- Scoring ----

/**
 * Calculate score and efficiency based on game outcome.
 */
export function calculateFaradayScore(
    finalState: FaradayState,
): { score: number; efficiency: number } {
    if (finalState.won) {
        // Won — score based on how quickly the player charged the battery
        const timeRatio = 1 - (finalState.ticksElapsed / TOTAL_TICKS);
        const score = Math.round(70 + timeRatio * 30); // 70–100 for winners
        const efficiency = 0.5 + timeRatio * 0.5; // 0.5–1.0
        return { score, efficiency };
    } else {
        // Lost — score based on max battery reached
        const score = Math.round(finalState.battery * 0.7); // 0–70
        const efficiency = finalState.battery / 200; // 0–0.5 max
        return { score, efficiency };
    }
}

// ---- Color helpers ----

/**
 * Get the zone color for UI rendering.
 */
export function getZoneColor(zone: VoltageZone): string {
    switch (zone) {
        case 'optimal': return '#00ff88';
        case 'low': return '#ffaa00';
        case 'overload': return '#ff4444';
    }
}

/**
 * Get the voltage gauge fill ratio (0 to 1).
 */
export function getVoltageFillRatio(voltage: number): number {
    return Math.min(voltage / MAX_VOLTAGE, 1);
}
