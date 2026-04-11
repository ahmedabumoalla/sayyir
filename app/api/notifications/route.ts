import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log('NOTIFICATIONS API INPUT:', body);

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa');

    if (body?.type === 'new_booking_request') {
      const payloadBase = {
        bookingId: body.bookingId || '',
        clientName: body.clientName || 'عميل',
        serviceName: body.serviceName || body.serviceTitle || 'خدمة سيّر',
        date: body.date || '',
        time: body.time || '',
        guests: body.guests || 1
      };

      const results: Record<string, any> = {};

      if (body.providerEmail || body.providerPhone) {
        const providerPayload = {
          templateId: 'new_booking_provider',
          email: body.providerEmail || null,
          phone: body.providerPhone || null,
          data: {
            ...payloadBase,
            providerName: body.providerName || 'مزود الخدمة'
          }
        };

        console.log('PROVIDER NOTIFICATION PAYLOAD:', providerPayload);

        try {
          const providerResponse = await fetch(`${baseUrl}/api/emails/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(providerPayload)
          });

          const providerResult = await providerResponse.json();

          console.log('PROVIDER NOTIFICATION RESULT:', {
            ok: providerResponse.ok,
            status: providerResponse.status,
            result: providerResult
          });

          results.provider = {
            ok: providerResponse.ok,
            status: providerResponse.status,
            result: providerResult
          };
        } catch (error) {
          console.error('PROVIDER NOTIFICATION ERROR:', error);
          results.provider = {
            ok: false,
            error: error instanceof Error ? error.message : 'Provider notification failed'
          };
        }
      } else {
        console.error('PROVIDER NOTIFICATION SKIPPED: no providerEmail/providerPhone');
        results.provider = {
          ok: false,
          skipped: true,
          reason: 'no providerEmail/providerPhone'
        };
      }

      if (body.clientEmail || body.clientPhone) {
        const clientPayload = {
          templateId: 'booking_pending_client',
          email: body.clientEmail || null,
          phone: body.clientPhone || null,
          data: payloadBase
        };

        console.log('CLIENT NOTIFICATION PAYLOAD:', clientPayload);

        try {
          const clientResponse = await fetch(`${baseUrl}/api/emails/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientPayload)
          });

          const clientResult = await clientResponse.json();

          console.log('CLIENT NOTIFICATION RESULT:', {
            ok: clientResponse.ok,
            status: clientResponse.status,
            result: clientResult
          });

          results.client = {
            ok: clientResponse.ok,
            status: clientResponse.status,
            result: clientResult
          };
        } catch (error) {
          console.error('CLIENT NOTIFICATION ERROR:', error);
          results.client = {
            ok: false,
            error: error instanceof Error ? error.message : 'Client notification failed'
          };
        }
      } else {
        console.error('CLIENT NOTIFICATION SKIPPED: no clientEmail/clientPhone');
        results.client = {
          ok: false,
          skipped: true,
          reason: 'no clientEmail/clientPhone'
        };
      }

      return NextResponse.json({ success: true, results });
    }

    const fallbackPayload = {
      ...body,
      templateId: body.templateId || body.type,
      data: body.data || body
    };

    console.log('NOTIFICATIONS FALLBACK PAYLOAD:', fallbackPayload);

    const response = await fetch(`${baseUrl}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fallbackPayload)
    });

    const result = await response.json();

    console.log('NOTIFICATIONS FALLBACK RESULT:', {
      ok: response.ok,
      status: response.status,
      result
    });

    return NextResponse.json(result, { status: response.status });
  } catch (error: unknown) {
    console.error('NOTIFICATIONS ROUTE ERROR:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}