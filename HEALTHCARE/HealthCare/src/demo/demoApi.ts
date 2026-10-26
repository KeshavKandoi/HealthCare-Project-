import axios from 'axios';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { Appointment, HolterDevice, RecordingSession } from '../types/domain';

const DATA_KEY = 'heartline.patientDemo.data';
const doctorId = 'demo-doctor-1';
const deviceId = 'demo-device-1';
const patientId = 'demo-patient';

type DemoUser = { _id: string; name: string; email: string; phone?: string; gender?: string; address?: string; image?: string };
type DemoRecord = Record<string, unknown> & { id: string };
type DemoAppointment = Appointment & { doctor_name: string; summary?: string | null };
type DemoChunk = { sequence: number; first_sample_at: string; sample_count: number; samples: number[]; sha256: string };
type DemoState = {
  user: DemoUser;
  profile: Record<string, unknown>;
  contact: Record<string, unknown>;
  preferences: Record<string, unknown>;
  events: DemoRecord[];
  medications: DemoRecord[];
  allergies: DemoRecord[];
  measurements: DemoRecord[];
  appointments: DemoAppointment[];
  hospitalRequests: DemoRecord[];
  planInquiries: DemoRecord[];
  devices: HolterDevice[];
  sessions: RecordingSession[];
  chunks: Record<string, DemoChunk[]>;
  notes: Record<string, DemoRecord[]>;
  rules: DemoRecord[];
  markers: Record<string, DemoRecord[]>;
  annotations: Record<string, DemoRecord[]>;
  reviews: Record<string, DemoRecord[]>;
  plans: DemoRecord[];
  caregivers: DemoRecord[];
  supportRequests: DemoRecord[];
  bpSettings: { enabled: boolean; systolic_limit: number | null; diastolic_limit: number | null };
  bpAlerts: DemoRecord[];
  careMessages: Record<string, DemoRecord[]>;
  careCalls: Record<string, DemoRecord[]>;
};

function sampleWaveform(): number[] {
  return Array.from({ length: 600 }, (_, index) => {
    const beat = index % 75;
    const spike = beat === 30 ? -0.4 : beat === 31 ? 1.8 : beat === 32 ? -0.6 : beat > 45 && beat < 55 ? 0.2 : 0;
    return Number((Math.sin(index / 13) * 0.035 + spike).toFixed(3));
  });
}

function seedState(): DemoState {
  const now = Date.now();
  const iso = (offset: number) => new Date(now + offset).toISOString();
  const recordingId = 'demo-recording-1';
  const samples = sampleWaveform();
  return {
    user: { _id: patientId, name: 'Demo Patient', email: 'demo@example.invalid', phone: '0000000000', gender: 'Not specified', address: 'Sample address' },
    profile: { patient_id: patientId, dob: null, gender: null, blood_group: null, height_cm: null, weight_kg: null, notes: 'Sample profile. No clinical data is stored.', units: 'metric', allergy_state: 'unknown', updated_at: iso(0) },
    contact: { name: null, relationship: null, email: null, notes: null },
    preferences: { default_days: 30, notify_appointments: false, export_format: 'json' },
    events: [{ id: 'demo-event-1', patient_id: patientId, event_type: 'other', title: 'Sample medical history entry', occurred_on: iso(-45 * 86400000).slice(0, 10), description: 'Illustrative entry only', source: 'patient', created_at: iso(-45 * 86400000), updated_at: iso(-45 * 86400000) }],
    medications: [{ id: 'demo-med-1', patient_id: patientId, name: 'Sample medication', dosage: 'Example only', frequency: 'Not prescribed', start_date: null, end_date: null, status: 'active', prescriber: null, notes: 'Not a real prescription', created_at: iso(-10 * 86400000), updated_at: iso(-10 * 86400000) }],
    allergies: [],
    measurements: [...[7, 5, 3, 1, 0].map((days, index) => ({ id: `demo-measurement-${index}`, patient_id: patientId, kind: 'heart_rate', value: 69 + index % 4, unit: 'bpm', measured_at: iso(-days * 86400000), source: 'demo', created_at: iso(-days * 86400000) })), { id: 'demo-bp-systolic', patient_id: patientId, kind: 'systolic_bp', value: 118, unit: 'mmHg', measured_at: iso(-86400000), source: 'demo', created_at: iso(-86400000) }, { id: 'demo-bp-diastolic', patient_id: patientId, kind: 'diastolic_bp', value: 76, unit: 'mmHg', measured_at: iso(-86400000), source: 'demo', created_at: iso(-86400000) }],
    hospitalRequests: [],
    planInquiries: [],
    appointments: [{ id: 'demo-appointment-1', patient_id: patientId, doctor_id: doctorId, doctor_name: 'Dr. Mira Sen (demo)', start_at: iso(3 * 86400000), end_at: iso(3 * 86400000 + 30 * 60000), status: 'confirmed', reason: 'Sample consultation', summary: null }],
    devices: [{ id: deviceId, model: 'Heartline sample Holter', firmware_version: 'demo', sample_rate_hz: 250, units: 'mV', last_seen_at: iso(0), status: 'paired' }],
    sessions: [{ id: recordingId, patient_id: patientId, device_id: deviceId, status: 'completed', started_at: iso(-86400000), ended_at: iso(-86400000 + 30000), sample_count: samples.length, sample_rate_hz: 250, units: 'mV', target_hours: 24 }],
    chunks: { [recordingId]: [{ sequence: 0, first_sample_at: iso(-86400000), sample_count: samples.length, samples, sha256: 'demo-sample-only' }] },
    notes: { [recordingId]: [] },
    rules: [{ id: 'demo-rule-1', weekday: 1, start_minute: 540, end_minute: 1020, duration_minutes: 30 }],
    markers: { [recordingId]: [{ id: 'demo-marker-1', session_id: recordingId, patient_id: patientId, symptom: 'palpitations', marked_at: iso(-86400000 + 1000), note: 'Sample marker', created_at: iso(-86400000 + 1000) }] },
    annotations: { [recordingId]: [] },
    reviews: { [recordingId]: [] },
    plans: [{ id: 'demo-plan-1', patient_id: patientId, doctor_id: doctorId, doctor_name: 'Dr. Mira Sen (demo)', device_id: deviceId, target_hours: 24, starts_at: iso(-2 * 86400000), review_due_at: iso(5 * 86400000), instructions: 'Wear the sample Holter during your scheduled study. Mark dizziness, palpitations, or breathlessness when they occur.', symptoms: ['dizziness', 'palpitations', 'breathlessness'], status: 'active', recorded_hours: 0.1, created_at: iso(-2 * 86400000) }],
    caregivers: [],
    supportRequests: [],
    bpSettings: { enabled: false, systolic_limit: null, diastolic_limit: null },
    bpAlerts: [],
    careMessages: { 'demo-appointment-1': [{ id: 'demo-message-1', appointment_id: 'demo-appointment-1', sender_user_id: 'demo-doctor-user', body: 'Your sample appointment is confirmed. Bring any recent blood pressure readings.', created_at: iso(-3600000) }] },
    careCalls: { 'demo-appointment-1': [] },
  };
}

export function resetDemoData(): void {
  memoryState = null;
  try { sessionStorage.removeItem(DATA_KEY); } catch { /* session memory unavailable */ }
}

let memoryState: DemoState | null = null;
function state(): DemoState {
  if (memoryState) return memoryState;
  try {
    const stored = sessionStorage.getItem(DATA_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && 'appointments' in parsed && 'user' in parsed) {
        const existing = parsed as Partial<DemoState>;
        memoryState = { ...seedState(), ...existing, markers: existing.markers || {}, annotations: existing.annotations || {}, reviews: existing.reviews || {}, plans: existing.plans || [], caregivers: existing.caregivers || [], supportRequests: existing.supportRequests || [], bpSettings: existing.bpSettings || seedState().bpSettings, bpAlerts: existing.bpAlerts || [], careMessages: existing.careMessages || seedState().careMessages, careCalls: existing.careCalls || {}, hospitalRequests: existing.hospitalRequests || [], planInquiries: existing.planInquiries || [] } as DemoState;
        return memoryState;
      }
    }
  } catch { /* start with fresh sample data */ }
  memoryState = seedState();
  return memoryState;
}
function save(data: DemoState): void {
  memoryState = data;
  try { sessionStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch { /* in-memory demo still works */ }
}
function payload(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string') {
    try { return JSON.parse(config.data) as Record<string, unknown>; } catch { return {}; }
  }
  if (config.data instanceof FormData) return Object.fromEntries(config.data.entries());
  return config.data && typeof config.data === 'object' ? config.data as Record<string, unknown> : {};
}
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: status === 200 ? 'OK' : 'Created', headers: {}, config };
}
function fail(config: InternalAxiosRequestConfig, message: string, status = 400): never {
  const result = response(config, { message }, status);
  throw new axios.AxiosError(message, 'ERR_BAD_REQUEST', config, undefined, result);
}
function nextId(): string { return `demo-${crypto.randomUUID()}`; }
function doctor() {
  return { _id: doctorId, id: doctorId, doctor_id: doctorId, name: 'Dr. Mira Sen (demo)', speciality: 'Cardiology', specialty: 'Cardiology', degree: 'Sample profile', experience: 'Demo', fees: 0, available: true, location: 'Demo clinic', description: 'Fictional clinician for interface exploration.', about: 'Fictional clinician for interface exploration.', demo_only: true, image: null };
}
function legacyAppointment(appointment: DemoAppointment) {
  const start = new Date(appointment.start_at);
  return { _id: appointment.id, userId: patientId, doctorId: appointment.doctor_id, status: appointment.status === 'requested' ? 'pending' : appointment.status, slotDate: start.toLocaleDateString('en-GB'), slotTime: start.toLocaleTimeString('en-IN'), amount: '0' };
}

export const demoAdapter: AxiosAdapter = async config => {
  const data = state();
  const method = (config.method || 'get').toUpperCase();
  const url = new URL(config.url || '/', 'http://demo.invalid');
  const path = url.pathname.replace(/^\/api\/v1/, '');
  const body = payload(config);
  const send = (value: unknown, status = 200) => response(config, value, status);

  if (method === 'GET' && path === '/user/get-login-user/' + patientId) return send({ user: data.user });
  if (method === 'PATCH' && path === '/user/update/' + patientId) {
    for (const key of ['name', 'phone', 'gender', 'address']) if (typeof body[key] === 'string') (data.user as unknown as Record<string, unknown>)[key] = body[key];
    if (config.data instanceof FormData) {
      const image = config.data.get('image');
      if (image instanceof Blob) {
        if (!image.type.startsWith('image/') || image.size > 2_000_000) fail(config, 'Choose an image under 2 MB for the demo profile.');
        const bytes = new Uint8Array(await image.arrayBuffer());
        let binary = '';
        for (const byte of bytes) binary += String.fromCharCode(byte);
        data.user.image = `data:${image.type};base64,${btoa(binary)}`;
      }
    }
    save(data); return send({ user: data.user, success: true });
  }
  if (path.startsWith('/user/update-password/')) fail(config, 'The demo has no password. Exit demo to manage a real account.', 409);
  if (method === 'GET' && path === '/my-health/overview') return send({ account: { name: data.user.name, email: data.user.email }, profile: data.profile, contact: data.contact, preferences: data.preferences, events: data.events, medications: data.medications, allergies: data.allergies, measurements: data.measurements });
  if (method === 'GET' && path === '/my-health/export') {
    const exported = { profile: data.profile, contact: data.contact, events: data.events, medications: data.medications, allergies: data.allergies, measurements: data.measurements };
    return send(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
  }
  if (method === 'PUT' && ['/my-health/profile', '/my-health/contact', '/my-health/preferences'].includes(path)) {
    const key = path.split('/')[2] as 'profile' | 'contact' | 'preferences';
    data[key] = { ...data[key], ...body, updated_at: new Date().toISOString() };
    save(data); return send({ [key]: data[key] });
  }
  const healthMatch = /^\/my-health\/(events|medications|allergies|measurements)(?:\/([^/]+))?$/.exec(path);
  if (healthMatch) {
    const key = healthMatch[1] as 'events' | 'medications' | 'allergies' | 'measurements';
    const id = healthMatch[2];
    if (method === 'GET') return send({ items: data[key] });
    if (method === 'POST') {
      const item: DemoRecord = { ...body, id: nextId(), patient_id: patientId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      data[key].unshift(item); save(data); return send({ item }, 201);
    }
    if (method === 'PATCH' && id) {
      const item = data[key].find(record => record.id === id); if (!item) fail(config, 'Demo record not found', 404);
      Object.assign(item, body, { updated_at: new Date().toISOString() }); save(data); return send({ item });
    }
    if (method === 'DELETE' && id) { data[key] = data[key].filter(item => item.id !== id); save(data); return send({ success: true }); }
  }

  if (method === 'GET' && path === '/care-communications/conversations') return send({ conversations: data.appointments.filter(item => ['confirmed', 'completed'].includes(item.status)).map(item => ({ appointment_id: item.id, doctor_name: item.doctor_name, patient_name: data.user.name, status: item.status, start_at: item.start_at, end_at: item.end_at, message_count: (data.careMessages[item.id] || []).length, last_message_at: (data.careMessages[item.id] || []).at(-1)?.created_at || null })) });
  const careMessageMatch = /^\/care-communications\/appointments\/([^/]+)\/messages$/.exec(path);
  if (careMessageMatch) {
    const id = careMessageMatch[1];
    if (method === 'GET') return send({ messages: data.careMessages[id] || [] });
    if (method === 'POST') { const message: DemoRecord = { id: nextId(), appointment_id: id, sender_user_id: patientId, body: String(body.body || '').slice(0, 2000), created_at: new Date().toISOString() }; (data.careMessages[id] ||= []).push(message); save(data); return send({ message }, 201); }
  }
  const careCallsMatch = /^\/care-communications\/appointments\/([^/]+)\/calls$/.exec(path);
  if (careCallsMatch && method === 'GET') return send({ calls: data.careCalls[careCallsMatch[1]] || [] });
  if (careCallsMatch && method === 'POST') fail(config, 'Demo video does not connect to a real clinician.', 409);
  if (path.startsWith('/care-communications/calls/')) fail(config, 'Demo video does not connect to a real clinician.', 409);
  if (method === 'GET' && path === '/plan-inquiries/mine') return send({ inquiries: data.planInquiries });
  if (method === 'POST' && path === '/plan-inquiries') {
    const item: DemoRecord = { id: nextId(), plan_id: body.planId, contact_phone: body.contactPhone, note: body.note, status: 'sample request', created_at: new Date().toISOString() };
    data.planInquiries.unshift(item); save(data); return send({ inquiry: item }, 201);
  }
  if (method === 'GET' && path === '/hospital-requests/profiles') return send({ linked: [] });
  if (method === 'GET' && path === '/hospital-requests/mine') return send({ requests: data.hospitalRequests });
  if (method === 'POST' && path === '/hospital-requests') {
    const item: DemoRecord = { id: nextId(), profile_id: body.profileId, preferred_start_at: body.preferredStartAt, reason: body.reason || null, status: 'requested', appointment_id: null, created_at: new Date().toISOString() };
    data.hospitalRequests.unshift(item); save(data); return send({ request: item }, 201);
  }
  const hospitalCancel = /^\/hospital-requests\/([^/]+)\/cancel$/.exec(path);
  if (method === 'POST' && hospitalCancel) { const item = data.hospitalRequests.find(record => record.id === hospitalCancel[1]); if (!item) fail(config, 'Request unavailable', 404); item.status = 'cancelled'; save(data); return send({ request: item }); }
  if (method === 'GET' && path === '/scheduling/doctors') return send({ doctors: [{ doctor_id: doctorId, name: doctor().name, specialty: 'Cardiology', location: 'Demo clinic', description: doctor().description, demo_only: true }], external: [] });
  if (method === 'GET' && /^\/scheduling\/doctors\/[^/]+\/slots$/.test(path)) {
    const day = String(config.params?.date || url.searchParams.get('date') || new Date().toISOString().slice(0, 10));
    const slots = [4, 5, 6].map(hour => ({ startAt: new Date(`${day}T${String(hour).padStart(2, '0')}:30:00.000Z`).toISOString(), endAt: new Date(`${day}T${String(hour + 1).padStart(2, '0')}:00:00.000Z`).toISOString() }));
    return send({ slots });
  }
  if (method === 'GET' && path === '/scheduling/mine') return send({ appointments: data.appointments });
  if (method === 'POST' && path === '/scheduling/book') {
    const startAt = String(body.startAt || new Date().toISOString());
    const appointment: DemoAppointment = { id: nextId(), patient_id: patientId, doctor_id: String(body.doctorId || doctorId), doctor_name: doctor().name, start_at: startAt, end_at: new Date(Date.parse(startAt) + 30 * 60000).toISOString(), status: 'requested', reason: typeof body.reason === 'string' ? body.reason : null };
    data.appointments.unshift(appointment); save(data); return send({ appointment }, 201);
  }
  const cancelMatch = /^\/scheduling\/([^/]+)\/cancel$/.exec(path);
  if (method === 'POST' && cancelMatch) { const item = data.appointments.find(appointment => appointment.id === cancelMatch[1]); if (!item) fail(config, 'Demo appointment unavailable', 404); item.status = 'cancelled'; save(data); return send({ appointment: item }); }
  if (method === 'GET' && path === '/scheduling/doctor/schedule') return send({ rules: data.rules, exceptions: [] });
  if (method === 'GET' && path === '/scheduling/doctor/appointments') return send({ appointments: data.appointments.map(item => ({ ...item, patient_name: data.user.name })) });
  if (method === 'POST' && path === '/scheduling/doctor/rules') { const rule = { ...body, id: nextId(), start_minute: body.startMinute, end_minute: body.endMinute, duration_minutes: body.durationMinutes }; data.rules.push(rule); save(data); return send({ rule }, 201); }
  if (method === 'DELETE' && path.startsWith('/scheduling/doctor/rules/')) { data.rules = data.rules.filter(item => item.id !== path.split('/').at(-1)); save(data); return send({ success: true }); }
  const statusMatch = /^\/scheduling\/([^/]+)\/status$/.exec(path);
  if (method === 'PATCH' && statusMatch) { const item = data.appointments.find(appointment => appointment.id === statusMatch[1]); if (!item) fail(config, 'Demo appointment unavailable', 404); item.status = body.status as Appointment['status']; save(data); return send({ appointment: item }); }

  if (method === 'GET' && path === '/ecg/devices') return send({ devices: data.devices });
  if (method === 'POST' && path === '/ecg/pairing-challenges') { if (!data.devices.some(item => item.id === deviceId)) data.devices.push({ id: deviceId, model: 'Heartline sample Holter', firmware_version: 'demo', sample_rate_hz: 250, units: 'mV', last_seen_at: new Date().toISOString(), status: 'paired' }); save(data); return send({ code: '12345678', expiresAt: new Date(Date.now() + 300000).toISOString() }, 201); }
  if (method === 'DELETE' && path.startsWith('/ecg/devices/')) { data.devices = data.devices.filter(item => item.id !== path.split('/').at(-1)); save(data); return send({ success: true }); }
  if (method === 'GET' && path === '/ecg/sessions') return send({ sessions: data.sessions.map(item => ({ ...item, model: data.devices.find(device => device.id === item.device_id)?.model || 'Sample Holter' })) });
  if (method === 'GET' && path === '/ecg/demo-live') return send({ chunks: Object.values(data.chunks)[0] || [] });
  if (method === 'POST' && path === '/ecg/sessions') {
    const session: RecordingSession = { id: nextId(), patient_id: patientId, device_id: String(body.deviceId || deviceId), status: 'recording', started_at: new Date().toISOString(), ended_at: null, sample_count: 0, sample_rate_hz: 250, units: 'mV', target_hours: body.targetHours === 72 ? 72 : 24 };
    data.sessions.unshift(session); data.chunks[session.id] = []; data.notes[session.id] = []; data.markers[session.id] = []; data.annotations[session.id] = []; data.reviews[session.id] = []; save(data); return send({ id: session.id, status: 'recording' }, 201);
  }
  const stopMatch = /^\/ecg\/sessions\/([^/]+)\/stop$/.exec(path);
  if (method === 'POST' && stopMatch) { const item = data.sessions.find(session => session.id === stopMatch[1]); if (!item) fail(config, 'Demo session unavailable', 404); item.status = 'completed'; item.ended_at = new Date().toISOString(); save(data); return send({ session: item }); }
  const noteMatch = /^\/ecg\/sessions\/([^/]+)\/notes$/.exec(path);
  if (method === 'POST' && noteMatch) { const note: DemoRecord = { id: nextId(), note: String(body.note || ''), created_at: new Date().toISOString() }; (data.notes[noteMatch[1]] ||= []).push(note); save(data); return send({ note }, 201); }
  const downloadMatch = /^\/ecg\/sessions\/([^/]+)\/download$/.exec(path);
  if (method === 'GET' && downloadMatch) return send(new Blob([JSON.stringify({ sessionId: downloadMatch[1], chunks: data.chunks[downloadMatch[1]] || [] }, null, 2)], { type: 'application/json' }));
  const sessionMatch = /^\/ecg\/sessions\/([^/]+)$/.exec(path);
  if (method === 'GET' && sessionMatch) { const session = data.sessions.find(item => item.id === sessionMatch[1]); if (!session) fail(config, 'Demo session unavailable', 404); return send({ session, chunks: data.chunks[session.id] || [], notes: data.notes[session.id] || [] }); }

  if (method === 'GET' && path === '/doctor/get-all') return send({ doctors: [doctor()] });
  if (method === 'GET' && path.startsWith('/doctor/get-details/')) return send({ doctor: doctor() });
  if (method === 'GET' && path === '/appointment/get-user-appointments/' + patientId) return send({ appointment: data.appointments.map(legacyAppointment) });
  if (method === 'GET' && path.startsWith('/appointment/get-details/')) { const item = data.appointments.find(appointment => appointment.id === path.split('/').at(-1)); if (!item) fail(config, 'Demo appointment unavailable', 404); return send({ appointmentDetails: { clientName: data.user.name, doctorName: item.doctor_name, bookingDate: item.start_at.slice(0, 10), bookingTime: new Date(item.start_at).toLocaleTimeString(), bookingStatus: item.status, amount: '0' } }); }
  if (method === 'POST' && path === '/appointment/create') { const appointment: DemoAppointment = { id: nextId(), patient_id: patientId, doctor_id: doctorId, doctor_name: doctor().name, start_at: new Date().toISOString(), end_at: new Date(Date.now() + 1800000).toISOString(), status: 'requested', reason: null }; data.appointments.unshift(appointment); save(data); return send({ appointment }, 201); }
  if (method === 'POST' && path.startsWith('/appointment/cancel/')) { const item = data.appointments.find(appointment => appointment.id === path.split('/').at(-1)); if (!item) fail(config, 'Demo appointment unavailable', 404); item.status = 'cancelled'; save(data); return send({ appointment: item }); }
  if (method === 'POST' && path === '/webMessage/create') return send({ success: true, message: 'Demo message shown locally only' }, 201);
  if (method === 'POST' && path === '/ai-doctor/chat') return send({ reply: 'This is a demo response. No AI service was contacted. For health questions, consult a qualified clinician.' });

  const reportMatch = /^\/monitoring\/sessions\/([^/]+)\/report$/.exec(path);
  if (method === 'GET' && reportMatch) {
    const session = data.sessions.find(item => item.id === reportMatch[1]);
    if (!session) fail(config, 'Sample study unavailable', 404);
    const chunks = data.chunks[session.id] || [];
    const markers = (data.markers[session.id] || []).map(marker => {
      const marked = Date.parse(String(marker.marked_at));
      const chunk = chunks.find(item => marked >= Date.parse(item.first_sample_at) && marked < Date.parse(item.first_sample_at) + item.sample_count * 1000 / session.sample_rate_hz);
      return { ...marker, chunk_sequence: chunk?.sequence ?? null, sample_offset: chunk ? Math.floor((marked - Date.parse(chunk.first_sample_at)) * session.sample_rate_hz / 1000) : null };
    });
    const duration = Date.parse(session.ended_at || new Date().toISOString()) - Date.parse(session.started_at);
    const available = chunks.reduce((sum, chunk) => sum + chunk.sample_count * 1000 / session.sample_rate_hz, 0);
    return send({ report: { sessionId: session.id, status: session.status, startedAt: session.started_at, endedAt: session.ended_at, asOf: new Date().toISOString(), targetHours: session.target_hours || 24, actualDurationMs: duration, availableCoverageMs: available, availableCoveragePercent: duration ? Math.round(available / duration * 1000) / 10 : 0, qualityVerified: false, sampleCount: session.sample_count, receivedBatchCount: chunks.length, missingSequences: 0, deviceEvents: [], symptomMarkers: markers, verifiedMeasurements: [], interpretation: 'Sample technical report only. Clinical quality and interpretation are not assessed.' }, reviews: (data.reviews[session.id] || []).map(review => ({ ...review, doctor_name: doctor().name, signatureVerified: false })) });
  }
  const markerMatch = /^\/monitoring\/sessions\/([^/]+)\/markers$/.exec(path);
  if (method === 'POST' && markerMatch) {
    const marker = { id: String(body.clientId || nextId()), session_id: markerMatch[1], patient_id: patientId, symptom: String(body.symptom), marked_at: String(body.markedAt || new Date().toISOString()), note: null, created_at: new Date().toISOString() };
    const list = data.markers[markerMatch[1]] ||= [];
    const existing = list.find(item => item.id === marker.id);
    if (existing) return send({ marker: existing, duplicate: true });
    list.push(marker); save(data); return send({ marker }, 201);
  }
  if (method === 'GET' && path === '/monitoring/plans') return send({ plans: data.plans });
  if (method === 'GET' && path === '/monitoring/doctor/patients') return send({ patients: [{ id: patientId, name: data.user.name }] });
  if (method === 'GET' && path === `/monitoring/doctor/patients/${patientId}/sessions`) return send({ sessions: data.sessions });
  if (method === 'GET' && path === `/monitoring/doctor/patients/${patientId}/devices`) return send({ devices: data.devices });
  const doctorSessionMatch = /^\/monitoring\/doctor\/sessions\/([^/]+)(?:\/(annotations|reviews))?$/.exec(path);
  if (doctorSessionMatch) {
    const session = data.sessions.find(item => item.id === doctorSessionMatch[1]);
    if (!session) fail(config, 'Sample study unavailable', 404);
    if (method === 'GET' && !doctorSessionMatch[2]) {
      const reportResponse = await demoAdapter({ ...config, method: 'get', url: `/monitoring/sessions/${session.id}/report` });
      return send({ session, report: (reportResponse.data as { report: unknown }).report, chunks: data.chunks[session.id] || [], annotations: data.annotations[session.id] || [], reviews: data.reviews[session.id] || [] });
    }
    if (method === 'POST' && doctorSessionMatch[2] === 'annotations') { const annotation: DemoRecord = { id: nextId(), session_id: session.id, doctor_id: doctorId, at_time: body.atTime, observation: body.observation, needs_attention: !!body.needsAttention, created_at: new Date().toISOString() }; (data.annotations[session.id] ||= []).push(annotation); save(data); return send({ annotation }, 201); }
    if (method === 'POST' && doctorSessionMatch[2] === 'reviews') { const review: DemoRecord = { id: nextId(), session_id: session.id, doctor_id: doctorId, summary: body.summary, signed_at: new Date().toISOString(), signature: 'demo-only', released_at: new Date().toISOString() }; (data.reviews[session.id] ||= []).push(review); save(data); return send({ review }, 201); }
  }
  if (method === 'POST' && path === '/monitoring/doctor/plans') { const plan: DemoRecord = { ...body, id: nextId(), patient_id: patientId, doctor_id: doctorId, doctor_name: doctor().name, device_id: body.deviceId, target_hours: body.targetHours, starts_at: body.startsAt, review_due_at: body.reviewDueAt, instructions: body.instructions, symptoms: body.symptoms, status: 'active', recorded_hours: 0, created_at: new Date().toISOString() }; data.plans.unshift(plan); save(data); return send({ plan }, 201); }
  if (method === 'GET' && path === '/bp-alerts/settings') return send({ settings: data.bpSettings, alerts: data.bpAlerts, smsConfigured: false });
  if (method === 'PUT' && path === '/bp-alerts/settings') { data.bpSettings = { enabled: !!body.enabled, systolic_limit: body.systolicLimit == null ? null : Number(body.systolicLimit), diastolic_limit: body.diastolicLimit == null ? null : Number(body.diastolicLimit) }; save(data); return send({ settings: data.bpSettings }); }
  if (method === 'GET' && path === '/bp-alerts/caregiver/grants') return send({ grants: data.caregivers.filter(item => item.accepted_at && !item.revoked_at).map(item => ({ ...item, patient_name: data.user.name })), smsConfigured: false });
  if (path.startsWith('/bp-alerts/caregiver/grants/') && path.includes('/phone/')) fail(config, 'SMS is not connected in the demo.', 503);
  if (method === 'DELETE' && /^\/bp-alerts\/caregiver\/grants\/[^/]+\/phone$/.test(path)) return send({ removed: true });
  if (method === 'GET' && path === '/monitoring/caregivers') return send({ caregivers: data.caregivers });
  if (method === 'POST' && path === '/monitoring/caregivers') { const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''); const invitation: DemoRecord = { id: nextId(), invite_email: String(body.email), scopes: body.scopes, notify: !!body.notify, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), accepted_at: null, revoked_at: null, token, created_at: new Date().toISOString() }; data.caregivers.unshift(invitation); save(data); return send({ invitation, token }, 201); }
  if (method === 'POST' && path === '/monitoring/caregivers/accept') { const grant = data.caregivers.find(item => item.token === body.token && !item.revoked_at); if (!grant) fail(config, 'Sample invitation unavailable', 403); grant.accepted_at = new Date().toISOString(); save(data); return send({ grant: { ...grant, patient_id: patientId } }); }
  if (method === 'PATCH' && path.startsWith('/monitoring/caregivers/')) { const grant = data.caregivers.find(item => item.id === path.split('/').at(-1)); if (!grant) fail(config, 'Sample invitation unavailable', 404); grant.scopes = body.scopes; grant.notify = body.notify; save(data); return send({ grant }); }
  if (method === 'DELETE' && path.startsWith('/monitoring/caregivers/')) { const grant = data.caregivers.find(item => item.id === path.split('/').at(-1)); if (!grant) fail(config, 'Sample invitation unavailable', 404); grant.revoked_at = new Date().toISOString(); save(data); return send({ success: true }); }
  if (method === 'GET' && path === `/monitoring/caregiver/shared/${patientId}`) { const grant = data.caregivers.find(item => item.accepted_at && !item.revoked_at); if (!grant) fail(config, 'Sample caregiver access unavailable', 403); const scopes = grant.scopes as string[]; return send({ scopes, notify: grant.notify, ...(scopes.includes('overview') ? { overview: { name: data.user.name } } : {}), ...(scopes.includes('measurements') ? { measurements: data.measurements } : {}), ...(scopes.includes('appointments') ? { appointments: data.appointments } : {}), ...(scopes.includes('ecg_reports') ? { ecgReports: data.sessions } : {}) }); }
  const diagnosticsMatch = /^\/monitoring\/devices\/([^/]+)\/diagnostics$/.exec(path);
  if (method === 'GET' && diagnosticsMatch) { const device = data.devices.find(item => item.id === diagnosticsMatch[1]); if (!device) fail(config, 'Sample device unavailable', 404); return send({ device: { ...device, battery_percent: 86, queued_batches: 0, sync_failures: 0, reported_at: new Date().toISOString() }, history: [{ action: 'pair', created_at: new Date(Date.now() - 7 * 86400000).toISOString() }], telemetry: [{ reported_at: new Date().toISOString(), battery_percent: 86, queued_batches: 0, sync_failures: 0 }], supportRequests: data.supportRequests.filter(item => item.device_id === device.id) }); }
  const supportMatch = /^\/monitoring\/devices\/([^/]+)\/support$/.exec(path);
  if (method === 'POST' && supportMatch) { const request: DemoRecord = { id: nextId(), device_id: supportMatch[1], patient_id: patientId, request_type: String(body.requestType || 'support'), issue: String(body.issue), status: 'open', created_at: new Date().toISOString() }; data.supportRequests.unshift(request); save(data); return send({ request }, 201); }
  if (method === 'GET' && path === '/monitoring/export/fhir') { const bundle = { resourceType: 'Bundle', type: 'collection', timestamp: new Date().toISOString(), entry: [{ fullUrl: 'urn:uuid:00000000-0000-4000-8000-000000000001', resource: { resourceType: 'Patient', name: [{ text: data.user.name }] } }] }; return send(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/fhir+json' })); }

  return fail(config, `This action is not available in the demo: ${method} ${path}`, 404);
};
