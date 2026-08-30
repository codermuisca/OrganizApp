import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CalendarPage from './calendar-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.rpc('accept_my_invitations');
  const selectedWorkspace = (await cookies()).get(
    'organiza_workspace_id',
  )?.value;
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name,email')
      .eq('id', user.id)
      .single(),
    supabase
      .from('memberships')
      .select(
        'workspace_id,role,workspaces!memberships_workspace_id_fkey(id,name)',
      )
      .eq('user_id', user.id)
      .order('created_at'),
  ]);
  const spaces = (memberships ?? []).map((membership) => {
    const workspace = membership.workspaces as unknown as {
      id: string;
      name: string;
    };
    return {
      id: workspace.id,
      name: workspace.name,
      role: membership.role as 'owner' | 'member',
    };
  });
  const activeSpace =
    spaces.find((space) => space.id === selectedWorkspace) ?? spaces[0];
  if (!activeSpace) redirect('/login');
  return (
    <CalendarPage
      user={{
        name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Usuario',
        email: profile?.email ?? user.email ?? '',
        role: activeSpace.role,
      }}
      workspace={activeSpace}
      workspaces={spaces}
    />
  );
}
