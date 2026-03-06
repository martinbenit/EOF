import { NextResponse } from 'next/server';
import { supabase as supabaseServer } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const supabase = supabaseServer;
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: progress, error } = await supabase
            .from('progress')
            .select('*')
            .eq('profile_id', user.id);

        if (error) throw error;

        return NextResponse.json(progress);
    } catch (err: any) {
        console.error('Error fetching progress:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const supabase = supabaseServer;
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { challengeId, score, xpEarned, timeSeconds, hintsUsed } = body;

        // 1. Record Attempt
        await supabase.from('challenge_attempts').insert({
            profile_id: user.id,
            challenge_id: challengeId,
            score,
            xp_earned: xpEarned,
            time_seconds: timeSeconds,
            hints_used: hintsUsed,
            end_time: new Date().toISOString()
        });

        // 2. Fetch current progress for this challenge
        const { data: currentProgress } = await supabase
            .from('progress')
            .select('*')
            .eq('profile_id', user.id)
            .eq('challenge_id', challengeId)
            .single();

        let newStatus = 'completed';
        let totalXpDelta = xpEarned;

        if (currentProgress) {
            // Update existing
            const newBestScore = Math.max(currentProgress.best_score || 0, score);
            // Only add XP if it's the first time beating it or something?
            // Actually, in gamification, maybe they get XP every time but diminishing, or we just add it.
            // Let's just add it.
            await supabase.from('progress').update({
                status: newStatus,
                best_score: newBestScore,
                xp_earned: (currentProgress.xp_earned || 0) + xpEarned,
                attempts: (currentProgress.attempts || 0) + 1,
                completed_at: new Date().toISOString()
            }).eq('id', currentProgress.id);
        } else {
            // Insert new
            await supabase.from('progress').insert({
                profile_id: user.id,
                challenge_id: challengeId,
                status: newStatus,
                best_score: score,
                xp_earned: xpEarned,
                attempts: 1,
                completed_at: new Date().toISOString()
            });
        }

        // 3. Update total XP in profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('total_xp, level')
            .eq('id', user.id)
            .single();

        if (profile) {
            const newTotalXp = (profile.total_xp || 0) + totalXpDelta;

            // Simple level up logic
            const XP_TABLE = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000];
            let newLevel = profile.level || 1;
            while (newLevel < XP_TABLE.length && newTotalXp >= XP_TABLE[newLevel]) {
                newLevel++;
            }

            await supabase.from('profiles').update({
                total_xp: newTotalXp,
                level: newLevel
            }).eq('id', user.id);
        }

        return NextResponse.json({ success: true, xpAdded: xpEarned });
    } catch (err: any) {
        console.error('Error saving progress:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
