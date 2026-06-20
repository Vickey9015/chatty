export function sdpHasRelayCandidates(sdp: string | undefined | null): boolean {
  if (!sdp) return false;
  return /a=candidate:[^\r\n]* typ relay/i.test(sdp);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function waitForIceGatheringComplete(
  peer: RTCPeerConnection,
  timeoutMs = 10000,
): Promise<void> {
  if (peer.iceGatheringState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      peer.removeEventListener('icegatheringstatechange', onChange);
      clearTimeout(timer);
      resolve();
    };

    const onChange = () => {
      if (peer.iceGatheringState === 'complete') {
        finish();
      }
    };

    peer.addEventListener('icegatheringstatechange', onChange);
    const timer = setTimeout(finish, timeoutMs);
  });
}

/** Wait until relay candidates are in the SDP (same-WiFi calls). */
export async function waitForRelayCandidates(
  peer: RTCPeerConnection,
  timeoutMs = 20000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const sdp = peer.localDescription?.sdp;
    if (sdpHasRelayCandidates(sdp)) return true;
    if (peer.iceGatheringState === 'complete') {
      return sdpHasRelayCandidates(sdp);
    }
    await sleep(150);
  }

  return sdpHasRelayCandidates(peer.localDescription?.sdp);
}

export function toSessionDescription(
  desc: RTCSessionDescription | RTCSessionDescriptionInit | null | undefined,
): RTCSessionDescriptionInit | null {
  if (!desc?.type || !desc?.sdp) return null;
  return { type: desc.type, sdp: desc.sdp };
}
