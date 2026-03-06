import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { userId, displayName } = body;

        if (!userId || !displayName) {
            return NextResponse.json({ error: 'Faltan parámetros requridos' }, { status: 400 });
        }

        const supabase = createServiceClient();

        const { error } = await supabase
            .from('profiles')
            .update({ display_name: displayName })
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
