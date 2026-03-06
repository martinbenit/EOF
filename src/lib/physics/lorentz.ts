// ============================================
// EOF-Gamificado — Lorentz Force Physics Engine
// F = q(v × B)
// ============================================

import { Vector3, Particle, LorentzParams } from '../types';

export function crossProduct(a: Vector3, b: Vector3): Vector3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}

export function vectorMagnitude(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function lorentzForce(charge: number, velocity: Vector3, bField: Vector3): Vector3 {
    const cross = crossProduct(velocity, bField);
    return {
        x: charge * cross.x,
        y: charge * cross.y,
        z: charge * cross.z,
    };
}

export function stepParticle(particle: Particle, bField: Vector3, dt: number): Particle {
    const force = lorentzForce(particle.charge, particle.velocity, bField);

    const ax = force.x / particle.mass;
    const ay = force.y / particle.mass;

    const newVx = particle.velocity.x + ax * dt;
    const newVy = particle.velocity.y + ay * dt;

    const newPx = particle.position.x + newVx * dt;
    const newPy = particle.position.y + newVy * dt;

    const newTrail = [...particle.trail, { x: particle.position.x, y: particle.position.y }];
    if (newTrail.length > 300) newTrail.shift();

    return {
        ...particle,
        position: { x: newPx, y: newPy, z: particle.position.z },
        velocity: { x: newVx, y: newVy, z: particle.velocity.z },
        trail: newTrail,
    };
}

export function distanceToTarget(particle: Particle, target: { x: number; y: number }): number {
    const dx = particle.position.x - target.x;
    const dy = particle.position.y - target.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function calculateLorentzScore(
    params: LorentzParams,
    finalDistance: number,
    hitTarget: boolean
): { score: number; efficiency: number } {
    const bMagnitude = vectorMagnitude(params.bField);
    const maxBMagnitude = 10; // Reference max field strength

    // Score based on how close to target (or if hit)
    let score = 0;
    if (hitTarget) {
        score = 100;
    } else {
        const maxDistance = 500; // pixels
        score = Math.max(0, Math.round((1 - finalDistance / maxDistance) * 80));
    }

    // Efficiency: less B field used = more efficient
    const efficiency = Math.max(0, Math.min(1, 1 - bMagnitude / maxBMagnitude));

    return { score, efficiency };
}

export function createDefaultLorentzParams(): LorentzParams {
    return {
        bField: { x: 0, y: 0, z: 2 },
        initialVelocity: { x: 3, y: 0, z: 0 },
        targetPosition: { x: 600, y: 300 },
        particleCharge: 1,
        particleMass: 1,
    };
}

export function createParticle(params: LorentzParams): Particle {
    return {
        position: { x: 50, y: 200, z: 0 },
        velocity: { ...params.initialVelocity },
        charge: params.particleCharge,
        mass: params.particleMass,
        trail: [],
    };
}
