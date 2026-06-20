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

export function mergeRemoteTrack(
  prev: MediaStream | null,
  event: RTCTrackEvent,
): MediaStream {
  if (event.streams[0]) {
    return event.streams[0];
  }

  const stream = prev ?? new MediaStream();
  const track = event.track;
  if (!stream.getTracks().some((t) => t.id === track.id)) {
    stream.addTrack(track);
  }
  return stream;
}

export function snapshotStream(stream: MediaStream): MediaStream {
  return new MediaStream(stream.getTracks());
}
