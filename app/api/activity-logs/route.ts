import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: 'Debes iniciar sesión' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = supabase
    .from('activity_logs')
    .select(
      'id,activity_id,duration_minutes,performed_at,note,activities!activity_logs_activity_id_fkey(name,color)',
    )
    .eq('user_id', user.id)
    .order('performed_at', { ascending: false });

  if (from) {
    query = query.gte('performed_at', from);
  }

  if (to) {
    query = query.lt('performed_at', to);
  }

  const { data, error } = await query.limit(1000);

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 400 },
    );
  }

  return Response.json(
    (data ?? []).map((log) => {
      const activity = log.activities as unknown as {
        name: string;
        color: string;
      };

      return {
        id: log.id,
        activityId: log.activity_id,
        activityName: activity.name,
        color: activity.color,
        durationMinutes: log.duration_minutes,
        performedAt: log.performed_at,
        note: log.note,
      };
    }),
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: 'Debes iniciar sesión' },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    activityId?: string;
    durationMinutes?: number;
    note?: string | null;
  };

  const duration = Number(body.durationMinutes);

  const note =
    typeof body.note === 'string'
      ? body.note.trim()
      : '';

  if (
    !body.activityId ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 1440
  ) {
    return Response.json(
      { error: 'Escribe una duración válida' },
      { status: 400 },
    );
  }

  if (note.length > 500) {
    return Response.json(
      {
        error:
          'La nota no puede superar los 500 caracteres',
      },
      { status: 400 },
    );
  }

  const { data: activity } = await supabase
    .from('activities')
    .select('id,name,color')
    .eq('id', body.activityId)
    .eq('user_id', user.id)
    .eq('archived', false)
    .maybeSingle();

  if (!activity) {
    return Response.json(
      { error: 'Actividad no encontrada' },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      activity_id: activity.id,
      user_id: user.id,
      duration_minutes: duration,
      note: note || null,
    })
    .select(
      'id,activity_id,duration_minutes,performed_at,note',
    )
    .single();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 400 },
    );
  }

  return Response.json(
    {
      id: data.id,
      activityId: data.activity_id,
      activityName: activity.name,
      color: activity.color,
      durationMinutes: data.duration_minutes,
      performedAt: data.performed_at,
      note: data.note,
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: 'Debes iniciar sesión' },
      { status: 401 },
    );
  }

  const id = new URL(request.url).searchParams.get('id');

  if (!id) {
    return Response.json(
      { error: 'Falta el registro' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('activity_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 400 },
    );
  }

  return new Response(null, { status: 204 });
}