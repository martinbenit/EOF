'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AuthGuard from '@/components/auth/AuthGuard';
import styles from './page.module.css';

interface LeaderboardEntry {
    rank: number;
    id: string;
    name: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    challenges: number;
    badge: string;
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/leaderboard');
                const data = await res.json();
                setLeaderboard(data);
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const maxXP = leaderboard.length > 0 ? leaderboard[0].xp : 1;
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    return (
        <AuthGuard>
            <div className={styles.leaderboard}>
                <div className="container">
                    <motion.div
                        className={styles.header}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1>🏆 Ranking Global</h1>
                        <p className={styles.headerSubtitle}>
                            Los mejores estudiantes de Electromagnetismo, Óptica y Fotónica
                        </p>
                    </motion.div>

                    {loading ? (
                        <div style={{ textAlign: 'center', margin: '40px 0', color: 'var(--text-secondary)' }}>
                            Cargando ranking... ⏳
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div style={{ textAlign: 'center', margin: '40px 0', color: 'var(--text-secondary)' }}>
                            Aún no hay estudiantes registrados en el ranking.
                        </div>
                    ) : (
                        <>
                            {/* Podium */}
                            {top3.length > 0 && (
                                <motion.div
                                    className={styles.podium}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {[1, 0, 2].map((index) => {
                                        const entry = top3[index];
                                        if (!entry) return <div key={index} className={styles.podiumEntry} style={{ opacity: 0 }} />;

                                        const heights = [180, 220, 150];
                                        return (
                                            <motion.div
                                                key={entry.rank}
                                                className={`${styles.podiumEntry} ${index === 0 ? styles.podiumFirst : ''}`}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 + index * 0.15 }}
                                            >
                                                <div className={styles.podiumAvatar}>
                                                    {entry.avatarUrl ? (
                                                        <img src={entry.avatarUrl} alt={entry.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span className={styles.podiumEmoji}>🧑‍🔬</span>
                                                    )}
                                                    <span className={styles.podiumBadge}>{entry.badge}</span>
                                                </div>
                                                <span className={styles.podiumName}>{entry.name}</span>
                                                <span className={styles.podiumXP}>{entry.xp} XP</span>
                                                <div
                                                    className={styles.podiumBar}
                                                    style={{ height: `${heights[index === 0 ? 1 : index === 1 ? 0 : 2]}px` }}
                                                >
                                                    <span className={styles.podiumRank}>#{entry.rank}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}

                            {/* Full Table */}
                            <motion.div
                                className={styles.tableWrapper}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Estudiante</th>
                                            <th>Nivel</th>
                                            <th>Desafíos</th>
                                            <th>XP</th>
                                            <th>Progreso Top 1</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((entry, i) => (
                                            <motion.tr
                                                key={entry.rank}
                                                className={styles.tableRow}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.5 + i * 0.05 }}
                                            >
                                                <td className={styles.rankCell}>
                                                    {entry.badge || `#${entry.rank}`}
                                                </td>
                                                <td className={styles.nameCell}>
                                                    {entry.avatarUrl ? (
                                                        <img src={entry.avatarUrl} alt={entry.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginRight: '8px' }} />
                                                    ) : (
                                                        <span className={styles.tableAvatar}>🧑‍🔬</span>
                                                    )}
                                                    {entry.name}
                                                </td>
                                                <td>
                                                    <span className="badge badge-cyan">Lvl {entry.level}</span>
                                                </td>
                                                <td className={styles.challengeCell}>{entry.challenges}/4</td>
                                                <td className={styles.xpCell}>{entry.xp}</td>
                                                <td>
                                                    <div className={styles.progressBarSmall}>
                                                        <div
                                                            className={styles.progressBarSmallFill}
                                                            style={{ width: `${(entry.xp / maxXP) * 100}%` }}
                                                        />
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </AuthGuard>
    );
}
