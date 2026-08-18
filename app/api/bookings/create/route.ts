import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertExperienceSeatsAvailable } from '@/lib/experienceSeats';
import {
  getDateAvailability,
  requestedDatesAreUnavailable,
} from '@/lib/serviceAvailability';
import { getInternalNotificationHeaders } from '@/lib/notificationAuth';
import { getAuthenticatedUserId } from '@/lib/requireProvider';
import {
  ensureProfileWhatsApp,
  whatsappGuardStatus,
} from '@/lib/whatsappProfile';

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
      notes,
      childCount
    } = body;

    if (!serviceId || !userId) {
      return NextResponse.json(
        { error: 'serviceId و userId مطلوبة' },
        { status: 400 }
      );
    }

    const authenticatedUserId = await getAuthenticatedUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول لإتمام الحجز.' }, { status: 401 });
    }
    if (authenticatedUserId !== userId) {
      return NextResponse.json({ error: 'لا يمكنك إنشاء حجز لمستخدم آخر.' }, { status: 403 });
    }

    const requestedQuantity = Number(quantity || guests || 1);

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

    const clientWhatsApp = await ensureProfileWhatsApp(client);
    if (!clientWhatsApp.ok) {
      return NextResponse.json(clientWhatsApp, {
        status: whatsappGuardStatus(clientWhatsApp),
      });
    }

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

    const providerWhatsApp = await ensureProfileWhatsApp(providerProfile);
    if (!providerWhatsApp.ok) {
      return NextResponse.json(
        {
          error: 'تعذر الحجز مؤقتاً لأن مزود الخدمة لم يضف رقم واتساب صالحاً.',
          code: 'PROVIDER_WHATSAPP_UNAVAILABLE',
        },
        { status: 409 }
      );
    }

    const isUnlimitedFixedPriceExperience =
      service.service_category === 'experience' &&
      service.sub_category !== 'event' &&
      Number(service.max_capacity || 0) <= 0;

    const bookingQuantity = isUnlimitedFixedPriceExperience ? 1 : requestedQuantity;

    await assertExperienceSeatsAvailable(supabaseAdmin, service.id, bookingQuantity);

    const dateAvailability = await getDateAvailability(supabaseAdmin, service);
    const requestedStart = checkIn || bookingDate;
    const requestedEndExclusive =
      service.sub_category === 'lodging' ? checkOut : undefined;

    if (dateAvailability.isDateExclusive && !requestedStart) {
      return NextResponse.json(
        { error: 'booking_date_required' },
        { status: 400 }
      );
    }

    if (service.sub_category === 'lodging' && !requestedEndExclusive) {
      return NextResponse.json(
        { error: 'check_out_required' },
        { status: 400 }
      );
    }

    if (
      dateAvailability.isDateExclusive &&
      requestedDatesAreUnavailable(
        dateAvailability.unavailableDates,
        requestedStart,
        requestedEndExclusive
      )
    ) {
      return NextResponse.json(
        { error: 'date_unavailable', message: 'التاريخ المختار محجوز وغير متاح.' },
        { status: 409 }
      );
    }

    const unitPrice = Number(service.price || 0);
    const totalPrice = isUnlimitedFixedPriceExperience ? unitPrice : unitPrice * bookingQuantity;

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

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa');

    const notificationPayload = {
      type: 'new_booking_request',
      bookingId: booking.id,
      clientEmail: client.email?.trim() || null,
      clientPhone: clientWhatsApp.phone,
      clientName: client.full_name || 'عميل',
      providerEmail: providerProfile.email?.trim() || null,
      providerPhone: providerWhatsApp.phone,
      providerName: providerProfile.full_name || 'مزود الخدمة',
      serviceName: service.title || service.name || 'خدمة سيّر',
      date: booking.booking_date || booking.check_in || '',
      checkIn: booking.check_in || booking.booking_date || '',
      checkOut: booking.check_out || '',
      time: booking.booking_time || '',
      guests: booking.quantity || 1,
      quantity: booking.quantity || 1,
      childCount: Number(childCount || 0),
      totalPrice: `${Number(booking.total_price || totalPrice || 0)} ريال`,
      notes: booking.additional_notes || notes || ''
    };

    let notificationStatus: Record<string, unknown> | null = null;
    try {
      const notificationResponse = await fetch(`${baseUrl}/api/notifications`, {
        method: 'POST',
        headers: getInternalNotificationHeaders(),
        body: JSON.stringify(notificationPayload)
      });

      const notificationResult = await notificationResponse.json();
      notificationStatus = notificationResult;

      if (!notificationResponse.ok) {
        console.error('NEW BOOKING NOTIFICATION FAILED:', notificationResult);
      }
    } catch (notifyError) {
      console.error('NOTIFICATION SEND ERROR:', notifyError);
    }

    return NextResponse.json({
      success: true,
      booking,
      message:
        notificationStatus && notificationStatus.success !== false
          ? 'تم إنشاء الحجز وإرسال إشعارات واتساب.'
          : 'تم إنشاء الحجز، لكن تعذر إرسال واحد أو أكثر من الإشعارات.',
      notificationStatus,
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
