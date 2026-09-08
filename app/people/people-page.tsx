'use client';

import { useEffect, useState } from 'react';
import {
  Crown,
  Mail,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react';

import AppSidebar from '@/components/app-sidebar';
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

type Space = {
  id: string;
  name: string;
  role: 'owner' | 'member';
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
  user: {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'member';
  };

  workspace: Space;

  workspaces: Space[];
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const isOwner = user.role === 'owner';

  async function loadMembers() {
    const response = await fetch('/api/members');

    if (response.ok) {
      setMembers(await response.json());
    } else {
      setNotice(
        'No pudimos cargar las personas del equipo.',
      );
    }

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
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
      }),
    });

    const result =
      (await response.json()) as {
        error?: string;
        invitationStored?: boolean;
      };

    if (response.ok) {
      setEmail('');
      setName('');
      setNotice('Invitación enviada por correo');

      await loadMembers();
    } else {
      setNotice(
        result.error ??
          'No pudimos enviar la invitación.',
      );

      if (result.invitationStored) {
        await loadMembers();
      }
    }

    setSaving(false);
  }

  async function resend(member: Member) {
    setSaving(true);

    const response = await fetch('/api/members', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: member.email,
        name: member.name,
      }),
    });

    const result =
      (await response.json()) as {
        error?: string;
      };

    setNotice(
      response.ok
        ? `Invitación reenviada a ${member.email}`
        : (result.error ??
          'No pudimos reenviar la invitación.'),
    );

    setSaving(false);
  }

  async function changeRole(
    member: Member,
    role: 'owner' | 'member',
  ) {
    if (!member.userId) return;

    const response = await fetch('/api/members', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        userId: member.userId,
        role,
      }),
    });

    if (response.ok) {
      setMembers((current) =>
        current.map((item) =>
          item.userId === member.userId
            ? {
                ...item,
                role,
              }
            : item,
        ),
      );
    } else {
      setNotice('No pudimos cambiar el rol.');
    }
  }

  async function remove(member: Member) {
    const query = member.userId
      ? `userId=${member.userId}`
      : `invitationId=${member.invitationId}`;

    const response = await fetch(
      `/api/members?${query}`,
      {
        method: 'DELETE',
      },
    );

    if (response.ok) {
      setMembers((current) =>
        current.filter(
          (item) => item !== member,
        ),
      );
    } else {
      setNotice(
        'No pudimos retirar a esta persona.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5fb] text-foreground">
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
        }}
        workspace={workspace}
        workspaces={workspaces}
        activePage="people"
      >
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-7 lg:grid-cols-[1fr_340px]">
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">
                  Equipo
                </p>

                <h1 className="mt-1 text-3xl font-bold">
                  Personas
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                  Administra quién participa y qué puede hacer.
                </p>
              </div>

              <Badge variant="outline">
                {members.length}{' '}
                {members.length === 1
                  ? 'persona'
                  : 'personas'}
              </Badge>
            </div>

            {notice && (
              <p className="mt-5 rounded-xl bg-card p-3 text-sm">
                {notice}
              </p>
            )}

            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">
                  Cargando equipo...
                </p>
              ) : members.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
                  <Users className="mx-auto size-8 text-primary" />

                  <h2 className="mt-3 font-semibold">
                    Aún no hay personas
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Invita a alguien para empezar a trabajar en equipo.
                  </p>
                </div>
              ) : (
                members.map((member) => (
                  <article
                    key={
                      member.userId ??
                      member.invitationId ??
                      member.email
                    }
                    className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e9e4ff] text-xs font-bold text-[#5b48d6]">
                      {initials(member.name)}
                    </span>

                    <div className="min-w-0 flex-1 sm:min-w-48">
                      <p className="truncate font-semibold">
                        {member.name}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>

                    <Badge
                      variant={
                        member.status === 'active'
                          ? 'secondary'
                          : 'outline'
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
                              event.target.value as
                                | 'owner'
                                | 'member',
                            )
                          }
                          className="h-9 rounded-lg border bg-background px-2 text-sm"
                        >
                          <option value="member">
                            Miembro
                          </option>

                          <option value="owner">
                            Propietario
                          </option>
                        </select>
                      )}

                    {member.userId === user.id && (
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Crown className="size-3" />
                        Tú
                      </span>
                    )}

                    {isOwner &&
                      member.status === 'invited' && (
                        <Button
                          aria-label={`Reenviar invitación a ${member.name}`}
                          variant="ghost"
                          size="icon"
                          disabled={saving}
                          onClick={() =>
                            void resend(member)
                          }
                        >
                          <Mail className="size-4 text-primary" />
                        </Button>
                      )}

                    {isOwner &&
                      member.userId !== user.id && (
                        <Button
                          aria-label={`Retirar a ${member.name}`}
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            void remove(member)
                          }
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
              <form
                onSubmit={invite}
                className="rounded-2xl border bg-card p-5"
              >
                <UserRoundPlus className="size-6 text-primary" />

                <h2 className="mt-3 text-lg font-semibold">
                  Invitar persona
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Recibirá por correo un enlace seguro para entrar a este espacio.
                </p>

                <label className="mt-5 block text-xs font-semibold">
                  Nombre

                  <Input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
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
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    className="mt-1"
                    placeholder="persona@ejemplo.com"
                  />
                </label>

                <Button
                  className="mt-5 w-full"
                  disabled={saving}
                >
                  <Mail />

                  {saving
                    ? 'Enviando...'
                    : 'Enviar invitación'}
                </Button>
              </form>
            ) : (
              <div className="rounded-2xl border bg-card p-5">
                <Users className="size-6 text-primary" />

                <h2 className="mt-3 font-semibold">
                  Eres miembro
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Puedes consultar las personas del espacio. Solo un propietario
                  puede administrar el equipo.
                </p>
              </div>
            )}
          </aside>
        </div>
      </AppSidebar>
    </main>
  );
}