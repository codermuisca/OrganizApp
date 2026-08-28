import { createClient } from '@/lib/supabase/server';

export async function workspaceContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'Debes iniciar sesión' }, { status: 401 }) } as const;
  await supabase.rpc('accept_my_invitations');
  const { data: membership } = await supabase.from('memberships').select('workspace_id,role').eq('user_id', user.id).order('created_at').limit(1).single();
  if (!membership) return { error: Response.json({ error: 'No tienes un espacio disponible' }, { status: 403 }) } as const;
  return { supabase, user, workspaceId: membership.workspace_id as string, role: membership.role as 'owner' | 'member' } as const;
}
