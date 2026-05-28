import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from './useSocket';
import useGameStore from '../store/useGameStore';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useAudio() {
  const [isMicOn, setIsMicOn] = useState(false);
  const [peerMuteStates, setPeerMuteStates] = useState({}); // { socketId: isMuted }

  const localStreamRef = useRef(null);
  // Map<peerId, RTCPeerConnection>
  const peerConnectionsRef = useRef(new Map());
  // Map<peerId, HTMLAudioElement>
  const audioElementsRef = useRef(new Map());
  // Map<peerId, RTCIceCandidate[]> - Buffer candidates until remoteDesc is set
  const pendingIceCandidatesRef = useRef(new Map());

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getOrCreatePC(peerId) {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId);
    }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerId, pc);
    console.log(`[Audio] PC created for peer: ${peerId}`);

    // Add local audio tracks if mic is active
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Remote audio
    pc.ontrack = (event) => {
      console.log(`[Audio] Remote track received from: ${peerId}`);
      if (!audioElementsRef.current.has(peerId)) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.volume = 1.0;
        
        // Ensure it is in the DOM (hidden) for some browsers
        let container = document.getElementById('audio-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'audio-container';
          container.style.display = 'none';
          document.body.appendChild(container);
        }
        container.appendChild(audio);

        audioElementsRef.current.set(peerId, audio);
      }
      const audio = audioElementsRef.current.get(peerId);
      
      // Dynamic fallback: construct a MediaStream if not provided by browser
      if (event.streams && event.streams[0]) {
        audio.srcObject = event.streams[0];
      } else {
        console.log(`[Audio] No stream found in ontrack, creating fallback stream for ${peerId}`);
        if (!audio.srcObject || !(audio.srcObject instanceof MediaStream)) {
          audio.srcObject = new MediaStream();
        }
        audio.srcObject.addTrack(event.track);
      }
      
      // Explicit play (handles some browser autoplay restrictions)
      audio.play().catch(e => {
        console.warn(`[Audio] Play blocked for ${peerId}:`, e.message);
      });
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket?.emit('WEBRTC_ICE_CANDIDATE', {
          targetId: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[Audio] ICE state for ${peerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        console.warn(`[Audio] Connection failed for ${peerId}, restarting...`);
        closePeer(peerId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Audio] Connection state for ${peerId}: ${pc.connectionState}`);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        closePeer(peerId);
      }
    };

    return pc;
  }

  function closePeer(peerId) {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    const audio = audioElementsRef.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove(); // Clean up from DOM
      audioElementsRef.current.delete(peerId);
    }
    pendingIceCandidatesRef.current.delete(peerId);
    console.log(`[Audio] Closed peer connection: ${peerId}`);
  }

  // ── Mic Management ─────────────────────────────────────────────────────────

  const enableMic = useCallback(async (isAuto = false) => {
    if (localStreamRef.current) {
      // Re-enable existing tracks instead of creating a new stream (prevents duplicate track errors)
      localStreamRef.current.getTracks().forEach((t) => {
        t.enabled = true;
      });
      setIsMicOn(true);
      getSocket()?.emit('AUDIO_MUTE_TOGGLE', { muted: false });
      return localStreamRef.current;
    }
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser context (requires HTTPS)');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      setIsMicOn(true);
      const socket = getSocket();
      socket?.emit('AUDIO_MUTE_TOGGLE', { muted: false });

      const selfId = useGameStore.getState().selfId;

      // Add tracks to all EXISTING PCs (only happens if mic starts manually)
      for (const [peerId, pc] of peerConnectionsRef.current) {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          if (!senders.find(s => s.track?.kind === track.kind)) {
            pc.addTrack(track, stream);
          }
        });
        
        // 🚥 GLARE PREVENTION: Only the initiator (lower ID) should re-offer
        if (selfId && selfId < peerId) {
          console.log(`[Audio] Initiating re-offer to ${peerId} after mic enable`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('WEBRTC_OFFER', { targetId: peerId, offer });
        }
      }
      return stream;
    } catch (err) {
      console.warn(`[Audio] Mic access denied (${isAuto ? 'Auto' : 'Manual'}):`, err.message);
      return null;
    }
  }, []);

  const disableMic = useCallback(() => {
    if (localStreamRef.current) {
      // Mute tracks (keeps connection alive without duplicate track negotiation errors)
      localStreamRef.current.getTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    setIsMicOn(false);
    getSocket()?.emit('AUDIO_MUTE_TOGGLE', { muted: true });
  }, []);

  const toggleMic = useCallback(async () => {
    if (isMicOn) disableMic();
    else await enableMic(false);
  }, [isMicOn, enableMic, disableMic]);

  // ── Socket Signaling Handlers ─────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Incoming offer → create answer
    const onOffer = async ({ fromId, offer }) => {
      console.log(`[WebRTC] Received offer from: ${fromId}`);
      const pc = getOrCreatePC(fromId);
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // 🎙️ AUTO-ACTIVATE: Ensure receiver mic is also on to send audio back
        const stream = await enableMic(true);
        if (stream) {
          const senders = pc.getSenders();
          stream.getTracks().forEach((track) => {
            if (!senders.find((s) => s.track?.kind === track.kind)) {
              pc.addTrack(track, stream);
            }
          });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('WEBRTC_ANSWER', { targetId: fromId, answer });

        // Process any buffered ICE candidates
        const buffered = pendingIceCandidatesRef.current.get(fromId) || [];
        for (const candidate of buffered) {
          await pc.addIceCandidate(candidate).catch(e => console.warn('[WebRTC] Buffered ICE fail', e));
        }
        pendingIceCandidatesRef.current.delete(fromId);

      } catch (err) {
        console.error(`[WebRTC] Offer error from ${fromId}:`, err);
      }
    };

    // Incoming answer
    const onAnswer = async ({ fromId, answer }) => {
      console.log(`[WebRTC] Received answer from: ${fromId}`);
      const pc = peerConnectionsRef.current.get(fromId);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          
          // Process any buffered ICE candidates
          const buffered = pendingIceCandidatesRef.current.get(fromId) || [];
          for (const candidate of buffered) {
            await pc.addIceCandidate(candidate).catch(e => console.warn('[WebRTC] Buffered ICE fail', e));
          }
          pendingIceCandidatesRef.current.delete(fromId);
        } catch (err) {
          console.error(`[WebRTC] Answer error from ${fromId}:`, err);
        }
      }
    };

    // Incoming ICE candidate
    const onIce = async ({ fromId, candidate }) => {
      const pc = peerConnectionsRef.current.get(fromId);
      const iceCandidate = new RTCIceCandidate(candidate);

      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(iceCandidate);
        } catch (e) {
          console.warn(`[WebRTC] Failed to add ICE candidate from ${fromId}:`, e);
        }
      } else {
        // Buffer until remote description is set
        console.log(`[WebRTC] Buffering ICE candidate from ${fromId}`);
        if (!pendingIceCandidatesRef.current.has(fromId)) {
          pendingIceCandidatesRef.current.set(fromId, []);
        }
        pendingIceCandidatesRef.current.get(fromId).push(iceCandidate);
      }
    };

    // Peer mute state update
    const onPeerMute = ({ socketId, muted }) => {
      setPeerMuteStates((prev) => ({ ...prev, [socketId]: muted }));
    };

    socket.on('WEBRTC_OFFER', onOffer);
    socket.on('WEBRTC_ANSWER', onAnswer);
    socket.on('WEBRTC_ICE_CANDIDATE', onIce);
    socket.on('PEER_MUTE_STATE', onPeerMute);

    // Proximity triggers: initiate WebRTC when entering proximity
    const onProximityStart = async ({ targetId }) => {
      const selfId = useGameStore.getState().selfId;
      // Lexicographically smaller ID is the initiator (prevents double-offers)
      if (!selfId || selfId >= targetId) return;

      const socket = getSocket();
      const pc = getOrCreatePC(targetId);

      // AUTO-ACTIVATE: Request/Ensure mic is on before offering
      const stream = await enableMic(true);
      if (stream) {
        const senders = pc.getSenders();
        stream.getTracks().forEach((t) => {
          if (!senders.find(s => s.track?.kind === t.kind)) {
            pc.addTrack(t, stream);
          }
        });
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('WEBRTC_OFFER', { targetId, offer });
      } catch (err) {
        console.warn('[WebRTC] Auto-offer failed:', err);
      }
    };

    const onProximityEnd = ({ targetId }) => {
      closePeer(targetId);
      setPeerMuteStates((prev) => {
        const n = { ...prev };
        delete n[targetId];
        return n;
      });
    };

    socket.on('PROXIMITY_START', onProximityStart);
    socket.on('PROXIMITY_END', onProximityEnd);

    return () => {
      socket.off('WEBRTC_OFFER', onOffer);
      socket.off('WEBRTC_ANSWER', onAnswer);
      socket.off('WEBRTC_ICE_CANDIDATE', onIce);
      socket.off('PEER_MUTE_STATE', onPeerMute);
      socket.off('PROXIMITY_START', onProximityStart);
      socket.off('PROXIMITY_END', onProximityEnd);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      for (const [id] of peerConnectionsRef.current) closePeer(id);
    };
  }, []);

  return { isMicOn, toggleMic, enableMic, disableMic, peerMuteStates };
}
