export function snapshotStream(stream: MediaStream): MediaStream {
  return new MediaStream(stream.getTracks());
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

export function hasLiveTrack(
  stream: MediaStream | null,
  kind: 'audio' | 'video',
): boolean {
  return Boolean(
    stream?.getTracks().some((t) => t.kind === kind && t.readyState === 'live' && t.enabled),
  );
}
