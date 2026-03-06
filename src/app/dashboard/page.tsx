'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/auth';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import ProfessorDashboard from '@/components/dashboard/ProfessorDashboard';
import RoleSelectionModal from '@/components/dashboard/RoleSelectionModal';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
    const { user, profile, refreshProfile } = useAuth();

    const handleRoleSelect = async (role: 'student' | 'professor') => {
        if (!user) return;
        try {
            await supabase
                .from('profiles')
                .update({ role, onboarding_completed: true })
                .eq('id', user.id);
            await refreshProfile();
        } catch (error) {
            console.error('Error saving role:', error);
        }
    };

    return (
        <AuthGuard>
            {profile && !profile.onboardingCompleted && (
                <RoleSelectionModal onSelectRole={handleRoleSelect} />
            )}

            {profile?.role === 'professor' || profile?.role === 'admin' ? (
                <ProfessorDashboard profile={profile} />
            ) : profile && user ? (
                <StudentDashboard profile={profile} user={user} />
            ) : null}
        </AuthGuard>
    );
}
