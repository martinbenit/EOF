'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
    refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            setProfile({
                id: data.id,
                clerkId: data.clerk_id || '',
                displayName: data.display_name,
                avatarUrl: data.avatar_url,
                totalXp: data.total_xp,
                level: data.level,
                role: data.role,
                createdAt: data.created_at,
            });
        }
    };

    const handleAuthChange = async (session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
            const { user } = session;
            // Upsert profile when user signs in
            await supabase
                .from('profiles')
                .upsert(
                    {
                        id: user.id,
                        display_name:
                            user.user_metadata?.full_name ||
                            user.user_metadata?.name ||
                            user.email?.split('@')[0] ||
                            'Estudiante',
                        avatar_url: user.user_metadata?.avatar_url || null,
                        email: user.email,
                    },
                    { onConflict: 'id', ignoreDuplicates: true } // Only if doesn't exist to avoid overwriting names/roles
                );

            await fetchProfile(user.id);
        } else {
            setProfile(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuthChange(session);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            handleAuthChange(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    return (
        <AuthContext.Provider
            value={{ user, session, profile, loading, signInWithGoogle, signOut, refreshProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
