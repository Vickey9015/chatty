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

function attachStream(
  el: HTMLVideoElement | HTMLAudioElement | null,
  stream: MediaStream | null,
) {
  if (!el) return;
  if (el.srcObject !== stream) {
    el.srcObject = stream;
  }
  if (stream) {
    void el.play().catch(() => {
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
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const isVideo = call.mode === 'video';
  const showVideos = isVideo && (call.status === 'active' || call.status === 'calling');
  const showAudio = !isVideo && call.status === 'active';

  useEffect(() => {
    if (isVideo) attachStream(localRef.current, localStream);
  }, [localStream, call.status, isVideo]);

  useEffect(() => {
    if (isVideo) attachStream(remoteRef.current, remoteStream);
    else attachStream(remoteAudioRef.current, remoteStream);
  }, [remoteStream, call.status, isVideo]);

  if (call.status === 'idle') return null;

  const callLabel = isVideo ? 'Video call' : 'Audio call';

  return (
    <div className={`video-call-overlay ${showVideos ? 'video-call-fullscreen' : ''}`}>
      <div
        className={`video-call-panel ${showVideos ? 'video-call-panel-fullscreen' : ''} ${showAudio ? 'audio-call-panel' : ''}`}
      >
        {showVideos && (
          <div className="video-grid">
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className={`video-remote ${!remoteStream ? 'video-hidden' : ''}`}
            />
            {!remoteStream && (
              <div className="video-remote video-placeholder">Waiting for video…</div>
            )}
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className={`video-local ${!localStream ? 'video-hidden' : ''}`}
            />
            {!localStream && (
              <div className="video-local video-placeholder">Starting camera…</div>
            )}
          </div>
        )}

        {showAudio && (
          <div className="audio-call-active">
            <div className="audio-call-avatar">🎧</div>
            <p>
              {callLabel} with <strong>{call.remoteUsername}</strong>
            </p>
            <audio ref={remoteAudioRef} autoPlay playsInline className="audio-call-stream" />
          </div>
        )}

        {call.status === 'incoming' && (
          <div className="call-banner incoming">
            <p>
              Incoming {callLabel.toLowerCase()} from <strong>{call.remoteUsername}</strong>
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
          <div className={`call-banner ${isVideo ? 'call-banner-overlay' : 'incoming'}`}>
            <p>
              {callLabel} <strong>{call.remoteUsername}</strong>…
            </p>
            <button type="button" className="btn-reject" onClick={onEnd}>
              Cancel
            </button>
          </div>
        )}

        {(showVideos || showAudio) && (
          <div className={`call-controls ${showVideos ? 'call-controls-overlay' : ''}`}>
            <button type="button" onClick={onToggleMute} title={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🎤'}
            </button>
            {isVideo && (
              <button type="button" onClick={onToggleVideo} title={videoOff ? 'Camera on' : 'Camera off'}>
                {videoOff ? '📷' : '📹'}
              </button>
            )}
            <button type="button" className="btn-end" onClick={onEnd}>
              End call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
