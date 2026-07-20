import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExperienceSeatAvailability } from "@/lib/experienceSeats";
import { getDateAvailability } from "@/lib/serviceAvailability";

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

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id, sub_category")
      .eq("id", id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
    }

    const [seatAvailability, dateAvailability] = await Promise.all([
      getExperienceSeatAvailability(supabaseAdmin, id),
      getDateAvailability(supabaseAdmin, service),
    ]);

    return NextResponse.json({
      success: true,
      ...seatAvailability,
      ...dateAvailability,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر جلب المقاعد المتاحة" },
      { status: 500 }
    );
  }
}
