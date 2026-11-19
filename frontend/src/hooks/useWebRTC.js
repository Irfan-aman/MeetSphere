import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../api/axios';

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
if (import.meta.env.VITE_TURN_URL) {
  ICE.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}

async function getLocalMedia() {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) return { stream: new MediaStream(), notice: 'This browser cannot access a camera or microphone (HTTPS is required).' };
  try {
    return { stream: await md.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }) };
  } catch {
    try {
      return { stream: await md.getUserMedia({ audio: true }), notice: 'Camera unavailable. You joined with audio only.' };
    } catch {
      return { stream: new MediaStream(), notice: 'Camera and microphone are blocked. You can still watch, listen and chat.' };
    }
  }
}

export default function useWebRTC({ roomId, token, initial }) {
  const socketRef = useRef(null);
  const pcs = useRef({}); // peerId -> RTCPeerConnection
  const remoteStreams = useRef({}); // peerId -> MediaStream
  const initiators = useRef({}); // peerId -> bool
  const pendingIce = useRef({});
  const localRef = useRef(null);
  const screenRef = useRef(null);
  const meRef = useRef({});

  const [status, setStatus] = useState('connecting'); // connecting | joined | error
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [previewStream, setPreviewStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [me, setMe] = useState({ id: null, mic: !!initial.mic, cam: !!initial.cam, hand: false, sharing: false });
  const [messages, setMessages] = useState([]);
  const [captionLines, setCaptionLines] = useState([]);
  const [interim, setInterim] = useState({});
  const [reactions, setReactions] = useState([]);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const emit = useCallback((evt, data) => socketRef.current?.emit(evt, data), []);

  const patchPeer = useCallback((id, patch) => setPeers((p) => (p[id] ? { ...p, [id]: { ...p[id], ...patch } } : p)), []);

  const makePc = useCallback(
    (peerId) => {
      if (pcs.current[peerId]) return pcs.current[peerId];
      const pc = new RTCPeerConnection({ iceServers: ICE });
      pcs.current[peerId] = pc;
      const local = localRef.current;
      for (const kind of ['audio', 'video']) {
        const track = local?.getTracks().find((t) => t.kind === kind);
        pc.addTransceiver(track || kind, { direction: 'sendrecv', streams: local ? [local] : [] });
      }
      const remote = (remoteStreams.current[peerId] ||= new MediaStream());
      pc.ontrack = (e) => {
        if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
        setPeers((p) => (p[peerId] ? { ...p, [peerId]: { ...p[peerId], stream: remote, v: (p[peerId].v || 0) + 1 } } : p));
      };
      pc.onicecandidate = (e) => e.candidate && emit('webrtc:ice-candidate', { to: peerId, candidate: e.candidate });
      pc.onconnectionstatechange = async () => {
        if (pc.connectionState === 'failed') {
          patchPeer(peerId, { unstable: true });
          if (initiators.current[peerId]) {
            try {
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              emit('webrtc:offer', { to: peerId, sdp: pc.localDescription });
            } catch {
              /* peer may have left */
            }
          }
        } else if (pc.connectionState === 'connected') patchPeer(peerId, { unstable: false });
      };
      return pc;
    },
    [emit, patchPeer]
  );

  const closePc = useCallback((peerId) => {
    pcs.current[peerId]?.close();
    delete pcs.current[peerId];
    delete remoteStreams.current[peerId];
    delete initiators.current[peerId];
    delete pendingIce.current[peerId];
    setPeers((p) => {
      const { [peerId]: _gone, ...rest } = p;
      return rest;
    });
  }, []);

  const flushIce = async (peerId, pc) => {
    for (const c of pendingIce.current[peerId] || []) await pc.addIceCandidate(c).catch(() => {});
    pendingIce.current[peerId] = [];
  };

  useEffect(() => {
    let cancelled = false;
    let socket;

    (async () => {
      const { stream, notice: n } = await getLocalMedia();
      if (cancelled) return stream.getTracks().forEach((t) => t.stop());
      if (n) setNotice(n);
      stream.getAudioTracks().forEach((t) => (t.enabled = !!initial.mic));
      stream.getVideoTracks().forEach((t) => (t.enabled = !!initial.cam));
      localRef.current = stream;
      setLocalStream(stream);
      setPreviewStream(stream);
      setHasVideo(stream.getVideoTracks().length > 0);
      setHasAudio(stream.getAudioTracks().length > 0);
      const mic = stream.getAudioTracks().length > 0 && !!initial.mic;
      const cam = stream.getVideoTracks().length > 0 && !!initial.cam;
      meRef.current = { mic, cam, hand: false, sharing: false };
      setMe((m) => ({ ...m, mic, cam }));

      socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'], reconnectionAttempts: 8 });
      socketRef.current = socket;

      const join = () =>
        socket.emit('room:join', { roomId, mic, cam }, async (res) => {
          if (res?.error) {
            setError(res.error);
            return setStatus('error');
          }
          // After a reconnect, rebuild every connection from scratch.
          Object.keys(pcs.current).forEach(closePc);
          setTitle(res.title || '');
          setMe((m) => ({ ...m, id: res.self.id, isHost: res.self.isHost }));
          const initial = {};
          res.peers.forEach((p) => (initial[p.id] = { ...p }));
          setPeers(initial);
          setStatus('joined');
          // The newcomer offers to everyone already in the room.
          for (const p of res.peers) {
            initiators.current[p.id] = true;
            const pc = makePc(p.id);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc:offer', { to: p.id, sdp: pc.localDescription });
          }
        });

      socket.on('connect', join);
      socket.on('connect_error', (e) => {
        if (e.message === 'Unauthorized') {
          setError('Your session expired. Please rejoin.');
          setStatus('error');
        }
      });
      socket.on('disconnect', () => setStatus((s) => (s === 'joined' ? 'connecting' : s)));

      socket.on('room:participant-joined', (p) => setPeers((prev) => ({ ...prev, [p.id]: { ...p } })));
      socket.on('room:participant-left', ({ id }) => closePc(id));
      socket.on('media:state', ({ id, ...s }) => patchPeer(id, s));

      socket.on('webrtc:offer', async ({ from, sdp }) => {
        const pc = makePc(from);
        await pc.setRemoteDescription(sdp);
        await flushIce(from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { to: from, sdp: pc.localDescription });
      });
      socket.on('webrtc:answer', async ({ from, sdp }) => {
        const pc = pcs.current[from];
        if (!pc) return;
        await pc.setRemoteDescription(sdp);
        await flushIce(from, pc);
      });
      socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
        const pc = pcs.current[from];
        if (!pc) return;
        if (pc.remoteDescription) await pc.addIceCandidate(candidate).catch(() => {});
        else (pendingIce.current[from] ||= []).push(candidate);
      });

      socket.on('chat:message', (m) => setMessages((l) => [...l.slice(-299), m]));
      socket.on('caption:line', (l) => {
        setCaptionLines((c) => [...c.slice(-99), l]);
        setInterim((i) => {
          const { [l.speakerId]: _x, ...rest } = i;
          return rest;
        });
      });
      socket.on('caption:interim', ({ speakerId, speaker, text }) => setInterim((i) => ({ ...i, [speakerId]: { speaker, text } })));
      socket.on('reaction', (r) => {
        setReactions((l) => [...l, r]);
        setTimeout(() => setReactions((l) => l.filter((x) => x.id !== r.id)), 3500);
      });
    })();

    return () => {
      cancelled = true;
      socket?.emit('room:leave');
      socket?.disconnect();
      Object.keys(pcs.current).forEach((id) => pcs.current[id].close());
      pcs.current = {};
      localRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  const push = (patch) => {
    meRef.current = { ...meRef.current, ...patch };
    setMe((m) => ({ ...m, ...patch }));
    emit('media:state', patch);
  };

  const toggleMic = () => {
    const t = localRef.current?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    push({ mic: t.enabled });
  };
  const toggleCam = () => {
    const t = localRef.current?.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    push({ cam: t.enabled });
  };
  const toggleHand = () => push({ hand: !meRef.current.hand });

  const setVideoTrack = async (track) => {
    for (const pc of Object.values(pcs.current)) {
      const tr = pc.getTransceivers().find((x) => x.receiver.track.kind === 'video');
      await tr?.sender.replaceTrack(track).catch(() => {});
    }
  };

  const stopShare = useCallback(async () => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    await setVideoTrack(localRef.current?.getVideoTracks()[0] || null);
    setPreviewStream(localRef.current);
    push({ sharing: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) return setNotice('Screen sharing is not supported on this device.');
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      screenRef.current = s;
      const track = s.getVideoTracks()[0];
      track.onended = stopShare;
      await setVideoTrack(track);
      setPreviewStream(s);
      push({ sharing: true });
    } catch (e) {
      if (e.name !== 'NotAllowedError') setNotice('Could not start screen sharing.');
    }
  };

  return {
    socketRef, status, error, notice, setNotice, title, me, peers, localStream, previewStream, hasVideo, hasAudio,
    messages, captionLines, interim, reactions,
    sendChat: (text) => emit('chat:message', { text }),
    sendReaction: (emoji) => emit('reaction', { emoji }),
    setLocalInterim: (text) => setInterim((i) => (text ? { ...i, me: { speaker: 'You', text } } : (({ me: _m, ...r }) => r)(i))),
    toggleMic, toggleCam, toggleHand,
    toggleShare: () => (screenRef.current ? stopShare() : startShare()),
  };
}
