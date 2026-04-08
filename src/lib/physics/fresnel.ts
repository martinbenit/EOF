// ============================================
// Escudo Invisible — Fresnel Equations Physics
// ============================================

export const N_AIR = 1.0;
export const N_SILICON = 3.5;

export interface CoatingMaterial {
    id: string;
    name: string;
    n: number;
    color: string;
    description: string;
}

export const COATING_MATERIALS: CoatingMaterial[] = [
    { id: 'none',   name: 'Sin Recubrimiento', n: 1.0,  color: 'transparent', description: 'Sin capa protectora' },
    { id: 'teflon', name: 'Teflón (PTFE)',     n: 1.3,  color: '#88ddaa',     description: 'Polímero fluorado, baja adherencia' },
    { id: 'mgf2',   name: 'MgF₂',             n: 1.38, color: '#aaccff',     description: 'Fluoruro de magnesio, clásico antirreflejo' },
    { id: 'sio2',   name: 'SiO₂',             n: 1.46, color: '#ccddff',     description: 'Dióxido de silicio, vidrio cuarzo' },
    { id: 'zro2',   name: 'ZrO₂',             n: 1.55, color: '#ddccee',     description: 'Óxido de circonio, alta dureza' },
];

export function getCoating(id: string): CoatingMaterial {
    return COATING_MATERIALS.find(m => m.id === id) || COATING_MATERIALS[0];
}

/**
 * Fresnel reflectance at normal incidence for a single interface:
 *   R = ((n1 - n2) / (n1 + n2))²
 */
export function fresnelReflectance(n1: number, n2: number): number {
    return ((n1 - n2) / (n1 + n2)) ** 2;
}

/**
 * Calculate effective reflectance with or without a coating layer.
 *
 * Without coating: R = ((n_air - n_si) / (n_air + n_si))²
 *
 * With coating (quarter-wave approx for ideal thickness):
 * The ideal antireflection coating has n_coat = sqrt(n_air * n_si) ≈ 1.87
 *
 * For a single-layer coating at normal incidence (quarter-wave):
 *   R_eff = ((n_air * n_si - n_coat²) / (n_air * n_si + n_coat²))²
 *
 * This gives R_eff → 0 when n_coat = sqrt(n_air * n_si)
 */
export function calculateReflectance(coatingId: string): number {
    const coating = getCoating(coatingId);

    if (coatingId === 'none' || coating.n === N_AIR) {
        // No coating: direct air-silicon interface
        return fresnelReflectance(N_AIR, N_SILICON);
    }

    // Quarter-wave coating model
    const nCoat = coating.n;
    const product = N_AIR * N_SILICON;  // 3.5
    const nCoatSq = nCoat * nCoat;
    const R = ((product - nCoatSq) / (product + nCoatSq)) ** 2;
    return R;
}

/**
 * Get reflectance as percentage 0-100
 */
export function getReflectancePercent(coatingId: string): number {
    return Math.round(calculateReflectance(coatingId) * 10000) / 100;
}

/**
 * Get the transmittance (useful energy captured)
 */
export function getTransmittancePercent(coatingId: string): number {
    return Math.round((1 - calculateReflectance(coatingId)) * 10000) / 100;
}

/**
 * Check if this coating achieves the win condition (R < 5%)
 */
export function isWinCondition(coatingId: string): boolean {
    return getReflectancePercent(coatingId) < 5;
}

/**
 * The ideal coating index: sqrt(n_air * n_silicon)
 */
export const IDEAL_N = Math.sqrt(N_AIR * N_SILICON); // ≈ 1.871

/**
 * Calculate score based on how close to ideal the coating is
 */
export function calculateFresnelScore(coatingId: string): { score: number; efficiency: number } {
    if (!isWinCondition(coatingId)) {
        return { score: 0, efficiency: 0 };
    }

    const R = getReflectancePercent(coatingId);

    // Score: lower reflectance = higher score
    // R < 1% → 100%, R < 2% → 90%, R < 5% → 70%
    let score: number;
    if (R < 1) score = 100;
    else if (R < 2) score = 90;
    else if (R < 3) score = 80;
    else if (R < 4) score = 75;
    else score = 70;

    return { score, efficiency: score / 100 };
}
