import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { CallMode, CallState } from '../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function mergeRemoteTrack(prev: MediaStream | null, event: RTCTrackEvent): MediaStream {
  const stream = prev ?? new MediaStream();
  const track = event.track;
  if (!stream.getTracks().some((t) => t.id === track.id)) {
    stream.addTrack(track);
  }
  return stream;
}

export function useWebRTC(socketRef: React.RefObject<Socket | null>) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteIdRef = useRef<string | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCallModeRef = useRef<CallMode>('video');
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callStatusRef = useRef<CallState['status']>('idle');

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [call, setCall] = useState<CallState>({
    status: 'idle',
    remoteUserId: null,
    remoteUsername: null,
    mode: null,
  });
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const updateCall = useCallback((next: CallState | ((prev: CallState) => CallState)) => {
    setCall((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      callStatusRef.current = resolved.status;
      return resolved;
    });
  }, []);

  const setRemote = useCallback((stream: MediaStream | null) => {
    remoteStreamRef.current = stream;
    setRemoteStream(stream);
  }, []);

  const cleanup = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    remoteIdRef.current = null;
    pendingOfferRef.current = null;
    pendingCallModeRef.current = 'video';
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemote(null);
    setMuted(false);
    setVideoOff(false);
    updateCall({ status: 'idle', remoteUserId: null, remoteUsername: null, mode: null });
  }, [setRemote, updateCall]);

  const flushPendingCandidates = useCallback(async (peer: RTCPeerConnection) => {
    const pending = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore stale candidates */
      }
    }
  }, []);

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const peer = peerRef.current;
      if (!peer) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      if (!peer.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const setupPeer = useCallback(
    (stream: MediaStream) => {
      const peer = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.ontrack = (event) => {
        const merged = mergeRemoteTrack(remoteStreamRef.current, event);
        setRemote(merged);
      };

      peer.onicecandidate = (event) => {
        if (event.candidate && remoteIdRef.current) {
          socketRef.current?.emit('ice_candidate', {
            to: remoteIdRef.current,
            candidate: event.candidate,
          });
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed') {
          console.warn('WebRTC connection failed');
        }
      };

      peerRef.current = peer;
      return peer;
    },
    [socketRef, setRemote],
  );

  const getMedia = useCallback(async (mode: CallMode) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: mode === 'video' ? { facingMode: 'user' } : false,
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setVideoOff(false);
    return stream;
  }, []);

  const startCall = useCallback(
    async (targetId: string, targetName: string, mode: CallMode) => {
      try {
        remoteIdRef.current = targetId;
        pendingCandidatesRef.current = [];
        setRemote(null);
        updateCall({
          status: 'calling',
          remoteUserId: targetId,
          remoteUsername: targetName,
          mode,
        });

        const stream = await getMedia(mode);
        const peer = setupPeer(stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current?.emit('call_user', { targetId, signal: offer, callType: mode });
      } catch {
        cleanup();
        alert(
          mode === 'audio'
            ? 'Could not access microphone. Please allow permissions.'
            : 'Could not access camera/microphone. Please allow permissions.',
        );
      }
    },
    [getMedia, setupPeer, socketRef, cleanup, setRemote, updateCall],
  );

  const acceptCall = useCallback(async () => {
    const remoteId = remoteIdRef.current;
    const offer = pendingOfferRef.current;
    const mode = pendingCallModeRef.current;
    if (!remoteId || !offer) return;

    try {
      setRemote(null);
      const stream = await getMedia(mode);
      const peer = setupPeer(stream);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingCandidates(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketRef.current?.emit('answer_call', { to: remoteId, signal: answer });
      updateCall((c) => ({ ...c, status: 'active' }));
    } catch {
      cleanup();
      alert(
        mode === 'audio'
          ? 'Could not access microphone.'
          : 'Could not access camera/microphone.',
      );
    }
  }, [getMedia, setupPeer, socketRef, cleanup, flushPendingCandidates, setRemote, updateCall]);

  const rejectCall = useCallback(() => {
    if (remoteIdRef.current) {
      socketRef.current?.emit('end_call', { to: remoteIdRef.current });
    }
    cleanup();
  }, [socketRef, cleanup]);

  const endCall = useCallback(() => {
    if (remoteIdRef.current) {
      socketRef.current?.emit('end_call', { to: remoteIdRef.current });
    }
    cleanup();
  }, [socketRef, cleanup]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onIncoming = ({
      from,
      username,
      signal,
      callType,
    }: {
      from: string;
      username: string;
      signal: RTCSessionDescriptionInit;
      callType?: CallMode;
    }) => {
      if (callStatusRef.current !== 'idle') {
        socket.emit('end_call', { to: from });
        return;
      }
      const mode: CallMode = callType === 'audio' ? 'audio' : 'video';
      remoteIdRef.current = from;
      pendingOfferRef.current = signal;
      pendingCallModeRef.current = mode;
      pendingCandidatesRef.current = [];
      updateCall({ status: 'incoming', remoteUserId: from, remoteUsername: username, mode });
    };

    const onAccepted = async ({ signal }: { signal: RTCSessionDescriptionInit }) => {
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        await flushPendingCandidates(peer);
        updateCall((c) => ({ ...c, status: 'active' }));
      } catch (err) {
        console.error('Failed to handle call answer', err);
      }
    };

    const onIce = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (candidate) void addIceCandidate(candidate);
    };

    const onEnded = () => cleanup();

    socket.on('incoming_call', onIncoming);
    socket.on('call_accepted', onAccepted);
    socket.on('ice_candidate', onIce);
    socket.on('call_ended', onEnded);

    return () => {
      socket.off('incoming_call', onIncoming);
      socket.off('call_accepted', onAccepted);
      socket.off('ice_candidate', onIce);
      socket.off('call_ended', onEnded);
    };
  }, [socketRef, cleanup, addIceCandidate, flushPendingCandidates, updateCall]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMuted((m) => !m);
  };

  const toggleVideo = () => {
    if (call.mode !== 'video') return;
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setVideoOff((v) => !v);
  };

  return {
    localStream,
    remoteStream,
    call,
    muted,
    videoOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
