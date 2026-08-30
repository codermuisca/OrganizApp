import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PeoplePage from './people-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.rpc('accept_my_invitations');
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name,email')
      .eq('id', user.id)
      .single(),
    supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .order('created_at')
      .limit(1)
      .single(),
  ]);
  return (
    <PeoplePage
      user={{
        id: user.id,
        name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Usuario',
        email: profile?.email ?? user.email ?? '',
        role: membership?.role === 'owner' ? 'owner' : 'member',
      }}
    />
  );
}
