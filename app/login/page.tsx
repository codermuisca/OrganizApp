'use client';

import { useState } from 'react';
import { CheckCircle2, Mail, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function signInWithEmail(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) setError(authError.message); else setSent(true);
    setLoading(false);
  }

  async function signInWithGoogle() {
    setLoading(true); setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) { setError('Google aún necesita conectarse en la configuración.'); setLoading(false); }
  }

  return <main className="grid min-h-screen bg-[#f7f5fb] lg:grid-cols-[1.05fr_.95fr]">
    <section className="hidden flex-col justify-between bg-[#251d43] p-12 text-white lg:flex">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#7c6cff] font-bold">O</span><span className="text-lg font-semibold">OrganizApp2</span></div>
      <div className="max-w-lg"><Sparkles className="mb-6 size-8 text-[#a99cff]"/><h1 className="text-5xl font-bold leading-tight tracking-tight">Tu trabajo, tus ideas y tu equipo en orden.</h1><p className="mt-5 text-lg leading-relaxed text-white/65">Un tablero sencillo para convertir planes en actividades terminadas.</p></div>
      <p className="text-sm text-white/40">OrganizApp2 · Tu espacio personal de trabajo · By: CoderMuisca</p>
    </section>
    <section className="flex items-center justify-center p-6"><div className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-[0_24px_80px_rgba(47,35,83,.1)] sm:p-10"><div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-primary font-bold text-white">O</span><span className="text-lg font-semibold">OrganizApp2</span></div>{sent ? <div className="py-8 text-center"><CheckCircle2 className="mx-auto size-12 text-[#35b78a]"/><h2 className="mt-5 text-2xl font-bold">Revisa tu correo</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Enviamos un enlace seguro a <strong>{email}</strong>. Ábrelo para entrar a OrganizApp2.</p><Button onClick={() => setSent(false)} variant="outline" className="mt-6">Usar otro email</Button></div> : <><h2 className="text-3xl font-bold tracking-tight">Bienvenido</h2><p className="mt-2 text-sm text-muted-foreground">Entra o crea tu cuenta en pocos segundos.</p><Button onClick={() => void signInWithGoogle()} variant="outline" className="mt-8 h-11 w-full rounded-xl" disabled={loading}><span className="text-base font-bold text-[#4285F4]">G</span>Continuar con Google</Button><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>o usa tu email<span className="h-px flex-1 bg-border"/></div><form onSubmit={signInWithEmail}><label className="text-xs font-semibold">Email<div className="relative mt-1"><Mail className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl pl-9" placeholder="tu@email.com"/></div></label>{error && <p className="mt-3 text-xs text-destructive">{error}</p>}<Button type="submit" className="mt-5 h-11 w-full rounded-xl" disabled={loading}>{loading ? 'Enviando...' : 'Enviar enlace de acceso'}</Button></form><p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">Al continuar aceptas usar OrganizApp2 para gestionar tus actividades y colaboraciones.</p></>}</div></section>
  </main>;
}
