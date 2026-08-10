import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type DatabaseClient = SupabaseClient;

export type ServiceForPricing = {
  id: string;
  provider_id?: string | null;
  price?: number | string | null;
  service_category?: string | null;
  sub_category?: string | null;
  max_capacity?: number | string | null;
  details?: {
    event_info?: {
      child_price?: unknown;
    };
  } | null;
};

export type DiscountValidation = {
  valid: boolean;
  applied: boolean;
  code: string | null;
  source: "platform" | "coupon" | null;
  discountAmount: number;
  finalAmount: number;
  discountPercent: number;
  error?: string;
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

export const normalizeDiscountCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const positiveInteger = (value: unknown, fallback = 1) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const nonNegativeInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

export function calculateServiceSubtotal(
  service: ServiceForPricing,
  quantity: unknown,
  childCount: unknown = 0
) {
  const unitPrice = Number(service.price || 0);

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("invalid_service_price");
  }

  const isEvent = service.sub_category === "event";
  const bookingQuantity = isEvent
    ? nonNegativeInteger(quantity)
    : positiveInteger(quantity);
  const children = nonNegativeInteger(childCount);
  const isUnlimitedFixedPriceExperience =
    service.service_category === "experience" &&
    !isEvent &&
    Number(service.max_capacity || 0) <= 0;

  if (isUnlimitedFixedPriceExperience) {
    return roundCurrency(unitPrice);
  }

  if (isEvent) {
    const childPrice = Number(service.details?.event_info?.child_price || 0);

    if (!Number.isFinite(childPrice) || childPrice < 0) {
      throw new Error("invalid_child_price");
    }

    return roundCurrency(unitPrice * bookingQuantity + childPrice * children);
  }

  return roundCurrency(unitPrice * bookingQuantity);
}

function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function riyadhDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizedDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function optionalNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== null && record[key] !== undefined && record[key] !== "") {
      const parsed = Number(record[key]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function matchesOptionalRestriction(
  record: Record<string, unknown>,
  singularKeys: string[],
  pluralKeys: string[],
  actualValue: string | null | undefined
) {
  for (const key of singularKeys) {
    if (record[key] && record[key] !== actualValue) return false;
  }

  for (const key of pluralKeys) {
    const allowed = safeStringArray(record[key]);
    if (allowed.length > 0 && (!actualValue || !allowed.includes(actualValue))) return false;
  }

  return true;
}

function invalidDiscount(finalAmount: number, error: string): DiscountValidation {
  return {
    valid: false,
    applied: false,
    code: null,
    source: null,
    discountAmount: 0,
    finalAmount,
    discountPercent: 0,
    error,
  };
}

export async function validateDiscountCode(params: {
  supabase: DatabaseClient;
  code: unknown;
  service: ServiceForPricing;
  bookingDate?: unknown;
  subtotal: number;
}): Promise<DiscountValidation> {
  const { supabase, service } = params;
  const code = normalizeDiscountCode(params.code);
  const subtotal = roundCurrency(Math.max(0, params.subtotal));

  if (!code) {
    return {
      valid: true,
      applied: false,
      code: null,
      source: null,
      discountAmount: 0,
      finalAmount: subtotal,
      discountPercent: 0,
    };
  }

  const { data: settings, error: settingsError } = await supabase
    .from("platform_settings")
    .select(
      "general_discount_code, general_discount_percent, is_general_discount_active, general_discount_categories"
    )
    .single();

  if (settingsError) {
    console.error("DISCOUNT SETTINGS FETCH ERROR:", settingsError);
    return invalidDiscount(subtotal, "تعذر التحقق من كود الخصم");
  }

  const platformCode = normalizeDiscountCode(settings?.general_discount_code);

  if (platformCode && platformCode === code) {
    if (settings?.is_general_discount_active !== true) {
      return invalidDiscount(subtotal, "كود الخصم غير فعال");
    }

    const allowedCategories = safeStringArray(settings.general_discount_categories);
    if (
      allowedCategories.length > 0 &&
      !allowedCategories.includes(service.service_category || "") &&
      !allowedCategories.includes(service.sub_category || "")
    ) {
      return invalidDiscount(subtotal, "كود الخصم لا يشمل هذه الخدمة");
    }

    const percent = Number(settings.general_discount_percent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return invalidDiscount(subtotal, "إعدادات كود الخصم غير صالحة");
    }

    const discountAmount = roundCurrency(Math.min(subtotal, subtotal * (percent / 100)));
    return {
      valid: true,
      applied: true,
      code: platformCode,
      source: "platform",
      discountAmount,
      finalAmount: roundCurrency(subtotal - discountAmount),
      discountPercent: percent,
    };
  }

  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (couponError) {
    console.error("COUPON FETCH ERROR:", couponError);
    return invalidDiscount(subtotal, "تعذر التحقق من كود الخصم");
  }

  if (!coupon) {
    return invalidDiscount(subtotal, "كود الخصم غير موجود");
  }

  const couponRecord = coupon as Record<string, unknown>;

  if ("is_active" in couponRecord && couponRecord.is_active !== true) {
    return invalidDiscount(subtotal, "كود الخصم غير فعال");
  }

  const today = riyadhDate();
  const bookingDate = normalizedDate(params.bookingDate);
  const startDate = normalizedDate(
    couponRecord.start_date || couponRecord.starts_at || couponRecord.valid_from
  );
  const endDate = normalizedDate(
    couponRecord.end_date || couponRecord.expires_at || couponRecord.valid_until
  );

  if (startDate && startDate > today) {
    return invalidDiscount(subtotal, "كود الخصم لم يبدأ بعد");
  }

  if (endDate && endDate < today) {
    return invalidDiscount(subtotal, "كود الخصم منتهي الصلاحية");
  }

  if (bookingDate && startDate && bookingDate < startDate) {
    return invalidDiscount(subtotal, "كود الخصم غير صالح لتاريخ الحجز");
  }

  if (bookingDate && endDate && bookingDate > endDate) {
    return invalidDiscount(subtotal, "كود الخصم غير صالح لتاريخ الحجز");
  }

  const serviceAllowed = matchesOptionalRestriction(
    couponRecord,
    ["service_id"],
    ["service_ids"],
    service.id
  );
  const providerAllowed = matchesOptionalRestriction(
    couponRecord,
    ["provider_id"],
    ["provider_ids"],
    service.provider_id
  );
  const categoryAllowed = matchesOptionalRestriction(
    couponRecord,
    ["service_category"],
    ["service_categories"],
    service.service_category
  );
  const subCategoryAllowed = matchesOptionalRestriction(
    couponRecord,
    ["sub_category"],
    ["sub_categories"],
    service.sub_category
  );

  if (!serviceAllowed || !providerAllowed || !categoryAllowed || !subCategoryAllowed) {
    return invalidDiscount(subtotal, "كود الخصم لا يشمل هذه الخدمة");
  }

  const maxUsage = optionalNumber(couponRecord, ["max_usage", "usage_limit", "max_uses"]);
  if (maxUsage !== null) {
    const { count, error: usageError } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("coupon_code", code)
      .eq("payment_status", "paid");

    if (usageError) {
      console.error("COUPON USAGE FETCH ERROR:", usageError);
      return invalidDiscount(subtotal, "تعذر التحقق من حد استخدام كود الخصم");
    }

    if ((count || 0) >= maxUsage) {
      return invalidDiscount(subtotal, "تم استنفاد حد استخدام كود الخصم");
    }
  }

  const percentage = optionalNumber(couponRecord, ["discount_percent", "percentage"]);
  const discountType = couponRecord.discount_type;
  const rawValue = optionalNumber(couponRecord, ["value", "discount_amount"]);
  let discountAmount = 0;
  let discountPercent = 0;

  if (percentage !== null) {
    if (percentage <= 0 || percentage > 100) {
      return invalidDiscount(subtotal, "قيمة كود الخصم غير صالحة");
    }
    discountPercent = percentage;
    discountAmount = subtotal * (percentage / 100);
  } else if (discountType === "percentage" && rawValue !== null) {
    if (rawValue <= 0 || rawValue > 100) {
      return invalidDiscount(subtotal, "قيمة كود الخصم غير صالحة");
    }
    discountPercent = rawValue;
    discountAmount = subtotal * (rawValue / 100);
  } else if (discountType === "fixed" && rawValue !== null && rawValue > 0) {
    discountAmount = rawValue;
  } else {
    return invalidDiscount(subtotal, "قيمة كود الخصم غير صالحة");
  }

  discountAmount = roundCurrency(Math.min(subtotal, discountAmount));

  return {
    valid: true,
    applied: true,
    code: normalizeDiscountCode(couponRecord.code),
    source: "coupon",
    discountAmount,
    finalAmount: roundCurrency(subtotal - discountAmount),
    discountPercent,
  };
}
