'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import styles from './Navbar.module.css';

const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/desafio', label: 'Desafíos', icon: '🧪' },
    { href: '/leaderboard', label: 'Ranking', icon: '🏆' },
];

export default function Navbar() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const { user, loading, signInWithGoogle, signOut } = useAuth();

    return (
        <nav className={styles.navbar}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>⚛</span>
                    <span className={styles.logoText}>
                        <strong>EOF</strong>
                        <span className={styles.logoSub}>-Gamificado</span>
                    </span>
                </Link>

                <div className={`${styles.links} ${menuOpen ? styles.linksOpen : ''}`}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${styles.link} ${pathname?.startsWith(link.href) ? styles.linkActive : ''
                                }`}
                            onClick={() => setMenuOpen(false)}
                        >
                            <span>{link.icon}</span> {link.label}
                        </Link>
                    ))}
                </div>

                <div className={styles.actions}>
                    {loading ? (
                        <div className={styles.avatarPlaceholder} />
                    ) : user ? (
                        <div className={styles.userMenu}>
                            <button
                                className={styles.avatarBtn}
                                onClick={signOut}
                                title="Cerrar sesión"
                            >
                                {user.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt={user.user_metadata?.full_name || 'Avatar'}
                                        className={styles.avatar}
                                    />
                                ) : (
                                    <span className={styles.avatarFallback}>
                                        {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                                    </span>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            className={styles.loginBtn}
                            onClick={signInWithGoogle}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Iniciar Sesión
                        </button>
                    )}
                </div>

                <button
                    className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>
        </nav>
    );
}
