import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { CallState } from '../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function useWebRTC(socketRef: React.RefObject<Socket | null>) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteIdRef = useRef<string | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [call, setCall] = useState<CallState>({
    status: 'idle',
    remoteUserId: null,
    remoteUsername: null,
  });
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const cleanup = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteIdRef.current = null;
    pendingOfferRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setVideoOff(false);
    setCall({ status: 'idle', remoteUserId: null, remoteUsername: null });
  }, []);

  const setupPeer = useCallback((stream: MediaStream) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && remoteIdRef.current) {
        socketRef.current?.emit('ice_candidate', {
          to: remoteIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    peerRef.current = peer;
    return peer;
  }, [socketRef]);

  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const startCall = useCallback(
    async (targetId: string, targetName: string) => {
      try {
        remoteIdRef.current = targetId;
        setCall({ status: 'calling', remoteUserId: targetId, remoteUsername: targetName });

        const stream = await getMedia();
        const peer = setupPeer(stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current?.emit('call_user', { targetId, signal: offer });
      } catch {
        cleanup();
        alert('Could not access camera/microphone. Please allow permissions.');
      }
    },
    [getMedia, setupPeer, socketRef, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const remoteId = remoteIdRef.current;
    const offer = pendingOfferRef.current;
    if (!remoteId || !offer) return;

    try {
      const stream = await getMedia();
      const peer = setupPeer(stream);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketRef.current?.emit('answer_call', { to: remoteId, signal: answer });
      setCall((c) => ({ ...c, status: 'active' }));
    } catch {
      cleanup();
      alert('Could not access camera/microphone.');
    }
  }, [getMedia, setupPeer, socketRef, cleanup]);

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
    }: {
      from: string;
      username: string;
      signal: RTCSessionDescriptionInit;
    }) => {
      if (call.status !== 'idle') {
        socket.emit('end_call', { to: from });
        return;
      }
      remoteIdRef.current = from;
      pendingOfferRef.current = signal;
      setCall({ status: 'incoming', remoteUserId: from, remoteUsername: username });
    };

    const onAccepted = async ({ signal }: { signal: RTCSessionDescriptionInit }) => {
      const peer = peerRef.current;
      if (!peer) return;
      await peer.setRemoteDescription(new RTCSessionDescription(signal));
      setCall((c) => ({ ...c, status: 'active' }));
    };

    const onIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const peer = peerRef.current;
      if (peer && candidate) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          /* ignore late candidates */
        }
      }
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
  }, [socketRef, call.status, cleanup]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMuted((m) => !m);
  };

  const toggleVideo = () => {
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
