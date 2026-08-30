"use client";

import { supabase } from "@/lib/supabaseClient";

export type AnalyticsEntityType =
  | "landmark"
  | "facility"
  | "experience"
  | "event";

export type PlatformAnalyticsEvent = {
  eventType: "entity_open" | "map_click" | "platform_click";
  entityType?: AnalyticsEntityType;
  entityId?: string;
  entityName?: string;
  pagePath?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const SESSION_KEY = "sayyir_analytics_session";
const VISITOR_KEY = "sayyir_analytics_visitor";
const START_KEY = "sayyir_analytics_started_at";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getOrCreateStorageValue(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const value = createId();
  storage.setItem(key, value);
  return value;
}

export function getAnalyticsIdentity() {
  if (typeof window === "undefined") return null;

  const sessionId = getOrCreateStorageValue(window.sessionStorage, SESSION_KEY);
  const visitorId = getOrCreateStorageValue(window.localStorage, VISITOR_KEY);
  const storedStart = window.sessionStorage.getItem(START_KEY);
  const startedAt = storedStart ? Number(storedStart) : Date.now();

  if (!storedStart) window.sessionStorage.setItem(START_KEY, String(startedAt));

  return { sessionId, visitorId, startedAt };
}

export function getAnalyticsDurationSeconds() {
  const identity = getAnalyticsIdentity();
  return identity ? Math.max(0, Math.floor((Date.now() - identity.startedAt) / 1000)) : 0;
}

export async function sendAnalyticsPayload(
  payload: Record<string, unknown>,
  options: { beacon?: boolean } = {}
) {
  const identity = getAnalyticsIdentity();
  if (!identity) return;

  const body = JSON.stringify({
    ...payload,
    sessionId: identity.sessionId,
    visitorId: identity.visitorId,
    durationSeconds: getAnalyticsDurationSeconds(),
  });

  if (options.beacon && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(
      "/api/analytics/track",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  await fetch("/api/analytics/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}

export function trackPlatformEvent(event: PlatformAnalyticsEvent) {
  if (event.eventType === "entity_open" && event.entityId) {
    const dedupeKey = `sayyir_analytics_open:${event.entityType}:${event.entityId}`;
    const lastOpen = Number(window.sessionStorage.getItem(dedupeKey) || 0);
    if (Date.now() - lastOpen < 2_000) return Promise.resolve();
    window.sessionStorage.setItem(dedupeKey, String(Date.now()));
  }

  return sendAnalyticsPayload({
    ...event,
    pagePath: event.pagePath || window.location.pathname,
  });
}
