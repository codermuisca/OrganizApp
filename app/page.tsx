import { redirect } from 'next/navigation';
import TaskBoard from './task-board';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.rpc('accept_my_invitations');
  const { data: profile } = await supabase.from('profiles').select('display_name,email').eq('id', user.id).single();
  return <TaskBoard user={{ name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Usuario', email: profile?.email ?? user.email ?? '' }} />;
}
