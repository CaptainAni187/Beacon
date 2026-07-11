/**
 * WebRTC helpers for Beacon calling.
 *
 * Signaling (who's calling whom, SDP offers/answers, ICE candidates) is
 * relayed over the existing app WebSocket — see the `call.*` events
 * handled in the backend's websocket handler. Actual audio/video media
 * flows peer-to-peer once negotiation completes; WebRTC itself encrypts
 * that media in transit (SRTP/DTLS) independent of Beacon's app-layer
 * message E2EE.
 *
 * NAT traversal note: only public STUN is configured here. On networks
 * with restrictive/symmetric NATs, a TURN relay would be needed for the
 * connection to succeed — out of scope for this project, but the standard
 * next step for production use.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

export interface LocalMediaOptions {
  audio: boolean;
  video: boolean;
  videoDeviceId?: string | null;
  microphoneDeviceId?: string | null;
}

/** Request the local microphone/camera, honoring the user's device picks from Settings. */
export async function getLocalMedia(options: LocalMediaOptions): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: options.microphoneDeviceId
      ? { deviceId: { exact: options.microphoneDeviceId } }
      : options.audio,
    video: options.video
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(options.videoDeviceId ? { deviceId: { exact: options.videoDeviceId } } : {}),
        }
      : false,
  });
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
