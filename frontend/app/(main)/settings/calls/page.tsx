"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { Checkbox } from "@/components/settings/Checkbox";

interface DeviceOption {
  deviceId: string;
  label: string;
}

export default function CallsSettingsPage() {
  const { calls, setCallSetting } = useUIStore();
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [audioInputs, setAudioInputs] = useState<DeviceOption[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<DeviceOption[]>([]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setVideoDevices(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }))
      );
      setAudioInputs(
        devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }))
      );
      setAudioOutputs(
        devices
          .filter((d) => d.kind === "audiooutput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}` }))
      );
    });
  }, []);

  return (
    <div className="mx-auto max-w-xl py-8">
      <h2 className="mb-8 text-center text-lg font-semibold">Calls</h2>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Calling</h3>
        <Checkbox
          label="Enable incoming calls"
          checked={calls.incomingCallsEnabled}
          onChange={(value) => setCallSetting("incomingCallsEnabled", value)}
        />
        <Checkbox
          label="Play calling sounds"
          checked={calls.callingSoundsEnabled}
          onChange={(value) => setCallSetting("callingSoundsEnabled", value)}
        />
      </section>

      <div className="my-6 border-t border-border" />

      <section>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Devices</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Video</label>
            <select
              value={calls.videoDeviceId ?? ""}
              onChange={(e) => setCallSetting("videoDeviceId", e.target.value || null)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">System default</option>
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Microphone</label>
            <select
              value={calls.microphoneDeviceId ?? ""}
              onChange={(e) => setCallSetting("microphoneDeviceId", e.target.value || null)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              {audioInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Speakers</label>
            <select
              value={calls.speakerDeviceId ?? ""}
              onChange={(e) => setCallSetting("speakerDeviceId", e.target.value || null)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              {audioOutputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="my-6 border-t border-border" />

      <section>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Advanced</h3>
        <Checkbox
          label="Always relay calls"
          description="Relay all calls through the Beacon server to avoid revealing your IP address to your contact. Enabling will reduce call quality."
          checked={calls.alwaysRelayCalls}
          onChange={(value) => setCallSetting("alwaysRelayCalls", value)}
        />
      </section>
    </div>
  );
}
