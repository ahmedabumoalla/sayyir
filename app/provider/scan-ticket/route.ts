import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { ticketCode, providerId } = await request.json();

    if (!ticketCode) return NextResponse.json({ error: "رمز التذكرة مفقود" }, { status: 400 });

    // 1. البحث عن التذكرة في قاعدة البيانات
    const { data: booking, error } = await supabase
        .from('bookings')
        .select('id, is_ticket_used, status, services(title, provider_id)')
        .eq('ticket_qr_code', ticketCode)
        .single();

    if (error || !booking) {
        return NextResponse.json({ success: false, message: "❌ تذكرة مزيفة أو غير موجودة في النظام!" });
    }

    // ✅ الحل لخطأ TypeScript: تحويل البيانات للنوع الصحيح (كائن واحد)
    const serviceInfo: any = Array.isArray(booking.services) ? booking.services[0] : booking.services;

    // 2. التأكد أن التذكرة تخص هذا المزود
    if (serviceInfo?.provider_id !== providerId) {
        return NextResponse.json({ success: false, message: "❌ هذه التذكرة لا تتبع لخدماتك!" });
    }

    // 3. التأكد أنها لم تستخدم مسبقاً
    if (booking.is_ticket_used) {
        return NextResponse.json({ success: false, message: "⚠️ عذراً، تم استخدام هذه التذكرة مسبقاً!" });
    }

    // 4. ختم التذكرة (صرفها)
    await supabase
        .from('bookings')
        .update({ 
            is_ticket_used: true,
            ticket_used_at: new Date().toISOString(),
            status: 'completed'
        })
        .eq('id', booking.id);

    return NextResponse.json({ 
        success: true, 
        message: "✅ تذكرة صحيحة، تم تسجيل دخول العميل بنجاح!",
        service: serviceInfo?.title
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}