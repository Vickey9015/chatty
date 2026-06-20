import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { unlockAppAudio } from '../lib/audioUnlock';
import { getRtcConfiguration, serializeIceCandidate } from '../lib/iceServers';
import { mergeRemoteTrack, snapshotStream } from '../lib/mediaStream';
import type { CallMode, CallState } from '../types';

export type ConnectionState = 'new' | 'connecting' | 'connected' | 'failed' | 'disconnected';

export function useWebRTC(
  socketRef: React.RefObject<Socket | null>,
  connected: boolean,
) {
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
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [connectionState, setConnectionState] = useState<ConnectionState>('new');

  const updateCall = useCallback((next: CallState | ((prev: CallState) => CallState)) => {
    setCall((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      callStatusRef.current = resolved.status;
      return resolved;
    });
  }, []);

  const setRemote = useCallback((stream: MediaStream | null) => {
    remoteStreamRef.current = stream;
    setRemoteStream(stream ? snapshotStream(stream) : null);
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
    facingModeRef.current = 'user';
    setFacingMode('user');
    setConnectionState('new');
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
      const peer = new RTCPeerConnection(getRtcConfiguration());

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.ontrack = (event) => {
        event.track.enabled = true;
        const merged = mergeRemoteTrack(remoteStreamRef.current, event);
        remoteStreamRef.current = merged;
        setRemoteStream(snapshotStream(merged));
      };

      peer.onicecandidate = (event) => {
        const candidate = serializeIceCandidate(event.candidate);
        if (candidate && remoteIdRef.current) {
          socketRef.current?.emit('ice_candidate', {
            to: remoteIdRef.current,
            candidate,
          });
        }
      };

      peer.oniceconnectionstatechange = () => {
        const state = peer.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          setConnectionState('connected');
        } else if (state === 'checking' || state === 'new') {
          setConnectionState('connecting');
        } else if (state === 'failed') {
          setConnectionState('failed');
          void peer.restartIce();
        } else if (state === 'disconnected') {
          setConnectionState('disconnected');
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed') {
          setConnectionState('failed');
          void peer.restartIce();
        }
      };

      peerRef.current = peer;
      return peer;
    },
    [socketRef],
  );

  const getMedia = useCallback(async (mode: CallMode, facing: 'user' | 'environment' = facingModeRef.current) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: mode === 'video' ? { facingMode: facing } : false,
      audio: true,
    });
    facingModeRef.current = facing;
    setFacingMode(facing);
    localStreamRef.current = stream;
    setLocalStream(stream);
    setVideoOff(false);
    return stream;
  }, []);

  const startCall = useCallback(
    async (targetId: string, targetName: string, mode: CallMode) => {
      try {
        unlockAppAudio();
        remoteIdRef.current = targetId;
        pendingCandidatesRef.current = [];
        setRemote(null);
        setConnectionState('connecting');
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
      unlockAppAudio();
      setRemote(null);
      setConnectionState('connecting');
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
    if (!connected) return;
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
      if (candidate?.candidate) void addIceCandidate(candidate);
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
  }, [connected, socketRef, cleanup, addIceCandidate, flushPendingCandidates, updateCall]);

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

  const switchCamera = useCallback(async () => {
    if (call.mode !== 'video') return;

    const peer = peerRef.current;
    const stream = localStreamRef.current;
    if (!peer || !stream) return;

    const oldVideoTrack = stream.getVideoTracks()[0];
    if (!oldVideoTrack) return;

    const nextFacing: 'user' | 'environment' =
      facingModeRef.current === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      newVideoTrack.enabled = oldVideoTrack.enabled;

      const sender = peer.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      stream.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
      stream.addTrack(newVideoTrack);
      newStream.getTracks().forEach((track) => {
        if (track !== newVideoTrack) track.stop();
      });

      facingModeRef.current = nextFacing;
      setFacingMode(nextFacing);
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch {
      alert('Could not switch camera. This device may only have one camera.');
    }
  }, [call.mode]);

  return {
    localStream,
    remoteStream,
    call,
    muted,
    videoOff,
    facingMode,
    connectionState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  };
}
