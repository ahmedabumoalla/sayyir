type SupabaseLike = {
  // Supabase's fluent query builder type is intentionally accepted here so
  // this helper works with both server clients used by the application.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

type BookingDateRow = {
  status?: string | null;
  payment_status?: string | null;
  booking_date?: string | null;
  execution_date?: string | null;
  check_in?: string | null;
  check_out?: string | null;
};

export type DateAvailability = {
  isDateExclusive: boolean;
  unavailableDates: string[];
};

const BLOCKING_BOOKING_STATUSES = new Set([
  "approved_unpaid",
  "confirmed",
  "completed",
]);

const NON_BLOCKING_BOOKING_STATUSES = new Set([
  "cancelled",
  "rejected",
  "expired",
]);

const BLOCKING_PAYMENT_STATUSES = new Set(["paid", "paid_to_provider"]);

function toDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || null;
}

function addUtcDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function blocksDate(booking: BookingDateRow) {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();

  if (NON_BLOCKING_BOOKING_STATUSES.has(status)) return false;

  return (
    BLOCKING_BOOKING_STATUSES.has(status) ||
    BLOCKING_PAYMENT_STATUSES.has(paymentStatus)
  );
}

function getOccupiedDates(booking: BookingDateRow, isLodging: boolean) {
  const start =
    toDateOnly(booking.check_in) ||
    toDateOnly(booking.booking_date) ||
    toDateOnly(booking.execution_date);

  if (!start) return [];

  if (!isLodging) return [start];

  const endExclusive = toDateOnly(booking.check_out) || addUtcDays(start, 1);
  if (endExclusive <= start) return [start];

  const dates: string[] = [];
  for (let date = start; date < endExclusive; date = addUtcDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export async function getDateAvailability(
  supabase: SupabaseLike,
  service: { id: string; sub_category?: string | null }
): Promise<DateAvailability> {
  const isLodging = service.sub_category === "lodging";
  const isDateExclusive = isLodging || service.sub_category === "facility";

  if (!isDateExclusive) {
    return { isDateExclusive: false, unavailableDates: [] };
  }

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "status, payment_status, booking_date, execution_date, check_in, check_out"
    )
    .eq("service_id", service.id);

  if (error) {
    throw new Error(error.message || "تعذر قراءة التواريخ المحجوزة");
  }

  const unavailableDates = new Set<string>();
  for (const booking of (bookings || []) as BookingDateRow[]) {
    if (!blocksDate(booking)) continue;
    for (const date of getOccupiedDates(booking, isLodging)) {
      unavailableDates.add(date);
    }
  }

  return {
    isDateExclusive: true,
    unavailableDates: Array.from(unavailableDates).sort(),
  };
}

export function requestedDatesAreUnavailable(
  unavailableDates: Iterable<string>,
  startValue: unknown,
  endExclusiveValue?: unknown
) {
  const start = toDateOnly(startValue);
  if (!start) return false;

  const unavailable = new Set(unavailableDates);
  const endExclusive = toDateOnly(endExclusiveValue);

  if (!endExclusive) return unavailable.has(start);
  if (endExclusive <= start) return true;

  for (let date = start; date < endExclusive; date = addUtcDays(date, 1)) {
    if (unavailable.has(date)) return true;
  }

  return false;
}
