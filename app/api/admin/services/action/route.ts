import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: Request) {
  const cookieStore = await cookies(); // ✅ الإصلاح هنا فقط

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { serviceId, action, reason, updates, adminId } =
    await request.json();

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminId)
    .single();

  if (!adminProfile) {
    return NextResponse.json(
      { error: "غير مصرح لك" },
      { status: 403 }
    );
  }

  try {
    let result: any;
    let logMessage = "";

    if (action === "approve") {
      result = await supabase
        .from("services")
        .update({
          status: "approved",
          rejection_reason: null,
        })
        .eq("id", serviceId);

      logMessage = `الموافقة على الخدمة رقم ${serviceId}`;
    } else if (action === "reject") {
      result = await supabase
        .from("services")
        .update({
          status: "rejected",
          rejection_reason: reason,
        })
        .eq("id", serviceId);

      logMessage = `رفض الخدمة رقم ${serviceId}. السبب: ${reason}`;
    } else if (action === "delete") {
      result = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

      logMessage = `حذف الخدمة رقم ${serviceId}`;
    } else if (action === "update") {
      result = await supabase
        .from("services")
        .update({
          title: updates.title,
          description: updates.description,
          price: Number(updates.price),
          status: updates.status,
        })
        .eq("id", serviceId);

      logMessage = `تعديل بيانات الخدمة رقم ${serviceId}`;
    }

    if (result?.error) throw result.error;

    await supabase.from("admin_logs").insert([
      {
        admin_id: adminId,
        action_type: `service_${action}`,
        details: logMessage,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "تم تنفيذ الإجراء بنجاح",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
