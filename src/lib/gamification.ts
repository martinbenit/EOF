// ============================================
// EOF-Gamificado (EON) — Gamification Engine
// ============================================

import { Achievement, ChallengeId, ChallengeResult } from './types';

// ---- Level System ----
export const XP_TABLE = [
    0,      // Level 1 (starting)
    100,    // Level 2
    250,    // Level 3
    500,    // Level 4
    1000,   // Level 5
    2000,   // Level 6
    3500,   // Level 7
    5500,   // Level 8
    8000,   // Level 9
    12000,  // Level 10 (max)
];

export const LEVEL_TITLES = [
    'Novato Cuántico',
    'Aprendiz de Maxwell',
    'Explorador de Campos',
    'Domador de Ondas',
    'Ingeniero Fotónico',
    'Maestro de Lorentz',
    'Arquitecto de Luz',
    'Señor de los Plasmones',
    'Sabio Nanofotónico',
    'Leyenda de la Física',
];

export function getLevelFromXP(totalXp: number): number {
    for (let i = XP_TABLE.length - 1; i >= 0; i--) {
        if (totalXp >= XP_TABLE[i]) return i + 1;
    }
    return 1;
}

export function getXPForNextLevel(level: number): number {
    if (level >= XP_TABLE.length) return XP_TABLE[XP_TABLE.length - 1];
    return XP_TABLE[level]; // XP_TABLE[level] is the threshold for level+1
}

export function getLevelProgress(totalXp: number): number {
    const level = getLevelFromXP(totalXp);
    if (level >= XP_TABLE.length) return 100;
    const currentLevelXP = XP_TABLE[level - 1];
    const nextLevelXP = XP_TABLE[level];
    const progress = ((totalXp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
}

export function getLevelTitle(level: number): string {
    return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

export const CHALLENGE_BASE_XP: Record<ChallengeId, number> = {
    lorentz: 200,
    maxwell: 250,
    quantum: 300,
    nanophotonic: 400,
    'ion-pilot': 200,
    'smes-forge': 400,
    'faraday': 200,
    'poynting': 200,
    'snell': 250,
    'fresnel': 150,
};

export const CHALLENGE_MAX_BONUS: Record<ChallengeId, number> = {
    lorentz: 150,
    maxwell: 200,
    quantum: 250,
    nanophotonic: 300,
    'ion-pilot': 300,
    'smes-forge': 400,
    'faraday': 200,
    'poynting': 200,
    'snell': 250,
    'fresnel': 200,
};

export function calculateChallengeResult(
    challengeId: ChallengeId,
    score: number, // 0 to 100
    efficiency: number, // 0 to 1 (how efficiently the challenge was solved)
    timeSeconds: number = 0,
    hintsUsed: number = 0
): ChallengeResult {
    const rawBaseXP = Math.round(CHALLENGE_BASE_XP[challengeId] * (score / 100));
    const rawBonusXP = Math.round(CHALLENGE_MAX_BONUS[challengeId] * efficiency);

    // Time Penalty: -1% XP every 10s over 60s (max 40% penalty)
    let timePenaltyFactor = 1;
    if (timeSeconds > 60) {
        const penalty = Math.min(0.4, ((timeSeconds - 60) / 10) * 0.01);
        timePenaltyFactor = 1 - penalty;
    }

    // Hint Penalty: -15% XP per hint
    let hintPenaltyFactor = Math.max(0.3, 1 - (hintsUsed * 0.15));

    const combinedPenalty = timePenaltyFactor * hintPenaltyFactor;

    const baseXP = Math.round(rawBaseXP * combinedPenalty);
    const bonusXP = Math.round(rawBonusXP * combinedPenalty);
    const totalXP = baseXP + bonusXP;

    const achievements = checkAchievements(challengeId, score, efficiency);

    let feedback = '';
    if (score >= 95) feedback = '¡Perfecto! Dominio absoluto. 🌟';
    else if (score >= 80) feedback = '¡Excelente! Muy buen manejo de los conceptos. 🎯';
    else if (score >= 60) feedback = 'Buen trabajo. Podés mejorar la eficiencia. 💪';
    else if (score >= 40) feedback = 'Vas por buen camino. Revisá los conceptos clave. 📚';
    else feedback = 'No te rindas. Revisá la teoría e intentá de nuevo. 🔄';

    return { baseXP, bonusXP, totalXP, score, achievementsUnlocked: achievements, feedback };
}

// ---- Achievements ----
export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
    {
        key: 'first_challenge',
        title: 'Primer Paso',
        description: 'Completaste tu primer desafío',
        icon: '🚀',
        xpReward: 50,
    },
    {
        key: 'lorentz_master',
        title: 'Domador de la Fuerza de Lorentz',
        description: 'Obtuviste score perfecto en el Laberinto de Lorentz',
        icon: '🧲',
        xpReward: 100,
    },
    {
        key: 'maxwell_master',
        title: 'Maestro de las Ecuaciones de Maxwell',
        description: 'Unificaste campos variables y dominaste la reflexión total',
        icon: '⚡',
        xpReward: 100,
    },
    {
        key: 'quantum_master',
        title: 'Sintonizador Cuántico',
        description: 'Sintonizaste los Quantum Dots con precisión perfecta',
        icon: '🔮',
        xpReward: 100,
    },
    {
        key: 'nanophotonic_master',
        title: 'Arquitecto Nanofotónico',
        description: 'Diseñaste una nanoantena con eficiencia máxima',
        icon: '💎',
        xpReward: 150,
    },
    {
        key: 'efficiency_king',
        title: 'Rey de la Eficiencia',
        description: 'Completaste un desafío con eficiencia > 90%',
        icon: '👑',
        xpReward: 75,
    },
    {
        key: 'all_challenges',
        title: 'Maestro EOF',
        description: 'Completaste los 4 desafíos',
        icon: '🏆',
        xpReward: 500,
    },
    {
        key: 'heisenberg_limit',
        title: 'Más allá de Heisenberg',
        description: 'Superaste el Límite de Incertidumbre',
        icon: '🌀',
        xpReward: 100,
    },
    {
        key: 'faraday_master',
        title: 'Bio-Electricista',
        description: 'Cargaste el nano-marcapasos con precisión perfecta usando inducción electromagnética',
        icon: '❤️‍🔥',
        xpReward: 100,
    },
    {
        key: 'poynting_master',
        title: 'Señor de las Ondas',
        description: 'Sincronizaste E y B con precisión perfecta para maximizar el Vector de Poynting',
        icon: '⚡',
        xpReward: 100,
    },
    {
        key: 'snell_master',
        title: 'Francotirador Fotónico',
        description: 'Eliminaste el virus usando refracción precisa con la Ley de Snell',
        icon: '🎯',
        xpReward: 100,
    },
    {
        key: 'fresnel_master',
        title: 'Alquimista de la Luz',
        description: 'Minimizaste la reflexión usando el recubrimiento antirreflejo perfecto',
        icon: '🛡️',
        xpReward: 100,
    },
];

function checkAchievements(
    challengeId: ChallengeId,
    score: number,
    efficiency: number
): string[] {
    const unlocked: string[] = [];

    // Challenge-specific mastery
    if (score >= 95) {
        unlocked.push(`${challengeId}_master`);
    }

    // Efficiency king
    if (efficiency >= 0.9) {
        unlocked.push('efficiency_king');
    }

    // Heisenberg limit (quantum challenge specific)
    if (challengeId === 'quantum' && score >= 85) {
        unlocked.push('heisenberg_limit');
    }

    return unlocked;
}

// ---- Verification Code ----
export function generateVerificationCode(
    clerkId: string,
    challengeId: string,
    completedAt: string
): string {
    const raw = `${clerkId}-${challengeId}-${completedAt}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `EOF-${Math.abs(hash).toString(36).toUpperCase().slice(0, 8)}`;
}
