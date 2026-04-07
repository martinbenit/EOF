'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getChallengeById } from '@/lib/challenges';
import LorentzChallenge from '@/components/challenges/LorentzChallenge';
import MaxwellChallenge from '@/components/challenges/MaxwellChallenge';
import QuantumChallenge from '@/components/challenges/QuantumChallenge';
import NanophotonicChallenge from '@/components/challenges/NanophotonicChallenge';
import IonPilotChallenge from '@/components/challenges/IonPilotChallenge';
import SMESForgeChallenge from '@/components/challenges/SMESForgeChallenge';
import FaradayChallenge from '@/components/challenges/FaradayChallenge';
import AuthGuard from '@/components/auth/AuthGuard';
import styles from './page.module.css';

const challengeComponents: Record<string, React.ComponentType> = {
    lorentz: LorentzChallenge,
    maxwell: MaxwellChallenge,
    quantum: QuantumChallenge,
    nanophotonic: NanophotonicChallenge,
    'ion-pilot': IonPilotChallenge,
    'smes-forge': SMESForgeChallenge,
    'faraday': FaradayChallenge,
};

export default function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const challenge = getChallengeById(id);
    const ChallengeComponent = challengeComponents[id];

    if (!challenge || !ChallengeComponent) {
        return (
            <div className={styles.notFound}>
                <div className="container">
                    <h1>Desafío no encontrado</h1>
                    <p>El desafío &quot;{id}&quot; no existe.</p>
                    <Link href="/dashboard" className="btn btn-primary">
                        ← Volver al Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <AuthGuard>
            <div className={styles.challengePage}>
                <div className="container">
                    {/* Header */}
                    <motion.div
                        className={styles.header}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Link href="/dashboard" className={styles.backLink}>
                            ← Dashboard
                        </Link>
                        <div className={styles.headerContent}>
                            <div className={styles.headerLeft}>
                                <span className={styles.headerIcon}>{challenge.icon}</span>
                                <div>
                                    <span className={styles.unitBadge}>Unidad {challenge.unit}</span>
                                    <h1 className={styles.title}>{challenge.title}</h1>
                                    <p className={styles.subtitle}>{challenge.subtitle}</p>
                                </div>
                            </div>
                            <div className={styles.headerRight}>
                                <div className={styles.xpReward}>
                                    <span className={styles.xpRewardIcon}>⭐</span>
                                    <span>Hasta {challenge.maxXp} XP</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Description */}
                    <motion.div
                        className={styles.description}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <p>{challenge.description}</p>
                    </motion.div>

                    {/* Challenge Simulation */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        <ChallengeComponent />
                    </motion.div>
                </div>
            </div>
        </AuthGuard>
    );
}
