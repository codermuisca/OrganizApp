# Supabase de Organiza

Las migraciones de esta carpeta versionan las reglas de seguridad del proyecto.

## Roles

- `owner`: administra tareas, responsables e invitaciones.
- `member`: ve el tablero y puede cambiar el estado de sus tareas asignadas.

La API vuelve a comprobar estas reglas. Las políticas RLS son la última barrera de
seguridad si alguien intenta acceder directamente a Supabase.

## Aplicación

La migración `20260830000000_team_permissions.sql` presupone que ya existen las
tablas `workspaces`, `memberships`, `invitations` y `tasks`. Debe revisarse en una
rama o proyecto Supabase de prueba antes de aplicarla al entorno de producción.

