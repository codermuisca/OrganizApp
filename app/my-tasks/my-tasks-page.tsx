'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  ListTodo,
  Search,
} from 'lucide-react';

import AppSidebar from '@/components/app-sidebar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
};

type Space = {
  id: string;
  name: string;
  role: 'owner' | 'member';
};

type DateFilter =
  | 'all'
  | 'overdue'
  | 'today'
  | 'upcoming'
  | 'no_date';

const statusLabels: Record<Status, string> = {
  todo: 'Por hacer',
  progress: 'En progreso',
  done: 'Completada',
};

const priorityLabels: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

function localDate() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function dateGroup(task: Task, today: string) {
  if (task.status === 'done') return 'Completadas';
  if (!task.dueDate) return 'Sin fecha';
  if (task.dueDate < today) return 'Vencidas';
  if (task.dueDate === today) return 'Para hoy';

  return 'Próximas';
}

function displayDate(value: string) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export default function MyTasksPage({
  user,
  workspace,
  workspaces,
}: {
  user: {
    name: string;
    email: string;
  };

  workspace: Space;
  workspaces: Space[];
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [priority, setPriority] =
    useState<'all' | Priority>('all');
  const [dateFilter, setDateFilter] =
    useState<DateFilter>('all');
  const [notice, setNotice] = useState('');

  const today = localDate();

  useEffect(() => {
    void fetch('/api/tasks?scope=mine').then(async (response) => {
      if (response.ok) {
        setTasks(await response.json());
      } else {
        setNotice('No pudimos cargar tus tareas.');
      }

      setLoading(false);
    });
  }, []);

  async function changeStatus(
    task: Task,
    nextStatus: Status,
  ) {
    const previous = task.status;

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: nextStatus,
            }
          : item,
      ),
    );

    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: task.id,
        status: nextStatus,
      }),
    });

    if (!response.ok) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: previous,
              }
            : item,
        ),
      );

      setNotice('No pudimos actualizar la tarea.');
    }
  }

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesQuery =
          `${task.title} ${task.description} ${task.tag}`
            .toLowerCase()
            .includes(query.toLowerCase());

        const matchesStatus =
          status === 'all' || task.status === status;

        const matchesPriority =
          priority === 'all' || task.priority === priority;

        const matchesDate =
          dateFilter === 'all' ||
          (dateFilter === 'no_date' && !task.dueDate) ||
          (dateFilter === 'overdue' &&
            task.status !== 'done' &&
            !!task.dueDate &&
            task.dueDate < today) ||
          (dateFilter === 'today' &&
            task.dueDate === today) ||
          (dateFilter === 'upcoming' &&
            !!task.dueDate &&
            task.dueDate > today);

        return (
          matchesQuery &&
          matchesStatus &&
          matchesPriority &&
          matchesDate
        );
      }),
    [tasks, query, status, priority, dateFilter, today],
  );

  const groups = [
    'Vencidas',
    'Para hoy',
    'Próximas',
    'Sin fecha',
    'Completadas',
  ]
    .map((name) => ({
      name,
      tasks: filtered.filter(
        (task) => dateGroup(task, today) === name,
      ),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <main className="min-h-screen bg-[#f7f5fb] text-foreground">
      <AppSidebar
        user={user}
        workspace={workspace}
        workspaces={workspaces}
        activePage="my-tasks"
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <ListTodo className="size-4" />
                Trabajo personal
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Mis tareas
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Todo lo que tienes asignado en {workspace.name}.
              </p>
            </div>

            <div className="rounded-full border bg-card px-4 py-2 text-sm">
              <strong>
                {
                  tasks.filter(
                    (task) => task.status !== 'done',
                  ).length
                }
              </strong>{' '}
              pendientes
            </div>
          </div>

          {notice && (
            <p className="mt-5 rounded-xl bg-card p-3 text-sm">
              {notice}
            </p>
          )}

          <div className="mt-7 grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_repeat(3,160px)]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

              <Input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                className="pl-9"
                placeholder="Buscar mis tareas..."
              />
            </div>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as 'all' | Status,
                )
              }
              className="h-10 rounded-lg border bg-background px-2 text-sm"
            >
              <option value="all">
                Todos los estados
              </option>

              <option value="todo">
                Por hacer
              </option>

              <option value="progress">
                En progreso
              </option>

              <option value="done">
                Completadas
              </option>
            </select>

            <select
              value={priority}
              onChange={(event) =>
                setPriority(
                  event.target.value as 'all' | Priority,
                )
              }
              className="h-10 rounded-lg border bg-background px-2 text-sm"
            >
              <option value="all">
                Toda prioridad
              </option>

              <option value="high">
                Alta
              </option>

              <option value="medium">
                Media
              </option>

              <option value="low">
                Baja
              </option>
            </select>

            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(
                  event.target.value as DateFilter,
                )
              }
              className="h-10 rounded-lg border bg-background px-2 text-sm"
            >
              <option value="all">
                Todas las fechas
              </option>

              <option value="overdue">
                Vencidas
              </option>

              <option value="today">
                Para hoy
              </option>

              <option value="upcoming">
                Próximas
              </option>

              <option value="no_date">
                Sin fecha
              </option>
            </select>
          </div>

          {loading ? (
            <p className="mt-10 text-sm text-muted-foreground">
              Cargando tus tareas...
            </p>
          ) : groups.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed bg-card p-12 text-center">
              <CheckCircle2 className="mx-auto size-9 text-[#35b78a]" />

              <h2 className="mt-3 font-semibold">
                Todo está en orden
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                No encontramos tareas con estos filtros.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {groups.map((group) => (
                <section key={group.name}>
                  <h2 className="mb-3 flex items-center gap-2 font-semibold">
                    {group.name === 'Vencidas' ? (
                      <AlertTriangle className="size-4 text-destructive" />
                    ) : group.name === 'Para hoy' ? (
                      <Clock3 className="size-4 text-[#f2a93b]" />
                    ) : group.name === 'Completadas' ? (
                      <CheckCircle2 className="size-4 text-[#35b78a]" />
                    ) : (
                      <CalendarDays className="size-4 text-primary" />
                    )}

                    {group.name}

                    <Badge variant="outline">
                      {group.tasks.length}
                    </Badge>
                  </h2>

                  <div className="space-y-3">
                    {group.tasks.map((task) => (
                      <article
                        key={task.id}
                        className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                      >
                        <Circle
                          className={`size-5 ${
                            task.status === 'done'
                              ? 'text-[#35b78a]'
                              : 'text-muted-foreground'
                          }`}
                        />

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`font-semibold ${
                                task.status === 'done'
                                  ? 'text-muted-foreground line-through'
                                  : ''
                              }`}
                            >
                              {task.title}
                            </h3>

                            <Badge variant="secondary">
                              {task.tag}
                            </Badge>

                            <span
                              className={`text-xs ${
                                task.priority === 'high'
                                  ? 'font-medium text-destructive'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {priorityLabels[task.priority]}
                            </span>
                          </div>

                          {task.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-muted-foreground">
                            {displayDate(task.dueDate)}
                          </p>
                        </div>

                        <select
                          aria-label={`Estado de ${task.title}`}
                          value={task.status}
                          onChange={(event) =>
                            void changeStatus(
                              task,
                              event.target.value as Status,
                            )
                          }
                          className="h-9 rounded-lg border bg-background px-2 text-sm"
                        >
                          <option value="todo">
                            {statusLabels.todo}
                          </option>

                          <option value="progress">
                            {statusLabels.progress}
                          </option>

                          <option value="done">
                            {statusLabels.done}
                          </option>
                        </select>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </AppSidebar>
    </main>
  );
}