'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CHALLENGES } from '@/lib/challenges';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

const UNIT_TITLES: Record<number, string> = {
    1: 'UNIDAD TEMÁTICA I: Campos Magnéticos Estáticos',
    2: 'UNIDAD TEMÁTICA II: Campos Magnéticos Variables y Óptica Geométrica',
    3: 'UNIDAD TEMÁTICA III: Física Cuántica',
    4: 'UNIDAD TEMÁTICA IV: Nanofotónica',
};

export default function DesafiosPage() {
    const { session, user } = useAuth();
    const [progressData, setProgressData] = useState<Record<string, { status: string; xpEarned: number; bestScore: number | null }>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProgress = async () => {
            if (!session) { setLoading(false); return; }
            try {
                const res = await fetch('/api/progress', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                const data = await res.json();
                const map: Record<string, { status: string; xpEarned: number; bestScore: number | null }> = {};
                if (Array.isArray(data)) {
                    data.forEach(row => {
                        map[row.challenge_id] = {
                            status: row.status,
                            xpEarned: row.xp_earned,
                            bestScore: row.best_score,
                        };
                    });
                }
                setProgressData(map);
            } catch (err) {
                console.error('Error loading progress:', err);
            } finally {
                setLoading(false);
            }
        };
        loadProgress();
    }, [session]);

    // Group challenges by unit
    const unitGroups: Record<number, typeof CHALLENGES> = {};
    CHALLENGES.forEach(c => {
        if (!unitGroups[c.unit]) unitGroups[c.unit] = [];
        unitGroups[c.unit].push(c);
    });

    const sortedUnits = Object.keys(unitGroups).map(Number).sort((a, b) => a - b);

    return (
        <AuthGuard>
            <div className={styles.page}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Link href="/dashboard" className={styles.backLink}>
                            ← Dashboard
                        </Link>
                        <h1 className={styles.pageTitle}>🧪 Mapa de Desafíos</h1>
                        <p className={styles.pageSubtitle}>
                            Elegí los desafíos que quieras realizar. Cada unidad temática tiene simuladores interactivos para poner a prueba tus conocimientos.
                        </p>
                    </motion.div>

                    {loading ? (
                        <div style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center' }}>
                            Cargando desafíos...
                        </div>
                    ) : (
                        <div className={styles.unitsList}>
                            {sortedUnits.map((unit, unitIndex) => {
                                const challenges = unitGroups[unit];
                                const unitTitle = UNIT_TITLES[unit] || `UNIDAD TEMÁTICA ${unit}`;

                                return (
                                    <motion.div
                                        key={unit}
                                        className={styles.unitSection}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 * unitIndex, duration: 0.4 }}
                                    >
                                        <div className={styles.unitHeader}>
                                            <span className={styles.unitNumber}>{unit}</span>
                                            <h2 className={styles.unitTitle}>{unitTitle}</h2>
                                        </div>

                                        <div className={styles.challengeGrid}>
                                            {challenges.map((challenge, i) => {
                                                const prog = progressData[challenge.id];
                                                const isCompleted = prog?.status === 'completed';
                                                const hasScore = prog?.bestScore !== null && prog?.bestScore !== undefined;

                                                return (
                                                    <motion.div
                                                        key={challenge.id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: 0.15 * unitIndex + 0.08 * i }}
                                                    >
                                                        <Link
                                                            href={`/desafio/${challenge.id}`}
                                                            className={styles.challengeCard}
                                                            style={{
                                                                '--accent': challenge.color,
                                                                '--glow': challenge.glowColor,
                                                            } as React.CSSProperties}
                                                        >
                                                            <div className={styles.cardTop}>
                                                                <span className={styles.cardIcon}>{challenge.icon}</span>
                                                                {isCompleted && (
                                                                    <span className={styles.completedBadge}>✅</span>
                                                                )}
                                                            </div>
                                                            <h3 className={styles.cardTitle}>{challenge.title}</h3>
                                                            <p className={styles.cardSubtitle}>{challenge.subtitle}</p>
                                                            <p className={styles.cardDesc}>{challenge.description}</p>
                                                            <div className={styles.cardFooter}>
                                                                <span className={styles.cardXP}>
                                                                    ⭐ {hasScore ? `${prog.xpEarned}` : '0'} / {challenge.maxXp} XP
                                                                </span>
                                                                {hasScore && (
                                                                    <span className={styles.cardScore}>
                                                                        Mejor: {prog.bestScore}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className={styles.cardAction}>
                                                                {isCompleted ? 'Volver a jugar →' : 'Jugar →'}
                                                            </div>
                                                        </Link>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AuthGuard>
    );
}
