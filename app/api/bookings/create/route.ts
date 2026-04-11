import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      serviceId,
      userId,
      quantity,
      guests,
      checkIn,
      checkOut,
      bookingDate,
      bookingTime,
      notes
    } = body;

    if (!serviceId || !userId) {
      return NextResponse.json(
        { error: 'serviceId و userId مطلوبة' },
        { status: 400 }
      );
    }

    const bookingQuantity = Number(quantity || guests || 1);

    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select(`
        *,
        profiles:provider_id (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'الخدمة غير موجودة' },
        { status: 404 }
      );
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'بيانات العميل غير موجودة' },
        { status: 404 }
      );
    }

    const provider = service.profiles;

    if (!provider?.id) {
      return NextResponse.json(
        { error: 'مزود الخدمة غير مرتبط بهذه الخدمة' },
        { status: 400 }
      );
    }

    const unitPrice = Number(service.price || 0);
    const totalPrice = unitPrice * bookingQuantity;

    const insertPayload: Record<string, any> = {
      service_id: service.id,
      user_id: client.id,
      provider_id: provider.id,
      quantity: bookingQuantity,
      total_price: totalPrice,
      final_price: totalPrice,
      status: 'pending',
      payment_status: 'unpaid',
      notes: notes || null
    };

    if (checkIn) insertPayload.check_in = checkIn;
    if (checkOut) insertPayload.check_out = checkOut;
    if (bookingDate) insertPayload.booking_date = bookingDate;
    if (bookingTime) insertPayload.booking_time = bookingTime;

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(insertPayload)
      .select('*')
      .single();

    if (bookingError || !booking) {
      console.error('Create Booking Error:', bookingError);
      return NextResponse.json(
        { error: bookingError?.message || 'فشل إنشاء الحجز' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    if (provider.email || provider.phone) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'new_booking_provider',
          email: provider.email,
          phone: provider.phone,
          data: {
            bookingId: booking.id,
            providerName: provider.full_name || 'مزود الخدمة',
            serviceName: service.title || service.name || 'خدمة سيّر',
            clientName: client.full_name || 'عميل',
            date: booking.booking_date || booking.check_in || '',
            time: booking.booking_time || '',
            guests: booking.quantity || 1
          }
        })
      }).catch((err) => {
        console.error('فشل إرسال إشعار الحجز للمزود:', err);
      });
    }

    if (client.email || client.phone) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'booking_pending_client',
          email: client.email,
          phone: client.phone,
          data: {
            bookingId: booking.id,
            clientName: client.full_name || 'عميل',
            serviceName: service.title || service.name || 'خدمة سيّر',
            date: booking.booking_date || booking.check_in || '',
            time: booking.booking_time || '',
            guests: booking.quantity || 1
          }
        })
      }).catch((err) => {
        console.error('فشل إرسال إشعار انتظار الرد للعميل:', err);
      });
    }

    return NextResponse.json({
      success: true,
      booking
    });
  } catch (error: any) {
    console.error('Create Booking Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ في إنشاء الحجز' },
      { status: 500 }
    );
  }
}