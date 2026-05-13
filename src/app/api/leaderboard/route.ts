import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { CHALLENGES } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = createServiceClient();

        const { data: leaderboard, error } = await db
            .from('profiles')
            .select('id, display_name, avatar_url, total_xp, level')
            .eq('role', 'student')
            .order('total_xp', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Fetch completed challenges count per user
        const { data: progress } = await db
            .from('progress')
            .select('profile_id, challenge_id')
            .eq('status', 'completed');

        // Count unique completed challenges per user
        const challengeCounts: Record<string, Set<string>> = {};
        (progress || []).forEach((row) => {
            if (!challengeCounts[row.profile_id]) challengeCounts[row.profile_id] = new Set();
            challengeCounts[row.profile_id].add(row.challenge_id);
        });

        const totalChallenges = CHALLENGES.length;

        const enrichedLeaderboard = leaderboard.map((user, idx) => ({
            rank: idx + 1,
            id: user.id,
            name: user.display_name,
            avatarUrl: user.avatar_url,
            xp: user.total_xp,
            level: user.level,
            challenges: challengeCounts[user.id]?.size || 0,
            totalChallenges,
            badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '',
        }));

        return NextResponse.json(enrichedLeaderboard);
    } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
