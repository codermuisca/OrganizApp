'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity as ActivityIcon,
  ArrowLeft,
  BarChart3,
  Clock3,
  Flame,
  Plus,
  Target,
  Timer,
  Trash2,
} from 'lucide-react';
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
};
type Period = 'week' | 'month' | 'year';
const colors = [
  '#7c6cff',
  '#35b78a',
  '#f2a93b',
  '#ef6461',
  '#4388d6',
  '#b25ec7',
];

function range(period: Period) {
  const now = new Date();
  let start: Date;
  if (period === 'week') {
    const offset = (now.getDay() + 6) % 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  } else if (period === 'month')
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  else start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekStart(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return dayKey(result);
}

function goalProgress(activity: Activity, logs: ActivityLog[]) {
  if (!activity.goalMinutes || !activity.goalPeriod) return 0;
  const now = new Date();
  return logs
    .filter((log) => {
      const date = new Date(log.performedAt);
      return (
        log.activityId === activity.id &&
        (activity.goalPeriod === 'daily'
          ? dayKey(date) === dayKey(now)
          : weekStart(date) === weekStart(now))
      );
    })
    .reduce((sum, log) => sum + log.durationMinutes, 0);
}

function currentStreak(activity: Activity, logs: ActivityLog[]) {
  if (!activity.goalMinutes || !activity.goalPeriod) return 0;
  const totals = new Map<string, number>();
  for (const log of logs.filter((item) => item.activityId === activity.id)) {
    const date = new Date(log.performedAt);
    const key =
      activity.goalPeriod === 'daily' ? dayKey(date) : weekStart(date);
    totals.set(key, (totals.get(key) ?? 0) + log.durationMinutes);
  }
  const cursor = new Date();
  if (activity.goalPeriod === 'weekly')
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  const keyFor = () =>
    activity.goalPeriod === 'daily' ? dayKey(cursor) : weekStart(cursor);
  if ((totals.get(keyFor()) ?? 0) < activity.goalMinutes)
    cursor.setDate(
      cursor.getDate() - (activity.goalPeriod === 'daily' ? 1 : 7),
    );
  let streak = 0;
  while ((totals.get(keyFor()) ?? 0) >= activity.goalMinutes) {
    streak += 1;
    cursor.setDate(
      cursor.getDate() - (activity.goalPeriod === 'daily' ? 1 : 7),
    );
  }
  return streak;
}

export default function ActivitiesPage({
  user,
}: {
  user: { name: string; email: string };
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [streakLogs, setStreakLogs] = useState<ActivityLog[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [goalPeriod, setGoalPeriod] = useState<'none' | GoalPeriod>('none');
  const [goalHours, setGoalHours] = useState(0);
  const [goalMinutes, setGoalMinutes] = useState(30);
  const [manageId, setManageId] = useState('');
  const [managePeriod, setManagePeriod] = useState<'none' | GoalPeriod>('none');
  const [manageHours, setManageHours] = useState(0);
  const [manageMinutes, setManageMinutes] = useState(30);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [period, setPeriod] = useState<Period>('week');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadActivities() {
    const response = await fetch('/api/activities');
    if (response.ok) {
      const result = (await response.json()) as Activity[];
      setActivities(result);
      setSelectedId((current) => current || result[0]?.id || '');
      setManageId((current) => current || result[0]?.id || '');
      if (!manageId && result[0]) {
        setManagePeriod(result[0].goalPeriod ?? 'none');
        setManageHours(Math.floor((result[0].goalMinutes ?? 30) / 60));
        setManageMinutes((result[0].goalMinutes ?? 30) % 60);
      }
    } else setNotice('No pudimos cargar tus actividades.');
  }

  async function loadLogs(selectedPeriod: Period) {
    const { from, to } = range(selectedPeriod);
    const response = await fetch(
      `/api/activity-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    if (response.ok) setLogs(await response.json());
    else setNotice('No pudimos cargar tu historial.');
  }

  async function loadStreakLogs() {
    const start = new Date();
    start.setDate(start.getDate() - 370);
    const response = await fetch(
      `/api/activity-logs?from=${encodeURIComponent(start.toISOString())}`,
    );
    if (response.ok) setStreakLogs(await response.json());
  }

  useEffect(() => {
    void loadActivities();
    void loadStreakLogs();
  }, []);
  useEffect(() => {
    void loadLogs(period);
  }, [period]);

  async function createActivity(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        color,
        goalPeriod: goalPeriod === 'none' ? null : goalPeriod,
        goalMinutes:
          goalPeriod === 'none' ? null : goalHours * 60 + goalMinutes,
      }),
    });
    const result = (await response.json()) as Activity & { error?: string };
    if (response.ok) {
      setActivities((current) => [...current, result]);
      setSelectedId(result.id);
      setName('');
      setGoalPeriod('none');
      setGoalHours(0);
      setGoalMinutes(30);
      setNotice('Actividad creada');
    } else setNotice(result.error ?? 'No pudimos crear la actividad.');
    setSaving(false);
  }

  async function register(event: React.FormEvent) {
    event.preventDefault();
    const durationMinutes = hours * 60 + minutes;
    if (!selectedId || durationMinutes < 1) {
      setNotice('Elige una actividad y una duración.');
      return;
    }
    setSaving(true);
    const response = await fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ activityId: selectedId, durationMinutes }),
    });
    const result = (await response.json()) as ActivityLog & { error?: string };
    if (response.ok) {
      setLogs((current) => [result, ...current]);
      setStreakLogs((current) => [result, ...current]);
      setHours(0);
      setMinutes(30);
      setNotice('Actividad registrada ahora');
    } else setNotice(result.error ?? 'No pudimos guardar el registro.');
    setSaving(false);
  }

  function selectGoalActivity(activityId: string) {
    setManageId(activityId);
    const activity = activities.find((item) => item.id === activityId);
    setManagePeriod(activity?.goalPeriod ?? 'none');
    setManageHours(Math.floor((activity?.goalMinutes ?? 30) / 60));
    setManageMinutes((activity?.goalMinutes ?? 30) % 60);
  }

  async function updateGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!manageId) return;
    setSaving(true);
    const response = await fetch('/api/activities', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: manageId,
        goalPeriod: managePeriod === 'none' ? null : managePeriod,
        goalMinutes:
          managePeriod === 'none' ? null : manageHours * 60 + manageMinutes,
      }),
    });
    const result = (await response.json()) as Activity & { error?: string };
    if (response.ok) {
      setActivities((current) =>
        current.map((activity) =>
          activity.id === result.id ? result : activity,
        ),
      );
      setNotice(
        managePeriod === 'none' ? 'Meta eliminada' : 'Meta actualizada',
      );
    } else setNotice(result.error ?? 'No pudimos actualizar la meta.');
    setSaving(false);
  }

  async function deleteLog(id: string) {
    const response = await fetch(`/api/activity-logs?id=${id}`, {
      method: 'DELETE',
    });
    if (response.ok)
      setLogs((current) => current.filter((log) => log.id !== id));
    else setNotice('No pudimos eliminar el registro.');
    if (response.ok)
      setStreakLogs((current) => current.filter((log) => log.id !== id));
  }

  const stats = useMemo(
    () =>
      activities
        .map((activity) => ({
          ...activity,
          minutes: logs
            .filter((log) => log.activityId === activity.id)
            .reduce((sum, log) => sum + log.durationMinutes, 0),
        }))
        .filter((activity) => activity.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes),
    [activities, logs],
  );
  const total = stats.reduce((sum, activity) => sum + activity.minutes, 0);
  const max = stats[0]?.minutes || 1;

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
          <span className="text-sm">{user.name}</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <ActivityIcon className="size-4" /> Progreso personal
          </p>
          <h1 className="mt-1 text-3xl font-bold">Actividades</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registra lo que haces y descubre cómo inviertes tu tiempo.
          </p>
        </div>
        {notice && (
          <p className="mt-5 rounded-xl bg-card p-3 text-sm">{notice}</p>
        )}
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <form onSubmit={register} className="rounded-2xl border bg-card p-5">
            <Timer className="size-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Registrar ahora</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              La fecha y hora se guardan automáticamente.
            </p>
            <label className="mt-5 block text-xs font-semibold">
              Actividad
              <select
                required
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
              >
                <option value="">Selecciona una actividad</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
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
                  onChange={(event) => setHours(Number(event.target.value))}
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
                  onChange={(event) => setMinutes(Number(event.target.value))}
                  className="mt-1"
                />
              </label>
            </div>
            <Button
              type="submit"
              className="mt-5 w-full"
              disabled={saving || !activities.length}
            >
              <Clock3 />
              {saving ? 'Guardando...' : 'Guardar registro'}
            </Button>
          </form>
          <form
            onSubmit={createActivity}
            className="rounded-2xl border bg-card p-5"
          >
            <Plus className="size-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Nueva actividad</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Créala una vez y reutilízala todos los días.
            </p>
            <label className="mt-5 block text-xs font-semibold">
              Nombre
              <Input
                required
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1"
                placeholder="Ej. Leer"
              />
            </label>
            <div className="mt-4">
              <p className="text-xs font-semibold">Color</p>
              <div className="mt-2 flex gap-2">
                {colors.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label={`Color ${option}`}
                    onClick={() => setColor(option)}
                    className={`size-8 rounded-full ${color === option ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ backgroundColor: option }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_80px_80px] gap-2">
              <label className="text-xs font-semibold">
                Meta opcional
                <select
                  value={goalPeriod}
                  onChange={(event) =>
                    setGoalPeriod(event.target.value as 'none' | GoalPeriod)
                  }
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
                >
                  <option value="none">Sin meta</option>
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                </select>
              </label>
              <label className="text-xs font-semibold">
                Horas
                <Input
                  type="number"
                  min="0"
                  value={goalHours}
                  disabled={goalPeriod === 'none'}
                  onChange={(event) => setGoalHours(Number(event.target.value))}
                  className="mt-1"
                />
              </label>
              <label className="text-xs font-semibold">
                Minutos
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={goalMinutes}
                  disabled={goalPeriod === 'none'}
                  onChange={(event) =>
                    setGoalMinutes(Number(event.target.value))
                  }
                  className="mt-1"
                />
              </label>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="mt-5 w-full"
              disabled={saving || !name.trim()}
            >
              <Plus />
              Crear actividad
            </Button>
          </form>
        </div>
        <section className="mt-8 rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Target className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Metas y rachas</h2>
          </div>
          <form
            onSubmit={updateGoal}
            className="mt-4 grid gap-3 rounded-xl bg-muted/50 p-4 md:grid-cols-[1fr_150px_90px_90px_auto] md:items-end"
          >
            <label className="text-xs font-semibold">
              Actividad
              <select
                value={manageId}
                onChange={(event) => selectGoalActivity(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
              >
                <option value="">Selecciona</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Frecuencia
              <select
                value={managePeriod}
                onChange={(event) =>
                  setManagePeriod(event.target.value as 'none' | GoalPeriod)
                }
                className="mt-1 h-10 w-full rounded-lg border bg-background px-2 text-sm"
              >
                <option value="none">Sin meta</option>
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
              </select>
            </label>
            <label className="text-xs font-semibold">
              Horas
              <Input
                type="number"
                min="0"
                value={manageHours}
                disabled={managePeriod === 'none'}
                onChange={(event) => setManageHours(Number(event.target.value))}
                className="mt-1"
              />
            </label>
            <label className="text-xs font-semibold">
              Minutos
              <Input
                type="number"
                min="0"
                max="59"
                value={manageMinutes}
                disabled={managePeriod === 'none'}
                onChange={(event) =>
                  setManageMinutes(Number(event.target.value))
                }
                className="mt-1"
              />
            </label>
            <Button type="submit" disabled={saving || !manageId}>
              Guardar meta
            </Button>
          </form>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activities
              .filter((activity) => activity.goalMinutes)
              .map((activity) => {
                const progress = goalProgress(activity, streakLogs);
                const percentage = Math.min(
                  100,
                  Math.round((progress / activity.goalMinutes!) * 100),
                );
                const streak = currentStreak(activity, streakLogs);
                return (
                  <article key={activity.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{activity.name}</span>
                      <span className="flex items-center gap-1 text-sm font-semibold text-[#ef783f]">
                        <Flame className="size-4" />
                        {streak}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {durationLabel(progress)} de{' '}
                      {durationLabel(activity.goalMinutes!)}{' '}
                      {activity.goalPeriod === 'daily' ? 'hoy' : 'esta semana'}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: activity.color,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-right text-xs font-medium">
                      {percentage}% · racha de {streak}{' '}
                      {activity.goalPeriod === 'daily' ? 'días' : 'semanas'}
                    </p>
                  </article>
                );
              })}
          </div>
        </section>
        <section className="mt-8 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <BarChart3 className="size-5 text-primary" />
                Resumen
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {durationLabel(total)} registrados en el período.
              </p>
            </div>
            <div className="flex rounded-xl bg-muted p-1">
              {(['week', 'month', 'year'] as Period[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setPeriod(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${period === item ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  {item === 'week'
                    ? 'Semana'
                    : item === 'month'
                      ? 'Mes'
                      : 'Año'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {stats.length ? (
              stats.map((activity) => (
                <div key={activity.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{activity.name}</span>
                    <span>{durationLabel(activity.minutes)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(activity.minutes / max) * 100}%`,
                        backgroundColor: activity.color,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay registros en este período.
              </p>
            )}
          </div>
        </section>
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Historial reciente</h2>
            <Badge variant="outline">{logs.length} registros</Badge>
          </div>
          <div className="mt-3 space-y-3">
            {logs.slice(0, 50).map((log) => (
              <article
                key={log.id}
                className="flex items-center gap-4 rounded-2xl border bg-card p-4"
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: log.color }}
                />
                <div className="flex-1">
                  <p className="font-semibold">{log.activityName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat('es-CO', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(log.performedAt))}
                  </p>
                </div>
                <strong className="text-sm">
                  {durationLabel(log.durationMinutes)}
                </strong>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar registro de ${log.activityName}`}
                  onClick={() => void deleteLog(log.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
