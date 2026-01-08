export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  max_usage: number | null;
  current_usage: number;
  expires_at: string | null;
  is_active: boolean;
};

export type PriceBreakdown = {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  platformFee: number;
  providerEarnings: number;
};