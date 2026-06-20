/** Wait until ICE gathering finishes so the SDP includes all candidates (more reliable than trickle over polling). */
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

export function toSessionDescription(
  desc: RTCSessionDescription | RTCSessionDescriptionInit | null | undefined,
): RTCSessionDescriptionInit | null {
  if (!desc?.type || !desc?.sdp) return null;
  return { type: desc.type, sdp: desc.sdp };
}
