import { NextResponse } from 'next/server';
import { supabase as supabaseAnon, createServiceClient } from '@/lib/supabase';
import { CHALLENGES } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

    if (error || !user) return false;

    const db = createServiceClient();
    const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role === 'professor' || profile?.role === 'admin';
}

// Build unit-to-challenges mapping dynamically from CHALLENGES config
function getChallengesByUnit(): Record<number, { id: string; weight: number }[]> {
    const unitGroups: Record<number, typeof CHALLENGES> = {};
    CHALLENGES.forEach(c => {
        if (!unitGroups[c.unit]) unitGroups[c.unit] = [];
        unitGroups[c.unit].push(c);
    });

    const result: Record<number, { id: string; weight: number }[]> = {};
    for (const [unitStr, challenges] of Object.entries(unitGroups)) {
        const unit = parseInt(unitStr);
        // Equal weight per challenge within the unit
        const weightPerChallenge = 1 / challenges.length;
        result[unit] = challenges.map(c => ({ id: c.id, weight: weightPerChallenge }));
    }
    return result;
}

// Unit weights for final score (out of 100)
const UNIT_WEIGHTS: Record<number, number> = {
    1: 30, // 30 pts for Unit 1
    2: 40, // 40 pts for Unit 2 (has 5 challenges: maxwell, faraday, poynting, snell, fresnel)
    3: 15, // 15 pts for Unit 3 (salto-cuantico)
    4: 15, // 15 pts for Unit 4 (nanophotonic)
};

export async function GET(request: Request) {
    try {
        const isAdmin = await verifyAdmin(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized or Forbidden' }, { status: 403 });
        }

        const db = createServiceClient();

        // Fetch all students and their progress
        const { data: students, error: studentsError } = await db
            .from('profiles')
            .select(`
                id,
                clerk_id,
                display_name,
                avatar_url,
                total_xp,
                level,
                parcial1_score,
                parcial2_score,
                progress (
                    challenge_id,
                    status,
                    best_score,
                    xp_earned
                )
            `)
            .eq('role', 'student');

        if (studentsError) throw studentsError;

        const challengesByUnit = getChallengesByUnit();
        const totalChallenges = CHALLENGES.length;

        // Build unit names for radar
        const unitNumbers = Object.keys(challengesByUnit).map(Number).sort();
        const responseData = {
            globalCompetencies: unitNumbers.map(u => ({
                subject: `Unidad ${u}`,
                A: 0,
                fullMark: 100,
            })),
            students: [] as any[]
        };

        if (!students || students.length === 0) {
            return NextResponse.json(responseData);
        }

        const globalUnitScores: Record<number, number> = {};
        unitNumbers.forEach(u => { globalUnitScores[u] = 0; });

        for (const student of students) {
            const p = student.progress || [];
            const getScore = (cid: string) => {
                const prog = p.find((x: any) => x.challenge_id === cid);
                return prog?.best_score || 0;
            };
            const isCompleted = (cid: string) => {
                const prog = p.find((x: any) => x.challenge_id === cid);
                return prog?.status === 'completed';
            };

            // Count total completed challenges
            let totalComplete = 0;
            CHALLENGES.forEach(c => {
                if (isCompleted(c.id)) totalComplete++;
            });

            // Calculate points per unit (each unit contributes its weight to 100)
            const unitPoints: Record<number, number> = {};
            let appPoints = 0;

            for (const unit of unitNumbers) {
                const challenges = challengesByUnit[unit];
                const unitWeight = UNIT_WEIGHTS[unit] || 0;

                // Average score across all challenges in this unit, weighted equally
                let unitAvgScore = 0;
                for (const ch of challenges) {
                    unitAvgScore += getScore(ch.id) * ch.weight;
                }

                const pts = (unitAvgScore / 100) * unitWeight;
                unitPoints[unit] = pts;
                appPoints += pts;

                // For radar: how much of this unit is "completed" (0-100%)
                globalUnitScores[unit] += unitAvgScore;
            }

            const p1 = student.parcial1_score || 0;
            const p2 = student.parcial2_score || 0;
            const parcialAvg100 = ((p1 + p2) / 2) * 10;

            const finalNote100 = (parcialAvg100 * 0.5) + (appPoints * 0.5);

            const totalProgressPercent = (totalComplete / totalChallenges) * 100;
            const isPromoting = parcialAvg100 >= 70 && appPoints >= 70;

            responseData.students.push({
                id: student.id,
                name: student.display_name,
                avatar_url: student.avatar_url,
                p1,
                p2,
                parcialAvg100,
                appPoints: Number(appPoints.toFixed(1)),
                finalNote100: Number(finalNote100.toFixed(1)),
                totalProgressPercent: Number(totalProgressPercent.toFixed(1)),
                totalComplete,
                totalChallenges,
                ...Object.fromEntries(unitNumbers.map(u => [`u${u}Points`, Number(unitPoints[u].toFixed(1))])),
                isPromoting
            });
        }

        const N = students.length;
        unitNumbers.forEach((u, idx) => {
            responseData.globalCompetencies[idx].A = Math.round(globalUnitScores[u] / N);
        });

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Error in /api/admin/dashboard-stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
