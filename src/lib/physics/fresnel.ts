// ============================================
// Escudo Invisible — Fresnel Equations & Brewster Angle
// ============================================

export const N_AIR = 1.0;

export interface PhotonicMaterial {
    id: string;
    name: string;
    n: number;
    color: string;
    description: string;
}

export const PHOTONIC_MATERIALS: PhotonicMaterial[] = [
    { id: 'polimero', name: 'Polímero', n: 1.33, color: '#ff77aa', description: 'Plástico transparente, bajo índice' },
    { id: 'vidrio',   name: 'Vidrio',   n: 1.50, color: '#aaccff', description: 'Vidrio de ventana convencional' },
    { id: 'nitruro',  name: 'Nitruro de Silicio', n: 2.00, color: '#44ee88', description: 'Usado en fotónica integrada' },
    { id: 'diamante', name: 'Diamante', n: 2.42, color: '#eeccff', description: 'Estructura cristalina, índice muy alto' },
];

export function getMaterial(id: string): PhotonicMaterial {
    return PHOTONIC_MATERIALS.find(m => m.id === id) || PHOTONIC_MATERIALS[0];
}

export type PolarizationType = 's' | 'p'; // 's' = perpendicular, 'p' = paralela

/**
 * Calculates Fresnel Reflectance and Transmittance
 * based on incidence angle and polarization.
 * @param n1 Refractive index of origin medium
 * @param n2 Refractive index of destination medium
 * @param thetaI_deg Incidence angle in degrees
 * @param polarization Polarization type ('s' or 'p')
 * @returns R (reflectance) and T (transmittance) as values between 0 and 1
 */
export function calculateFresnel(n1: number, n2: number, thetaI_deg: number, polarization: PolarizationType): { R: number, T: number, thetaT_deg: number } {
    const thetaI = thetaI_deg * Math.PI / 180;
    
    // Snell's Law: n1 * sin(thetaI) = n2 * sin(thetaT)
    const sinThetaT = (n1 / n2) * Math.sin(thetaI);
    
    // Check for Total Internal Reflection (TIR) - although not possible from n1=1 to n2>1, good for general purpose
    if (sinThetaT > 1 || sinThetaT < -1) {
        return { R: 1, T: 0, thetaT_deg: 90 };
    }
    
    const thetaT = Math.asin(sinThetaT);
    
    const cosThetaI = Math.cos(thetaI);
    const cosThetaT = Math.cos(thetaT);
    
    let R = 0;
    
    if (polarization === 's') {
        const rs = (n1 * cosThetaI - n2 * cosThetaT) / (n1 * cosThetaI + n2 * cosThetaT);
        R = rs * rs;
    } else { // 'p'
        const rp = (n2 * cosThetaI - n1 * cosThetaT) / (n2 * cosThetaI + n1 * cosThetaT);
        R = rp * rp;
    }
    
    return {
        R,
        T: 1 - R,
        thetaT_deg: thetaT * 180 / Math.PI
    };
}

/**
 * Calculates the exact Brewster angle where 'p' reflectance is zero.
 */
export function getBrewsterAngleDeg(n1: number, n2: number): number {
    return Math.atan(n2 / n1) * 180 / Math.PI;
}

/**
 * Check if the given values result in the win condition (R < 0.1%)
 */
export function isBrewsterWinCondition(n1: number, n2: number, thetaI_deg: number, polarization: PolarizationType): boolean {
    const { R } = calculateFresnel(n1, n2, thetaI_deg, polarization);
    return R * 100 < 0.1;
}

/**
 * Calculate score based on how close reflectance is to 0
 */
export function calculateBrewsterScore(R: number, polarization: PolarizationType, isWin: boolean): { score: number; efficiency: number } {
    if (!isWin) {
        return { score: 0, efficiency: 0 };
    }

    // Since they hit R < 0.1%, they essentially get maximum score
    let score = 100;
    if (R * 100 < 0.01) score = 100;
    else if (R * 100 < 0.05) score = 95;
    else score = 90;

    return { score, efficiency: score / 100 };
}
