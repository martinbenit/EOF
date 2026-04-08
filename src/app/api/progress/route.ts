import { NextResponse } from 'next/server';
import { supabase as supabaseAnon, createServiceClient } from '@/lib/supabase';
import { calculateChallengeResult } from '@/lib/gamification';
import { getChallengeById } from '@/lib/challenges';
import type { ChallengeId } from '@/lib/types';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use service client for reliable reads (bypasses RLS)
        const db = createServiceClient();
        const { data: progress, error } = await db
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

        // Authenticate with anon client
        const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use service role client for all writes (bypasses RLS)
        const db = createServiceClient();

        const body = await request.json();
        const { challengeId, score, xpEarned, timeSeconds, hintsUsed } = body;

        console.log(`[progress] Saving: user=${user.id}, challenge=${challengeId}, score=${score}, xp=${xpEarned}`);

        // 0. Auto-seed: ensure this challenge exists in the DB (FK constraint)
        const { data: existingChallenge } = await db
            .from('challenges')
            .select('id')
            .eq('id', challengeId)
            .maybeSingle();

        if (!existingChallenge) {
            const challengeDef = getChallengeById(challengeId);
            if (challengeDef) {
                console.log(`[progress] Auto-seeding challenge "${challengeId}"...`);
                const { error: seedErr } = await db.from('challenges').upsert({
                    id: challengeDef.id,
                    unit: challengeDef.unit,
                    title: challengeDef.title,
                    subtitle: challengeDef.subtitle || null,
                    description: challengeDef.description || null,
                    max_xp: challengeDef.maxXp,
                    unlock_level: challengeDef.unlockLevel || 1,
                    icon: challengeDef.icon || null,
                    color: challengeDef.color || null,
                }, { onConflict: 'id' });
                if (seedErr) console.error('[progress] Seed error:', seedErr);
                else console.log(`[progress] Seeded "${challengeId}" OK`);
            }
        }

        // 1. Record Attempt
        const { error: attemptError } = await db.from('challenge_attempts').insert({
            profile_id: user.id,
            challenge_id: challengeId,
            score,
            xp_earned: xpEarned,
            time_seconds: timeSeconds,
            hints_used: hintsUsed,
            end_time: new Date().toISOString()
        });
        if (attemptError) console.error('[progress] Attempt error:', attemptError);

        // 2. Upsert progress
        const { data: currentProgress } = await db
            .from('progress')
            .select('*')
            .eq('profile_id', user.id)
            .eq('challenge_id', challengeId)
            .maybeSingle();

        if (currentProgress) {
            const newBestScore = Math.max(currentProgress.best_score || 0, score);
            const { error: updateErr } = await db.from('progress').update({
                status: 'completed',
                best_score: newBestScore,
                xp_earned: (currentProgress.xp_earned || 0) + xpEarned,
                attempts: (currentProgress.attempts || 0) + 1,
                completed_at: new Date().toISOString()
            }).eq('id', currentProgress.id);
            if (updateErr) console.error('[progress] Update error:', updateErr);
        } else {
            const { error: insertErr } = await db.from('progress').insert({
                profile_id: user.id,
                challenge_id: challengeId,
                status: 'completed',
                best_score: score,
                xp_earned: xpEarned,
                attempts: 1,
                completed_at: new Date().toISOString()
            });
            if (insertErr) console.error('[progress] Insert error:', insertErr);
        }

        // 3. Update total XP in profile
        const { data: profile } = await db
            .from('profiles')
            .select('total_xp, level')
            .eq('id', user.id)
            .single();

        if (profile) {
            const newTotalXp = (profile.total_xp || 0) + xpEarned;

            const XP_TABLE = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000];
            let newLevel = profile.level || 1;
            while (newLevel < XP_TABLE.length && newTotalXp >= XP_TABLE[newLevel]) {
                newLevel++;
            }

            const { error: profileErr } = await db.from('profiles').update({
                total_xp: newTotalXp,
                level: newLevel
            }).eq('id', user.id);
            if (profileErr) console.error('[progress] Profile XP error:', profileErr);
            else console.log(`[progress] XP updated: ${newTotalXp} (level ${newLevel})`);
        }

        // 4. Persist achievements
        try {
            const challengeResult = calculateChallengeResult(challengeId as ChallengeId, score, score / 100, timeSeconds, hintsUsed);
            const newAchievements = [...challengeResult.achievementsUnlocked];

            const { data: allProgress } = await db
                .from('progress')
                .select('challenge_id')
                .eq('profile_id', user.id)
                .eq('status', 'completed');

            if (allProgress && allProgress.length <= 1) {
                newAchievements.push('first_challenge');
            }

            // Auto-seed achievement definitions too
            for (const achKey of newAchievements) {
                await db.from('achievements').upsert({
                    profile_id: user.id,
                    achievement_key: achKey,
                    unlocked_at: new Date().toISOString()
                }, { onConflict: 'profile_id,achievement_key', ignoreDuplicates: true });
            }
        } catch (achErr) {
            console.error('[progress] Achievement error (non-fatal):', achErr);
        }

        console.log(`[progress] Done: user=${user.id}, challenge=${challengeId}`);
        return NextResponse.json({ success: true, xpAdded: xpEarned });
    } catch (err: any) {
        console.error('[progress] FATAL:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
