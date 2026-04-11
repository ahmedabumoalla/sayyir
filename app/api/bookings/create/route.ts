import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log('CREATE BOOKING INPUT:', body);

    const {
      serviceId,
      userId,
      quantity,
      guests,
      checkIn,
      checkOut,
      bookingDate,
      bookingTime,
      notes,
      childCount
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
      console.error('SERVICE FETCH ERROR:', serviceError);
      return NextResponse.json(
        { error: 'الخدمة غير موجودة' },
        { status: 404 }
      );
    }

    console.log('SERVICE FOUND:', service);

    const { data: client, error: clientError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', userId)
      .single();

    if (clientError || !client) {
      console.error('CLIENT FETCH ERROR:', clientError);
      return NextResponse.json(
        { error: 'بيانات العميل غير موجودة' },
        { status: 404 }
      );
    }

    console.log('CLIENT FOUND:', client);

    const provider = service.profiles;

    if (!provider?.id) {
      console.error('PROVIDER MISSING ON SERVICE:', service);
      return NextResponse.json(
        { error: 'مزود الخدمة غير مرتبط بهذه الخدمة' },
        { status: 400 }
      );
    }

    const { data: providerProfile, error: providerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', provider.id)
      .single();

    if (providerProfileError || !providerProfile) {
      console.error('PROVIDER PROFILE FETCH ERROR:', providerProfileError);
      return NextResponse.json(
        { error: 'بيانات مزود الخدمة غير موجودة' },
        { status: 404 }
      );
    }

    console.log('PROVIDER PROFILE FOUND:', providerProfile);

    const unitPrice = Number(service.price || 0);
    const totalPrice = unitPrice * bookingQuantity;

    const insertPayload: Record<string, unknown> = {
      service_id: service.id,
      user_id: client.id,
      provider_id: provider.id,
      quantity: bookingQuantity,
      total_price: totalPrice,
      status: 'pending',
      payment_status: 'pending',
      additional_notes: notes || null,
      details: {
        child_count: Number(childCount || 0)
      }
    };

    if (checkIn) {
      insertPayload.check_in = checkIn;
      insertPayload.execution_date = checkIn;
    }

    if (checkOut) insertPayload.check_out = checkOut;
    if (bookingDate) insertPayload.booking_date = bookingDate;
    if (bookingTime) insertPayload.booking_time = bookingTime;

    console.log('BOOKING INSERT PAYLOAD:', insertPayload);

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(insertPayload)
      .select('*')
      .single();

    if (bookingError || !booking) {
      console.error('CREATE BOOKING ERROR:', bookingError);
      return NextResponse.json(
        { error: bookingError?.message || 'فشل إنشاء الحجز' },
        { status: 500 }
      );
    }

    console.log('BOOKING CREATED:', booking);

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa');

    const notificationPayload = {
      type: 'new_booking_request',
      bookingId: booking.id,
      clientEmail: client.email?.trim() || null,
      clientPhone: client.phone?.trim() || null,
      clientName: client.full_name || 'عميل',
      providerEmail: providerProfile.email?.trim() || null,
      providerPhone: providerProfile.phone?.trim() || null,
      providerName: providerProfile.full_name || 'مزود الخدمة',
      serviceName: service.title || service.name || 'خدمة سيّر',
      date: booking.booking_date || booking.check_in || '',
      time: booking.booking_time || '',
      guests: booking.quantity || 1
    };

    console.log('NEW BOOKING NOTIFICATION PAYLOAD:', notificationPayload);

    try {
      const notificationResponse = await fetch(`${baseUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload)
      });

      const notificationResult = await notificationResponse.json();

      console.log('NEW BOOKING NOTIFICATION RESULT:', {
        ok: notificationResponse.ok,
        status: notificationResponse.status,
        result: notificationResult
      });

      if (!notificationResponse.ok) {
        console.error('NEW BOOKING NOTIFICATION FAILED:', notificationResult);
      }
    } catch (notifyError) {
      console.error('NOTIFICATION SEND ERROR:', notifyError);
    }

    return NextResponse.json({
      success: true,
      booking
    });
  } catch (error: unknown) {
    console.error('CREATE BOOKING ROUTE ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في إنشاء الحجز';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}