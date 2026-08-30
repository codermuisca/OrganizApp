import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ActivitiesPage from './activities-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name,email')
    .eq('id', user.id)
    .single();
  return (
    <ActivitiesPage
      user={{
        name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Usuario',
        email: profile?.email ?? user.email ?? '',
      }}
    />
  );
}
