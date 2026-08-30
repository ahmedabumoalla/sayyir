"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getAnalyticsIdentity,
  sendAnalyticsPayload,
} from "@/lib/platformAnalytics";

const LAST_PATH_KEY = "sayyir_analytics_last_path";

function isTrackablePath(pathname: string) {
  return !pathname.startsWith("/admin") && !pathname.startsWith("/api");
}

function getReferrerDomain() {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
}

export default function PlatformAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isTrackablePath(pathname)) return;

    const identity = getAnalyticsIdentity();
    if (!identity) return;

    const startSession = async () => {
      const isNewSession = !window.sessionStorage.getItem(LAST_PATH_KEY);

      if (isNewSession) {
        await sendAnalyticsPayload({
          eventType: "session_start",
          pagePath: pathname,
          referrerDomain: getReferrerDomain(),
        });
      }

      const lastPath = window.sessionStorage.getItem(LAST_PATH_KEY);
      if (lastPath === pathname) return;

      window.sessionStorage.setItem(LAST_PATH_KEY, pathname);
      await sendAnalyticsPayload({ eventType: "page_view", pagePath: pathname });
    };

    void startSession();
  }, [pathname]);

  useEffect(() => {
    if (!isTrackablePath(window.location.pathname)) return;

    const identity = getAnalyticsIdentity();
    if (!identity) return;

    const heartbeat = () => {
      if (
        document.visibilityState === "visible" &&
        isTrackablePath(window.location.pathname)
      ) {
        void sendAnalyticsPayload({
          eventType: "heartbeat",
          pagePath: window.location.pathname,
        });
      }
    };

    const flush = () => {
      if (!isTrackablePath(window.location.pathname)) return;
      void sendAnalyticsPayload(
        { eventType: "heartbeat", pagePath: window.location.pathname },
        { beacon: true }
      );
    };

    const interval = window.setInterval(heartbeat, 15_000);
    document.addEventListener("visibilitychange", heartbeat);
    window.addEventListener("pagehide", flush);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!isTrackablePath(window.location.pathname)) return;
      if (!(event.target instanceof Element)) return;

      const control = event.target.closest<HTMLElement>(
        "a, button, [role='button']"
      );
      if (!control || control.dataset.analyticsIgnore === "true") return;

      const rawHref = control instanceof HTMLAnchorElement ? control.href : null;
      let targetPath: string | null = null;
      if (rawHref) {
        try {
          const url = new URL(rawHref, window.location.href);
          targetPath = url.origin === window.location.origin ? url.pathname : url.hostname;
        } catch {
          targetPath = null;
        }
      }

      const categoryEntity =
        targetPath === "/landmarks"
          ? "landmark"
          : targetPath === "/facilities"
            ? "facility"
            : targetPath === "/experiences"
              ? "experience"
              : targetPath === "/events"
                ? "event"
                : null;

      void sendAnalyticsPayload({
        eventType: "platform_click",
        pagePath: window.location.pathname,
        metadata: {
          element: control.tagName.toLowerCase(),
          target: targetPath,
        },
      });

      if (categoryEntity) {
        void sendAnalyticsPayload({
          eventType: "entity_open",
          entityType: categoryEntity,
          pagePath: window.location.pathname,
          metadata: { scope: "category", target: targetPath },
        });
      }
    };

    document.addEventListener("click", handleClick, { passive: true });
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
