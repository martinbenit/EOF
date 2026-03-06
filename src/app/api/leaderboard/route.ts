import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: leaderboard, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, total_xp, level')
            .eq('role', 'student')
            .order('total_xp', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Also fetch completed challenges count per user
        // Note: For now we'll mock challenges completed until the exact progress DB is queried, or we can use a separate query
        const { data: progress } = await supabase
            .from('progress')
            .select('profile_id')
            .eq('status', 'completed');

        const challengeCounts = (progress || []).reduce((acc: any, row) => {
            acc[row.profile_id] = (acc[row.profile_id] || 0) + 1;
            return acc;
        }, {});

        const enrichedLeaderboard = leaderboard.map((user, idx) => ({
            rank: idx + 1,
            id: user.id,
            name: user.display_name,
            avatarUrl: user.avatar_url,
            xp: user.total_xp,
            level: user.level,
            challenges: challengeCounts[user.id] || 0,
            badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '',
        }));

        return NextResponse.json(enrichedLeaderboard);
    } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
