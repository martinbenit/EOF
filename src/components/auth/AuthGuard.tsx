'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { session, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !session) {
            router.push('/');
        }
    }, [session, loading, router]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border-glass)', borderTopColor: 'var(--neon-cyan)', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Verificando autenticación...</p>
                <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    if (!session) {
        return null; // Will redirect in useEffect
    }

    return <>{children}</>;
}
