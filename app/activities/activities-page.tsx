'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity as ActivityIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Plus,
  Target,
  Timer,
  Trash2,
} from 'lucide-react';

import AppSidebar from '@/components/app-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type GoalPeriod = 'daily' | 'weekly';

type Activity = {
  id: string;
  name: string;
  color: string;
  goalMinutes: number | null;
  goalPeriod: GoalPeriod | null;
};

type ActivityLog = {
  id: string;
  activityId: string;
  activityName: string;
  color: string;
  durationMinutes: number;
  performedAt: string;
  note?: string | null;
};

type Period = 'week' | 'month' | 'year';

type Space = {
  id: string;
  name: string;
  role: 'owner' | 'member';
};

const defaultColors = [
  '#7c6cff',
  '#35b78a',
  '#f2a93b',
  '#ef6461',
  '#4388d6',
  '#b25ec7',
];

function range(
  period: Period,
  referenceDate: Date,
) {
  let start: Date;
  let end: Date;

  if (period === 'week') {
    const offset =
      (referenceDate.getDay() + 6) % 7;

    start = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - offset,
    );

    end = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 7,
    );
  } else if (period === 'month') {
    start = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1,
    );

    end = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      1,
    );
  } else {
    start = new Date(
      referenceDate.getFullYear(),
      0,
      1,
    );

    end = new Date(
      referenceDate.getFullYear() + 1,
      0,
      1,
    );
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) {
    return `${remainder} min`;
  }

  return remainder
    ? `${hours} h ${remainder} min`
    : `${hours} h`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function weekStart(date: Date) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  result.setDate(
    result.getDate() -
      ((result.getDay() + 6) % 7),
  );

  return dayKey(result);
}

function goalProgress(
  activity: Activity,
  logs: ActivityLog[],
) {
  if (
    !activity.goalMinutes ||
    !activity.goalPeriod
  ) {
    return 0;
  }

  const now = new Date();

  return logs
    .filter((log) => {
      const date = new Date(
        log.performedAt,
      );

      return (
        log.activityId === activity.id &&
        (activity.goalPeriod === 'daily'
          ? dayKey(date) === dayKey(now)
          : weekStart(date) ===
            weekStart(now))
      );
    })
    .reduce(
      (sum, log) =>
        sum + log.durationMinutes,
      0,
    );
}

function currentStreak(
  activity: Activity,
  logs: ActivityLog[],
) {
  if (
    !activity.goalMinutes ||
    !activity.goalPeriod
  ) {
    return 0;
  }

  const totals = new Map<
    string,
    number
  >();

  for (const log of logs.filter(
    (item) =>
      item.activityId === activity.id,
  )) {
    const date = new Date(
      log.performedAt,
    );

    const key =
      activity.goalPeriod === 'daily'
        ? dayKey(date)
        : weekStart(date);

    totals.set(
      key,
      (totals.get(key) ?? 0) +
        log.durationMinutes,
    );
  }

  const cursor = new Date();

  if (
    activity.goalPeriod === 'weekly'
  ) {
    cursor.setDate(
      cursor.getDate() -
        ((cursor.getDay() + 6) % 7),
    );
  }

  const keyFor = () =>
    activity.goalPeriod === 'daily'
      ? dayKey(cursor)
      : weekStart(cursor);

  if (
    (totals.get(keyFor()) ?? 0) <
    activity.goalMinutes
  ) {
    cursor.setDate(
      cursor.getDate() -
        (activity.goalPeriod === 'daily'
          ? 1
          : 7),
    );
  }

  let streak = 0;

  while (
    (totals.get(keyFor()) ?? 0) >=
    activity.goalMinutes
  ) {
    streak += 1;

    cursor.setDate(
      cursor.getDate() -
        (activity.goalPeriod === 'daily'
          ? 1
          : 7),
    );
  }

  return streak;
}

export default function ActivitiesPage({
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
  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [logs, setLogs] =
    useState<ActivityLog[]>([]);

  const [
    streakLogs,
    setStreakLogs,
  ] = useState<ActivityLog[]>([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState('');

  const [name, setName] =
    useState('');
  
  const [colors, setColors] = useState(defaultColors);
  const [customColor, setCustomColor] = useState('#000000');
  const [color, setColor] =
  useState(defaultColors[0]);

  const [
    goalPeriod,
    setGoalPeriod,
  ] = useState<
    'none' | GoalPeriod
  >('none');

  const [
    goalHours,
    setGoalHours,
  ] = useState(0);

  const [
    goalMinutes,
    setGoalMinutes,
  ] = useState(0);

  const [
    manageId,
    setManageId,
  ] = useState('');

  const [
    managePeriod,
    setManagePeriod,
  ] = useState<
    'none' | GoalPeriod
  >('none');

  const [
    manageHours,
    setManageHours,
  ] = useState(0);

  const [
    manageMinutes,
    setManageMinutes,
  ] = useState(0);

  const [hours, setHours] =
    useState(0);

  const [minutes, setMinutes] =
    useState(0);

  const [note, setNote] =
    useState('');

  const [period, setPeriod] =
    useState<Period>('week');

  const [
    periodDate,
    setPeriodDate,
  ] = useState(() => new Date());

  const [notice, setNotice] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  async function loadActivities() {
    const response = await fetch(
      '/api/activities',
    );

    if (response.ok) {
      const result =
        (await response.json()) as Activity[];

      setActivities(result);

      setSelectedId(
        (current) =>
          current ||
          result[0]?.id ||
          '',
      );

      setManageId(
        (current) =>
          current ||
          result[0]?.id ||
          '',
      );

      if (!manageId && result[0]) {
        setManagePeriod(
          result[0].goalPeriod ??
            'none',
        );

        setManageHours(
          Math.floor(
            (result[0]
              .goalMinutes ??
              0) / 60,
          ),
        );

        setManageMinutes(
          (result[0]
            .goalMinutes ??
            0) % 60,
        );
      }
    } else {
      setNotice(
        'No pudimos cargar tus actividades.',
      );
    }
  }

  async function loadLogs(
    selectedPeriod: Period,
    selectedDate: Date,
  ) {
    const { from, to } = range(
      selectedPeriod,
      selectedDate,
    );

    const response = await fetch(
      `/api/activity-logs?from=${encodeURIComponent(
        from,
      )}&to=${encodeURIComponent(to)}`,
    );

    if (response.ok) {
      setLogs(
        await response.json(),
      );
    } else {
      setNotice(
        'No pudimos cargar tu historial.',
      );
    }
  }

  async function loadStreakLogs() {
    const start = new Date();

    start.setDate(
      start.getDate() - 370,
    );

    const response = await fetch(
      `/api/activity-logs?from=${encodeURIComponent(
        start.toISOString(),
      )}`,
    );

    if (response.ok) {
      setStreakLogs(
        await response.json(),
      );
    }
  }

  useEffect(() => {
    void loadActivities();
    void loadStreakLogs();
  }, []);

  useEffect(() => {
    void loadLogs(
      period,
      periodDate,
    );
  }, [period, periodDate]);

  async function createActivity(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setSaving(true);

    const response = await fetch(
      '/api/activities',
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          name,
          color,
          goalPeriod:
            goalPeriod === 'none'
              ? null
              : goalPeriod,
          goalMinutes:
            goalPeriod === 'none'
              ? null
              : goalHours * 60 +
                goalMinutes,
        }),
      },
    );

    const result =
      (await response.json()) as Activity & {
        error?: string;
      };

    if (response.ok) {
      setActivities((current) => [
        ...current,
        result,
      ]);

      setSelectedId(result.id);
      setName('');
      setGoalPeriod('none');
      setGoalHours(0);
      setGoalMinutes(0);

      setNotice(
        'Actividad creada',
      );
    } else {
      setNotice(
        result.error ??
          'No pudimos crear la actividad.',
      );
    }

    setSaving(false);
  }

  async function register(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const durationMinutes =
      hours * 60 + minutes;

    if (
      !selectedId ||
      durationMinutes < 1
    ) {
      setNotice(
        'Elige una actividad y una duración.',
      );

      return;
    }

    setSaving(true);

    const response = await fetch(
      '/api/activity-logs',
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          activityId: selectedId,
          durationMinutes,
          note:
            note.trim() || null,
        }),
      },
    );

    const result =
      (await response.json()) as ActivityLog & {
        error?: string;
      };

    if (response.ok) {
      /*
       * Solo agregamos directamente el registro
       * a "logs" si pertenece al período que
       * estamos viendo actualmente.
       */
      const {
        from,
        to,
      } = range(
        period,
        periodDate,
      );

      const logTime =
        new Date(
          result.performedAt,
        ).getTime();

      const fromTime =
        new Date(from).getTime();

      const toTime =
        new Date(to).getTime();

      if (
        logTime >= fromTime &&
        logTime < toTime
      ) {
        setLogs((current) => [
          result,
          ...current,
        ]);
      }

      setStreakLogs(
        (current) => [
          result,
          ...current,
        ],
      );

      setHours(0);
      setMinutes(0);
      setNote('');

      setNotice(
        'Actividad registrada ahora',
      );
    } else {
      setNotice(
        result.error ??
          'No pudimos guardar el registro.',
      );
    }

    setSaving(false);
  }

  function selectGoalActivity(
    activityId: string,
  ) {
    setManageId(activityId);

    const activity =
      activities.find(
        (item) =>
          item.id === activityId,
      );

    setManagePeriod(
      activity?.goalPeriod ??
        'none',
    );

    setManageHours(
      Math.floor(
        (activity?.goalMinutes ??
          0) / 60,
      ),
    );

    setManageMinutes(
      (activity?.goalMinutes ??
        0) % 60,
    );
  }

  async function updateGoal(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!manageId) return;

    setSaving(true);

    const response = await fetch(
      '/api/activities',
      {
        method: 'PATCH',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          id: manageId,
          goalPeriod:
            managePeriod === 'none'
              ? null
              : managePeriod,
          goalMinutes:
            managePeriod === 'none'
              ? null
              : manageHours * 60 +
                manageMinutes,
        }),
      },
    );

    const result =
      (await response.json()) as Activity & {
        error?: string;
      };

    if (response.ok) {
      setActivities(
        (current) =>
          current.map(
            (activity) =>
              activity.id ===
              result.id
                ? result
                : activity,
          ),
      );

      setNotice(
        managePeriod === 'none'
          ? 'Meta eliminada'
          : 'Meta actualizada',
      );
    } else {
      setNotice(
        result.error ??
          'No pudimos actualizar la meta.',
      );
    }

    setSaving(false);
  }

  async function deleteLog(
    id: string,
  ) {
    const response = await fetch(
      `/api/activity-logs?id=${id}`,
      {
        method: 'DELETE',
      },
    );

    if (response.ok) {
      setLogs((current) =>
        current.filter(
          (log) =>
            log.id !== id,
        ),
      );

      setStreakLogs(
        (current) =>
          current.filter(
            (log) =>
              log.id !== id,
          ),
      );
    } else {
      setNotice(
        'No pudimos eliminar el registro.',
      );
    }
  }

  function changePeriod(
    direction: -1 | 1,
  ) {
    setPeriodDate(
      (current) => {
        const next =
          new Date(current);

        if (
          period === 'week'
        ) {
          next.setDate(
            next.getDate() +
              direction * 7,
          );
        } else if (
          period === 'month'
        ) {
          next.setMonth(
            next.getMonth() +
              direction,
          );
        } else {
          next.setFullYear(
            next.getFullYear() +
              direction,
          );
        }

        return next;
      },
    );
  }

  function periodLabel() {
    if (period === 'year') {
      return String(
        periodDate.getFullYear(),
      );
    }

    if (period === 'month') {
      return new Intl.DateTimeFormat(
        'es-CO',
        {
          month: 'long',
          year: 'numeric',
        },
      ).format(periodDate);
    }

    const offset =
      (periodDate.getDay() + 6) %
      7;

    const start = new Date(
      periodDate.getFullYear(),
      periodDate.getMonth(),
      periodDate.getDate() -
        offset,
    );

    const end = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 6,
    );

    const sameYear =
      start.getFullYear() ===
      end.getFullYear();

    const sameMonth =
      sameYear &&
      start.getMonth() ===
        end.getMonth();

    if (sameMonth) {
      const month =
        new Intl.DateTimeFormat(
          'es-CO',
          {
            month: 'short',
          },
        ).format(start);

      return `${start.getDate()}–${end.getDate()} ${month} ${end.getFullYear()}`;
    }

    if (sameYear) {
      const startText =
        new Intl.DateTimeFormat(
          'es-CO',
          {
            day: 'numeric',
            month: 'short',
          },
        ).format(start);

      const endText =
        new Intl.DateTimeFormat(
          'es-CO',
          {
            day: 'numeric',
            month: 'short',
          },
        ).format(end);

      return `${startText}–${endText} ${end.getFullYear()}`;
    }

    const startText =
      new Intl.DateTimeFormat(
        'es-CO',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
      ).format(start);

    const endText =
      new Intl.DateTimeFormat(
        'es-CO',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
      ).format(end);

    return `${startText}–${endText}`;
  }

  const stats = useMemo(
    () =>
      activities
        .map((activity) => ({
          ...activity,

          minutes: logs
            .filter(
              (log) =>
                log.activityId ===
                activity.id,
            )
            .reduce(
              (sum, log) =>
                sum +
                log.durationMinutes,
              0,
            ),
        }))
        .filter(
          (activity) =>
            activity.minutes > 0,
        )
        .sort(
          (a, b) =>
            b.minutes -
            a.minutes,
        ),
    [activities, logs],
  );

  const total = stats.reduce(
    (sum, activity) =>
      sum + activity.minutes,
    0,
  );

  const max =
    stats[0]?.minutes || 1;

  return (
    <main className="min-h-screen bg-[#f7f5fb] text-foreground">
      <AppSidebar
        user={user}
        workspace={workspace}
        workspaces={workspaces}
        activePage="activities"
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <ActivityIcon className="size-4" />
              Progreso personal
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Actividades
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Registra lo que haces y descubre cómo inviertes tu tiempo.
            </p>
          </div>

          {notice && (
            <p className="mt-5 rounded-xl bg-card p-3 text-sm">
              {notice}
            </p>
          )}

          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            {/* Registrar ahora */}
            <form
              onSubmit={register}
              className="rounded-2xl border bg-card p-5"
            >
              <Timer className="size-6 text-primary" />

              <h2 className="mt-3 text-lg font-semibold">
                Registrar ahora
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                La fecha y hora se guardan automáticamente.
              </p>

              <label className="mt-5 block text-xs font-semibold">
                Actividad

                <select
                  required
                  value={selectedId}
                  onChange={(
                    event,
                  ) =>
                    setSelectedId(
                      event.target
                        .value,
                    )
                  }
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
                >
                  <option value="">
                    Selecciona una actividad
                  </option>

                  {activities.map(
                    (activity) => (
                      <option
                        key={
                          activity.id
                        }
                        value={
                          activity.id
                        }
                      >
                        {
                          activity.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold">
                  Horas

                  <Input
                    type="number"
                    min="0"
                    max="24"
                    value={hours}
                    onFocus={(
                      event,
                    ) =>
                      event.target.select()
                    }
                    onChange={(
                      event,
                    ) =>
                      setHours(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="mt-1"
                  />
                </label>

                <label className="text-xs font-semibold">
                  Minutos

                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onFocus={(
                      event,
                    ) =>
                      event.target.select()
                    }
                    onChange={(
                      event,
                    ) =>
                      setMinutes(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="mt-1"
                  />
                </label>
              </div>

              <label className="mt-4 block text-xs font-semibold">
                Nota

                <textarea
                  value={note}
                  onChange={(
                    event,
                  ) =>
                    setNote(
                      event.target
                        .value,
                    )
                  }
                  maxLength={500}
                  rows={3}
                  placeholder="Deja tu nota..."
                  className="mt-1 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <span className="mt-1 block text-right text-[10px] font-normal text-muted-foreground">
                  {note.length}/500
                </span>
              </label>

              <Button
                type="submit"
                className="mt-4 w-full"
                disabled={
                  saving ||
                  !activities.length
                }
              >
                <Clock3 />

                {saving
                  ? 'Guardando...'
                  : 'Guardar registro'}
              </Button>
            </form>

            {/* Nueva actividad */}
            <form
              onSubmit={
                createActivity
              }
              className="rounded-2xl border bg-card p-5"
            >
              <Plus className="size-6 text-primary" />

              <h2 className="mt-3 text-lg font-semibold">
                Nueva actividad
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Créala una vez y reutilízala todos los días.
              </p>

              <label className="mt-5 block text-xs font-semibold">
                Nombre

                <Input
                  required
                  maxLength={60}
                  value={name}
                  onChange={(
                    event,
                  ) =>
                    setName(
                      event.target
                        .value,
                    )
                  }
                  className="mt-1"
                  placeholder="Ej. Leer"
                />
              </label>

              <div className="mt-2 flex flex-wrap items-center gap-2">
  {colors.map((option) => {
    const isDefault = defaultColors.includes(option);

    return (
      <div
        key={option}
        className="relative"
      >
        <button
          type="button"
          aria-label={`Color ${option}`}
          onClick={() => setColor(option)}
          className={`size-8 rounded-full ${
            color === option
              ? 'ring-2 ring-primary ring-offset-2'
              : ''
          }`}
          style={{
            backgroundColor: option,
          }}
        />

        {!isDefault && (
          <button
            type="button"
            aria-label={`Eliminar color ${option}`}
            onClick={() => {
              setColors((current) =>
                current.filter(
                  (item) => item !== option,
                ),
              );

              if (color === option) {
                setColor(defaultColors[0]);
              }
            }}
            className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
          >
            ×
          </button>
        )}
      </div>
    );
  })}

  <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
    + Agregar color

    <input
      type="color"
      value={customColor}
      onChange={(event) => {
        const newColor =
          event.target.value;

        setCustomColor(newColor);
        setColor(newColor);

        setColors((current) =>
          current.includes(newColor)
            ? current
            : [...current, newColor],
        );
      }}
      className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
    />
  </label>
</div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_80px_80px]">
                <label className="text-xs font-semibold">
                  Meta opcional

                  <select
                    value={
                      goalPeriod
                    }
                    onChange={(
                      event,
                    ) =>
                      setGoalPeriod(
                        event.target
                          .value as
                          | 'none'
                          | GoalPeriod,
                      )
                    }
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
                  >
                    <option value="none">
                      Sin meta
                    </option>

                    <option value="daily">
                      Diaria
                    </option>

                    <option value="weekly">
                      Semanal
                    </option>
                  </select>
                </label>

                <label className="text-xs font-semibold">
                  Horas

                  <Input
                    type="number"
                    min="0"
                    value={
                      goalHours
                    }
                    disabled={
                      goalPeriod ===
                      'none'
                    }
                    onFocus={(
                      event,
                    ) =>
                      event.target.select()
                    }
                    onChange={(
                      event,
                    ) =>
                      setGoalHours(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="mt-1"
                  />
                </label>

                <label className="text-xs font-semibold">
                  Minutos

                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={
                      goalMinutes
                    }
                    disabled={
                      goalPeriod ===
                      'none'
                    }
                    onFocus={(
                      event,
                    ) =>
                      event.target.select()
                    }
                    onChange={(
                      event,
                    ) =>
                      setGoalMinutes(
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                    className="mt-1"
                  />
                </label>
              </div>

              <Button
                type="submit"
                variant="outline"
                className="mt-5 w-full"
                disabled={
                  saving ||
                  !name.trim()
                }
              >
                <Plus />
                Crear actividad
              </Button>
            </form>
          </div>

          {/* Metas y rachas */}
          <section className="mt-8 rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" />

              <h2 className="text-lg font-semibold">
                Metas y rachas
              </h2>
            </div>

            <form
              onSubmit={updateGoal}
              className="mt-4 grid gap-3 rounded-xl bg-muted/50 p-4 md:grid-cols-[1fr_150px_90px_90px_auto] md:items-end"
            >
              <label className="text-xs font-semibold">
                Actividad

                <select
                  value={manageId}
                  onChange={(
                    event,
                  ) =>
                    selectGoalActivity(
                      event.target
                        .value,
                    )
                  }
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
                >
                  <option value="">
                    Selecciona
                  </option>

                  {activities.map(
                    (activity) => (
                      <option
                        key={
                          activity.id
                        }
                        value={
                          activity.id
                        }
                      >
                        {
                          activity.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="text-xs font-semibold">
                Frecuencia

                <select
                  value={
                    managePeriod
                  }
                  onChange={(
                    event,
                  ) =>
                    setManagePeriod(
                      event.target
                        .value as
                        | 'none'
                        | GoalPeriod,
                    )
                  }
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
                >
                  <option value="none">
                    Sin meta
                  </option>

                  <option value="daily">
                    Diaria
                  </option>

                  <option value="weekly">
                    Semanal
                  </option>
                </select>
              </label>

              <label className="text-xs font-semibold">
                Horas

                <Input
                  type="number"
                  min="0"
                  value={
                    manageHours
                  }
                  disabled={
                    managePeriod ===
                    'none'
                  }
                  onFocus={(
                    event,
                  ) =>
                    event.target.select()
                  }
                  onChange={(
                    event,
                  ) =>
                    setManageHours(
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                  className="mt-1"
                />
              </label>

              <label className="text-xs font-semibold">
                Minutos

                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={
                    manageMinutes
                  }
                  disabled={
                    managePeriod ===
                    'none'
                  }
                  onFocus={(
                    event,
                  ) =>
                    event.target.select()
                  }
                  onChange={(
                    event,
                  ) =>
                    setManageMinutes(
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                  className="mt-1"
                />
              </label>

              <Button
                type="submit"
                disabled={
                  saving ||
                  !manageId
                }
              >
                Guardar meta
              </Button>
            </form>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activities
                .filter(
                  (activity) =>
                    activity.goalMinutes,
                )
                .map(
                  (activity) => {
                    const progress =
                      goalProgress(
                        activity,
                        streakLogs,
                      );

                    const percentage =
                      Math.min(
                        100,
                        Math.round(
                          (progress /
                            activity.goalMinutes!) *
                            100,
                        ),
                      );

                    const streak =
                      currentStreak(
                        activity,
                        streakLogs,
                      );

                    return (
                      <article
                        key={
                          activity.id
                        }
                        className="rounded-xl border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {
                              activity.name
                            }
                          </span>

                          <span className="flex items-center gap-1 text-sm font-semibold text-[#ef783f]">
                            <Flame className="size-4" />
                            {
                              streak
                            }
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {durationLabel(
                            progress,
                          )}{' '}
                          de{' '}
                          {durationLabel(
                            activity.goalMinutes!,
                          )}{' '}
                          {activity.goalPeriod ===
                          'daily'
                            ? 'hoy'
                            : 'esta semana'}
                        </p>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor:
                                activity.color,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-right text-xs font-medium">
                          {
                            percentage
                          }
                          % · racha de{' '}
                          {streak}{' '}
                          {activity.goalPeriod ===
                          'daily'
                            ? 'días'
                            : 'semanas'}
                        </p>
                      </article>
                    );
                  },
                )}
            </div>
          </section>

          {/* Resumen */}
          <section className="mt-8 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <BarChart3 className="size-5 text-primary" />
                  Resumen
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {durationLabel(
                    total,
                  )}{' '}
                  registrados en el período.
                </p>
              </div>

              <div className="flex flex-col items-end gap-3">
                {/* Semana / Mes / Año */}
                <div className="flex rounded-xl bg-muted p-1">
                  {(
                    [
                      'week',
                      'month',
                      'year',
                    ] as Period[]
                  ).map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setPeriod(
                            item,
                          );

                          setPeriodDate(
                            new Date(),
                          );
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          period ===
                          item
                            ? 'bg-background shadow-sm'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {item ===
                        'week'
                          ? 'Semana'
                          : item ===
                              'month'
                            ? 'Mes'
                            : 'Año'}
                      </button>
                    ),
                  )}
                </div>

                {/* Navegación del período */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      changePeriod(
                        -1,
                      )
                    }
                    aria-label="Período anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  <div className="min-w-40 text-center text-sm font-semibold capitalize">
                    {periodLabel()}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      changePeriod(
                        1,
                      )
                    }
                    aria-label="Período siguiente"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {stats.length ? (
                stats.map(
                  (activity) => (
                    <div
                      key={
                        activity.id
                      }
                    >
                      <div className="mb-1.5 flex justify-between gap-3 text-sm">
                        <span className="font-medium">
                          {
                            activity.name
                          }
                        </span>

                        <span>
                          {durationLabel(
                            activity.minutes,
                          )}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(activity.minutes / max) * 100}%`,
                            backgroundColor:
                              activity.color,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay registros en{' '}
                  {periodLabel()}.
                </p>
              )}
            </div>
          </section>

          {/* Historial */}
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Historial
                </h2>

                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {periodLabel()}
                </p>
              </div>

              <Badge variant="outline">
                {logs.length}{' '}
                {logs.length === 1
                  ? 'registro'
                  : 'registros'}
              </Badge>
            </div>

            <div className="mt-3 space-y-3">
              {logs.length ? (
                logs
                  .slice(0, 50)
                  .map(
                    (log) => (
                      <article
                        key={
                          log.id
                        }
                        className="flex items-start gap-3 rounded-2xl border bg-card p-4 sm:gap-4"
                      >
                        <span
                          className="mt-1 size-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              log.color,
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {
                              log.activityName
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat(
                              'es-CO',
                              {
                                dateStyle:
                                  'medium',
                                timeStyle:
                                  'short',
                              },
                            ).format(
                              new Date(
                                log.performedAt,
                              ),
                            )}
                          </p>

                          {log.note && (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                              {
                                log.note
                              }
                            </p>
                          )}
                        </div>

                        <strong className="shrink-0 text-sm">
                          {durationLabel(
                            log.durationMinutes,
                          )}
                        </strong>

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Eliminar registro de ${log.activityName}`}
                          onClick={() =>
                            void deleteLog(
                              log.id,
                            )
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </article>
                    ),
                  )
              ) : (
                <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay registros en{' '}
                    <span className="font-medium capitalize">
                      {periodLabel()}
                    </span>
                    .
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </AppSidebar>
    </main>
  );
}