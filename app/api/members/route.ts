import { workspaceContext } from '../authz';

export async function GET() {
  const context = await workspaceContext(); if ('error' in context) return context.error;
  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    context.supabase.from('memberships').select('role,profiles!memberships_user_id_fkey(email,display_name)').eq('workspace_id', context.workspaceId),
    context.supabase.from('invitations').select('email,role,status').eq('workspace_id', context.workspaceId).eq('status', 'pending'),
  ]);
  const active = (memberships ?? []).map((row) => { const profile = row.profiles as unknown as { email: string; display_name: string }; return { email: profile.email, name: profile.display_name, role: row.role, status: 'active' }; });
  const pending = (invitations ?? []).map((row) => ({ email: row.email, name: row.email.split('@')[0], role: row.role, status: 'invited' }));
  return Response.json([...active, ...pending]);
}

export async function POST(request: Request) {
  const context = await workspaceContext(); if ('error' in context) return context.error;
  if (context.role !== 'owner') return Response.json({ error: 'Solo el propietario puede invitar' }, { status: 403 });
  const body = await request.json() as { email?: string; name?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) return Response.json({ error: 'Escribe un email válido' }, { status: 400 });
  const { data, error } = await context.supabase.from('invitations').upsert({ workspace_id: context.workspaceId, email, role: 'member', status: 'pending', invited_by: context.user.id }, { onConflict: 'workspace_id,email' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ email: data.email, name: body.name?.trim() || email.split('@')[0], role: data.role, status: 'invited' }, { status: 201 });
}
