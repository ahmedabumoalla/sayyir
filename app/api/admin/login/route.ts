import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 401) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = (body?.email ?? "").toString().trim();
    const authPassword = (body?.authPassword ?? "").toString();
    const secret = (body?.secret ?? "").toString();

    if (!email || !authPassword || !secret) {
      return jsonError("الرجاء إدخال جميع البيانات", 400);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !anon || !service) {
      return jsonError("Server env missing", 500);
    }

    // (A) تحقق كلمة مرور Supabase Auth (بدون الاعتماد على client)
    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password: authPassword }),
    });

    const authJson = await authRes.json().catch(() => null);
    if (!authRes.ok || !authJson?.access_token || !authJson?.user?.id) {
      return jsonError("بيانات الدخول غير صحيحة");
    }

    const userId = authJson.user.id as string;

    // (B) قراءة صلاحيات الأدمن من profiles عبر Service Role (يتجاوز RLS)
    const adminDb = createClient(url, service, {
      auth: { persistSession: false },
    });

    const { data: profile, error } = await adminDb
      .from("profiles")
      .select("is_super_admin, admin_secret_hash")
      .eq("id", userId)
      .single();

    if (error || !profile?.is_super_admin || !profile?.admin_secret_hash) {
      return jsonError("ليس لديك صلاحية الأدمن");
    }

    // (C) تحقق السر
    const ok = await bcrypt.compare(secret, profile.admin_secret_hash);
    if (!ok) {
      return jsonError("إجابة غير صحيحة");
    }

    // رجّع التوكنز عشان الـ client يسوي setSession
    return NextResponse.json({
      ok: true,
      access_token: authJson.access_token,
      refresh_token: authJson.refresh_token,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
