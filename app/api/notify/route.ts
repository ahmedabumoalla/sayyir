import { NextResponse } from 'next/server';
import {
  getInternalNotificationHeaders,
  isAuthorizedInternalNotification,
} from '@/lib/notificationAuth';

export async function POST(req: Request) {
  try {
    if (!isAuthorizedInternalNotification(req)) {
      return NextResponse.json({ error: 'Unauthorized notification request' }, { status: 401 });
    }

    const body = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

    const response = await fetch(`${baseUrl}/api/emails/send`, {
      method: 'POST',
      headers: getInternalNotificationHeaders(),
      body: JSON.stringify({
        ...body,
        templateId: body.templateId || body.type,
        data: body.data || body
      })
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
