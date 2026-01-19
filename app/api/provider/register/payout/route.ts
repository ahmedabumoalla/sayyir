import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/twilio'; // ✅

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { providerId, amount, iban, bankName, providerName } = body;

    if (!providerId || !amount || !iban) {
      return NextResponse.json({ error: "بيانات الطلب ناقصة" }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('payout_requests')
      .insert([{ provider_id: providerId, amount: amount, iban: iban, bank_name: bankName, status: 'pending' }]);

    if (insertError) throw insertError;

    // 📩 إشعار للأدمن (أنت)
    const adminEmail = process.env.ADMIN_EMAIL || 'ahmedabumoalla@gmail.com';
    const adminPhone = process.env.ADMIN_PHONE || '+966500000000'; // استبدله برقمك

    // 1. إرسال إيميل
    await resend.emails.send({
        from: 'المالية - سَيّر <info@emails.sayyir.sa>',
        to: adminEmail,
        subject: '💰 طلب سحب رصيد جديد',
        html: `<div dir="rtl"><h2>طلب سحب: ${providerName}</h2><p>المبلغ: ${amount} ريال</p><p>البنك: ${bankName}</p></div>`
    });

    // 2. إرسال SMS ✅
    await sendSMS({
        to: adminPhone,
        body: `💰 تنبيه مالي:\nيوجد طلب سحب رصيد جديد.\nالمزود: ${providerName}\nالمبلغ: ${amount} ريال.`
    });

    return NextResponse.json({ success: true, message: "تم إرسال طلب السحب بنجاح" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}