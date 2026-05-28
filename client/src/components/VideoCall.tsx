import { useEffect, useRef } from 'react';
import type { CallState } from '../types';

interface Props {
  call: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  videoOff: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

function attachStream(video: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!video) return;
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }
  if (stream) {
    void video.play().catch(() => {
      /* autoplay may need user gesture */
    });
  }
}

export function VideoCall({
  call,
  localStream,
  remoteStream,
  muted,
  videoOff,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
}: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    attachStream(localRef.current, localStream);
  }, [localStream, call.status]);

  useEffect(() => {
    attachStream(remoteRef.current, remoteStream);
  }, [remoteStream, call.status]);

  if (call.status === 'idle') return null;

  const showVideos = call.status === 'active' || call.status === 'calling';

  return (
    <div className="video-call-overlay">
      <div className="video-call-panel">
        {call.status === 'incoming' && (
          <div className="call-banner incoming">
            <p>
              Incoming call from <strong>{call.remoteUsername}</strong>
            </p>
            <div className="call-actions">
              <button type="button" className="btn-accept" onClick={onAccept}>
                Accept
              </button>
              <button type="button" className="btn-reject" onClick={onReject}>
                Decline
              </button>
            </div>
          </div>
        )}

        {call.status === 'calling' && (
          <div className="call-banner">
            <p>
              Calling <strong>{call.remoteUsername}</strong>…
            </p>
            <button type="button" className="btn-reject" onClick={onEnd}>
              Cancel
            </button>
          </div>
        )}

        {showVideos && (
          <div className="video-grid">
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className={`video-remote ${!remoteStream ? 'video-hidden' : ''}`}
            />
            {!remoteStream && <div className="video-remote video-placeholder">Waiting for video…</div>}
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className={`video-local ${!localStream ? 'video-hidden' : ''}`}
            />
            {!localStream && <div className="video-local video-placeholder">Starting camera…</div>}
          </div>
        )}

        {showVideos && (
          <div className="call-controls">
            <button type="button" onClick={onToggleMute} title={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🎤'}
            </button>
            <button type="button" onClick={onToggleVideo} title={videoOff ? 'Camera on' : 'Camera off'}>
              {videoOff ? '📷' : '📹'}
            </button>
            <button type="button" className="btn-end" onClick={onEnd}>
              End call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
