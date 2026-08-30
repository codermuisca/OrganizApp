import { workspaceContext } from '../authz';

const statuses = new Set(['todo', 'progress', 'done']);
const priorities = new Set(['low', 'medium', 'high']);

async function assigneeInWorkspace(
  context: Awaited<ReturnType<typeof workspaceContext>> & { error?: never },
  email: string,
) {
  const { data: profile } = await context.supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (!profile) return null;
  const { data: membership } = await context.supabase
    .from('memberships')
    .select('user_id')
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', profile.id)
    .maybeSingle();
  return membership?.user_id ?? null;
}

function present(task: Record<string, unknown>) {
  const assignee = task.assignee as {
    email?: string;
    display_name?: string;
  } | null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tag: task.label,
    dueDate: task.due_date ?? '',
    assignee: assignee?.email ?? '',
    createdAt: task.created_at,
  };
}

export async function GET(request: Request) {
  const context = await workspaceContext();
  if ('error' in context) return context.error;
  let query = context.supabase
    .from('tasks')
    .select('*,assignee:profiles!tasks_assignee_id_fkey(email,display_name)')
    .eq('workspace_id', context.workspaceId);
  if (new URL(request.url).searchParams.get('scope') === 'mine')
    query = query.eq('assignee_id', context.user.id);
  const { data, error } = await query.order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json((data ?? []).map((task) => present(task)));
}

export async function POST(request: Request) {
  const context = await workspaceContext();
  if ('error' in context) return context.error;
  if (context.role !== 'owner')
    return Response.json(
      { error: 'Solo el propietario puede crear tareas' },
      { status: 403 },
    );
  const body = (await request.json()) as Record<string, string>;
  if (!body.title?.trim())
    return Response.json(
      { error: 'El título es obligatorio' },
      { status: 400 },
    );
  if (body.status && !statuses.has(body.status))
    return Response.json({ error: 'Estado inválido' }, { status: 400 });
  if (body.priority && !priorities.has(body.priority))
    return Response.json({ error: 'Prioridad inválida' }, { status: 400 });
  let assigneeId: string | null = null;
  if (body.assignee) {
    assigneeId = await assigneeInWorkspace(context, body.assignee);
    if (!assigneeId)
      return Response.json(
        { error: 'El responsable no pertenece a este espacio' },
        { status: 400 },
      );
  }
  const { data, error } = await context.supabase
    .from('tasks')
    .insert({
      workspace_id: context.workspaceId,
      title: body.title.trim(),
      description: body.description ?? '',
      status: body.status ?? 'todo',
      priority: body.priority ?? 'medium',
      label: body.tag ?? 'Personal',
      due_date: body.dueDate || null,
      assignee_id: assigneeId,
      created_by: context.user.id,
    })
    .select('*,assignee:profiles!tasks_assignee_id_fkey(email,display_name)')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(present(data), { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await workspaceContext();
  if ('error' in context) return context.error;
  const body = (await request.json()) as Record<string, string>;
  if (!body.id)
    return Response.json({ error: 'Falta el identificador' }, { status: 400 });
  const { data: currentTask } = await context.supabase
    .from('tasks')
    .select('assignee_id')
    .eq('id', body.id)
    .eq('workspace_id', context.workspaceId)
    .maybeSingle();
  if (!currentTask)
    return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });
  if (context.role !== 'owner') {
    const requestedFields = Object.keys(body).filter((key) => key !== 'id');
    if (
      currentTask.assignee_id !== context.user.id ||
      requestedFields.some((key) => key !== 'status')
    )
      return Response.json(
        { error: 'Solo puedes cambiar el estado de tus tareas asignadas' },
        { status: 403 },
      );
  }
  if (body.status && !statuses.has(body.status))
    return Response.json({ error: 'Estado inválido' }, { status: 400 });
  if (body.priority && !priorities.has(body.priority))
    return Response.json({ error: 'Prioridad inválida' }, { status: 400 });
  const changes: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const map: Record<string, string> = {
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    tag: 'label',
    dueDate: 'due_date',
  };
  for (const [source, target] of Object.entries(map))
    if (source in body)
      changes[target] =
        source === 'dueDate' ? body[source] || null : body[source];
  if ('assignee' in body) {
    changes.assignee_id = body.assignee
      ? await assigneeInWorkspace(context, body.assignee)
      : null;
    if (body.assignee && !changes.assignee_id)
      return Response.json(
        { error: 'El responsable no pertenece a este espacio' },
        { status: 400 },
      );
  }
  const { data, error } = await context.supabase
    .from('tasks')
    .update(changes)
    .eq('id', body.id)
    .eq('workspace_id', context.workspaceId)
    .select('*,assignee:profiles!tasks_assignee_id_fkey(email,display_name)')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(present(data));
}

export async function DELETE(request: Request) {
  const context = await workspaceContext();
  if ('error' in context) return context.error;
  if (context.role !== 'owner')
    return Response.json(
      { error: 'Solo el propietario puede eliminar tareas' },
      { status: 403 },
    );
  const id = new URL(request.url).searchParams.get('id');
  if (!id)
    return Response.json({ error: 'Falta el identificador' }, { status: 400 });
  const { error } = await context.supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('workspace_id', context.workspaceId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
