import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendSMS } from "@/lib/twilio";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return String(phone || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, service_type, dynamic_data } = body ?? {};

    const normalizedName = String(name || "").trim();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const normalizedServiceType = String(service_type || "").trim();

    if (!normalizedName) {
      return NextResponse.json({ error: "الاسم مطلوب." }, { status: 400 });
    }

    if (!normalizedEmail) {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب." }, { status: 400 });
    }

    if (!normalizedPhone) {
      return NextResponse.json({ error: "رقم الجوال مطلوب." }, { status: 400 });
    }

    const { data: profileByEmail, error: profileEmailError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_provider")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (profileEmailError) throw profileEmailError;

    const { data: profileByPhone, error: profilePhoneError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_provider")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (profilePhoneError) throw profilePhoneError;

    if (
      (profileByEmail && profileByEmail.is_provider) ||
      (profileByPhone && profileByPhone.is_provider)
    ) {
      return NextResponse.json(
        { error: "هذا المستخدم مسجل كمزود خدمة مسبقاً." },
        { status: 400 }
      );
    }

    const { data: existingRequestsByEmail, error: reqEmailError } = await supabaseAdmin
      .from("provider_requests")
      .select("id, status")
      .ilike("email", normalizedEmail)
      .in("status", ["pending", "approved"]);

    if (reqEmailError) throw reqEmailError;

    const { data: existingRequestsByPhone, error: reqPhoneError } = await supabaseAdmin
      .from("provider_requests")
      .select("id, status")
      .eq("phone", normalizedPhone)
      .in("status", ["pending", "approved"]);

    if (reqPhoneError) throw reqPhoneError;

    const existingRequests = [
      ...(existingRequestsByEmail || []),
      ...(existingRequestsByPhone || []),
    ];

    if (existingRequests.length > 0) {
      const hasApproved = existingRequests.some((r) => r.status === "approved");
      const hasPending = existingRequests.some((r) => r.status === "pending");

      if (hasApproved) {
        return NextResponse.json(
          { error: "هذا المستخدم مسجل كمزود خدمة مسبقاً." },
          { status: 400 }
        );
      }

      if (hasPending) {
        return NextResponse.json(
          { error: "يوجد طلب انضمام تحت الإجراء لهذا المستخدم. يرجى انتظار رد الإدارة." },
          { status: 400 }
        );
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("provider_requests")
      .insert([
        {
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          service_type: normalizedServiceType,
          dynamic_data: dynamic_data ?? {},
          status: "pending",
        },
      ]);

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message?.toLowerCase().includes("duplicate key") ||
        insertError.message?.includes("يوجد طلب انضمام تحت الإجراء") ||
        insertError.message?.includes("مسجل كمزود خدمة")
      ) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 400 }
        );
      }

      throw insertError;
    }

    const adminEmail = process.env.ADMIN_EMAIL || "info@sayyir.sa";
    const adminPhone = process.env.ADMIN_PHONE || "+966508424401";

    await resend.emails.send({
      from: "نظام سَيّر <info@emails.sayyir.sa>",
      to: adminEmail,
      subject: "🔔 طلب انضمام مزود جديد!",
      html: `<div dir="rtl"><h3>طلب جديد: ${normalizedName}</h3><p>الخدمة: ${normalizedServiceType}</p><p>راجع لوحة التحكم.</p></div>`,
    });

    await sendSMS({
      to: adminPhone,
      body: `🔔 تنبيه سَيّر:\nوصل طلب انضمام جديد من: ${normalizedName}\nالخدمة: ${normalizedServiceType}`,
    });

    return NextResponse.json({
      success: true,
      message: "تم استقبال طلبك بنجاح.",
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ غير متوقع." },
      { status: 500 }
    );
  }
}