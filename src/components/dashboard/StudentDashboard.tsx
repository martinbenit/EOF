'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CHALLENGES } from '@/lib/challenges';
import { getLevelFromXP, getLevelProgress, getLevelTitle, XP_TABLE } from '@/lib/gamification';
import { useAuth } from '@/lib/auth';
import type { UserProfile } from '@/lib/types';
import styles from '@/app/dashboard/page.module.css';

// Demo progress tracking (will connect to DB later)
const DEMO_PROGRESS: Record<string, { status: string; xpEarned: number; bestScore: number | null }> = {
    lorentz: { status: 'completed', xpEarned: 280, bestScore: 87 },
    maxwell: { status: 'in_progress', xpEarned: 170, bestScore: 62 },
    quantum: { status: 'available', xpEarned: 0, bestScore: null },
    nanophotonic: { status: 'locked', xpEarned: 0, bestScore: null },
};

const DEMO_LEADERBOARD = [
    { rank: 1, name: 'María G.', xp: 1850, level: 7 },
    { rank: 2, name: 'Juan P.', xp: 1420, level: 6 },
    { rank: 3, name: 'Lucas R.', xp: 980, level: 5 },
    { rank: 4, name: 'Ana S.', xp: 720, level: 4 },
];

const statusConfig: Record<string, { label: string; className: string }> = {
    completed: { label: '✅ Completado', className: styles.statusCompleted },
    in_progress: { label: '🔄 En Progreso', className: styles.statusInProgress },
    available: { label: '🟢 Disponible', className: styles.statusAvailable },
    locked: { label: '🔒 Bloqueado', className: styles.statusLocked },
};

export default function StudentDashboard({ profile, user }: { profile: UserProfile; user: any }) {
    const { refreshProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(profile.displayName);
    const [saving, setSaving] = useState(false);

    const level = getLevelFromXP(profile.totalXp);
    const progress = getLevelProgress(profile.totalXp);
    const title = getLevelTitle(level);
    const nextLevelXP = level < XP_TABLE.length ? XP_TABLE[level] : XP_TABLE[XP_TABLE.length - 1];

    const handleSaveName = async () => {
        if (!editName.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: profile.id, displayName: editName }),
            });
            if (res.ok) {
                await refreshProfile();
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Failed to save name:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.dashboard}>
            <div className="container">
                {/* Profile Header */}
                <motion.div
                    className={styles.profileHeader}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className={styles.profile}>
                        <div className={styles.avatar}>
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <span className={styles.avatarEmoji}>🧑‍🔬</span>
                            )}
                            <div className={styles.levelBadge}>{level}</div>
                        </div>
                        <div className={styles.profileInfo}>
                            {isEditing ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="form-control"
                                        style={{ fontSize: '1.2rem', padding: '4px 12px', width: '250px' }}
                                        disabled={saving}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={saving}>
                                        {saving ? '...' : 'Guardar'}
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)} disabled={saving}>
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <h1 className={styles.profileName}>
                                    {profile.displayName}
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '10px', opacity: 0.5 }}
                                        title="Editar nombre"
                                    >
                                        ✏️
                                    </button>
                                </h1>
                            )}
                            <p className={styles.profileTitle}>{title}</p>
                        </div>
                    </div>

                    <div className={styles.xpSection}>
                        <div className={styles.xpDisplay}>
                            <span className={styles.xpValue}>{profile.totalXp}</span>
                            <span className={styles.xpLabel}>XP Total</span>
                        </div>
                        <div className={styles.xpBarContainer}>
                            <div className={styles.xpBarHeader}>
                                <span className={styles.xpBarLevel}>Nivel {level}</span>
                                <span className={styles.xpBarProgress}>
                                    {profile.totalXp} / {nextLevelXP} XP
                                </span>
                            </div>
                            <div className="progress-bar">
                                <motion.div
                                    className="progress-bar__fill"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className={styles.mainGrid}>
                    {/* Challenge Map */}
                    <div className={styles.challengeMapSection}>
                        <h2 className={styles.sectionTitle}>🗺️ Mapa de Desafíos</h2>
                        <div className={styles.challengeList}>
                            {CHALLENGES.map((challenge, i) => {
                                const prog = DEMO_PROGRESS[challenge.id];
                                const status = statusConfig[prog.status];
                                return (
                                    <motion.div
                                        key={challenge.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + i * 0.1 }}
                                    >
                                        <Link
                                            href={prog.status !== 'locked' ? `/desafio/${challenge.id}` : '#'}
                                            className={`${styles.challengeItem} ${prog.status === 'locked' ? styles.challengeItemLocked : ''}`}
                                            style={{
                                                borderColor: prog.status !== 'locked' ? challenge.color + '33' : undefined,
                                                '--accent': challenge.color,
                                            } as React.CSSProperties}
                                        >
                                            <div className={styles.challengeItemLeft}>
                                                <span className={styles.challengeItemIcon}>{challenge.icon}</span>
                                                <div>
                                                    <div className={styles.challengeItemUnit}>Unidad {challenge.unit}</div>
                                                    <div className={styles.challengeItemTitle}>{challenge.title}</div>
                                                    <div className={`${styles.challengeItemStatus} ${status.className}`}>
                                                        {status.label}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={styles.challengeItemRight}>
                                                {prog.bestScore !== null && (
                                                    <div className={styles.bestScore}>
                                                        Mejor: <strong>{prog.bestScore}%</strong>
                                                    </div>
                                                )}
                                                <div className={styles.challengeItemXP}>
                                                    +{prog.xpEarned} / {challenge.maxXp} XP
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        {/* Quick Stats */}
                        <motion.div
                            className={`glass-card ${styles.statsCard}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h3 className={styles.cardTitle}>📊 Tus Estadísticas</h3>
                            <div className={styles.statsList}>
                                <div className={styles.statsItem}>
                                    <span className={styles.statsItemLabel}>Desafíos Completados</span>
                                    <span className={styles.statsItemValue}>1 / 4</span>
                                </div>
                                <div className={styles.statsItem}>
                                    <span className={styles.statsItemLabel}>Intentos Totales</span>
                                    <span className={styles.statsItemValue}>5</span>
                                </div>
                                <div className={styles.statsItem}>
                                    <span className={styles.statsItemLabel}>Logros Desbloqueados</span>
                                    <span className={styles.statsItemValue}>2 / 8</span>
                                </div>
                                <div className={styles.statsItem}>
                                    <span className={styles.statsItemLabel}>Posición en Ranking</span>
                                    <span className={styles.statsItemValue}>#5</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Leaderboard Preview */}
                        <motion.div
                            className={`glass-card ${styles.leaderboardCard}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <h3 className={styles.cardTitle}>🏆 Top Ranking</h3>
                            <div className={styles.leaderboardList}>
                                {DEMO_LEADERBOARD.map((entry) => (
                                    <div
                                        key={entry.rank}
                                        className={styles.leaderboardRow}
                                    >
                                        <span className={styles.leaderboardRank}>
                                            {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                                        </span>
                                        <span className={styles.leaderboardName}>{entry.name}</span>
                                        <span className={styles.leaderboardXP}>{entry.xp} XP</span>
                                    </div>
                                ))}
                                {/* Current User Preview */}
                                <div className={`${styles.leaderboardRow} ${styles.leaderboardRowHighlight}`}>
                                    <span className={styles.leaderboardRank}>#5</span>
                                    <span className={styles.leaderboardName}>{profile.displayName} (Tú)</span>
                                    <span className={styles.leaderboardXP}>{profile.totalXp} XP</span>
                                </div>
                            </div>
                            <Link href="/leaderboard" className="btn btn-ghost" style={{ width: '100%', marginTop: '12px' }}>
                                Ver ranking completo →
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
