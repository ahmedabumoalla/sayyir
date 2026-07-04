import { NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/adminGuard";

export async function POST(req: Request) {
  try {
    const { requesterId } = await req.json();

    const permissionCheck = await checkAdminPermission(requesterId, "users_manage");
    if (!permissionCheck.success) {
      return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error:
          "Use /api/admin/users/action with action=toggle_ban to change account ban state.",
      },
      { status: 410 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
