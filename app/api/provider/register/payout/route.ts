import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// إعداد عميل Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// إعداد ناقل الإيميل (Nodemailer)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { providerId, amount, iban, bankName, providerName } = body;

    // 1. التحقق من البيانات
    if (!providerId || !amount || !iban) {
      return NextResponse.json({ error: "بيانات الطلب غير مكتملة" }, { status: 400 });
    }

    // 2. إدخال طلب السحب في قاعدة البيانات
    const { data: payoutRequest, error: insertError } = await supabaseAdmin
      .from('payout_requests')
      .insert([{
        provider_id: providerId,
        amount: amount,
        iban: iban,
        bank_name: bankName,
        status: 'pending' // الحالة الافتراضية
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. إرسال إيميل تنبيه للأدمن (المسجل في env) 📧
    try {
        const adminEmail = process.env.GMAIL_USER; // نرسل لنفس إيميل النظام كإشعار
        
        await transporter.sendMail({
            from: `"منصة سيّر - المالية" <${process.env.GMAIL_USER}>`,
            to: adminEmail,
            subject: '💰 طلب سحب رصيد جديد',
            html: `
                <div dir="rtl" style="font-family: sans-serif; color: #333;">
                    <h2 style="color: #C89B3C;">طلب سحب رصيد جديد</h2>
                    <p>تم استلام طلب سحب رصيد من المزود: <strong>${providerName}</strong></p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #eee;">
                        <p><strong>المبلغ المطلوب:</strong> ${amount} ﷼</p>
                        <p><strong>البنك:</strong> ${bankName}</p>
                        <p><strong>الآيبان:</strong> <span style="font-family: monospace;">${iban}</span></p>
                        <p><strong>تاريخ الطلب:</strong> ${new Date().toLocaleDateString('ar-SA')}</p>
                    </div>

                    <p>يرجى مراجعة لوحة التحكم (المالية) لاتخاذ الإجراء (تحويل أو رفض).</p>
                    <br/>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/finance" style="background-color: #2B1F17; color: #C89B3C; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        الذهاب للمالية
                    </a>
                </div>
            `
        });
        console.log("Admin payout notification sent.");
    } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
        // لا نوقف العملية، لأن الطلب تم حفظه في قاعدة البيانات
    }

    return NextResponse.json({ success: true, message: "تم إرسال طلب السحب بنجاح" });

  } catch (error: any) {
    console.error("Payout API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}