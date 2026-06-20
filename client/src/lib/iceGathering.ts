export function sdpHasRelayCandidates(sdp: string | undefined | null): boolean {
  if (!sdp) return false;
  return /a=candidate:[^\r\n]* typ relay/i.test(sdp);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Wait until relay candidates are in the SDP (required for same-WiFi laptop + phone). */
export async function waitForRelayCandidates(
  peer: RTCPeerConnection,
  timeoutMs = 18000,
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
