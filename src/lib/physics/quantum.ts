// ============================================
// EOF-Gamificado — Quantum Physics Engine
// Pozo de potencial, Schrödinger, Quantum Dots
// ============================================

import { QuantumParams } from '../types';

// Physical constants (SI)
const HBAR = 1.0546e-34;  // J·s
const M_E = 9.109e-31;    // kg (electron mass)
const EV_TO_J = 1.602e-19; // J/eV
const NM_TO_M = 1e-9;
const H = 6.626e-34;      // Planck's constant
const C = 3e8;             // Speed of light m/s

// Energy levels for infinite square well: E_n = n²π²ħ² / (2mL²)
export function energyLevel(n: number, wellWidth_nm: number): number {
    const L = wellWidth_nm * NM_TO_M;
    const E_joules = (n * n * Math.PI * Math.PI * HBAR * HBAR) / (2 * M_E * L * L);
    return E_joules / EV_TO_J; // Return in eV
}

// Photon wavelength from transition E_n2 -> E_n1
export function transitionWavelength(n_upper: number, n_lower: number, wellWidth_nm: number): number {
    const E_upper = energyLevel(n_upper, wellWidth_nm);
    const E_lower = energyLevel(n_lower, wellWidth_nm);
    const deltaE = E_upper - E_lower;
    if (deltaE <= 0) return Infinity;
    const E_joules = deltaE * EV_TO_J;
    const wavelength_m = (H * C) / E_joules;
    return wavelength_m / NM_TO_M; // Return in nm
}

// Wavefunction ψ_n(x) for infinite square well (normalized)
export function wavefunction(n: number, x: number, wellWidth_nm: number): number {
    const L = wellWidth_nm;
    if (x < 0 || x > L) return 0;
    return Math.sqrt(2 / L) * Math.sin((n * Math.PI * x) / L);
}

// Probability density |ψ_n(x)|²
export function probabilityDensity(n: number, x: number, wellWidth_nm: number): number {
    const psi = wavefunction(n, x, wellWidth_nm);
    return psi * psi;
}

// Get all visible transitions for a given well width
export function getVisibleTransitions(wellWidth_nm: number): Array<{
    nUpper: number;
    nLower: number;
    wavelength: number;
    energy: number;
    visible: boolean;
}> {
    const transitions: Array<{
        nUpper: number;
        nLower: number;
        wavelength: number;
        energy: number;
        visible: boolean;
    }> = [];

    for (let nUpper = 2; nUpper <= 5; nUpper++) {
        for (let nLower = 1; nLower < nUpper; nLower++) {
            const wl = transitionWavelength(nUpper, nLower, wellWidth_nm);
            const energy = energyLevel(nUpper, wellWidth_nm) - energyLevel(nLower, wellWidth_nm);
            transitions.push({
                nUpper,
                nLower,
                wavelength: wl,
                energy,
                visible: wl >= 380 && wl <= 780,
            });
        }
    }

    return transitions;
}

// Heisenberg uncertainty: Δx·Δp ≥ ħ/2
export function heisenbergUncertainty(wellWidth_nm: number): {
    deltaX: number; // nm
    deltaP: number; // kg·m/s
    product: number; // should be ≥ ħ/2
    satisfiesLimit: boolean;
} {
    const L = wellWidth_nm * NM_TO_M;
    const deltaX = L / (2 * Math.sqrt(3)); // For ground state
    const deltaP = (Math.PI * HBAR) / L; // For ground state n=1
    const product = deltaX * deltaP;
    return {
        deltaX: deltaX / NM_TO_M,
        deltaP,
        product,
        satisfiesLimit: product >= HBAR / 2,
    };
}

export function calculateQuantumScore(
    params: QuantumParams,
    emittedWavelength: number
): { score: number; efficiency: number } {
    const diff = Math.abs(emittedWavelength - params.targetWavelength);
    const tolerance = params.targetWavelength * 0.02; // 2% tolerance = perfect

    let score: number;
    if (diff <= tolerance) score = 100;
    else if (diff <= tolerance * 2) score = 90;
    else if (diff <= tolerance * 5) score = 70;
    else if (diff <= tolerance * 10) score = 50;
    else score = Math.max(0, 30 - diff / 10);

    const efficiency = Math.max(0, 1 - diff / (params.targetWavelength * 0.2));

    return { score, efficiency };
}

export function createDefaultQuantumParams(): QuantumParams {
    return {
        wellWidth: 5, // nm
        wellDepth: 10, // eV
        targetWavelength: 520, // Green light
    };
}

// Wavelength to color helper
export function wavelengthToRGB(wavelength: number): { r: number; g: number; b: number } {
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

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}
