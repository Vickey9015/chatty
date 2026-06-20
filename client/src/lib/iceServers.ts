/** ICE/TURN config for WebRTC. STUN alone fails across many mobile/carrier NATs — TURN relays media. */
export function getRtcConfiguration(): RTCConfiguration {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  if (
    import.meta.env.VITE_TURN_URL &&
    import.meta.env.VITE_TURN_USERNAME &&
    import.meta.env.VITE_TURN_CREDENTIAL
  ) {
    servers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  } else {
    servers.push(
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
          'turns:openrelay.metered.ca:443',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh',
      },
    );
  }

  return {
    iceServers: servers,
    iceCandidatePoolSize: 0,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}

export function serializeIceCandidate(
  candidate: RTCIceCandidate | RTCIceCandidateInit | null,
): RTCIceCandidateInit | null {
  if (!candidate?.candidate) return null;
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid ?? undefined,
    sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
    usernameFragment: candidate.usernameFragment ?? undefined,
  };
}
