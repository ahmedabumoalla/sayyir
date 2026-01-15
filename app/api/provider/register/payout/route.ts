import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

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

    // 1. إدخال الطلب
    const { error: insertError } = await supabaseAdmin
      .from('payout_requests')
      .insert([{
        provider_id: providerId,
        amount: amount,
        iban: iban,
        bank_name: bankName,
        status: 'pending'
      }]);

    if (insertError) throw insertError;

    // 2. إرسال تنبيه مالي للأدمن عبر Resend ✅
    const adminEmail = process.env.ADMIN_EMAIL || 'ahmedabumoalla@gmail.com';

    await resend.emails.send({
        from: 'المالية - سَيّر <info@emails.sayyir.sa>',
        to: adminEmail,
        subject: '💰 طلب سحب رصيد جديد',
        html: `
            <div dir="rtl" style="font-family: sans-serif; color: #333;">
                <h2 style="color: #C89B3C;">طلب سحب رصيد جديد</h2>
                <p>تم استلام طلب سحب رصيد من المزود: <strong>${providerName}</strong></p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                    <p><strong>المبلغ:</strong> ${amount} ﷼</p>
                    <p><strong>البنك:</strong> ${bankName}</p>
                    <p><strong>الآيبان:</strong> ${iban}</p>
                </div>
                <br/>
                <a href="https://sayyir.sa/admin/finance" style="background-color: #2B1F17; color: #C89B3C; padding: 10px 20px; text-decoration: none; border-radius: 5px;">الذهاب للمالية</a>
            </div>
        `
    });

    return NextResponse.json({ success: true, message: "تم إرسال طلب السحب بنجاح" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}