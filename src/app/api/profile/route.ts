import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { userId, displayName, avatarUrl } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
        }

        const supabase = createServiceClient();

        const updates: any = {};
        if (displayName !== undefined) updates.display_name = displayName;
        if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No data to update' }, { status: 400 });
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error('Error updating profile:', error);
            return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
        }

        return NextResponse.json({ success: true, displayName });
    } catch (err) {
        console.error('Error en API profile:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
