import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAdminPermission } from '@/lib/adminGuard';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type ProviderRequest = {
  id?: string;
  user_id?: string | null;
  email: string;
  name: string;
  phone?: string | null;
  status?: string | null;
  approved_at?: string | null;
};

function createTemporaryPassword() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `Sayyir@${randomNum}`;
}

async function findAuthUserIdByEmail(email: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user.id;
    if (data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

async function ensureProviderProfile(requestData: ProviderRequest, customCommission: unknown) {
  const { data: existingProfileByRequestUserId } = requestData.user_id
    ? await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', requestData.user_id)
        .maybeSingle()
    : { data: null };

  const { data: existingProfileByEmail } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', requestData.email)
    .maybeSingle();

  let userId = existingProfileByRequestUserId?.id || existingProfileByEmail?.id || null;
  let tempPassword: string | null = null;

  if (!userId) {
    userId = await findAuthUserIdByEmail(requestData.email);
  }

  if (!userId) {
    tempPassword = createTemporaryPassword();

    const { data: newUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: requestData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: requestData.name,
          is_provider: true,
        },
      });

    if (createUserError || !newUser.user) {
      throw new Error(createUserError?.message || 'Failed to create provider user');
    }

    userId = newUser.user.id;
  } else {
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          full_name: requestData.name,
          is_provider: true,
        },
      }
    );

    if (updateAuthError) {
      throw new Error(updateAuthError.message);
    }
  }

  const profilePayload = {
    email: requestData.email,
    full_name: requestData.name,
    phone: requestData.phone ?? null,
    role: 'provider',
    is_provider: true,
    is_approved: true,
    is_admin: false,
    is_super_admin: false,
    is_banned: false,
    is_blocked: false,
    is_deleted: false,
    ...(customCommission !== undefined ? { custom_commission: customCommission } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error: unbanAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });

  if (unbanAuthError) {
    throw new Error(unbanAuthError.message);
  }

  const { data: profileById, error: profileByIdError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileByIdError) {
    throw new Error(profileByIdError.message);
  }

  const { error: saveProfileError } = profileById
    ? await supabaseAdmin
        .from('profiles')
        .update(profilePayload)
        .eq('id', userId)
    : await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          ...profilePayload,
          created_at: new Date().toISOString(),
        });

  if (saveProfileError) {
    throw new Error(saveProfileError.message);
  }

  return { userId, tempPassword };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(req: Request) {
  try {
    const { requestId, requesterId, customCommission } = (await req.json()) as {
      requestId: string;
      requesterId: string;
      customCommission?: unknown;
    };

    const permissionCheck = await checkAdminPermission(requesterId, 'requests_approve');
    if (!permissionCheck.success) {
      return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
    }

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('provider_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Provider request not found' }, { status: 404 });
    }

    const providerRequest = requestData as ProviderRequest;
    const requestStatus = providerRequest.status;

    if (!['pending', 'rejected', 'approved'].includes(String(requestStatus || ''))) {
      return NextResponse.json(
        {
          success: false,
          code: 'provider_request_status_not_approvable',
          message: 'Provider request must be pending, rejected, or already approved for manual review.',
        },
        { status: 400 }
      );
    }

    const { userId, tempPassword } = await ensureProviderProfile(
      providerRequest,
      customCommission
    );

    const { error: approveError } = await supabaseAdmin
      .from('provider_requests')
      .update({
        status: 'approved',
        approved_at: providerRequest.approved_at || new Date().toISOString(),
        user_id: userId,
      })
      .eq('id', requestId);

    if (approveError) {
      throw new Error(approveError.message);
    }

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa');

    const emailResponse = await fetch(`${baseUrl}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'provider_approved',
        email: providerRequest.email,
        phone: providerRequest.phone,
        providerName: providerRequest.name,
        password: tempPassword || 'Existing account',
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('EMAIL SEND ERROR:', emailResult);
    }

    return NextResponse.json({
      success: true,
      message: 'Provider request approved successfully.',
      providerId: userId,
      emailResult,
    });
  } catch (error: unknown) {
    console.error('APPROVE ERROR:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
