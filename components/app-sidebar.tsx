'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Menu,
  Settings2,
  Users,
  X,
} from 'lucide-react';

type Space = {
  id: string;
  name: string;
  role: 'owner' | 'member';
};

type AppSidebarProps = {
  user: {
    name: string;
    email: string;
  };

  workspace: Space;

  workspaces: Space[];

  activePage:
    | 'dashboard'
    | 'my-tasks'
    | 'calendar'
    | 'activities'
    | 'people';

  children?: React.ReactNode;
};

function initials(value: string) {
  return (
    value
      .split(/[@\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase(),
      )
      .join('') || 'U'
  );
}

export default function AppSidebar({
  user,
  workspace,
  workspaces,
  activePage,
  children,
}: AppSidebarProps) {
  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow =
      'hidden';

    return () => {
      document.body.style.overflow =
        '';
    };
  }, [mobileMenuOpen]);

  async function switchWorkspace(
    workspaceId: string,
  ) {
    const response = await fetch(
      '/api/workspaces',
      {
        method: 'POST',
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          workspaceId,
        }),
      },
    );

    if (response.ok) {
      window.location.reload();
    }
  }

  const links = [
    {
      id: 'dashboard',
      label: 'Tablero',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      id: 'my-tasks',
      label: 'Mis tareas',
      href: '/my-tasks',
      icon: ListTodo,
    },
    {
      id: 'calendar',
      label: 'Calendario',
      href: '/calendar',
      icon: CalendarDays,
    },
    {
      id: 'activities',
      label: 'Actividades',
      href: '/activities',
      icon: Activity,
    },
    {
      id: 'people',
      label: 'Personas',
      href: '/people',
      icon: Users,
    },
  ] as const;

  return (
    <>
      {/* Fondo oscuro cuando se abre el menú móvil */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] lg:hidden"
          onClick={() =>
            setMobileMenuOpen(false)
          }
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          flex w-60 flex-col
          border-r bg-sidebar px-4 py-5
          transition-transform duration-300 ease-in-out
          lg:z-20 lg:translate-x-0
          ${
            mobileMenuOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        {/* Botón cerrar en celular/tablet */}
        <button
          type="button"
          onClick={() =>
            setMobileMenuOpen(false)
          }
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-sidebar-accent lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="size-5" />
        </button>

        {/* Logo + nombre + espacio */}
        <div className="flex items-center gap-3 px-2 pr-10 lg:pr-2">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-xl shadow-sm">
            <Image
              src="/icons/icon-512.png"
              alt="OrganizApp2"
              fill
              priority
              sizes="40px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight">
              OrganizApp2
            </p>

            {workspaces.length > 1 ? (
              <select
                aria-label="Espacio activo"
                value={workspace.id}
                onChange={(event) =>
                  void switchWorkspace(
                    event.target.value,
                  )
                }
                className="mt-0.5 max-w-36 bg-transparent text-xs text-muted-foreground outline-none"
              >
                {workspaces.map(
                  (space) => (
                    <option
                      key={space.id}
                      value={space.id}
                    >
                      {space.name}
                    </option>
                  ),
                )}
              </select>
            ) : (
              <p className="truncate text-xs text-muted-foreground">
                {workspace.name}
              </p>
            )}
          </div>
        </div>

        {/* Navegación */}
        <nav className="mt-8 space-y-1 text-sm">
          {links.map((item) => {
            const Icon = item.icon;

            const active =
              activePage === item.id;

            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() =>
                  setMobileMenuOpen(
                    false,
                  )
                }
                className={
                  active
                    ? 'flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-2.5 font-medium'
                    : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground'
                }
              >
                <Icon className="size-4 shrink-0" />

                <span>
                  {item.label}
                </span>
              </a>
            );
          })}
        </nav>

        {/* Parte inferior */}
        <div className="mt-auto">
          <a
            href="/auth/signout"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
          >
            <Settings2 className="size-4 shrink-0" />

            Cerrar sesión
          </a>

          <div className="mt-3 flex items-center gap-3 border-t pt-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#efeaff] text-xs font-bold text-[#5b48d6]">
              {initials(user.name)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.name}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <section className="lg:pl-60">
        {/* Header móvil/tablet */}
        <header className="border-b bg-background">
          <div className="flex min-h-16 items-center px-4 sm:px-7">
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </header>

        {children}
      </section>
    </>
  );
}