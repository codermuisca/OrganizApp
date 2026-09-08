'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
} from 'lucide-react';

import AppSidebar from '@/components/app-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
};

type Member = {
  email: string;
  name: string;
  status: 'active' | 'invited';
};

type Space = {
  id: string;
  name: string;
  role: 'owner' | 'member';
};

const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthCells(month: Date) {
  const first = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
  );

  const offset = (first.getDay() + 6) % 7;

  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - offset,
  );

  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + index,
      ),
  );
}

export default function CalendarPage({
  user,
  workspace,
  workspaces,
}: {
  user: {
    name: string;
    email: string;
    role: 'owner' | 'member';
  };

  workspace: Space;

  workspaces: Space[];
}) {
  const [month, setMonth] = useState(
    () =>
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ),
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [status, setStatus] =
    useState<'all' | Status>('all');

  const [priority, setPriority] =
    useState<'all' | Priority>('all');

  const [assignee, setAssignee] =
    useState('all');

  const [selected, setSelected] =
    useState<Task | null>(null);

  const [notice, setNotice] = useState('');

  const today = isoDate(new Date());

  useEffect(() => {
    void Promise.all([
      fetch('/api/tasks'),
      fetch('/api/members'),
    ]).then(
      async ([
        taskResponse,
        memberResponse,
      ]) => {
        if (
          taskResponse.ok &&
          memberResponse.ok
        ) {
          setTasks(
            await taskResponse.json(),
          );

          setMembers(
            await memberResponse.json(),
          );
        } else {
          setNotice(
            'No pudimos cargar el calendario.',
          );
        }
      },
    );
  }, []);

  async function changeStatus(
    task: Task,
    nextStatus: Status,
  ) {
    const response = await fetch(
      '/api/tasks',
      {
        method: 'PATCH',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          id: task.id,
          status: nextStatus,
        }),
      },
    );

    if (response.ok) {
      const updated = {
        ...task,
        status: nextStatus,
      };

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? updated
            : item,
        ),
      );

      setSelected(updated);
    } else {
      setNotice(
        'No tienes permiso para actualizar esta tarea.',
      );
    }
  }

  const filtered = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.dueDate &&
          (status === 'all' ||
            task.status === status) &&
          (priority === 'all' ||
            task.priority === priority) &&
          (assignee === 'all' ||
            task.assignee === assignee),
      ),
    [
      tasks,
      status,
      priority,
      assignee,
    ],
  );

  const cells = monthCells(month);

  const memberName = (
    email: string,
  ) =>
    members.find(
      (member) =>
        member.email === email,
    )?.name ?? email;

  const canUpdate =
    selected &&
    (user.role === 'owner' ||
      selected.assignee.toLowerCase() ===
        user.email.toLowerCase());

  return (
    <main className="min-h-screen bg-[#f7f5fb] text-foreground">
      <AppSidebar
        user={user}
        workspace={workspace}
        workspaces={workspaces}
        activePage="calendar"
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-7">
          {/* Encabezado */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <CalendarDays className="size-4" />
                Planificación
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Calendario
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Fechas límite de{' '}
                {workspace.name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Mes anterior"
                onClick={() =>
                  setMonth(
                    new Date(
                      month.getFullYear(),
                      month.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronLeft />
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setMonth(
                    new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1,
                    ),
                  )
                }
              >
                Hoy
              </Button>

              <Button
                variant="outline"
                size="icon"
                aria-label="Mes siguiente"
                onClick={() =>
                  setMonth(
                    new Date(
                      month.getFullYear(),
                      month.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          {notice && (
            <p className="mt-5 rounded-xl bg-card p-3 text-sm">
              {notice}
            </p>
          )}

          {/* Barra de mes y filtros */}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
            <h2 className="text-xl font-semibold capitalize">
              {new Intl.DateTimeFormat(
                'es-CO',
                {
                  month: 'long',
                  year: 'numeric',
                },
              ).format(month)}
            </h2>

            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | 'all'
                      | Status,
                  )
                }
                className="h-9 rounded-lg border bg-background px-2 text-sm"
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
                    event.target.value as
                      | 'all'
                      | Priority,
                  )
                }
                className="h-9 rounded-lg border bg-background px-2 text-sm"
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
                value={assignee}
                onChange={(event) =>
                  setAssignee(
                    event.target.value,
                  )
                }
                className="h-9 max-w-52 rounded-lg border bg-background px-2 text-sm"
              >
                <option value="all">
                  Todos los responsables
                </option>

                {members
                  .filter(
                    (member) =>
                      member.status ===
                      'active',
                  )
                  .map((member) => (
                    <option
                      key={member.email}
                      value={
                        member.email
                      }
                    >
                      {member.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Calendario */}
          <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 border-b bg-muted/50">
                {weekdays.map(
                  (day) => (
                    <div
                      key={day}
                      className="p-2 text-center text-xs font-semibold text-muted-foreground"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((date) => {
                  const iso =
                    isoDate(date);

                  const dayTasks =
                    filtered.filter(
                      (task) =>
                        task.dueDate ===
                        iso,
                    );

                  const currentMonth =
                    date.getMonth() ===
                    month.getMonth();

                  return (
                    <div
                      key={iso}
                      className={`min-h-28 border-b border-r p-1.5 sm:min-h-32 sm:p-2 ${
                        currentMonth
                          ? 'bg-card'
                          : 'bg-muted/25'
                      }`}
                    >
                      <div
                        className={`mb-1 grid size-7 place-items-center rounded-full text-xs ${
                          iso === today
                            ? 'bg-primary font-bold text-primary-foreground'
                            : currentMonth
                              ? ''
                              : 'text-muted-foreground'
                        }`}
                      >
                        {date.getDate()}
                      </div>

                      <div className="space-y-1">
                        {dayTasks
                          .slice(0, 3)
                          .map(
                            (task) => (
                              <button
                                key={
                                  task.id
                                }
                                onClick={() =>
                                  setSelected(
                                    task,
                                  )
                                }
                                className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium sm:text-xs ${
                                  task.status ===
                                  'done'
                                    ? 'bg-[#e7f7f1] text-[#238363]'
                                    : task.priority ===
                                        'high'
                                      ? 'bg-[#ffeded] text-destructive'
                                      : 'bg-[#f0edff] text-[#5b48d6]'
                                }`}
                              >
                                {
                                  task.title
                                }
                              </button>
                            ),
                          )}

                        {dayTasks.length >
                          3 && (
                          <p className="px-1 text-[10px] text-muted-foreground">
                            +
                            {dayTasks.length -
                              3}{' '}
                            más
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal detalle tarea */}
        <Dialog
          open={!!selected}
          onOpenChange={(open) =>
            !open &&
            setSelected(null)
          }
        >
          <DialogContent className="sm:max-w-md">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selected.title}
                  </DialogTitle>

                  <DialogDescription>
                    {selected.description ||
                      'Sin descripción'}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      Fecha límite
                    </span>

                    <span>
                      {new Intl.DateTimeFormat(
                        'es-CO',
                        {
                          dateStyle:
                            'medium',
                        },
                      ).format(
                        new Date(
                          `${selected.dueDate}T12:00:00`,
                        ),
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      Prioridad
                    </span>

                    <Badge variant="secondary">
                      {
                        priorityLabels[
                          selected
                            .priority
                        ]
                      }
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CircleUserRound className="size-4" />
                      Responsable
                    </span>

                    <span className="text-right">
                      {memberName(
                        selected.assignee,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      Estado
                    </span>

                    {canUpdate ? (
                      <select
                        value={
                          selected.status
                        }
                        onChange={(
                          event,
                        ) =>
                          void changeStatus(
                            selected,
                            event.target
                              .value as Status,
                          )
                        }
                        className="h-9 rounded-lg border bg-background px-2"
                      >
                        <option value="todo">
                          Por hacer
                        </option>

                        <option value="progress">
                          En progreso
                        </option>

                        <option value="done">
                          Completada
                        </option>
                      </select>
                    ) : (
                      <span>
                        {
                          statusLabels[
                            selected
                              .status
                          ]
                        }
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </AppSidebar>
    </main>
  );
}