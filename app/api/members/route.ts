import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { members } from '@/db/schema';
import { requireWorkspaceMember } from '../authz';

export async function GET() {
  const auth = await requireWorkspaceMember();
  if ('error' in auth) return auth.error;
  return Response.json(await getDb().select().from(members).orderBy(asc(members.createdAt)));
}

export async function POST(request: Request) {
  const auth = await requireWorkspaceMember();
  if ('error' in auth) return auth.error;
  if (auth.member.role !== 'owner') return Response.json({ error: 'Solo el propietario puede invitar' }, { status: 403 });
  const body = await request.json() as { email?: string; name?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) return Response.json({ error: 'Escribe un email válido' }, { status: 400 });
  const member = { email, name: body.name?.trim() || email.split('@')[0], role: 'member' as const, status: 'invited' as const, createdAt: new Date() };
  await getDb().insert(members).values(member).onConflictDoUpdate({ target: members.email, set: { name: member.name } });
  return Response.json(member, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireWorkspaceMember();
  if ('error' in auth) return auth.error;
  if (auth.member.role !== 'owner') return Response.json({ error: 'Solo el propietario puede eliminar miembros' }, { status: 403 });
  const email = new URL(request.url).searchParams.get('email')?.toLowerCase();
  if (!email) return Response.json({ error: 'Falta el email' }, { status: 400 });
  const target = await getDb().select().from(members).where(eq(members.email, email)).get();
  if (target?.role === 'owner') return Response.json({ error: 'No puedes eliminar al propietario' }, { status: 400 });
  await getDb().delete(members).where(eq(members.email, email));
  return new Response(null, { status: 204 });
}
