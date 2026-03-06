import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'EOF-Gamificado | Electromagnetismo, Óptica y Fotónica',
  description:
    'Plataforma gamificada para la materia Electromagnetismo, Óptica y Fotónica de la Licenciatura en Nanotecnología — Universidad CAECE',
  keywords: [
    'electromagnetismo',
    'óptica',
    'fotónica',
    'nanotecnología',
    'UCAECE',
    'gamificación',
    'física',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="page-content">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
