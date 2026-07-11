"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Checkbox } from "@/components/settings/Checkbox";

type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Browser";
  const platform = navigator.platform || navigator.userAgent;
  if (/Mac/i.test(platform)) return "macOS";
  if (/Win/i.test(platform)) return "Windows";
  if (/Linux/i.test(platform)) return "Linux";
  return "Web browser";
}

export default function GeneralSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const { general, setGeneralSetting, addToast } = useUIStore();
  const [micPermission, setMicPermission] = useState<PermissionState>("prompt");
  const [cameraPermission, setCameraPermission] = useState<PermissionState>("prompt");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        setMicPermission(status.state as PermissionState);
        status.onchange = () => setMicPermission(status.state as PermissionState);
      })
      .catch(() => setMicPermission("unsupported"));
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((status) => {
        setCameraPermission(status.state as PermissionState);
        status.onchange = () => setCameraPermission(status.state as PermissionState);
      })
      .catch(() => setCameraPermission("unsupported"));
  }, []);

  const requestPermission = async (kind: "microphone" | "camera") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: kind === "microphone",
        video: kind === "camera",
      });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      addToast({
        message: `Beacon was denied access to your ${kind}. Enable it in your browser's site settings.`,
        variant: "error",
      });
    }
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <h2 className="mb-8 text-center text-lg font-semibold">General</h2>

      <div className="flex items-center justify-between py-2 text-sm">
        <span>Username</span>
        <span className="text-muted-foreground">{user?.username ? `@${user.username}` : "—"}</span>
      </div>
      <div className="flex items-center justify-between py-2 text-sm">
        <span>Device Name</span>
        <span className="text-muted-foreground">{detectDeviceLabel()}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Beacon runs in your browser, so there&apos;s no companion mobile app to link devices from.
      </p>

      <div className="my-6 border-t border-border" />

      <section>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">System</h3>
        <Checkbox
          label="Open at computer login"
          checked={general.openAtLogin}
          onChange={(value) => setGeneralSetting("openAtLogin", value)}
        />
      </section>

      <div className="my-6 border-t border-border" />

      <section>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Permissions</h3>
        <Checkbox
          label="Allow access to the microphone"
          description={micPermission === "denied" ? "Blocked in browser settings" : undefined}
          checked={micPermission === "granted"}
          onChange={() => void requestPermission("microphone")}
        />
        <Checkbox
          label="Allow access to the camera"
          description={cameraPermission === "denied" ? "Blocked in browser settings" : undefined}
          checked={cameraPermission === "granted"}
          onChange={() => void requestPermission("camera")}
        />
      </section>

      <div className="my-6 border-t border-border" />

      <section>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Updates</h3>
        <Checkbox
          label="Automatically download updates"
          checked={general.autoDownloadUpdates}
          onChange={(value) => setGeneralSetting("autoDownloadUpdates", value)}
        />
      </section>
    </div>
  );
}
