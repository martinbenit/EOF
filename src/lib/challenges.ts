// ============================================
// EOF-Gamificado (EON) — Challenge Definitions
// ============================================

import { Challenge } from './types';

export const CHALLENGES: Challenge[] = [
    {
        id: 'lorentz',
        unit: 1,
        title: 'El Laberinto de Lorentz',
        subtitle: 'Control de Haces de Partículas',
        description:
            'Ajustá la intensidad de campos magnéticos para desviar cargas en movimiento y alcanzar el objetivo. Aplicá la Fuerza de Lorentz F = q(v × B) para guiar la partícula con la menor energía posible.',
        maxXp: 350,
        unlockLevel: 1,
        icon: '🧲',
        color: '#00f0ff',
        glowColor: 'rgba(0, 240, 255, 0.3)',
    },
    {
        id: 'maxwell',
        unit: 2,
        title: 'El Enigma de Maxwell',
        subtitle: 'Confinamiento Total',
        description:
            'Simulá la incidencia de ondas en una interfaz óptica. Encontrá el ángulo crítico para generar reflexión interna total y capturá la onda evanescente.',
        maxXp: 450,
        unlockLevel: 1,
        icon: '⚡',
        color: '#ff00aa',
        glowColor: 'rgba(255, 0, 170, 0.3)',
    },
    {
        id: 'quantum',
        unit: 3,
        title: 'El Salto Cuántico',
        subtitle: 'Sintonizando Quantum Dots',
        description:
            'Ajustá las dimensiones de un pozo de potencial cuántico para que el Quantum Dot emita fotones de un color específico. Dominá la Ecuación de Schrödinger.',
        maxXp: 550,
        unlockLevel: 1,
        icon: '🔮',
        color: '#8b5cf6',
        glowColor: 'rgba(139, 92, 246, 0.3)',
    },
    {
        id: 'nanophotonic',
        unit: 4,
        title: 'El Maestro Nanofotónico',
        subtitle: 'Diseño de Metasuperficies',
        description:
            'Utilizá plasmones y cristales fotónicos para manipular la luz y superar el límite de difracción. Diseñá una nanoantena eficiente.',
        maxXp: 700,
        unlockLevel: 1,
        icon: '💎',
        color: '#ffd700',
        glowColor: 'rgba(255, 215, 0, 0.3)',
    },
    {
        id: 'ion-pilot',
        unit: 1,
        title: 'Piloto de Iones',
        subtitle: 'Escape Microfluídico',
        description:
            'Controlá un cañón de iones de sodio a través de un canal microfluídico. Aplicá la Regla de la Mano Derecha para inyectar campos magnéticos entrantes o salientes y lograr evitar las frágiles paredes.',
        maxXp: 500,
        unlockLevel: 1,
        icon: '🕹️',
        color: '#ff4d4d',
        glowColor: 'rgba(255, 77, 77, 0.3)',
    },
    {
        id: 'smes-forge',
        unit: 1,
        title: 'Forja Cuántica',
        subtitle: 'Batería SMES',
        description:
            'Diseñá una bobina superconductora (SMES) para almacenar 1 MJ de energía magnética en el vacío. Optimizá radio e intensidad controlando el Potencial Vector A en el centro.',
        maxXp: 800,
        unlockLevel: 1,
        icon: '🔋',
        color: '#00ffaa',
        glowColor: 'rgba(0, 255, 170, 0.3)',
    },
];

export function getChallengeById(id: string): Challenge | undefined {
    return CHALLENGES.find((c) => c.id === id);
}
