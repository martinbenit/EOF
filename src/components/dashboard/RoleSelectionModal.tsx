import { useState } from 'react';
import { motion } from 'framer-motion';

interface RoleSelectionModalProps {
    onSelectRole: (role: 'student' | 'professor') => Promise<void>;
}

export default function RoleSelectionModal({ onSelectRole }: RoleSelectionModalProps) {
    const [loading, setLoading] = useState(false);

    const handleSelect = async (role: 'student' | 'professor') => {
        setLoading(true);
        try {
            await onSelectRole(role);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5, 5, 20, 0.9)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card"
                style={{
                    maxWidth: '600px',
                    width: '100%',
                    padding: '40px',
                    textAlign: 'center',
                    border: '1px solid var(--neon-cyan)'
                }}
            >
                <h1 style={{ fontSize: '2rem', marginBottom: '10px', color: 'white' }}>Bienvenido a EON</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '1.1rem' }}>
                    Antes de comenzar, por favor indícanos cómo vas a utilizar la plataforma.
                </p>

                <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                    <button
                        className="btn btn-primary"
                        style={{ padding: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}
                        onClick={() => handleSelect('student')}
                        disabled={loading}
                    >
                        <span>🧑‍🎓</span> Soy Alumno
                    </button>

                    <button
                        className="btn btn-secondary"
                        style={{ padding: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', borderColor: 'var(--neon-violet)', color: 'var(--neon-violet)' }}
                        onClick={() => handleSelect('professor')}
                        disabled={loading}
                    >
                        <span>👨‍🏫</span> Soy Profesor
                    </button>
                </div>
                {loading && <p style={{ marginTop: '20px', color: 'var(--neon-cyan)' }}>Guardando...</p>}
            </motion.div>
        </div>
    );
}
