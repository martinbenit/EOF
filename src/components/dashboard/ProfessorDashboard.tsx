'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { UserProfile } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import styles from '@/app/dashboard/page.module.css';

interface DashboardStats {
    globalCompetencies: { subject: string, A: number, fullMark: number }[];
    students: {
        id: string;
        name: string;
        avatar_url: string;
        p1: number;
        p2: number;
        parcialAvg100: number;
        appPoints: number;
        finalNote100: number;
        totalProgressPercent: number;
        isPromoting: boolean;
    }[];
}

export default function ProfessorDashboard({ profile }: { profile: UserProfile }) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/admin/dashboard-stats', {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
            await fetchData();
        } catch (error) {
            console.error('Action failed', error);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading || !stats) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando métricas...</div>;
    }

    const alerts = stats.students.filter(s => s.totalProgressPercent < 60);
    const promoted = stats.students.filter(s => s.isPromoting);

    // Prepare scatter data
    const scatterData = stats.students.map(s => ({
        name: s.name,
        Parciales: Number(s.parcialAvg100.toFixed(1)),
        Gamificacion: Number(s.appPoints.toFixed(1)),
    }));

    return (
        <div className={styles.dashboard}>
            <div className="container">
                {/* Header */}
                <motion.div
                    className={styles.profileHeader}
                    style={{ background: 'linear-gradient(rgba(139, 92, 246, 0.1), transparent)', marginBottom: '30px' }}
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
                            <p className={styles.profileTitle} style={{ color: 'var(--neon-violet)' }}>Panel de Control de Competencias (EOF)</p>
                        </div>
                    </div>
                </motion.div>

                {/* KPI Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                    {/* Radar Chart: Transversal Competency */}
                    <div className="glass-card" style={{ padding: '20px', height: '350px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--neon-cyan)' }}>Radar Transversal de Competencias</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Promedio de la cohorte por unidad (%)</p>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.globalCompetencies}>
                                    <PolarGrid stroke="rgba(255,255,255,0.2)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-primary)', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-secondary)' }} />
                                    <Radar name="Cohorte 2026" dataKey="A" stroke="var(--neon-cyan)" fill="var(--neon-cyan)" fillOpacity={0.4} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-glass)', borderColor: 'var(--border-glass)' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Scatter Plot: Correlation */}
                    <div className="glass-card" style={{ padding: '20px', height: '350px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--neon-magenta)' }}>Correlación de Logro</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Gamificación vs. Evaluación Tradicional</p>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis type="number" dataKey="Parciales" name="Nota Parciales" unit="%" stroke="var(--text-secondary)" domain={[0, 100]} />
                                    <YAxis type="number" dataKey="Gamificacion" name="Gamificación" unit="pts" stroke="var(--text-secondary)" domain={[0, 100]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--bg-glass)', borderColor: 'var(--border-glass)' }} />
                                    <Legend />
                                    <Scatter name="Alumnos" data={scatterData} fill="var(--neon-magenta)" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Alerts and Promotions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Flipped Classroom Alerts */}
                        <div className="glass-card" style={{ padding: '20px', flex: 1, borderTop: '4px solid #ff4d4d' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#ff4d4d' }}>⚠️ Alertas (Flipped Classroom)</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Alumnos con &lt; 60% de progreso gamificado previo a teóricos.</p>
                            {alerts.length === 0 ? (
                                <div style={{ fontSize: '0.9rem', color: '#00ffaa' }}>¡Todos los alumnos están al día!</div>
                            ) : (
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem' }}>
                                    {alerts.map(a => (
                                        <li key={a.id} style={{ marginBottom: '8px' }}>
                                            <strong>{a.name}</strong> ({a.totalProgressPercent.toFixed(0)}%)
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Promotion Track */}
                        <div className="glass-card" style={{ padding: '20px', flex: 1, borderTop: '4px solid #00ffaa' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#00ffaa' }}>🏆 Estado de Promoción</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Alumnos con &gt; 70% en todos los indicadores (Candidatos a coloquio).</p>
                            {promoted.length === 0 ? (
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Aún no hay candidatos.</div>
                            ) : (
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem' }}>
                                    {promoted.map(p => (
                                        <li key={p.id} style={{ marginBottom: '8px' }}>
                                            <strong>{p.name}</strong> (Final: {p.finalNote100.toFixed(1)}%)
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                </div>

                {/* Detailed Student List */}
                <motion.div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.4rem' }}>📋 Desglose Analítico por Alumno</h2>
                        <button className="btn btn-primary btn-sm" onClick={fetchData}>↻ Actualizar</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Estudiante</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>P1 / P2</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Avg Trad. (50%)</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>GamiF. Pts (50%)</th>
                                    <th style={{ padding: '12px', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>Nota Final</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Acciones App</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.students.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>No hay estudiantes registrados.</td></tr>
                                ) : (
                                    stats.students.map(student => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ fontWeight: 600 }}>{student.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: student.isPromoting ? '#00ffaa' : 'var(--text-secondary)' }}>
                                                    {student.isPromoting ? 'Promocionando' : 'Regular'} (Progreso App: {student.totalProgressPercent.toFixed(0)}%)
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                                    {student.p1.toFixed(1)} / {student.p2.toFixed(1)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                                    {student.parcialAvg100.toFixed(1)}%
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--neon-magenta)' }}>
                                                    {student.appPoints.toFixed(1)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                                                    {student.finalNote100.toFixed(1)}%
                                                </div>
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
                                                        onClick={() => handleAction(student.id, 'delete')}
                                                        disabled={actionLoading !== null}
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: 'var(--neon-magenta)', color: 'var(--neon-magenta)' }}
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
    );
}
