import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTechnicalReport } from '../dist/lib/monitoringReport.js';

test('technical report uses interval coverage and links symptoms to original sample positions', () => {
  const started = '2026-10-26T10:00:00.000Z';
  const report = makeTechnicalReport(
    { id: 'study', patient_id: 'patient', device_id: 'device', status: 'completed', started_at: started, ended_at: '2026-10-26T10:00:10.000Z', target_hours: 24, sample_rate_hz: 10, sample_count: 50 },
    [
      { sequence: 0, first_sample_at: started, sample_count: 20 },
      { sequence: 1, first_sample_at: '2026-10-26T10:00:01.000Z', sample_count: 20 },
      { sequence: 3, first_sample_at: '2026-10-26T10:00:07.000Z', sample_count: 10 },
    ],
    [{ id: 'symptom', symptom: 'dizziness', marked_at: '2026-10-26T10:00:01.500Z' }, { id: 'pending', symptom: 'palpitations', marked_at: '2026-10-26T10:00:06.000Z' }],
    [{ event: 'disconnect' }], [],
  );
  assert.equal(report.actualDurationMs, 10000);
  assert.equal(report.availableCoverageMs, 4000);
  assert.equal(report.availableCoveragePercent, 40);
  assert.equal(report.missingSequences, 1);
  assert.equal(report.symptomMarkers[0].chunk_sequence, 0);
  assert.equal(report.symptomMarkers[0].sample_offset, 15);
  assert.equal(report.symptomMarkers[1].chunk_sequence, null);
  assert.equal(report.qualityVerified, false);
});
