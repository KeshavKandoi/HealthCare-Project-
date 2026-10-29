import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useSearchParams } from 'react-router-dom';
import { hospitalProfiles } from './Doctors/hospitalProfiles';
import API from '../Api/API';
import { isDemoSession } from '../demo/demoSession';
import './CareCommunications.css';

type Conversation = { appointment_id: string; doctor_name: string; patient_name: string; status: string; start_at: string; end_at: string; message_count: number; last_message_at: string | null };
type Message = { id: string; sender_user_id: string; body: string; created_at: string };
type Call = { id: string; initiated_by: string; status: string; started_at: string; connected_at: string | null; ended_at: string | null };
type Signal = { type: 'offer' | 'answer' | 'candidate'; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
const base = (import.meta.env.VITE_BASEURL || 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
const when = (value: string) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
function Avatar({name}:{name:string}){const image=hospitalProfiles.find(profile=>profile.name===name)?.image;return <span className="care-comms-avatar" aria-hidden="true">{image?<img src={image} alt=""/>:name.replace(/^Dr\.?\s*/,'').charAt(0)}</span>}

export default function CareCommunications() {
  const demo = isDemoSession();
  const [searchParams] = useSearchParams();
  const appointmentQuery = searchParams.get('appointment');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [tab, setTab] = useState<'chat' | 'calls'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState('');
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const signalSocket = useRef<Socket | null>(null);
  const currentUser = (() => { if (demo) return 'demo-patient'; try { return JSON.parse(localStorage.getItem('appData') || 'null')?.user?._id as string | undefined; } catch { return undefined; } })();
  const chosen = conversations.find(item => item.appointment_id === selected);
  const inCallWindow = chosen && Date.now() >= Date.parse(chosen.start_at) - 15 * 60000 && Date.now() <= Date.parse(chosen.end_at) + 30 * 60000 && chosen.status === 'confirmed';

  const loadConversations = useCallback(async () => {
    try { const { data } = await API.get('/care-communications/conversations'); setConversations(data.conversations); setSelected(old => old || data.conversations.find((item: Conversation) => item.appointment_id === appointmentQuery)?.appointment_id || data.conversations[0]?.appointment_id || ''); }
    catch { setError('Could not load conversations.'); }
  }, [appointmentQuery]);
  const loadHistory = useCallback(async (id: string) => {
    try {
      const [m, c] = await Promise.all([API.get(`/care-communications/appointments/${id}/messages`), API.get(`/care-communications/appointments/${id}/calls`)]);
      setMessages(m.data.messages); setCalls(c.data.calls);
    } catch { setError('Could not load chat or call history.'); }
  }, []);
  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => { if (!selected) return; void loadHistory(selected); const timer = window.setInterval(() => { void loadHistory(selected); }, 5000); return () => clearInterval(timer); }, [selected, loadHistory]);
  useEffect(() => { if (localVideo.current && stream.current) localVideo.current.srcObject = stream.current; }, [activeCall]);
  useEffect(() => () => { signalSocket.current?.disconnect(); peer.current?.close(); stream.current?.getTracks().forEach(track => track.stop()); }, []);

  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected || !draft.trim()) return; setBusy(true); setError('');
    try { await API.post(`/care-communications/appointments/${selected}/messages`, { body: draft.trim() }); setDraft(''); await loadHistory(selected); }
    catch { setError('Message could not be sent.'); } finally { setBusy(false); }
  };
  const closeMedia = () => { signalSocket.current?.disconnect(); signalSocket.current = null; peer.current?.close(); peer.current = null; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (remoteVideo.current) remoteVideo.current.srcObject = null; setActiveCall(null); setCallStatus(''); };
  const endCall = async () => { const id = activeCall?.id; closeMedia(); if (id && !demo) { try { await API.patch(`/care-communications/calls/${id}`, { status: 'completed' }); } catch { /* another participant ended */ } if (selected) void loadHistory(selected); } };
  const openCall = async (call: Call, initiator: boolean) => {
    if (!selected || demo) return; setError(''); setActiveCall(call); setCallStatus('Connecting camera…');
    try {
      const token = JSON.parse(localStorage.getItem('appData') || 'null')?.token;
      if (!token) throw new Error('Sign in required');
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); stream.current = media;
      if (localVideo.current) localVideo.current.srcObject = media;
      const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }); peer.current = connection;
      media.getTracks().forEach(track => connection.addTrack(track, media));
      connection.ontrack = event => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; };
      connection.onicecandidate = event => { if (event.candidate) signalSocket.current?.emit('care:signal', { callId: call.id, signal: { type: 'candidate', candidate: event.candidate.toJSON() } }); };
      connection.onconnectionstatechange = () => { setCallStatus(connection.connectionState === 'connected' ? 'Connected' : connection.connectionState); if (connection.connectionState === 'connected') void API.patch(`/care-communications/calls/${call.id}`, { status: 'connected' }).catch(() => {}); };
      const socket = io(base, { auth: { token } }); signalSocket.current = socket;
      const makeOffer = async () => { if (connection.signalingState !== 'stable') return; const offer = await connection.createOffer(); await connection.setLocalDescription(offer); socket.emit('care:signal', { callId: call.id, signal: { type: 'offer', sdp: offer } }); };
      socket.on('connect', () => { socket.emit('care:join', { appointmentId: selected, callId: call.id }, (result: { ok: boolean; message?: string }) => { if (!result.ok) { setError(result.message || 'Call unavailable'); closeMedia(); } else { setCallStatus('Waiting for the other person…'); if (!initiator) socket.emit('care:peer-joined'); } }); });
      socket.on('care:peer-joined', () => { if (initiator) void makeOffer().catch(() => setError('Could not start video.')); });
      socket.on('care:peer-left', () => setCallStatus('The other person left the call.'));
      socket.on('care:signal', async (signal: Signal) => {
        try {
          if (signal.type === 'offer' && signal.sdp) { await connection.setRemoteDescription(signal.sdp); const answer = await connection.createAnswer(); await connection.setLocalDescription(answer); socket.emit('care:signal', { callId: call.id, signal: { type: 'answer', sdp: answer } }); }
          if (signal.type === 'answer' && signal.sdp) await connection.setRemoteDescription(signal.sdp);
          if (signal.type === 'candidate' && signal.candidate) await connection.addIceCandidate(signal.candidate);
        } catch { setError('Video connection failed. Please end the call and try again.'); }
      });
      socket.on('connect_error', () => { setError('Could not connect to video signaling.'); closeMedia(); });
    } catch { setError('Camera or microphone unavailable. Allow access in your browser and try again.'); closeMedia(); }
  };
  const startCall = async () => {
    if (!selected || demo || !inCallWindow) return; setBusy(true); setError('');
    try { const { data } = await API.post(`/care-communications/appointments/${selected}/calls`); await loadHistory(selected); await openCall(data.call, true); }
    catch { setError('Could not start the video call. Check the appointment time.'); } finally { setBusy(false); }
  };
  const activeHistoryCall = calls.find(call => ['ringing', 'connected'].includes(call.status));
  return <main className="care-comms"><header><div><span>HEARTLINE CARE</span><h1>Messages</h1></div><p>Your appointment conversations and call history in one place.</p></header>
    {error && <p className="care-comms-error" role="alert">{error}</p>}
    <div className="care-comms-layout"><aside aria-label="Conversations"><div className="care-comms-aside-title"><h2>Conversations</h2><small>{conversations.length} chats</small></div>{conversations.length ? conversations.map(item => <button className={selected === item.appointment_id ? 'active' : ''} key={item.appointment_id} onClick={() => { setSelected(item.appointment_id); setTab('chat'); setMessages([]); setCalls([]); }}><Avatar name={item.doctor_name}/><span className="care-comms-preview"><strong>{item.doctor_name}</strong><small>{when(item.start_at)}</small><small>{item.message_count ? `${item.message_count} messages` : 'Start a conversation'}</small></span></button>) : <div className="care-comms-no-conversations"><p>No conversations yet.</p><a href="/doctors">Find a doctor →</a></div>}</aside>
      <div className="care-comms-main">{chosen ? <><div className="care-comms-toolbar"><Avatar name={chosen.doctor_name}/><div><h2>{chosen.doctor_name}</h2><p>{when(chosen.start_at)} · {chosen.status}</p></div><div className="care-comms-tabs"><button className={tab==='chat'?'active':''} onClick={()=>setTab('chat')}>Chat</button><button className={tab==='calls'?'active':''} onClick={()=>setTab('calls')}>Calls</button></div></div>
      {tab==='chat' ? <section className="care-chat" aria-label="Chat history"><div className="care-chat-list">{messages.length ? messages.map(message => <article key={message.id} className={message.sender_user_id === currentUser ? 'mine' : ''}><p>{message.body}</p><time dateTime={message.created_at}>{when(message.created_at)}</time></article>) : <div className="care-comms-empty"><strong>No messages yet</strong><p>Say hello or share a short question before your visit.</p></div>}</div><form onSubmit={send}><label className="sr-only" htmlFor="care-message">Write a message</label><input id="care-message" value={draft} maxLength={2000} onChange={event => setDraft(event.target.value)} placeholder="Type a message…" /><button className="hl-button" type="submit" disabled={busy || !draft.trim()} aria-label="Send message">Send <span aria-hidden="true">↗</span></button></form></section>
      : <section className="care-calls" aria-label="Call history"><div className="care-comms-section-head"><div><h2>Video appointments</h2><p>Calls open around your confirmed visit time.</p></div><button className="hl-button" disabled={busy || !!activeCall || !inCallWindow || demo} onClick={startCall}>Start video call</button></div>{demo && <p className="care-comms-empty">Demo calls are illustrative. Live video needs two signed-in participants.</p>}{!demo && !inCallWindow && <p className="care-comms-empty">Video opens 15 minutes before the visit and closes 30 minutes after it ends.</p>}{activeHistoryCall && !activeCall && !demo && <button className="hl-button hl-button--soft" onClick={() => void openCall(activeHistoryCall, false)}>Join active call</button>}{activeCall && <div className="care-video"><video ref={remoteVideo} autoPlay playsInline aria-label="Remote video" /><video ref={localVideo} autoPlay playsInline muted aria-label="Your video" /><p>{callStatus}</p><button className="hl-button hl-button--danger" onClick={() => void endCall()}>End call</button></div>}<h3>Call history</h3>{calls.length ? <ul>{calls.map(call => <li key={call.id}><span>{when(call.started_at)}</span><strong>{call.status}</strong><small>{call.connected_at && call.ended_at ? `${Math.max(0, Math.round((Date.parse(call.ended_at) - Date.parse(call.connected_at)) / 60000))} min` : 'No duration'}</small></li>)}</ul> : <p className="care-comms-empty">No calls for this appointment.</p>}</section>}</> : <section className="care-chat care-comms-unselected"><div className="care-comms-avatar" aria-hidden="true"><i className="fa-solid fa-comment" /></div><h2>Select a conversation</h2><p>Choose a confirmed appointment to see your messages and calls.</p></section>}</div></div>
  </main>;
}
