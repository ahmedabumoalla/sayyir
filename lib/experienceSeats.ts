type SupabaseLike = {
  from: (table: string) => any;
};

export type ExperienceSeatAvailability = {
  isLimitedExperience: boolean;
  maxCapacity: number | null;
  confirmedSeats: number;
  availableSeats: number | null;
};

const CONFIRMED_BOOKING_STATUSES = ["confirmed"];
export async function getExperienceSeatAvailability(
  supabase: SupabaseLike,
  serviceId: string
): Promise<ExperienceSeatAvailability> {
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, service_category, sub_category, max_capacity")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    throw new Error("الخدمة غير موجودة");
  }

  const hasLimitedCapacity =
    service.service_category === "experience" &&
    service.sub_category !== "event" &&
    service.max_capacity !== null &&
    service.max_capacity !== undefined;

  if (!hasLimitedCapacity) {
    return {
      isLimitedExperience: false,
      maxCapacity: null,
      confirmedSeats: 0,
      availableSeats: null,
    };
  }

  const maxCapacity = Math.max(0, Number(service.max_capacity || 0));

  const { data: confirmedBookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("quantity")
    .eq("service_id", serviceId)
    .in("status", CONFIRMED_BOOKING_STATUSES);

  if (bookingsError) {
    throw new Error(bookingsError.message || "تعذر قراءة المقاعد المحجوزة");
  }

  const confirmedSeats = (confirmedBookings || []).reduce(
    (sum: number, booking: any) => sum + Number(booking.quantity || 1),
    0
  );

  return {
    isLimitedExperience: true,
    maxCapacity,
    confirmedSeats,
    availableSeats: Math.max(0, maxCapacity - confirmedSeats),
  };
}

export async function assertExperienceSeatsAvailable(
  supabase: SupabaseLike,
  serviceId: string,
  requestedSeats: number
) {
  const availability = await getExperienceSeatAvailability(supabase, serviceId);

  if (
    availability.isLimitedExperience &&
    availability.availableSeats !== null &&
    requestedSeats > availability.availableSeats
  ) {
    throw new Error(`عذراً، المقاعد المتبقية هي ${availability.availableSeats} فقط.`);
  }

  return availability;
}
