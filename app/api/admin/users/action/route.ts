import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    const { action, userId, requesterId, newStatus, confirmText } =
      await req.json();

    if (!action || !userId || !requesterId) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const { data: requester, error: requesterError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, is_admin, is_super_admin, is_deleted, is_blocked, is_banned")
      .eq("id", requesterId)
      .single();

    if (requesterError || !requester?.is_admin) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, is_admin, is_super_admin, is_deleted, is_blocked, is_banned")
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    if (targetProfile.is_super_admin) {
      return NextResponse.json(
        { error: "لا يمكن تعديل حساب سوبر أدمن" },
        { status: 403 }
      );
    }

    if (action === "toggle_ban") {
      const blocked = Boolean(newStatus);

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_blocked: blocked,
          is_banned: blocked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: blocked ? "876000h" : "none",
        });

      if (authError) throw authError;

      await supabaseAdmin.from("admin_logs").insert([
        {
          admin_id: requesterId,
          action_type: blocked ? "ban_user" : "unban_user",
          details: `${blocked ? "تم إيقاف" : "تم فك إيقاف"} المستخدم: ${
            targetProfile.full_name || targetProfile.email
          }`,
        },
      ]);

      return NextResponse.json({
        success: true,
        message: blocked ? "تم إيقاف الحساب بنجاح" : "تم فك الإيقاف بنجاح",
      });
    }

    if (action === "archive") {
      if (!requester.is_super_admin) {
        return NextResponse.json(
          { error: "الأرشفة متاحة للسوبر أدمن فقط" },
          { status: 403 }
        );
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_deleted: true,
          is_blocked: true,
          is_banned: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
          user_metadata: {
            is_archived: true,
          },
        });

      if (authError) throw authError;

      await supabaseAdmin.from("admin_logs").insert([
        {
          admin_id: requesterId,
          action_type: "archive_user",
          details: `تمت أرشفة المستخدم بدون تغيير البريد: ${
            targetProfile.full_name || targetProfile.email
          }`,
        },
      ]);

      return NextResponse.json({
        success: true,
        message: "تمت أرشفة الحساب بدون تغيير البريد الإلكتروني",
      });
    }

    if (action === "restore") {
      if (!requester.is_super_admin) {
        return NextResponse.json(
          { error: "استعادة الحساب متاحة للسوبر أدمن فقط" },
          { status: 403 }
        );
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_deleted: false,
          is_blocked: false,
          is_banned: false,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "none",
          user_metadata: {
            is_archived: false,
          },
        });

      if (authError) throw authError;

      await supabaseAdmin.from("admin_logs").insert([
        {
          admin_id: requesterId,
          action_type: "restore_user",
          details: `تمت استعادة المستخدم: ${
            targetProfile.full_name || targetProfile.email
          }`,
        },
      ]);

      return NextResponse.json({
        success: true,
        message: "تمت استعادة الحساب بنجاح",
      });
    }

    if (action === "permanent_delete") {
      if (!requester.is_super_admin) {
        return NextResponse.json(
          { error: "الحذف النهائي متاح للسوبر أدمن فقط" },
          { status: 403 }
        );
      }

      if (confirmText !== "DELETE_USER_PERMANENTLY") {
        return NextResponse.json(
          { error: "تأكيد الحذف النهائي غير صحيح" },
          { status: 400 }
        );
      }

      await supabaseAdmin.from("admin_logs").insert([
        {
          admin_id: requesterId,
          action_type: "permanent_delete_user_requested",
          details: `طلب حذف نهائي للمستخدم: ${
            targetProfile.full_name || targetProfile.email
          }`,
        },
      ]);

      return NextResponse.json(
        {
          error:
            "الحذف النهائي معطل مؤقتًا لحماية البيانات. فعّلناه لاحقًا بعد التأكد من علاقات الحجوزات والمدفوعات.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: "أمر غير معروف" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin user action error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}