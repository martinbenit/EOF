// ============================================
// EOF-Gamificado — Nanophotonic Physics Engine
// Plasmones, metasuperficies, nanoantenas
// ============================================

import { NanophotonicParams } from '../types';

// Speed of light
const C = 3e8;
const NM_TO_M = 1e-9;

// Plasma frequencies for metals (rad/s, approximate)
const PLASMA_FREQ: Record<string, number> = {
    gold: 2.18e15,
    silver: 2.32e15,
    aluminum: 3.57e15,
};

// Damping rates
const DAMPING_RATE: Record<string, number> = {
    gold: 6.5e12,
    silver: 5.1e12,
    aluminum: 1.24e13,
};

// Drude model dielectric function
export function drudePermittivity(
    material: 'gold' | 'silver' | 'aluminum',
    wavelength_nm: number
): { real: number; imag: number } {
    const omega = (2 * Math.PI * C) / (wavelength_nm * NM_TO_M);
    const wp = PLASMA_FREQ[material];
    const gamma = DAMPING_RATE[material];

    const real = 1 - (wp * wp) / (omega * omega + gamma * gamma);
    const imag = (wp * wp * gamma) / (omega * (omega * omega + gamma * gamma));

    return { real, imag };
}

// Surface plasmon resonance wavelength (simplified)
export function plasmonResonanceWavelength(
    material: 'gold' | 'silver' | 'aluminum',
    particleSize_nm: number,
    surroundingIndex: number
): number {
    const wp = PLASMA_FREQ[material];
    // Fröhlich condition: ε_real = -2ε_m
    // For Drude: 1 - wp²/ω² = -2n²
    // ω² = wp²/(1 + 2n²)
    const n2 = surroundingIndex * surroundingIndex;
    const omega_res = wp / Math.sqrt(1 + 2 * n2);

    // Size correction (red-shift with increasing size)
    const sizeCorrection = 1 + 0.002 * particleSize_nm;

    const lambda_res = (2 * Math.PI * C) / omega_res;
    return (lambda_res / NM_TO_M) * sizeCorrection;
}

// Diffraction limit (Abbe): d = λ / (2n·sin(θ))
export function diffractionLimit(wavelength_nm: number, na: number): number {
    return wavelength_nm / (2 * na);
}

// Near-field enhancement factor (simplified model)
export function nearFieldEnhancement(
    material: 'gold' | 'silver' | 'aluminum',
    particleSize_nm: number,
    wavelength_nm: number
): number {
    const resonanceWl = plasmonResonanceWavelength(material, particleSize_nm, 1.0);
    const detuning = Math.abs(wavelength_nm - resonanceWl) / resonanceWl;

    // Lorentzian profile for enhancement
    const gamma_eff = 0.1; // Effective damping
    const enhancement = 1 / (detuning * detuning + gamma_eff * gamma_eff);

    // Scale by material quality factor
    const materialFactor = material === 'silver' ? 1.5 : material === 'gold' ? 1.0 : 0.6;

    return Math.min(enhancement * materialFactor * 0.01, 100);
}

// Bragg condition for photonic crystal: 2d·sin(θ) = nλ
export function braggCondition(spacing_nm: number, order: number): number {
    // At normal incidence (θ = 90°, sin(θ) = 1)
    return (2 * spacing_nm) / order;
}

// Antenna efficiency (simplified)
export function antennaEfficiency(
    params: NanophotonicParams
): {
    efficiency: number;
    resonanceMatch: number;
    fieldConfinement: number;
    bandgapOverlap: number;
} {
    const resonanceWl = plasmonResonanceWavelength(params.material, params.particleSize, 1.0);
    const resonanceMatch = Math.exp(
        -Math.pow((params.wavelength - resonanceWl) / (0.1 * resonanceWl), 2)
    );

    const diffLimit = diffractionLimit(params.wavelength, 1.4);
    const fieldConfinement = Math.min(1, diffLimit / (params.particleSize * 0.5));

    const braggWl = braggCondition(params.particleSpacing, 1);
    const bandgapOverlap = Math.exp(-Math.pow((params.wavelength - braggWl) / 100, 2));

    const efficiency = (resonanceMatch * 0.5 + fieldConfinement * 0.3 + bandgapOverlap * 0.2);

    return {
        efficiency: Math.min(1, Math.max(0, efficiency)),
        resonanceMatch,
        fieldConfinement,
        bandgapOverlap,
    };
}

export function calculateNanophotonicScore(
    params: NanophotonicParams
): { score: number; efficiency: number } {
    const result = antennaEfficiency(params);
    const score = Math.round(result.efficiency * 100);
    return { score, efficiency: result.efficiency };
}

export function createDefaultNanophotonicParams(): NanophotonicParams {
    return {
        particleSize: 80,
        particleSpacing: 200,
        material: 'gold',
        wavelength: 633, // HeNe laser wavelength
    };
}
