'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  LayoutDashboard,
  ListTodo,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Status = 'todo' | 'progress' | 'done';
type Priority = 'low' | 'medium' | 'high';
type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  tag: string;
  dueDate: string;
  assignee: string;
  createdAt?: string;
};
type Member = {
  userId?: string;
  invitationId?: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  status: 'active' | 'invited';
};

const columnInfo: { status: Status; title: string; tone: string }[] = [
  { status: 'todo', title: 'Por hacer', tone: 'bg-[#7c6cff]' },
  { status: 'progress', title: 'En progreso', tone: 'bg-[#f2a93b]' },
  { status: 'done', title: 'Completado', tone: 'bg-[#35b78a]' },
];
const blankTask: Omit<Task, 'id'> = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  tag: 'Personal',
  dueDate: '',
  assignee: 'CM',
};

function prettyDate(date: string) {
  if (!date) return 'Sin fecha';
  const value = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(value);
}

function todayLabel() {
  const formatted = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

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

export default function TaskBoard({
  user,
  workspace,
  workspaces,
}: {
  user: { name: string; email: string; role: 'owner' | 'member' };
  workspace: { id: string; name: string; role: 'owner' | 'member' };
  workspaces: { id: string; name: string; role: 'owner' | 'member' }[];
}) {
  const isOwner = user.role === 'owner';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Task, 'id'>>(blankTask);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);

  async function switchWorkspace(workspaceId: string) {
    const response = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    });
    if (response.ok) window.location.reload();
    else {
      setNotice('No pudimos cambiar de espacio.');
      setTimeout(() => setNotice(''), 2500);
    }
  }

  async function loadTasks() {
    try {
      const [taskResponse, memberResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/members'),
      ]);
      if (!taskResponse.ok || !memberResponse.ok) throw new Error();
      setTasks(await taskResponse.json());
      const loadedMembers = (await memberResponse.json()) as Member[];
      setMembers(loadedMembers);
      if (loadedMembers.length && blankTask.assignee === 'CM')
        blankTask.assignee = loadedMembers[0].email;
    } catch {
      setNotice('No pudimos cargar tus tareas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadTasks();
  }, []);

  const filtered = useMemo(
    () =>
      tasks.filter((task) =>
        `${task.title} ${task.tag}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [tasks, query],
  );

  function startCreate(status: Status = 'todo') {
    setEditingId(null);
    setForm({ ...blankTask, status });
    setDialogOpen(true);
  }
  function startEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      tag: task.tag,
      dueDate: task.dueDate,
      assignee: task.assignee,
    });
    setDialogOpen(true);
  }
  async function saveTask(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/tasks', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      if (!response.ok) throw new Error();
      const saved = (await response.json()) as Task;
      setTasks((current) =>
        editingId
          ? current.map((task) => (task.id === editingId ? saved : task))
          : [...current, saved],
      );
      setDialogOpen(false);
      setNotice(editingId ? 'Tarea actualizada' : 'Tarea creada');
    } catch {
      setNotice('No pudimos guardar la tarea.');
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(''), 2500);
    }
  }
  function canMoveTask(task: Task) {
    return isOwner || task.assignee.toLowerCase() === user.email.toLowerCase();
  }
  async function moveTaskTo(task: Task, status: Status) {
    if (status === task.status) return;
    if (!canMoveTask(task)) {
      setNotice('Solo puedes avanzar las tareas que tienes asignadas.');
      setTimeout(() => setNotice(''), 2500);
      return;
    }
    const previousStatus = task.status;
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status } : item)),
    );
    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: task.id, status }),
    });
    if (!response.ok) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, status: previousStatus } : item,
        ),
      );
      setNotice('No pudimos cambiar el estado de la tarea.');
      setTimeout(() => setNotice(''), 2500);
    }
  }
  async function moveTask(task: Task) {
    const index = columnInfo.findIndex(
      (column) => column.status === task.status,
    );
    const status =
      columnInfo[Math.min(index + 1, columnInfo.length - 1)].status;
    await moveTaskTo(task, status);
  }
  async function deleteTask() {
    if (!editingId) return;
    await fetch(`/api/tasks?id=${editingId}`, { method: 'DELETE' });
    setTasks((current) => current.filter((task) => task.id !== editingId));
    setDialogOpen(false);
    setNotice('Tarea eliminada');
    setTimeout(() => setNotice(''), 2500);
  }
  async function inviteMember(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName }),
    });
    const result = (await response.json()) as {
      error?: string;
      invitationStored?: boolean;
    };
    if (!response.ok) {
      setNotice(result.error ?? 'No pudimos enviar la invitación.');
      if (result.invitationStored) void loadTasks();
      return;
    }
    const member = result as Member;
    setMembers((current) => [
      ...current.filter((item) => item.email !== member.email),
      member,
    ]);
    setInviteOpen(false);
    setInviteEmail('');
    setInviteName('');
    setNotice('Invitación enviada por correo');
    setTimeout(() => setNotice(''), 2500);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r bg-sidebar px-4 py-5 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            O
          </div>  
          <div>
            <p className="font-semibold tracking-tight">OrganizApp2</p>
            {workspaces.length > 1 ? (
              <select
                aria-label="Espacio activo"
                value={workspace.id}
                onChange={(event) => void switchWorkspace(event.target.value)}
                className="mt-0.5 max-w-36 bg-transparent text-xs text-muted-foreground outline-none"
              >
                {workspaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-muted-foreground">{workspace.name}</p>
            )}
          </div>
        </div>
        <nav className="mt-8 space-y-1 text-sm">
          <a
            className="flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-2.5 font-medium"
            href="#"
          >
            <LayoutDashboard className="size-4" />
            Tablero
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground"
            href="/my-tasks"
          >
            <ListTodo className="size-4" />
            Mis tareas
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground"
            href="/calendar"
          >
            <CalendarDays className="size-4" />
            Calendario
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground"
            href="/activities"
          >
            <Activity className="size-4" />
            Actividades
          </a>
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground"
            href="/people"
          >
            <Users className="size-4" />
            Personas
          </a>
        </nav>
        <div className="mt-auto">
          <a
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground"
            href="/auth/signout"
          >
            <Settings2 className="size-4" />
            Cerrar sesión
          </a>
          <div className="mt-3 flex items-center gap-3 border-t pt-4">
            <div className="grid size-9 place-items-center rounded-full bg-[#efeaff] text-xs font-bold text-[#5b48d6]">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section className="lg:pl-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground lg:hidden">
              O
            </div>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-64 rounded-xl bg-muted/50 pl-9"
                placeholder="Buscar tareas..."
              />
            </div>
          </div>
          {isOwner && (
            <Button
              onClick={() => startCreate()}
              className="h-10 rounded-xl px-4"
            >
              <Plus /> Nueva tarea
            </Button>
          )}
        </header>
        <div className="px-4 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-primary">
                {todayLabel()}
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Hola {user.name.split(' ')[0]}!
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Estas son las actividades que necesitan tu atención.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4 text-[#35b78a]" />
              <strong className="text-foreground">
                {tasks.filter((task) => task.status === 'done').length}
              </strong>{' '}
              completadas
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Mi tablero</h2>
              <p className="text-xs text-muted-foreground">
                {tasks.length} actividades · {members.length}{' '}
                {members.length === 1 ? 'persona' : 'personas'}
              </p>
            </div>
            {isOwner && (
              <Button
                onClick={() => setInviteOpen(true)}
                variant="outline"
                className="rounded-xl"
              >
                <Users /> Invitar
              </Button>
            )}
          </div>
          {notice && (
            <output className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-xl">
              <Check className="size-4" />
              {notice}
            </output>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {columnInfo.map((column) => {
              const items = filtered.filter(
                (task) => task.status === column.status,
              );
              return (
                <section
                  key={column.status}
                  onDragOver={(event) => {
                    const task = tasks.find((item) => item.id === draggingId);
                    if (!task || !canMoveTask(task)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverStatus(column.status);
                  }}
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(event.relatedTarget as Node)
                    )
                      setDragOverStatus(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const taskId =
                      draggingId || event.dataTransfer.getData('text/plain');
                    const task = tasks.find((item) => item.id === taskId);
                    setDraggingId(null);
                    setDragOverStatus(null);
                    if (task) void moveTaskTo(task, column.status);
                  }}
                  className={`min-w-0 rounded-2xl p-3 transition-colors ${
                    dragOverStatus === column.status
                      ? 'bg-primary/10 ring-2 ring-primary/35'
                      : 'bg-muted/55'
                  }`}
                >
                  <div className="flex items-center justify-between px-1 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${column.tone}`} />
                      <h3 className="text-sm font-semibold">{column.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                    {isOwner && column.status === 'todo' && (
                      <button
                        onClick={() => startCreate()}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-background"
                        aria-label={`Agregar a ${column.title}`}
                      >
                        <Plus className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {loading &&
                      [1, 2].map((n) => (
                        <div
                          key={n}
                          className="h-28 animate-pulse rounded-xl bg-card"
                        />
                      ))}
                    {!loading &&
                      items.map((task) => (
                        <article
                          key={task.id}
                          draggable={canMoveTask(task)}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', task.id);
                            setDraggingId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverStatus(null);
                          }}
                          className={`group rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(38,31,68,.04)] transition hover:-translate-y-0.5 hover:shadow-md ${
                            canMoveTask(task)
                              ? 'cursor-grab active:cursor-grabbing'
                              : ''
                          } ${draggingId === task.id ? 'opacity-45' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => void moveTask(task)}
                              aria-label="Avanzar tarea"
                            >
                              {task.status === 'done' ? (
                                <CheckCircle2 className="mt-0.5 size-4 text-[#35b78a]" />
                              ) : (
                                <Circle className="mt-0.5 size-4 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => isOwner && startEdit(task)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <h4 className="text-sm font-semibold leading-snug">
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                            </button>
                            {isOwner && (
                              <button
                                onClick={() => startEdit(task)}
                                className="opacity-40 transition group-hover:opacity-100"
                                aria-label="Editar"
                              >
                                <MoreHorizontal className="size-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className="bg-[#f0edff] text-[#5b48d6]"
                            >
                              {task.tag}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  task.priority === 'high'
                                    ? 'text-[11px] font-medium text-destructive'
                                    : 'text-[11px] text-muted-foreground'
                                }
                              >
                                {prettyDate(task.dueDate)}
                              </span>
                              <span
                                title={task.assignee}
                                className="grid size-6 place-items-center rounded-full bg-[#e9e4ff] text-[9px] font-bold text-[#5b48d6]"
                              >
                                {initials(task.assignee)}
                              </span>
                              {task.status !== 'done' && (
                                <ChevronRight className="size-3 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    {!loading && items.length === 0 && (
                      <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                        No hay tareas aquí
                      </div>
                    )}
                    {isOwner && column.status === 'todo' && (
                      <button
                        onClick={() => startCreate()}
                        className="flex w-full items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-card"
                      >
                        <Plus className="size-4" />
                        Agregar tarea
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={saveTask}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar tarea' : 'Nueva tarea'}
              </DialogTitle>
              <DialogDescription>
                Guarda lo importante y decide cuándo hacerlo.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold">
                Título
                <Input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 h-10"
                  placeholder="Ej. Preparar presentación"
                />
              </label>
              <label className="block text-xs font-semibold">
                Descripción
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 min-h-20"
                  placeholder="Detalles opcionales"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold">
                  Estado
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as Status })
                    }
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
                  >
                    <option value="todo">Por hacer</option>
                    <option value="progress">En progreso</option>
                    <option value="done">Completado</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Prioridad
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as Priority })
                    }
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Etiqueta
                  <Input
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    className="mt-1 h-10"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Fecha límite
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    className="mt-1 h-10"
                  />
                </label>
                <label className="col-span-2 text-xs font-semibold">
                  Responsable
                  <select
                    value={form.assignee}
                    onChange={(e) =>
                      setForm({ ...form, assignee: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
                  >
                    {members.map((member) => (
                      <option key={member.email} value={member.email}>
                        {member.name} · {member.email}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <DialogFooter className="mt-5">
              <div className="flex w-full justify-between">
                {editingId ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void deleteTask()}
                  >
                    <Trash2 />
                    Eliminar
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <DialogClose
                    render={<Button type="button" variant="outline" />}
                  >
                    Cancelar
                  </DialogClose>
                  <Button type="submit" disabled={saving || !form.title.trim()}>
                    {saving ? 'Guardando...' : 'Guardar tarea'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={inviteMember}>
            <DialogHeader>
              <DialogTitle>Invitar participante</DialogTitle>
              <DialogDescription>
                Recibirá un enlace seguro para entrar, ver el tablero y recibir
                tareas.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold">
                Nombre
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1 h-10"
                  placeholder="Nombre del participante"
                />
              </label>
              <label className="block text-xs font-semibold">
                Email
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 h-10"
                  placeholder="persona@ejemplo.com"
                />
              </label>
              {members.length > 0 && (
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs font-semibold">
                    Personas en el espacio
                  </p>
                  <div className="mt-2 space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.email}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="grid size-7 place-items-center rounded-full bg-[#e9e4ff] font-bold text-[#5b48d6]">
                          {initials(member.name)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {member.name}
                        </span>
                        <Badge variant="outline">
                          {member.status === 'active' ? 'Activo' : 'Invitado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-5">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit">Enviar invitación</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
