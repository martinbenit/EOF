import { NextResponse } from 'next/server';
import { supabase as supabaseServer } from '@/lib/supabase';
import { calculateChallengeResult } from '@/lib/gamification';
import type { ChallengeId } from '@/lib/types';

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
            const newBestScore = Math.max(currentProgress.best_score || 0, score);
            await supabase.from('progress').update({
                status: newStatus,
                best_score: newBestScore,
                xp_earned: (currentProgress.xp_earned || 0) + xpEarned,
                attempts: (currentProgress.attempts || 0) + 1,
                completed_at: new Date().toISOString()
            }).eq('id', currentProgress.id);
        } else {
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

        // 4. Persist achievements
        try {
            // Calculate achievements from game result
            const challengeResult = calculateChallengeResult(challengeId as ChallengeId, score, score / 100, timeSeconds, hintsUsed);
            const newAchievements = [...challengeResult.achievementsUnlocked];

            // Check if this is their first challenge completion ever
            const { data: allProgress } = await supabase
                .from('progress')
                .select('challenge_id')
                .eq('profile_id', user.id)
                .eq('status', 'completed');

            if (allProgress && allProgress.length <= 1) {
                newAchievements.push('first_challenge');
            }

            // Insert each achievement (ignore conflicts for already-unlocked ones)
            for (const achKey of newAchievements) {
                await supabase.from('achievements').upsert({
                    profile_id: user.id,
                    achievement_key: achKey,
                    unlocked_at: new Date().toISOString()
                }, { onConflict: 'profile_id,achievement_key', ignoreDuplicates: true });
            }
        } catch (achErr) {
            console.error('Error saving achievements (non-fatal):', achErr);
        }

        return NextResponse.json({ success: true, xpAdded: xpEarned });
    } catch (err: any) {
        console.error('Error saving progress:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
