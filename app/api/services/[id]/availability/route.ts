import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExperienceSeatAvailability } from "@/lib/experienceSeats";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "معرف الخدمة مطلوب" }, { status: 400 });
    }

    const availability = await getExperienceSeatAvailability(supabaseAdmin, id);

    return NextResponse.json({ success: true, ...availability });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر جلب المقاعد المتاحة" },
      { status: 500 }
    );
  }
}
