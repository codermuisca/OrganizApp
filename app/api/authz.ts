import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { members } from '@/db/schema';
import { getChatGPTUser } from '@/app/chatgpt-auth';

export async function ensureMembersTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS members (
    email TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'invited',
    created_at INTEGER NOT NULL
  )`).run();
}

export async function requireWorkspaceMember() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: 'Debes iniciar sesión' }, { status: 401 }) } as const;
  await ensureMembersTable();
  const db = getDb();
  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM members').first<{ total: number }>();
  if (!count?.total) {
    await db.insert(members).values({ email: user.email.toLowerCase(), name: user.displayName, role: 'owner', status: 'active', createdAt: new Date() });
  }
  const member = await db.select().from(members).where(eq(members.email, user.email.toLowerCase())).get();
  if (!member) return { error: Response.json({ error: 'No perteneces a este espacio' }, { status: 403 }) } as const;
  if (member.status !== 'active') await db.update(members).set({ status: 'active', name: user.displayName }).where(eq(members.email, member.email));
  return { user, member: { ...member, status: 'active' as const } } as const;
}
