"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateFetchCache } from "@/lib/fetch-json";
import { USER_STRUCTURE_URL } from "@/lib/user-structure";
import { useAppUser } from "@/lib/app-user-context";

// Native notifications while the site is open also work if the push queue is delayed.
export function BrowserNotificationReceiver() {
  const { data } = useAppUser();
  const userId = data?.user?.id;
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId || !window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    let stopped = false, pending = false;
    let cursor: string | null = null, previousEndpoint = "";
    let workerUpdated = false;
    const controller = new AbortController();
    const invalidate = () => {
      invalidateFetchCache(USER_STRUCTURE_URL);
      void queryClient.invalidateQueries({ queryKey: ["user-structure", userId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-list", "/api/user/notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["collection-structure", "/api/user/notifications?structure=1"] });
    };
    const poll = async () => {
      if (stopped || pending || document.hidden || Notification.permission !== "granted") return;
      pending = true;
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) return;
        if (previousEndpoint !== subscription.endpoint) { cursor = null; previousEndpoint = subscription.endpoint; }
        const params = new URLSearchParams({ endpoint: subscription.endpoint });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/user/push/live?${params}`, { cache: "no-store", signal: controller.signal, headers: { "x-skip-notification": "true" } });
        if (!response.ok) return;
        const { data } = await response.json();
        if (stopped || !data?.enabled || !Array.isArray(data.items)) return;
        if (!data.items.length) { cursor = data.cursor; return; }
        // Register the current worker so existing installations receive the live handler too.
        if (!workerUpdated) {
          await navigator.serviceWorker.register("/notification-worker.js", { scope: "/" });
          workerUpdated = true;
        }
        const ready = await navigator.serviceWorker.ready;
        for (const item of data.items) {
          if (stopped) return;
          await new Promise<void>((resolve, reject) => {
            const channel = new MessageChannel();
            const timer = setTimeout(() => { channel.port1.close(); reject(new Error("Notification worker timeout")); }, 5000);
            channel.port1.onmessage = event => {
              clearTimeout(timer); channel.port1.close();
              if (event.data?.ok) resolve(); else reject(new Error("Notification display failed"));
            };
            ready.active?.postMessage({ type: "display-notification", notification: item }, [channel.port2]);
          });
        }
        if (data.items.length) invalidate();
        cursor = data.cursor;
      } catch { /* Retry transient network/worker failures without losing the cursor. */ }
      finally { pending = false; }
    };
    const onPush = (event: MessageEvent) => { if (event.data?.type === "notification-received") invalidate(); };
    void poll();
    const timer = window.setInterval(() => void poll(), 15000);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    navigator.serviceWorker.addEventListener("message", onPush);
    return () => { stopped = true; controller.abort(); clearInterval(timer); window.removeEventListener("focus", poll); document.removeEventListener("visibilitychange", poll); navigator.serviceWorker.removeEventListener("message", onPush); };
  }, [queryClient, userId]);
  return null;
}
