import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function workspaceContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error: Response.json({ error: 'Debes iniciar sesión' }, { status: 401 }),
    } as const;
  await supabase.rpc('accept_my_invitations');
  const selectedWorkspace = (await cookies()).get(
    'organiza_workspace_id',
  )?.value;
  let membershipQuery = supabase
    .from('memberships')
    .select('workspace_id,role')
    .eq('user_id', user.id);
  if (selectedWorkspace)
    membershipQuery = membershipQuery.eq('workspace_id', selectedWorkspace);
  let { data: membership } = await membershipQuery
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (!membership && selectedWorkspace) {
    const result = await supabase
      .from('memberships')
      .select('workspace_id,role')
      .eq('user_id', user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    membership = result.data;
  }
  if (!membership)
    return {
      error: Response.json(
        { error: 'No tienes un espacio disponible' },
        { status: 403 },
      ),
    } as const;
  return {
    supabase,
    user,
    workspaceId: membership.workspace_id as string,
    role: membership.role as 'owner' | 'member',
  } as const;
}
