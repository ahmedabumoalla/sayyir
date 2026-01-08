import { createClient } from "../supabaseClient";

export async function calculateBookingPrice(
  basePrice: number,
  couponCode: string | null = null
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = createClient();

  let discountAmount = 0;
  let finalCouponCode: string | null = null;

  const { data: settings, error: settingsError } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "platform_commission_rate")
    .single();

  if (settingsError) {
    return { success: false, error: "فشل جلب إعدادات المنصة" };
  }

  const commissionRate = settings?.value ?? 10;

  if (couponCode) {
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode)
      .eq("is_active", true)
      .single();

    if (error || !coupon) {
      return { success: false, error: "الكوبون غير صالح" };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { success: false, error: "الكوبون منتهي الصلاحية" };
    }

    if (coupon.max_usage && coupon.current_usage >= coupon.max_usage) {
      return { success: false, error: "تم استنفاذ عدد مرات استخدام الكوبون" };
    }

    discountAmount =
      coupon.discount_type === "percentage"
        ? (basePrice * coupon.value) / 100
        : coupon.value;

    if (discountAmount > basePrice) discountAmount = basePrice;

    finalCouponCode = coupon.code;
  }

  const finalPrice = basePrice - discountAmount;
  const platformFee = (finalPrice * commissionRate) / 100;
  const providerEarnings = finalPrice - platformFee;

  return {
    success: true,
    data: {
      originalPrice: basePrice,
      discountAmount: Number(discountAmount.toFixed(2)),
      couponCode: finalCouponCode,
      finalPrice: Number(finalPrice.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      providerEarnings: Number(providerEarnings.toFixed(2)),
      commissionRate,
    },
  };
}
