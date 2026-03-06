'use client';

import { motion } from 'framer-motion';
import AuthGuard from '@/components/auth/AuthGuard';
import styles from './page.module.css';

// Demo leaderboard data (will come from Supabase)
const LEADERBOARD = [
    { rank: 1, name: 'María García', xp: 1850, level: 7, challenges: 4, badge: '🥇' },
    { rank: 2, name: 'Juan Pérez', xp: 1420, level: 6, challenges: 3, badge: '🥈' },
    { rank: 3, name: 'Lucas Rodríguez', xp: 980, level: 5, challenges: 3, badge: '🥉' },
    { rank: 4, name: 'Ana Sánchez', xp: 720, level: 4, challenges: 2, badge: '' },
    { rank: 5, name: 'Estudiante Demo', xp: 450, level: 3, challenges: 1, badge: '' },
    { rank: 6, name: 'Pablo Martínez', xp: 380, level: 3, challenges: 1, badge: '' },
    { rank: 7, name: 'Sofía López', xp: 290, level: 2, challenges: 1, badge: '' },
    { rank: 8, name: 'Diego Fernández', xp: 200, level: 2, challenges: 1, badge: '' },
    { rank: 9, name: 'Valentina Torres', xp: 120, level: 1, challenges: 0, badge: '' },
    { rank: 10, name: 'Mateo Ruiz', xp: 50, level: 1, challenges: 0, badge: '' },
];

export default function LeaderboardPage() {
    const maxXP = LEADERBOARD[0].xp;

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

                    {/* Podium */}
                    <motion.div
                        className={styles.podium}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {[1, 0, 2].map((index) => {
                            const entry = LEADERBOARD[index];
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
                                        <span className={styles.podiumEmoji}>🧑‍🔬</span>
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
                                    <th>Progreso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {LEADERBOARD.map((entry, i) => (
                                    <motion.tr
                                        key={entry.rank}
                                        className={`${styles.tableRow} ${entry.name === 'Estudiante Demo' ? styles.tableRowHighlight : ''}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + i * 0.05 }}
                                    >
                                        <td className={styles.rankCell}>
                                            {entry.badge || `#${entry.rank}`}
                                        </td>
                                        <td className={styles.nameCell}>
                                            <span className={styles.tableAvatar}>🧑‍🔬</span>
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
                </div>
            </div>
        </AuthGuard>
    );
}
