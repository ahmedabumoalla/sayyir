import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "تم تعطيل حذف المستخدمين نهائيًا لحماية الحسابات والحجوزات والمدفوعات. استخدم الإيقاف أو الأرشفة فقط.",
    },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "تم تعطيل حذف المستخدمين نهائيًا لحماية الحسابات والحجوزات والمدفوعات. استخدم الإيقاف أو الأرشفة فقط.",
    },
    { status: 403 }
  );
}