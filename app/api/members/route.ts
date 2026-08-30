import { workspaceContext } from '../authz';

export async function GET() {
  const context = await workspaceContext();
  if ('error' in context) return context.error;
  const [
    { data: memberships, error: membershipsError },
    { data: invitations, error: invitationsError },
  ] = await Promise.all([
    context.supabase
      .from('memberships')
      .select('role,profiles!memberships_user_id_fkey(id,email,display_name)')
      .eq('workspace_id', context.workspaceId),
    context.supabase
      .from('invitations')
      .select('id,email,role,status')
      .eq('workspace_id', context.workspaceId)
      .eq('status', 'pending'),
  ]);
  if (membershipsError || invitationsError)
    return Response.json(
      { error: membershipsError?.message ?? invitationsError?.message },
      { status: 400 },
    );
  const active = (memberships ?? []).map((row) => {
    const profile = row.profiles as unknown as {
      id: string;
      email: string;
      display_name: string;
    };
    return {
      userId: profile.id,
      email: profile.email,
      name: profile.display_name,
      role: row.role,
      status: 'active',
    };
  });
  const pending = (invitations ?? []).map((row) => ({
    invitationId: row.id,
    email: row.email,
    name: row.email.split('@')[0],
    role: row.role,
    status: 'invited',
  }));
  return Response.json([...active, ...pending]);
}

export async function POST(request: Request) {
  const context = await workspaceContext();
  if ('error' in context) return context.error;
  if (context.role !== 'owner')
    return Response.json(
      { error: 'Solo el propietario puede invitar' },
      { status: 403 },
    );
  const body = (await request.json()) as { email?: string; name?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@'))
    return Response.json({ error: 'Escribe un email válido' }, { status: 400 });
  const { data, error } = await context.supabase
    .from('invitations')
    .upsert(
      {
        workspace_id: context.workspaceId,
        email,
        role: 'member',
        status: 'pending',
        invited_by: context.user.id,
      },
      { onConflict: 'workspace_id,email' },
    )
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(
    {
      email: data.email,
      name: body.name?.trim() || email.split('@')[0],
      role: data.role,
      status: 'invited',
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const context = await workspaceContext();
  if ('error' in context) return context.error;
  if (context.role !== 'owner')
    return Response.json(
      { error: 'Solo el propietario puede cambiar roles' },
      { status: 403 },
    );
  const body = (await request.json()) as { userId?: string; role?: string };
  if (!body.userId || !['owner', 'member'].includes(body.role ?? ''))
    return Response.json({ error: 'Datos de rol inválidos' }, { status: 400 });
  if (body.userId === context.user.id)
    return Response.json(
      { error: 'No puedes cambiar tu propio rol' },
      { status: 400 },
    );
  const { error } = await context.supabase
    .from('memberships')
    .update({ role: body.role })
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', body.userId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ userId: body.userId, role: body.role });
}

export async function DELETE(request: Request) {
  const context = await workspaceContext();
  if ('error' in context) return context.error;
  if (context.role !== 'owner')
    return Response.json(
      { error: 'Solo el propietario puede retirar personas' },
      { status: 403 },
    );
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const invitationId = url.searchParams.get('invitationId');
  if (userId === context.user.id)
    return Response.json(
      { error: 'No puedes retirarte a ti mismo' },
      { status: 400 },
    );
  if (userId) {
    const { error } = await context.supabase
      .from('memberships')
      .delete()
      .eq('workspace_id', context.workspaceId)
      .eq('user_id', userId);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  } else if (invitationId) {
    const { error } = await context.supabase
      .from('invitations')
      .delete()
      .eq('workspace_id', context.workspaceId)
      .eq('id', invitationId);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  } else
    return Response.json(
      { error: 'Falta la persona o invitación' },
      { status: 400 },
    );
  return new Response(null, { status: 204 });
}
