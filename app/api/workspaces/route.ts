import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  await supabase.rpc('accept_my_invitations');
  const { data, error } = await supabase
    .from('memberships')
    .select(
      'workspace_id,role,workspaces!memberships_workspace_id_fkey(id,name)',
    )
    .eq('user_id', user.id)
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(
    (data ?? []).map((membership) => ({
      id: membership.workspace_id,
      role: membership.role,
      name: (membership.workspaces as unknown as { name: string }).name,
    })),
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  const body = (await request.json()) as { workspaceId?: string };
  if (!body.workspaceId)
    return Response.json({ error: 'Falta el espacio' }, { status: 400 });
  const { data: membership } = await supabase
    .from('memberships')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('workspace_id', body.workspaceId)
    .maybeSingle();
  if (!membership)
    return Response.json(
      { error: 'No perteneces a este espacio' },
      { status: 403 },
    );
  const response = NextResponse.json({ workspaceId: membership.workspace_id });
  response.cookies.set('organiza_workspace_id', membership.workspace_id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
