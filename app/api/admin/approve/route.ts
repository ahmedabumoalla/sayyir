import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAdminPermission } from '@/lib/adminGuard';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { requestId, requesterId, customCommission } = await req.json();

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
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    if (requestData.status === 'approved') {
      return NextResponse.json({ success: true, message: "الطلب مقبول مسبقاً" });
    }

    let userId: string | null = null;
    let tempPassword: string | null = null;

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', requestData.email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
    }

    if (!userId) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      tempPassword = `Sayyir@${randomNum}`;

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
        throw new Error(createUserError?.message || "فشل إنشاء المستخدم");
      }

      userId = newUser.user.id;

      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
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
          custom_commission: customCommission ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertProfileError) {
        throw new Error(insertProfileError.message);
      }
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

      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: requestData.email,
          full_name: requestData.name,
          phone: requestData.phone ?? null,
          role: 'provider',
          is_provider: true,
          is_approved: true,
          is_banned: false,
          is_blocked: false,
          is_deleted: false,
          custom_commission: customCommission ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateProfileError) {
        throw new Error(updateProfileError.message);
      }
    }

    const { error: approveError } = await supabaseAdmin
      .from('provider_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (approveError) {
      throw new Error(approveError.message);
    }

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa');

    fetch(`${baseUrl}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'provider_approved',
        email: requestData.email,
        name: requestData.name,
        password: tempPassword || 'كلمة مرورك السابقة (لديك حساب مسبقاً)',
        clientPhone: requestData.phone,
      }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "تمت الموافقة وإرسال الإشعارات بنجاح",
    });
  } catch (error: any) {
    console.error("APPROVE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}