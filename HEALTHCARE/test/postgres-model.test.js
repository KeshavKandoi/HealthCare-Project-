import test from 'node:test';
import assert from 'node:assert/strict';

const testUrl = process.env.PG_TEST_DATABASE_URL;
const localOnly = testUrl && ['localhost', '127.0.0.1', '::1'].includes(new URL(testUrl).hostname);

test('PostgreSQL stores users, doctors, appointments, health and ECG records', { skip: !localOnly }, async () => {
  process.env.DATABASE_URL = testUrl;
  const [{ default: User }, { default: Doctor }, { default: Appointment }, { default: Health }, { default: ECG }, { getPool }] = await Promise.all([
    import('../models/UserModels.js'),
    import('../models/doctorModel.js'),
    import('../models/appointmentsModel.js'),
    import('../models/healthModel.js'),
    import('../models/ecgModel.js'),
    import('../config/db.js'),
  ]);
  const pool = getPool();
  const created = [];
  try {
    const user = await new User({ name: 'Test Patient', email: `patient-${Date.now()}@example.invalid`, password: 'hashed' }).save();
    created.push(['app_users', user._id]);
    const doctor = await new Doctor({ name: 'Test Doctor', email: `doctor-${Date.now()}@example.invalid` }).save();
    created.push(['doctors', doctor._id]);
    assert.equal((await User.findOne({ email: user.email }))._id, user._id);
    const appointment = await new Appointment({ userId: user._id, doctorId: doctor._id, amount: '150', slotDate: '2026-11-01', slotTime: '10:00' }).save();
    created.push(['appointments', appointment._id]);
    const populated = await Appointment.find({ userId: user._id }).populate('userId', 'name email').populate('doctorId', 'name email');
    assert.equal(populated[0].userId.name, user.name);
    assert.equal(populated[0].doctorId.name, doctor.name);
    assert.equal((await Appointment.findByIdAndUpdate(appointment._id, { $set: { status: 'completed' } })).status, 'completed');
    const health = await Health.create({ userId: user._id, age: 30 });
    created.push(['health_records', health._id]);
    const ecg = await ECG.create({ patientId: user._id, values: [1, 2], bpm: 70 });
    created.push(['ecg_records', ecg._id]);
    assert.equal((await Health.find({ userId: user._id }).sort({ createdAt: -1 })).length, 1);
    assert.equal((await ECG.find({ patientId: user._id }).limit(100)).length, 1);
  } finally {
    for (const [table, id] of created.reverse()) await pool.query(`delete from ${table} where id = $1`, [id]);
    await pool.end();
  }
});
