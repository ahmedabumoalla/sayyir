import {
  sendGreenApiMessage,
  sendGreenApiQrCode,
} from "@/lib/greenApi";

type Field = [label: string, value: unknown];

const FIELD_LABELS: Record<string, string> = {
  full_name: "الاسم الكامل",
  name: "الاسم",
  email: "البريد الإلكتروني",
  phone: "رقم الجوال",
  service_type: "نوع الخدمة",
  service_category: "التصنيف الرئيسي",
  sub_category: "التصنيف الفرعي",
  title: "العنوان",
  description: "الوصف",
  price: "السعر",
  max_capacity: "السعة",
  location_lat: "خط العرض",
  location_lng: "خط الطول",
  commercial_license: "السجل/الترخيص التجاري",
  reason: "السبب",
  start: "من تاريخ",
  end: "إلى تاريخ",
};

export function getAppUrl() {
  return String(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://sayyir.sa"
  ).replace(/\/+$/, "");
}

function clean(value: unknown): string {
  if (value === null || value === undefined || value === "") return "غير محدد";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) {
    return value.length ? value.map(clean).join("، ") : "لا يوجد";
  }
  if (typeof value === "object") return "";
  return String(value).trim() || "غير محدد";
}

function optionalString(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

function reference(value: unknown) {
  return String(value || "").split("-")[0].toUpperCase();
}

function formatDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: raw.includes("T") ? "short" : undefined,
    timeZone: "Asia/Riyadh",
  }).format(parsed);
}

function formatDetails(
  input: unknown,
  prefix = "",
  depth = 0,
  output: string[] = []
) {
  if (!input || typeof input !== "object" || depth > 3 || output.length >= 35) {
    return output;
  }

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (output.length >= 35) break;
    if (["images", "image_url", "pending_updates"].includes(key)) continue;

    const label = FIELD_LABELS[key] || key.replace(/_/g, " ");
    const fullLabel = prefix ? `${prefix} - ${label}` : label;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      formatDetails(value, fullLabel, depth + 1, output);
      continue;
    }

    const formatted = clean(value);
    if (formatted !== "غير محدد" && formatted !== "لا يوجد") {
      output.push(`• ${fullLabel}: ${formatted}`);
    }
  }

  return output;
}

function compose({
  title,
  intro,
  requestReference,
  fields = [],
  details,
  actionLabel,
  actionUrl,
  note,
}: {
  title: string;
  intro?: string;
  requestReference?: unknown;
  fields?: Field[];
  details?: unknown;
  actionLabel?: string;
  actionUrl?: string;
  note?: string;
}) {
  const lines = [`*${title}*`];
  if (intro) lines.push("", intro);
  if (requestReference) lines.push("", `*المرجع:* #${reference(requestReference)}`);

  const validFields = fields.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (validFields.length) {
    lines.push("", "*التفاصيل:*", ...validFields.map(([label, value]) => `• ${label}: ${clean(value)}`));
  }

  const detailLines = formatDetails(details);
  if (detailLines.length) lines.push("", "*تفاصيل إضافية:*", ...detailLines);
  if (note) lines.push("", note);
  if (actionUrl) lines.push("", `*${actionLabel || "فتح صفحة الإجراء"}:*`, actionUrl);
  lines.push("", "— منصة سيّر | إشعار آلي");

  return lines.join("\n").slice(0, 19_500);
}

export async function notifyAdminNewProviderRequest(data: Record<string, unknown>) {
  const appUrl = getAppUrl();
  return sendGreenApiMessage({
    to: process.env.ADMIN_PHONE || "+966508424401",
    message: compose({
      title: "🔔 طلب انضمام مزود جديد",
      intro: "وصل طلب جديد ويحتاج إلى مراجعة الإدارة.",
      requestReference: data.id,
      fields: [
        ["اسم مقدم الطلب", data.name],
        ["رقم الجوال", data.phone],
        ["البريد الإلكتروني", data.email],
        ["نوع النشاط/الخدمة", data.service_type],
        ["تاريخ الطلب", formatDate(data.created_at || new Date().toISOString())],
      ],
      details: data.dynamic_data,
      actionLabel: "مراجعة الطلب واتخاذ الإجراء",
      actionUrl: `${appUrl}/admin/requests/${data.id}`,
    }),
  });
}

export async function notifyAdminServiceRequest({
  kind,
  service,
  provider,
  requestId,
  reason,
  requestedChanges,
  stopDates,
}: {
  kind: "new" | "update" | "stop" | "delete";
  service: Record<string, unknown>;
  provider: Record<string, unknown>;
  requestId?: string;
  reason?: string;
  requestedChanges?: unknown;
  stopDates?: unknown;
}) {
  const labels = {
    new: "طلب إضافة خدمة جديدة",
    update: "طلب تعديل خدمة",
    stop: "طلب إيقاف مؤقت لخدمة",
    delete: "طلب إيقاف نهائي/حذف خدمة",
  };
  const appUrl = getAppUrl();

  return sendGreenApiMessage({
    to: process.env.ADMIN_PHONE || "+966508424401",
    message: compose({
      title: `🧾 ${labels[kind]}`,
      intro: "يوجد طلب خدمة جديد بانتظار مراجعة الإدارة.",
      requestReference: requestId || service.id,
      fields: [
        ["الخدمة", service.title || service.name],
        ["نوع الطلب", labels[kind]],
        ["التصنيف", service.sub_category || service.service_category || service.service_type],
        ["السعر", service.price !== undefined ? `${service.price} ريال` : ""],
        ["المزود", provider.full_name || provider.name],
        ["جوال المزود", provider.phone],
        ["بريد المزود", provider.email],
        ["السبب", reason],
        ["الفترة المطلوبة", stopDates ? JSON.stringify(stopDates) : ""],
      ],
      details: kind === "new" ? service.details : requestedChanges,
      actionLabel: "فتح مراجعة الخدمات",
      actionUrl: `${appUrl}/admin/services?service=${service.id}`,
    }),
  });
}

export async function notifyProviderApplicationDecision({
  phone,
  approved,
  name,
  requestId,
  reason,
  email,
  temporaryPassword,
}: {
  phone: string;
  approved: boolean;
  name?: string;
  requestId?: string;
  reason?: string;
  email?: string;
  temporaryPassword?: string | null;
}) {
  const appUrl = getAppUrl();
  return sendGreenApiMessage({
    to: phone,
    message: compose({
      title: approved ? "✅ تمت الموافقة على طلب انضمامك" : "❌ تحديث طلب الانضمام",
      intro: approved
        ? `مرحبًا ${name || "بك"}، يسعدنا انضمامك كمزود خدمة في منصة سيّر.`
        : `مرحبًا ${name || "بك"}، نعتذر عن عدم قبول طلب الانضمام في الوقت الحالي.`,
      requestReference: requestId,
      fields: approved
        ? [
            ["البريد المستخدم للدخول", email],
            ["كلمة المرور المؤقتة", temporaryPassword],
          ]
        : [["سبب الرفض", reason || "لم يتم توضيح سبب"]],
      note:
        approved && temporaryPassword
          ? "🔐 حفاظًا على حسابك، غيّر كلمة المرور بعد أول تسجيل دخول ولا تشاركها مع أحد."
          : undefined,
      actionLabel: approved ? "تسجيل الدخول إلى حساب المزود" : "تقديم طلب جديد بعد معالجة الملاحظات",
      actionUrl: approved ? `${appUrl}/login` : `${appUrl}/register/provider`,
    }),
  });
}

export async function notifyProviderServiceDecision({
  phone,
  providerName,
  service,
  action,
  reason,
  requestedChanges,
}: {
  phone: string;
  providerName?: string;
  service: Record<string, unknown>;
  action: string;
  reason?: string;
  requestedChanges?: unknown;
}) {
  const actionLabels: Record<string, string> = {
    approve: "تمت الموافقة على إضافة الخدمة ونشرها",
    reject: "تم رفض طلب إضافة الخدمة",
    approve_update: "تمت الموافقة على تعديلات الخدمة",
    reject_update: "تم رفض تعديلات الخدمة والإبقاء على البيانات السابقة",
    approve_stop: "تمت الموافقة على إيقاف الخدمة",
    reject_stop: "تم رفض طلب إيقاف الخدمة وإعادة تفعيلها",
    approve_delete: "تمت الموافقة على إيقاف الخدمة نهائيًا",
    reject_delete: "تم رفض طلب الإيقاف النهائي وإعادة تفعيل الخدمة",
    admin_stop: "تم إيقاف الخدمة من قبل الإدارة",
    admin_reactivate: "تمت إعادة تفعيل الخدمة من قبل الإدارة",
  };
  const decision = actionLabels[action] || "تم تحديث حالة الخدمة";
  const isRejected = action.includes("reject") || action === "admin_stop";
  const appUrl = getAppUrl();

  return sendGreenApiMessage({
    to: phone,
    message: compose({
      title: `${isRejected ? "📌" : "✅"} ${decision}`,
      intro: `مرحبًا ${providerName || "بك"}، تم الانتهاء من مراجعة طلبك.`,
      requestReference: service.id,
      fields: [
        ["الخدمة", service.title || service.name],
        ["القرار", decision],
        ["سبب/ملاحظة الإدارة", reason],
        ["تاريخ القرار", formatDate(new Date().toISOString())],
      ],
      details: requestedChanges,
      actionLabel: "عرض الخدمة وحالتها",
      actionUrl: `${appUrl}/provider/services`,
    }),
  });
}

export async function notifyAdminPayoutRequest({
  payout,
  provider,
}: {
  payout: Record<string, unknown>;
  provider: Record<string, unknown>;
}) {
  const appUrl = getAppUrl();
  return sendGreenApiMessage({
    to: process.env.ADMIN_PHONE || "+966508424401",
    message: compose({
      title: "💰 طلب سحب رصيد جديد",
      intro: "وصل طلب سحب جديد ويحتاج إلى مراجعة الإدارة.",
      requestReference: payout.id,
      fields: [
        ["المزود", provider.full_name || provider.name],
        ["رقم واتساب المزود", provider.phone],
        ["المبلغ", `${payout.amount || ""} ريال`],
        ["البنك", payout.bank_name],
        ["رقم الآيبان", payout.iban],
        ["تاريخ الطلب", formatDate(payout.created_at || new Date().toISOString())],
      ],
      actionLabel: "فتح طلبات السحب واتخاذ الإجراء",
      actionUrl: `${appUrl}/admin/finance/providers?payout=${payout.id}`,
    }),
  });
}

export async function notifyProviderPayoutDecision({
  phone,
  providerName,
  payout,
  approved,
  reason,
}: {
  phone: string;
  providerName?: string;
  payout: Record<string, unknown>;
  approved: boolean;
  reason?: string;
}) {
  const appUrl = getAppUrl();
  return sendGreenApiMessage({
    to: phone,
    message: compose({
      title: approved ? "✅ تمت الموافقة على طلب السحب" : "📌 تم رفض طلب السحب",
      intro: `مرحباً ${providerName || "بك"}، تم الانتهاء من مراجعة طلب السحب.`,
      requestReference: payout.id,
      fields: [
        ["القرار", approved ? "مقبول / تم التحويل" : "مرفوض"],
        ["المبلغ", `${payout.amount || ""} ريال`],
        ["البنك", payout.bank_name],
        ["رقم الآيبان", payout.iban],
        ["السبب/ملاحظة الإدارة", reason],
        ["تاريخ القرار", formatDate(new Date().toISOString())],
      ],
      actionLabel: "فتح المحفظة وسجل السحوبات",
      actionUrl: `${appUrl}/provider/finance`,
    }),
  });
}

export async function sendTemplateWhatsAppNotification(
  templateId: string,
  phone: string,
  data: Record<string, unknown>
) {
  const appUrl = getAppUrl();
  const bookingId = data.bookingId || data.id;
  let message: string;

  switch (templateId) {
    case "new_booking_provider":
      message = compose({
        title: "🔔 طلب حجز جديد بانتظار قرارك",
        intro: `مرحبًا ${data.providerName || "مزود الخدمة"}، وصلك طلب حجز جديد.`,
        requestReference: bookingId,
        fields: [
          ["الخدمة", data.serviceName],
          ["العميل", data.clientName],
          ["جوال العميل", data.clientPhone],
          ["التاريخ/الدخول", formatDate(data.date || data.checkIn)],
          ["تاريخ المغادرة", formatDate(data.checkOut)],
          ["الوقت", data.time],
          ["العدد/الكمية", data.guests || data.quantity],
          ["عدد الأطفال", data.childCount],
          ["الإجمالي", data.totalPrice],
          ["ملاحظات العميل", data.notes],
        ],
        actionLabel: "قبول أو رفض الحجز",
        actionUrl: optionalString(data.actionUrl) || `${appUrl}/provider/bookings`,
      });
      break;

    case "booking_pending_client":
      message = compose({
        title: "⏳ تم استلام طلب حجزك",
        intro: `مرحبًا ${data.clientName || "بك"}، تم إرسال طلبك للمزود وهو الآن قيد المراجعة.`,
        requestReference: bookingId,
        fields: [
          ["الخدمة", data.serviceName],
          ["التاريخ", formatDate(data.date || data.checkIn)],
          ["الوقت", data.time],
          ["العدد/الكمية", data.guests || data.quantity],
          ["الإجمالي", data.totalPrice],
        ],
        actionLabel: "متابعة حالة الطلب",
        actionUrl: `${appUrl}/client/dashboard`,
      });
      break;

    case "booking_approved_invoice":
      message = compose({
        title: "✅ وافق المزود على حجزك",
        intro: `مرحبًا ${data.clientName || "بك"}، وافق المزود على طلبك. أكمل الدفع قبل انتهاء المهلة لتأكيد الحجز.`,
        requestReference: bookingId,
        fields: [
          ["الخدمة", data.serviceName],
          ["المزود", data.providerName],
          ["التاريخ/الدخول", formatDate(data.date || data.checkIn)],
          ["المغادرة", formatDate(data.checkOut)],
          ["الوقت", data.time],
          ["العدد/الكمية", data.guests || data.quantity],
          ["الإجمالي", data.totalPrice],
          ["آخر موعد للدفع", formatDate(data.expiresAt)],
        ],
        actionLabel: "إكمال الدفع وتأكيد الحجز",
        actionUrl: optionalString(data.paymentLink) || `${appUrl}/checkout/${bookingId}`,
      });
      break;

    case "booking_rejected":
      message = compose({
        title: "❌ اعتذر المزود عن قبول الحجز",
        intro: `مرحبًا ${data.clientName || "بك"}، نعتذر لعدم قبول طلب الحجز.`,
        requestReference: bookingId,
        fields: [
          ["الخدمة", data.serviceName],
          ["المزود", data.providerName],
          ["سبب الرفض", data.reason || "لم يتم توضيح سبب"],
          ["التاريخ المطلوب", formatDate(data.date || data.checkIn)],
          ["العدد/الكمية", data.guests || data.quantity],
          ["الإجمالي", data.totalPrice],
        ],
        actionLabel: "استعراض خدمات بديلة",
        actionUrl: `${appUrl}/service`,
      });
      break;

    case "booking_payment_confirmed":
      message = compose({
        title: "🎫 تم تأكيد حجزك وإصدار التذكرة",
        intro: `مرحبًا ${data.clientName || "بك"}، تم تأكيد الدفع والحجز بنجاح.`,
        requestReference: bookingId,
        fields: [
          ["الخدمة", data.serviceName],
          ["التاريخ/الدخول", formatDate(data.date || data.checkIn)],
          ["المغادرة", formatDate(data.checkOut)],
          ["الوقت", data.time],
          ["العدد/الكمية", data.guests || data.quantity],
          ["المبلغ المدفوع", data.totalPrice],
          ["رمز التذكرة", data.ticketCodeShort || data.ticketCode],
        ],
        note: "احتفظ برسالة QR التالية وأبرزها لمزود الخدمة عند الوصول.",
        actionLabel: "عرض تفاصيل التذكرة والحجز",
        actionUrl: optionalString(data.ticketUrl) || `${appUrl}/client/trips/${bookingId}`,
      });
      break;

    case "provider_payment_received":
      message = compose({
        title: "💵 تم الدفع وتأكيد الحجز",
        intro: `مرحبًا ${data.providerName || "مزود الخدمة"}، أصبح الحجز مؤكدًا بعد اكتمال الدفع.`,
        requestReference: bookingId,
        fields: [
          ["الخدمة", data.serviceName],
          ["العميل", data.clientName],
          ["جوال العميل", data.clientPhone],
          ["التاريخ/الدخول", formatDate(data.date || data.checkIn)],
          ["المغادرة", formatDate(data.checkOut)],
          ["الوقت", data.time],
          ["العدد/الكمية", data.guests || data.quantity],
          ["المبلغ", data.totalPrice],
        ],
        actionLabel: "عرض الحجز المؤكد",
        actionUrl: `${appUrl}/provider/bookings`,
      });
      break;

    case "provider_approved":
      return notifyProviderApplicationDecision({
        phone,
        approved: true,
        name: optionalString(data.providerName),
        requestId: optionalString(data.requestId),
        email: optionalString(data.email),
        temporaryPassword:
          data.password && data.password !== "Existing account"
            ? String(data.password)
            : null,
      });

    case "service_approved":
    case "service_rejected":
    case "update_approved":
    case "update_rejected":
    case "stop_approved":
    case "stop_rejected":
    case "delete_approved":
    case "delete_rejected":
      return notifyProviderServiceDecision({
        phone,
        providerName: optionalString(data.providerName),
        service: { id: data.serviceId, title: data.serviceName || data.serviceTitle },
        action:
          ({
            service_approved: "approve",
            service_rejected: "reject",
            update_approved: "approve_update",
            update_rejected: "reject_update",
            stop_approved: "approve_stop",
            stop_rejected: "reject_stop",
            delete_approved: "approve_delete",
            delete_rejected: "reject_delete",
          } as Record<string, string>)[templateId] || templateId,
        reason: optionalString(data.reason),
        requestedChanges: data.requestedChanges,
      });

    default:
      message = compose({
        title: optionalString(data.title) || "إشعار جديد من منصة سيّر",
        intro: optionalString(data.message || data.description),
        requestReference: bookingId || data.requestId || data.serviceId,
        details: data,
        actionUrl: optionalString(data.actionUrl),
      });
  }

  const textResult = await sendGreenApiMessage({ to: phone, message });
  if (
    templateId === "booking_payment_confirmed" &&
    data.ticketCode &&
    textResult.ok
  ) {
    const qrResult = await sendGreenApiQrCode({
      to: phone,
      value: String(data.ticketCode),
      reference: reference(bookingId),
      caption: `🎫 تذكرة سيّر | الحجز #${reference(bookingId)}\nالرمز: ${clean(
        data.ticketCodeShort || data.ticketCode
      )}`,
    });
    return { ...textResult, qr: qrResult };
  }

  return textResult;
}
