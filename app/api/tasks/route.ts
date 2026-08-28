import { workspaceContext } from '../authz';

function present(task: Record<string, unknown>) {
  const assignee = task.assignee as { email?: string; display_name?: string } | null;
  return { id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, tag: task.label, dueDate: task.due_date ?? '', assignee: assignee?.email ?? '', createdAt: task.created_at };
}

export async function GET() {
  const context = await workspaceContext(); if ('error' in context) return context.error;
  const { data, error } = await context.supabase.from('tasks').select('*,assignee:profiles!tasks_assignee_id_fkey(email,display_name)').eq('workspace_id', context.workspaceId).order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json((data ?? []).map((task) => present(task)));
}

export async function POST(request: Request) {
  const context = await workspaceContext(); if ('error' in context) return context.error;
  const body = await request.json() as Record<string, string>;
  if (!body.title?.trim()) return Response.json({ error: 'El título es obligatorio' }, { status: 400 });
  let assigneeId: string | null = null;
  if (body.assignee) { const { data } = await context.supabase.from('profiles').select('id').eq('email', body.assignee).maybeSingle(); assigneeId = data?.id ?? null; }
  const { data, error } = await context.supabase.from('tasks').insert({ workspace_id: context.workspaceId, title: body.title.trim(), description: body.description ?? '', status: body.status ?? 'todo', priority: body.priority ?? 'medium', label: body.tag ?? 'Personal', due_date: body.dueDate || null, assignee_id: assigneeId, created_by: context.user.id }).select('*,assignee:profiles!tasks_assignee_id_fkey(email,display_name)').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(present(data), { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await workspaceContext(); if ('error' in context) return context.error;
  const body = await request.json() as Record<string, string>;
  if (!body.id) return Response.json({ error: 'Falta el identificador' }, { status: 400 });
  const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = { title: 'title', description: 'description', status: 'status', priority: 'priority', tag: 'label', dueDate: 'due_date' };
  for (const [source, target] of Object.entries(map)) if (source in body) changes[target] = source === 'dueDate' ? body[source] || null : body[source];
  if ('assignee' in body) { const { data } = await context.supabase.from('profiles').select('id').eq('email', body.assignee).maybeSingle(); changes.assignee_id = data?.id ?? null; }
  const { data, error } = await context.supabase.from('tasks').update(changes).eq('id', body.id).eq('workspace_id', context.workspaceId).select('*,assignee:profiles!tasks_assignee_id_fkey(email,display_name)').single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(present(data));
}

export async function DELETE(request: Request) {
  const context = await workspaceContext(); if ('error' in context) return context.error;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Falta el identificador' }, { status: 400 });
  const { error } = await context.supabase.from('tasks').delete().eq('id', id).eq('workspace_id', context.workspaceId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
