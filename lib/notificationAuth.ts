const NOTIFICATION_HEADER = "x-sayyir-notification-secret";

function getInternalSecret() {
  return String(
    process.env.INTERNAL_NOTIFICATION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ""
  );
}

export function getInternalNotificationHeaders() {
  return {
    "Content-Type": "application/json",
    [NOTIFICATION_HEADER]: getInternalSecret(),
  };
}

export function isAuthorizedInternalNotification(request: Request) {
  const expected = getInternalSecret();
  const provided = request.headers.get(NOTIFICATION_HEADER) || "";
  return Boolean(expected && provided && expected === provided);
}
