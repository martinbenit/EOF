// ============================================
// EOF-Gamificado — Maxwell / Snell's Law Physics Engine
// Reflexión interna total y onda evanescente
// ============================================

import { MaxwellParams } from '../types';

export function snellAngle(n1: number, n2: number, thetaI: number): number | null {
    const sinThetaT = (n1 / n2) * Math.sin(thetaI);
    if (Math.abs(sinThetaT) > 1) return null; // Total internal reflection
    return Math.asin(sinThetaT);
}

export function criticalAngle(n1: number, n2: number): number | null {
    if (n1 <= n2) return null; // Only exists when n1 > n2
    return Math.asin(n2 / n1);
}

export function fresnelCoefficients(
    n1: number,
    n2: number,
    thetaI: number
): { rs: number; rp: number; ts: number; tp: number; R: number; T: number } {
    const cosI = Math.cos(thetaI);
    const sinT = (n1 / n2) * Math.sin(thetaI);

    if (Math.abs(sinT) >= 1) {
        // Total internal reflection
        return { rs: 1, rp: 1, ts: 0, tp: 0, R: 1, T: 0 };
    }

    const cosT = Math.sqrt(1 - sinT * sinT);

    const rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
    const rp = (n2 * cosI - n1 * cosT) / (n2 * cosI + n1 * cosT);
    const ts = (2 * n1 * cosI) / (n1 * cosI + n2 * cosT);
    const tp = (2 * n1 * cosI) / (n2 * cosI + n1 * cosT);

    const R = (rs * rs + rp * rp) / 2;
    const T = 1 - R;

    return { rs, rp, ts, tp, R, T };
}

export function evanescentDecayLength(
    n1: number,
    n2: number,
    thetaI: number,
    wavelength: number
): number {
    const sinI = Math.sin(thetaI);
    const term = Math.sqrt(n1 * n1 * sinI * sinI - n2 * n2);
    if (term <= 0) return Infinity;
    return wavelength / (2 * Math.PI * term);
}

export function isTotalInternalReflection(n1: number, n2: number, thetaI: number): boolean {
    if (n1 <= n2) return false;
    const critical = criticalAngle(n1, n2);
    if (critical === null) return false;
    return thetaI >= critical;
}

export function calculateMaxwellScore(
    params: MaxwellParams,
    foundTIR: boolean,
    anglePrecision: number // how close to critical angle (degrees)
): { score: number; efficiency: number } {
    let score = 0;

    if (foundTIR) {
        // Score based on precision (closer to critical angle = better)
        if (anglePrecision <= 0.5) score = 100;
        else if (anglePrecision <= 1) score = 95;
        else if (anglePrecision <= 2) score = 85;
        else if (anglePrecision <= 5) score = 70;
        else score = 50;
    } else {
        score = Math.max(0, 30 - anglePrecision);
    }

    const efficiency = foundTIR ? Math.max(0, 1 - anglePrecision / 10) : 0;

    return { score, efficiency };
}

export function createDefaultMaxwellParams(): MaxwellParams {
    return {
        n1: 1.5, // Glass
        n2: 1.0, // Air
        incidenceAngle: 30,
        wavelength: 550, // Green light
    };
}

export const MEDIA_PRESETS: Record<string, number> = {
    'Vacío': 1.0,
    'Aire': 1.0003,
    'Agua': 1.33,
    'Vidrio Crown': 1.52,
    'Vidrio Flint': 1.62,
    'Diamante': 2.42,
    'Silicio': 3.42,
    'GaAs': 3.5,
};

export function wavelengthToColor(wavelength: number): string {
    let r = 0, g = 0, b = 0;

    if (wavelength >= 380 && wavelength < 440) {
        r = -(wavelength - 440) / (440 - 380);
        b = 1;
    } else if (wavelength >= 440 && wavelength < 490) {
        g = (wavelength - 440) / (490 - 440);
        b = 1;
    } else if (wavelength >= 490 && wavelength < 510) {
        g = 1;
        b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
        r = (wavelength - 510) / (580 - 510);
        g = 1;
    } else if (wavelength >= 580 && wavelength < 645) {
        r = 1;
        g = -(wavelength - 645) / (645 - 580);
    } else if (wavelength >= 645 && wavelength <= 780) {
        r = 1;
    }

    r = Math.round(r * 255);
    g = Math.round(g * 255);
    b = Math.round(b * 255);

    return `rgb(${r}, ${g}, ${b})`;
}
