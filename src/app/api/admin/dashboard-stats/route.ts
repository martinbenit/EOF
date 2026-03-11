import { NextResponse } from 'next/server';
import { supabase as supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

    const token = authHeader.split('Bearer ')[1];
    const supabase = supabaseServer;
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return false;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role === 'professor' || profile?.role === 'admin';
}

export async function GET(request: Request) {
    try {
        const isAdmin = await verifyAdmin(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized or Forbidden' }, { status: 403 });
        }

        const supabase = supabaseServer;

        // Fetch all students and their progress
        const { data: students, error: studentsError } = await supabase
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
                    best_score
                )
            `)
            .eq('role', 'student');

        if (studentsError) throw studentsError;

        // Weights for the "100 App Points"
        // U1 (30 pts): Lorentz (10), Ion Pilot (10), SMES Forge (10)
        // U2 (30 pts): Maxwell (30)
        // U3 (15 pts): Quantum (15)
        // U4 (25 pts): Nanophotonic (25)

        const responseData = {
            globalCompetencies: [
                { subject: 'Unidad I', A: 0, fullMark: 100 },
                { subject: 'Unidad II', A: 0, fullMark: 100 },
                { subject: 'Unidad III', A: 0, fullMark: 100 },
                { subject: 'Unidad IV', A: 0, fullMark: 100 },
            ],
            students: [] as any[]
        };

        if (!students || students.length === 0) {
            return NextResponse.json(responseData);
        }

        let globalU1 = 0, globalU2 = 0, globalU3 = 0, globalU4 = 0;

        for (const student of students) {
            const p = student.progress || [];
            const getScore = (cid: string) => {
                const prog = p.find((x: any) => x.challenge_id === cid);
                return prog?.best_score || 0; // 0 to 100
            };
            const isCompleted = (cid: string) => {
                const prog = p.find((x: any) => x.challenge_id === cid);
                return prog?.status === 'completed';
            };

            const sLorentz = getScore('lorentz');
            const sIon = getScore('ion-pilot');
            const sForge = getScore('smes-forge');
            const sMaxwell = getScore('maxwell');
            const sQuantum = getScore('quantum');
            const sNano = getScore('nanophotonic');

            const u1Complete = (isCompleted('lorentz') ? 1 : 0) + (isCompleted('ion-pilot') ? 1 : 0) + (isCompleted('smes-forge') ? 1 : 0);
            const totalComplete = u1Complete + (isCompleted('maxwell') ? 1 : 0) + (isCompleted('quantum') ? 1 : 0) + (isCompleted('nanophotonic') ? 1 : 0);

            const u1Points = (sLorentz * 0.10) + (sIon * 0.10) + (sForge * 0.10); // max 30
            const u2Points = (sMaxwell * 0.30); // max 30
            const u3Points = (sQuantum * 0.15); // max 15
            const u4Points = (sNano * 0.25); // max 25

            const appPoints = u1Points + u2Points + u3Points + u4Points; // max 100

            const p1 = student.parcial1_score || 0;
            const p2 = student.parcial2_score || 0;
            const parcialAvg100 = ((p1 + p2) / 2) * 10;

            const finalNote100 = (parcialAvg100 * 0.5) + (appPoints * 0.5);

            globalU1 += (u1Points / 30) * 100;
            globalU2 += (u2Points / 30) * 100;
            globalU3 += (u3Points / 15) * 100;
            globalU4 += (u4Points / 25) * 100;

            const totalProgressPercent = (totalComplete / 6) * 100;
            const isPromoting = parcialAvg100 >= 70 && appPoints >= 70;

            responseData.students.push({
                id: student.id,
                name: student.display_name,
                avatar_url: student.avatar_url,
                p1,
                p2,
                parcialAvg100,
                appPoints,
                finalNote100,
                totalProgressPercent,
                u1Points,
                u2Points,
                u3Points,
                u4Points,
                isPromoting
            });
        }

        const N = students.length;
        responseData.globalCompetencies[0].A = Math.round(globalU1 / N);
        responseData.globalCompetencies[1].A = Math.round(globalU2 / N);
        responseData.globalCompetencies[2].A = Math.round(globalU3 / N);
        responseData.globalCompetencies[3].A = Math.round(globalU4 / N);

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Error in /api/admin/dashboard-stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
