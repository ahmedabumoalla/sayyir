import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdminPermission } from "@/lib/adminGuard";

export async function POST(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const { action, admin_id, rejection_reason } = body;

    if (!admin_id) {
      return NextResponse.json({ error: "admin_id مطلوب" }, { status: 400 });
    }

    const permissionCheck = await checkAdminPermission(
      admin_id,
      "services_approve"
    );

    if (!permissionCheck.success) {
      return NextResponse.json(
        { error: permissionCheck.message },
        { status: 403 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "قرار غير صالح" }, { status: 400 });
    }

    const { data: changeRequest, error: requestError } = await supabaseServer
      .from("service_change_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !changeRequest) {
      return NextResponse.json(
        { error: "طلب التعديل غير موجود" },
        { status: 404 }
      );
    }

    if (changeRequest.status !== "pending") {
      return NextResponse.json(
        { error: "تم اتخاذ قرار على هذا الطلب مسبقًا" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      const { error } = await supabaseServer
        .from("service_change_requests")
        .update({
          status: "rejected",
          rejection_reason: rejection_reason || "تم رفض طلب التعديل",
          reviewed_by: admin_id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "تم رفض طلب التعديل",
      });
    }

    const { error: serviceError } = await supabaseServer
      .from("services")
      .update({
        ...changeRequest.requested_changes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", changeRequest.service_id)
      .eq("provider_id", changeRequest.provider_id);

    if (serviceError) {
      return NextResponse.json({ error: serviceError.message }, { status: 500 });
    }

    const { error: approveError } = await supabaseServer
      .from("service_change_requests")
      .update({
        status: "approved",
        reviewed_by: admin_id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (approveError) {
      return NextResponse.json(
        { error: approveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم قبول طلب التعديل وتطبيقه",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}