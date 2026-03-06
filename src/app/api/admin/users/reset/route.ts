import { NextResponse } from 'next/server';
import { supabase as supabaseServer, createServiceClient } from '@/lib/supabase';

// Helper to verify admin/professor role from the request header
async function verifyAdmin(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

    const token = authHeader.split('Bearer ')[1];

    const supabase = supabaseServer;
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return false;

    // Check if user is professor or admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role === 'professor' || profile?.role === 'admin';
}

export async function POST(request: Request) {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { userId, action } = await request.json();

        if (!userId || !action) {
            return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
        }

        const adminSupabase = createServiceClient();

        if (action === 'reset_xp') {
            const { error } = await adminSupabase
                .from('profiles')
                .update({ total_xp: 0, level: 1 })
                .eq('id', userId);

            if (error) throw error;
        } else if (action === 'reset_progress') {
            const { error: err1 } = await adminSupabase.from('progress').delete().eq('profile_id', userId);
            const { error: err2 } = await adminSupabase.from('challenge_attempts').delete().eq('profile_id', userId);
            const { error: err3 } = await adminSupabase.from('achievements').delete().eq('profile_id', userId);

            if (err1 || err2 || err3) throw new Error('Failed to reset some progress data');
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
