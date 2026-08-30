import { createClient } from '@/lib/supabase/server';

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function present(activity: Record<string, unknown>) {
  return {
    id: activity.id,
    name: activity.name,
    color: activity.color,
    goalMinutes: activity.goal_minutes ?? null,
    goalPeriod: activity.goal_period ?? null,
  };
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user)
    return Response.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  const { data, error } = await supabase
    .from('activities')
    .select('id,name,color,goal_minutes,goal_period,archived,created_at')
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json((data ?? []).map((activity) => present(activity)));
}

export async function POST(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user)
    return Response.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  const body = (await request.json()) as {
    name?: string;
    color?: string;
    goalMinutes?: number | null;
    goalPeriod?: string | null;
  };
  const name = body.name?.trim();
  if (!name || name.length > 60)
    return Response.json(
      { error: 'Escribe un nombre válido' },
      { status: 400 },
    );
  const color = /^#[0-9a-f]{6}$/i.test(body.color ?? '')
    ? body.color
    : '#7c6cff';
  const goalMinutes = Number(body.goalMinutes);
  const hasGoal = body.goalPeriod === 'daily' || body.goalPeriod === 'weekly';
  if (
    hasGoal &&
    (!Number.isInteger(goalMinutes) || goalMinutes < 1 || goalMinutes > 10080)
  )
    return Response.json({ error: 'Escribe una meta válida' }, { status: 400 });
  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: user.id,
      name,
      color,
      goal_minutes: hasGoal ? goalMinutes : null,
      goal_period: hasGoal ? body.goalPeriod : null,
    })
    .select('id,name,color,goal_minutes,goal_period,archived,created_at')
    .single();
  if (error)
    return Response.json(
      {
        error:
          error.code === '23505'
            ? 'Ya tienes una actividad con este nombre'
            : error.message,
      },
      { status: 400 },
    );
  return Response.json(present(data), { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user)
    return Response.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  const body = (await request.json()) as {
    id?: string;
    goalMinutes?: number | null;
    goalPeriod?: string | null;
  };
  if (!body.id)
    return Response.json({ error: 'Falta la actividad' }, { status: 400 });
  const hasGoal = body.goalPeriod === 'daily' || body.goalPeriod === 'weekly';
  const goalMinutes = Number(body.goalMinutes);
  if (
    hasGoal &&
    (!Number.isInteger(goalMinutes) || goalMinutes < 1 || goalMinutes > 10080)
  )
    return Response.json({ error: 'Escribe una meta válida' }, { status: 400 });
  const { data, error } = await supabase
    .from('activities')
    .update({
      goal_minutes: hasGoal ? goalMinutes : null,
      goal_period: hasGoal ? body.goalPeriod : null,
    })
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select('id,name,color,goal_minutes,goal_period')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(present(data));
}

export async function DELETE(request: Request) {
  const { supabase, user } = await currentUser();
  if (!user)
    return Response.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id)
    return Response.json({ error: 'Falta la actividad' }, { status: 400 });
  const { error } = await supabase
    .from('activities')
    .update({ archived: true })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
