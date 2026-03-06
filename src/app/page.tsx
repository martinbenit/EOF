'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CHALLENGES } from '@/lib/challenges';
import styles from './page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3 + i * 0.12, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
          <div className={styles.orb3} />
          <div className={styles.grid} />
        </div>

        <motion.div
          className={styles.heroContent}
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.15 } },
          }}
        >
          <motion.div className={styles.heroBadge} variants={fadeUp} custom={0}>
            <span className={styles.heroBadgeIcon}>⚛</span>
            Universidad CAECE — Lic. en Nanotecnología
          </motion.div>

          <motion.h1 className={styles.heroTitle} variants={fadeUp} custom={1}>
            Electromagnetismo,
            <br />
            <span className="text-gradient">Óptica y Fotónica</span>
          </motion.h1>

          <motion.p className={styles.heroSubtitle} variants={fadeUp} custom={2}>
            Resolvé desafíos interactivos de física, ganá XP y demostrá tu dominio
            sobre campos, ondas y materia a escala nano.
          </motion.p>

          <motion.div className={styles.heroCTA} variants={fadeUp} custom={3}>
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              🚀 Empezar Ahora
            </Link>
            <Link href="/leaderboard" className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              🏆 Ver Ranking
            </Link>
          </motion.div>

          <motion.div className={styles.heroStats} variants={fadeUp} custom={4}>
            <div className={styles.stat}>
              <span className={styles.statValue}>4</span>
              <span className={styles.statLabel}>Desafíos</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>2050</span>
              <span className={styles.statLabel}>XP Máximo</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>8</span>
              <span className={styles.statLabel}>Logros</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Challenges Preview */}
      <section className={styles.challenges}>
        <div className="container">
          <motion.h2
            className={styles.sectionTitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Desafíos por Unidad
          </motion.h2>
          <motion.p
            className={styles.sectionSubtitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Cuatro niveles de complejidad creciente, desde magnetostática hasta nanofotónica
          </motion.p>

          <div className={styles.challengeGrid}>
            {CHALLENGES.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                className={styles.challengeCard}
                style={{
                  borderColor: challenge.color + '33',
                  '--glow': challenge.glowColor,
                } as React.CSSProperties}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={scaleIn}
                custom={i}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                <div className={styles.challengeUnit}>Unidad {challenge.unit}</div>
                <div className={styles.challengeIcon}>{challenge.icon}</div>
                <h3 className={styles.challengeTitle}>{challenge.title}</h3>
                <p className={styles.challengeSubtitle}>{challenge.subtitle}</p>
                <p className={styles.challengeDesc}>{challenge.description}</p>
                <div className={styles.challengeXP}>
                  <span className={styles.xpIcon}>⭐</span>
                  Hasta {challenge.maxXp} XP
                </div>
                <Link
                  href={`/desafio/${challenge.id}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', borderColor: challenge.color + '44', color: challenge.color }}
                >
                  Iniciar Desafío
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <div className="container">
          <motion.h2
            className={styles.sectionTitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            ¿Cómo Funciona?
          </motion.h2>

          <div className={styles.stepsGrid}>
            {[
              { icon: '📚', title: 'Estudiá la Teoría', desc: 'Revisá el material en Moodle (Aula Invertida)' },
              { icon: '🎮', title: 'Resolvé Desafíos', desc: 'Aplicá los conceptos en simulaciones interactivas' },
              { icon: '⭐', title: 'Ganá XP y Logros', desc: 'Subí de nivel y desbloqueá achievements' },
              { icon: '📤', title: 'Subí a Moodle', desc: 'Descargá tu tarjeta de éxito como evidencia' },
            ].map((step, i) => (
              <motion.div
                key={i}
                className={styles.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className={styles.stepNumber}>{i + 1}</div>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <p>
            ⚛ EOF-Gamificado — Lic. en Nanotecnología, Universidad CAECE © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
