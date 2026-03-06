'use client';

import { motion } from 'framer-motion';
import type { UserProfile } from '@/lib/types';
import styles from '@/app/dashboard/page.module.css';

// Admin mock data — will be populated from Supabase
const METRICS = {
    totalStudents: 42,
    activeThisWeek: 35,
    challengesCompleted: 104,
    averageXp: 850,
};

const STUDENTS = [
    { id: '1', name: 'María García', email: 'maria@example.com', level: 7, xp: 1850, completed: 4, lastActive: 'Hace 2 horas' },
    { id: '2', name: 'Juan Pérez', email: 'juan@example.com', level: 6, xp: 1420, completed: 3, lastActive: 'Ayer' },
    { id: '3', name: 'Lucas Rodríguez', email: 'lucas@example.com', level: 5, xp: 980, completed: 2, lastActive: 'Ayer' },
    { id: '4', name: 'Ana Silva', email: 'ana@example.com', level: 4, xp: 720, completed: 1, lastActive: 'Hace 3 días' },
];

export default function ProfessorDashboard({ profile }: { profile: UserProfile }) {
    return (
        <div className={styles.dashboard}>
            <div className="container">
                {/* Professor Header */}
                <motion.div
                    className={styles.profileHeader}
                    style={{ background: 'linear-gradient(rgba(139, 92, 246, 0.1), transparent)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className={styles.profile}>
                        <div className={styles.avatar} style={{ borderColor: 'var(--neon-violet)', boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)' }}>
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <span className={styles.avatarEmoji}>👨‍🏫</span>
                            )}
                        </div>
                        <div className={styles.profileInfo}>
                            <h1 className={styles.profileName}>{profile.displayName}</h1>
                            <p className={styles.profileTitle} style={{ color: 'var(--neon-violet)' }}>Panel de Profesor (Administrador)</p>
                        </div>
                    </div>

                    <div className={styles.xpSection} style={{ gap: '10px', flexDirection: 'row', flexWrap: 'wrap' }}>
                        <div className="glass-card" style={{ padding: '16px', minWidth: '150px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alumnos Registrados</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>{METRICS.totalStudents}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '16px', minWidth: '150px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Activos esta semana</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{METRICS.activeThisWeek}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '16px', minWidth: '150px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Promedio XP</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neon-violet)' }}>{METRICS.averageXp}</div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <div style={{ marginTop: '24px' }}>
                    <motion.div
                        className="glass-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ padding: '24px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.4rem' }}>👥 Seguimiento de Estudiantes</h2>
                            <button className="btn btn-primary btn-sm">Exportar CSV</button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Estudiante</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Nivel</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>XP Total</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Desafíos</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Última Actividad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {STUDENTS.map(student => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ fontWeight: 600 }}>{student.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{student.email}</div>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <span style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--neon-cyan)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                                                    Lvl {student.level}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 12px', fontWeight: 600 }}>{student.xp}</td>
                                            <td style={{ padding: '16px 12px' }}>
                                                {student.completed} / 4
                                                <div style={{ width: '100px', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', marginTop: '6px' }}>
                                                    <div style={{ width: `${(student.completed / 4) * 100}%`, height: '100%', background: 'var(--neon-cyan)', borderRadius: '2px' }} />
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{student.lastActive}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
