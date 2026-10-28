export type ISODateTime = string;
export type Identifier = string;

export interface PatientAccount {
  _id: Identifier;
  name: string;
  email: string;
  isAdmin?: boolean;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  user: PatientAccount;
}

export interface HealthProfile {
  patient_id: Identifier;
  dob: string | null;
  gender: string | null;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  notes: string | null;
  units: 'metric' | 'imperial';
  allergy_state: 'unknown' | 'none_confirmed' | 'recorded';
  updated_at: ISODateTime;
}

export interface MedicalEvent {
  id: Identifier;
  patient_id: Identifier;
  event_type: 'illness' | 'surgery' | 'condition' | 'hospital' | 'treatment' | 'other';
  title: string;
  occurred_on: string | null;
  description: string | null;
  source: 'patient' | 'clinician';
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface HealthMeasurement {
  id: Identifier;
  patient_id: Identifier;
  kind: 'heart_rate' | 'systolic_bp' | 'diastolic_bp' | 'blood_glucose' | 'oxygen' | 'weight';
  value: number;
  unit: string;
  measured_at: ISODateTime;
  source: 'patient' | 'device' | 'clinician';
}

export type AppointmentStatus = 'requested' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment {
  id: Identifier;
  patient_id: Identifier;
  doctor_id: Identifier;
  doctor_name?: string;
  start_at: ISODateTime;
  end_at: ISODateTime;
  status: AppointmentStatus;
  reason: string | null;
}

export interface HolterDevice {
  id: Identifier;
  is_simulated?: boolean;
  model: string | null;
  firmware_version: string | null;
  sample_rate_hz: number;
  units: 'raw' | 'mV';
  last_seen_at: ISODateTime | null;
  status: 'unpaired' | 'paired' | 'revoked';
}

export interface ECGBatch {
  sessionId: Identifier;
  deviceId: Identifier;
  sequence: number;
  firstSampleAt: ISODateTime;
  sampleRateHz: number;
  samples: number[];
  units: 'raw' | 'mV';
  receivedAt: ISODateTime;
}

export type RecordingStatus = 'created' | 'starting' | 'recording' | 'interrupted' | 'finalizing' | 'completed' | 'failed';

export interface RecordingSession {
  id: Identifier;
  is_simulated?: boolean;
  patient_id: Identifier;
  device_id: Identifier;
  status: RecordingStatus;
  started_at: ISODateTime;
  ended_at: ISODateTime | null;
  sample_count: number;
  sample_rate_hz: number;
  units: 'raw' | 'mV';
  target_hours?: 24 | 72;
}
