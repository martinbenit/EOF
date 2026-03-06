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

export async function GET(request: Request) {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = supabaseServer;

    // Fetch all students with their total XP and level
    const { data: students, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, level, total_xp, created_at')
        .eq('role', 'student')
        .order('total_xp', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(students);
}

export async function DELETE(request: Request) {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('id');

        if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

        const supabase = supabaseServer;

        // 1. Delete from profiles (Cascade will handle progress and attempts if we set it up, but Supabase auth user needs to be deleted via admin API)

        // Use the service role client explicitly for admin auth actions
        const adminSupabase = createServiceClient();

        // Get the clerk/auth id
        const { data: profile } = await supabase.from('profiles').select('clerk_id').eq('id', userId).single();

        if (profile?.clerk_id) {
            // Try to delete from auth.users (requires service role)
            const { error: authError } = await adminSupabase.auth.admin.deleteUser(profile.clerk_id);
            if (authError) {
                console.error('Failed to delete auth user:', authError);
            }
        }

        // Delete from public.profiles
        const { error } = await supabase.from('profiles').delete().eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
