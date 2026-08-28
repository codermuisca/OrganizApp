import { asc, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { tasks } from '@/db/schema';

const seed = [
  ['t1', 'Definir objetivos de septiembre', 'todo', 'high', 'Planeación', '2026-08-30'],
  ['t2', 'Preparar propuesta para cliente', 'todo', 'medium', 'Trabajo', '2026-09-02'],
  ['t3', 'Actualizar portafolio personal', 'progress', 'medium', 'Personal', '2026-08-28'],
  ['t4', 'Revisar presupuesto mensual', 'progress', 'high', 'Finanzas', '2026-08-31'],
  ['t5', 'Agendar cita médica', 'done', 'low', 'Personal', '2026-08-28'],
] as const;

async function ensureDatabase() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    tag TEXT NOT NULL DEFAULT 'Personal',
    due_date TEXT NOT NULL DEFAULT '',
    assignee TEXT NOT NULL DEFAULT 'CM',
    created_at INTEGER NOT NULL
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at)').run();
  const existing = await env.DB.prepare('SELECT COUNT(*) AS total FROM tasks').first<{ total: number }>();
  if (!existing?.total) {
    await env.DB.batch(seed.map(([id, title, status, priority, tag, dueDate], index) =>
      env.DB.prepare('INSERT INTO tasks (id, title, status, priority, tag, due_date, assignee, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, title, status, priority, tag, dueDate, 'CM', '', Date.now() + index),
    ));
  }
}

export async function GET() {
  await ensureDatabase();
  return Response.json(await getDb().select().from(tasks).orderBy(asc(tasks.createdAt)));
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json() as Partial<typeof tasks.$inferInsert>;
  if (!body.title?.trim()) return Response.json({ error: 'El título es obligatorio' }, { status: 400 });
  const task: typeof tasks.$inferInsert = {
    id: crypto.randomUUID(), title: body.title.trim(), description: body.description ?? '',
    status: body.status ?? 'todo', priority: body.priority ?? 'medium', tag: body.tag ?? 'Personal',
    dueDate: body.dueDate ?? '', assignee: body.assignee ?? 'CM', createdAt: new Date(),
  };
  await getDb().insert(tasks).values(task);
  return Response.json(task, { status: 201 });
}

export async function PATCH(request: Request) {
  await ensureDatabase();
  const body = await request.json() as Partial<typeof tasks.$inferInsert> & { id?: string };
  if (!body.id) return Response.json({ error: 'Falta el identificador' }, { status: 400 });
  const { id, createdAt: _createdAt, ...changes } = body;
  await getDb().update(tasks).set(changes).where(eq(tasks.id, id));
  const updated = await getDb().select().from(tasks).where(eq(tasks.id, id)).get();
  return Response.json(updated);
}

export async function DELETE(request: Request) {
  await ensureDatabase();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Falta el identificador' }, { status: 400 });
  await getDb().delete(tasks).where(eq(tasks.id, id));
  return new Response(null, { status: 204 });
}
