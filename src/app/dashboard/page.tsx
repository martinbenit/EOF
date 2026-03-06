'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/auth';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import ProfessorDashboard from '@/components/dashboard/ProfessorDashboard';

export default function DashboardPage() {
    const { user, profile } = useAuth();

    return (
        <AuthGuard>
            {profile?.role === 'professor' || profile?.role === 'admin' ? (
                <ProfessorDashboard profile={profile} />
            ) : profile && user ? (
                <StudentDashboard profile={profile} user={user} />
            ) : null}
        </AuthGuard>
    );
}
