'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity as ActivityIcon,
  ArrowLeft,
  BarChart3,
  Clock3,
  Plus,
  Timer,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Activity = { id: string; name: string; color: string };
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

export default function ActivitiesPage({
  user,
}: {
  user: { name: string; email: string };
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors[0]);
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

  useEffect(() => {
    void loadActivities();
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
      body: JSON.stringify({ name, color }),
    });
    const result = (await response.json()) as Activity & { error?: string };
    if (response.ok) {
      setActivities((current) => [...current, result]);
      setSelectedId(result.id);
      setName('');
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
      setHours(0);
      setMinutes(30);
      setNotice('Actividad registrada ahora');
    } else setNotice(result.error ?? 'No pudimos guardar el registro.');
    setSaving(false);
  }

  async function deleteLog(id: string) {
    const response = await fetch(`/api/activity-logs?id=${id}`, {
      method: 'DELETE',
    });
    if (response.ok)
      setLogs((current) => current.filter((log) => log.id !== id));
    else setNotice('No pudimos eliminar el registro.');
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
            <Button
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
