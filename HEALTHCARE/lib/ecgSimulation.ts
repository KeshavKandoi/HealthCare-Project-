/** Resting synthetic scenario v1. ECG and BP are independently generated scenario outputs. */
export const simulationRate = 250;
export function scenarioVitals(seconds: number) {
  return { bpm: 72 + 3 * Math.sin(seconds / 30), systolic: 118 + 3 * Math.sin(seconds / 45), diastolic: 76 + 2 * Math.sin(seconds / 45) };
}
export function simulationSample(seconds: number) {
  // Integral of the scenario HR: phase remains continuous as the heart rate changes.
  const beats = 1.2 * seconds + 1.5 * (1 - Math.cos(seconds / 30));
  const phase = beats - Math.floor(beats);
  const gaussian = (center: number, width: number, amplitude: number) => amplitude * Math.exp(-0.5 * ((phase - center) / width) ** 2);
  return gaussian(.18,.025,.12) + gaussian(.365,.009,-.14) + gaussian(.4,.012,1) + gaussian(.435,.012,-.25) + gaussian(.68,.055,.28) + .015*Math.sin(seconds*2*Math.PI/5);
}
export function simulationPacket(sequence: number) {
  return Array.from({length: simulationRate}, (_, i) => simulationSample(sequence + i / simulationRate));
}
