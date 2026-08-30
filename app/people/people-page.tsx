'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Crown,
  Mail,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Member = {
  userId?: string;
  invitationId?: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  status: 'active' | 'invited';
};

function initials(value: string) {
  return (
    value
      .split(/[@\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

export default function PeoplePage({
  user,
  workspace,
  workspaces,
}: {
  user: { id: string; name: string; email: string; role: 'owner' | 'member' };
  workspace: { id: string; name: string; role: 'owner' | 'member' };
  workspaces: { id: string; name: string; role: 'owner' | 'member' }[];
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const isOwner = user.role === 'owner';

  async function switchWorkspace(workspaceId: string) {
    const response = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    });
    if (response.ok) window.location.reload();
    else setNotice('No pudimos cambiar de espacio.');
  }

  async function loadMembers() {
    const response = await fetch('/api/members');
    if (response.ok) setMembers(await response.json());
    else setNotice('No pudimos cargar las personas del equipo.');
    setLoading(false);
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch('/api/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    if (response.ok) {
      setEmail('');
      setName('');
      setNotice('Invitación preparada');
      await loadMembers();
    } else setNotice('No pudimos preparar la invitación.');
    setSaving(false);
  }

  async function changeRole(member: Member, role: 'owner' | 'member') {
    if (!member.userId) return;
    const response = await fetch('/api/members', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: member.userId, role }),
    });
    if (response.ok)
      setMembers((current) =>
        current.map((item) =>
          item.userId === member.userId ? { ...item, role } : item,
        ),
      );
    else setNotice('No pudimos cambiar el rol.');
  }

  async function remove(member: Member) {
    const query = member.userId
      ? `userId=${member.userId}`
      : `invitationId=${member.invitationId}`;
    const response = await fetch(`/api/members?${query}`, { method: 'DELETE' });
    if (response.ok)
      setMembers((current) => current.filter((item) => item !== member));
    else setNotice('No pudimos retirar a esta persona.');
  }

  return (
    <main className="min-h-screen bg-[#f7f5fb] text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-7">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="size-4" /> Volver al tablero
          </Link>
          <div className="flex items-center gap-3">
            {workspaces.length > 1 ? (
              <select
                aria-label="Espacio activo"
                value={workspace.id}
                onChange={(event) => void switchWorkspace(event.target.value)}
                className="h-9 max-w-48 rounded-lg border bg-background px-2 text-sm"
              >
                {workspaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-muted-foreground">
                {workspace.name}
              </span>
            )}
            <span className="grid size-9 place-items-center rounded-full bg-[#efeaff] text-xs font-bold text-[#5b48d6]">
              {initials(user.name)}
            </span>
            <span className="hidden text-sm sm:inline">{user.name}</span>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-7 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Equipo</p>
              <h1 className="mt-1 text-3xl font-bold">Personas</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Administra quién participa y qué puede hacer.
              </p>
            </div>
            <Badge variant="outline">{members.length} personas</Badge>
          </div>
          {notice && (
            <p className="mt-5 rounded-xl bg-card p-3 text-sm">{notice}</p>
          )}
          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Cargando equipo...
              </p>
            ) : (
              members.map((member) => (
                <article
                  key={member.userId ?? member.invitationId ?? member.email}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-[#e9e4ff] text-xs font-bold text-[#5b48d6]">
                    {initials(member.name)}
                  </span>
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <Badge
                    variant={
                      member.status === 'active' ? 'secondary' : 'outline'
                    }
                  >
                    {member.status === 'active'
                      ? 'Activo'
                      : 'Invitación pendiente'}
                  </Badge>
                  {isOwner &&
                    member.userId !== user.id &&
                    member.status === 'active' && (
                      <select
                        aria-label={`Rol de ${member.name}`}
                        value={member.role}
                        onChange={(event) =>
                          void changeRole(
                            member,
                            event.target.value as 'owner' | 'member',
                          )
                        }
                        className="h-9 rounded-lg border bg-background px-2 text-sm"
                      >
                        <option value="member">Miembro</option>
                        <option value="owner">Propietario</option>
                      </select>
                    )}
                  {member.userId === user.id && (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Crown className="size-3" /> Tú
                    </span>
                  )}
                  {isOwner && member.userId !== user.id && (
                    <Button
                      aria-label={`Retirar a ${member.name}`}
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove(member)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
        <aside>
          {isOwner ? (
            <form onSubmit={invite} className="rounded-2xl border bg-card p-5">
              <UserRoundPlus className="size-6 text-primary" />
              <h2 className="mt-3 text-lg font-semibold">Invitar persona</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                La invitación quedará vinculada a este espacio.
              </p>
              <label className="mt-5 block text-xs font-semibold">
                Nombre
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1"
                  placeholder="Nombre"
                />
              </label>
              <label className="mt-4 block text-xs font-semibold">
                Email
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1"
                  placeholder="persona@ejemplo.com"
                />
              </label>
              <Button className="mt-5 w-full" disabled={saving}>
                <Mail />
                {saving ? 'Preparando...' : 'Preparar invitación'}
              </Button>
            </form>
          ) : (
            <div className="rounded-2xl border bg-card p-5">
              <Users className="size-6 text-primary" />
              <h2 className="mt-3 font-semibold">Eres miembro</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Puedes consultar las personas del espacio. Solo un propietario
                puede administrar el equipo.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
