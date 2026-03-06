// ============================================
// EOF-Gamificado (EON) — TypeScript Types
// ============================================

// ---- User & Profile ----
export interface UserProfile {
  id: string;
  clerkId: string;
  displayName: string;
  avatarUrl: string | null;
  totalXp: number;
  level: number;
  createdAt: string;
}

// ---- Challenges ----
export type ChallengeId = 'lorentz' | 'maxwell' | 'quantum' | 'nanophotonic';

export type ChallengeStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface Challenge {
  id: ChallengeId;
  unit: number;
  title: string;
  subtitle: string;
  description: string;
  maxXp: number;
  unlockLevel: number;
  icon: string;
  color: string;
  glowColor: string;
}

export interface ChallengeProgress {
  id: string;
  profileId: string;
  challengeId: ChallengeId;
  status: ChallengeStatus;
  xpEarned: number;
  bestScore: number | null;
  attempts: number;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
}

// ---- Gamification ----
export interface ChallengeResult {
  baseXP: number;
  bonusXP: number;
  totalXP: number;
  score: number; // 0-100
  achievementsUnlocked: string[];
  feedback: string;
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: string;
}

// ---- Leaderboard ----
export interface LeaderboardEntry {
  rank: number;
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  totalXp: number;
  level: number;
  challengesCompleted: number;
}

// ---- Physics Simulation ----
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Particle {
  position: Vector3;
  velocity: Vector3;
  charge: number;
  mass: number;
  trail: Array<{ x: number; y: number }>;
}

export interface SimulationState {
  running: boolean;
  time: number;
  dt: number;
}

// ---- Challenge specific params ----
export interface LorentzParams {
  bField: Vector3;
  initialVelocity: Vector3;
  targetPosition: { x: number; y: number };
  particleCharge: number;
  particleMass: number;
}

export interface MaxwellParams {
  n1: number; // refractive index medium 1
  n2: number; // refractive index medium 2
  incidenceAngle: number; // degrees
  wavelength: number; // nm
}

export interface QuantumParams {
  wellWidth: number; // nm
  wellDepth: number; // eV
  targetWavelength: number; // nm (color target)
}

export interface NanophotonicParams {
  particleSize: number; // nm
  particleSpacing: number; // nm
  material: 'gold' | 'silver' | 'aluminum';
  wavelength: number; // nm
}

// ---- Moodle Integration ----
export interface SuccessCardData {
  studentName: string;
  challengeTitle: string;
  challengeId: ChallengeId;
  xpEarned: number;
  score: number;
  completedAt: string;
  verificationCode: string;
}
