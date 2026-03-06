'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { UserProfile } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import styles from '@/app/dashboard/page.module.css';

interface StudentData {
    id: string;
    display_name: string;
    email: string;
    level: number;
    total_xp: number;
    created_at: string;
    challenges_completed: number;
}

export default function ProfessorDashboard({ profile }: { profile: UserProfile }) {
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchStudents = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const data = await res.json();

            // For now, we mock challenges completed (it will come from progress table later)
            const enrichedData = (data || []).map((s: any) => ({
                ...s,
                challenges_completed: 0 // Mock until we join with progress
            }));

            setStudents(enrichedData);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleAction = async (userId: string, action: 'delete' | 'reset_xp' | 'reset_progress') => {
        if (!confirm(`¿Estás seguro de que quieres realizar esta acción (${action})?`)) return;

        setActionLoading(`${userId}-${action}`);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            if (action === 'delete') {
                await fetch(`/api/admin/users?id=${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });
            } else {
                await fetch('/api/admin/users/reset', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId, action })
                });
            }
            await fetchStudents();
        } catch (error) {
            console.error('Action failed', error);
        } finally {
            setActionLoading(null);
        }
    };

    const metrics = {
        totalStudents: students.length,
        activeThisWeek: students.length, // Placeholder
        challengesCompleted: students.reduce((acc, s) => acc + s.challenges_completed, 0),
        averageXp: students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.total_xp, 0) / students.length) : 0,
    };

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
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>{metrics.totalStudents}</div>
                        </div>
                        <div className="glass-card" style={{ padding: '16px', minWidth: '150px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Promedio XP</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--neon-violet)' }}>{metrics.averageXp}</div>
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
                            <button className="btn btn-primary btn-sm" onClick={fetchStudents}>↻ Actualizar</button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Estudiante</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Nivel</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>XP Total</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Registro</th>
                                        <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>Cargando datos...</td></tr>
                                    ) : students.length === 0 ? (
                                        <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>No hay estudiantes registrados.</td></tr>
                                    ) : (
                                        students.map(student => (
                                            <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '16px 12px' }}>
                                                    <div style={{ fontWeight: 600 }}>{student.display_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{student.email}</div>
                                                </td>
                                                <td style={{ padding: '16px 12px' }}>
                                                    <span style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--neon-cyan)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                                                        Lvl {student.level}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 12px', fontWeight: 600 }}>{student.total_xp}</td>
                                                <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    {new Date(student.created_at).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => handleAction(student.id, 'reset_xp')}
                                                            disabled={actionLoading !== null}
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                            title="Reiniciar XP a 0"
                                                        >
                                                            {actionLoading === `${student.id}-reset_xp` ? '...' : 'Reset XP'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(student.id, 'reset_progress')}
                                                            disabled={actionLoading !== null}
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                            title="Reiniciar Progreso (Desafíos)"
                                                        >
                                                            {actionLoading === `${student.id}-reset_progress` ? '...' : 'Reset Progreso'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(student.id, 'delete')}
                                                            disabled={actionLoading !== null}
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: 'var(--neon-magenta)', color: 'var(--neon-magenta)' }}
                                                            title="Eliminar Estudiante"
                                                        >
                                                            {actionLoading === `${student.id}-delete` ? '...' : 'Borrar'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
