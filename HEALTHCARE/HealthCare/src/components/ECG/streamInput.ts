export function parseStreamInput(text: string): { packets: number; values?: number[]; bpm?: number } {
  if (text.length > 12000) throw new Error('Input is too long. Paste one loop or a JSON packet.');
  if (text.trim().startsWith('{')) {
    const data = JSON.parse(text);
    const packets = data.packets ?? 300;
    if (!Number.isInteger(packets) || packets < 1 || packets > 3600) throw new Error('Choose between 1 and 3600 packets.');
    if (!Array.isArray(data.values) || data.values.length !== 10 || !data.values.every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e7)) throw new Error('Provide exactly 10 numeric waveform values.');
    if (typeof data.bpm !== 'number' || !Number.isFinite(data.bpm) || data.bpm < 20 || data.bpm > 250) throw new Error('BPM must be between 20 and 250.');
    return { packets, values: data.values, bpm: data.bpm };
  }
  // Recognize the user's fixed generator, never evaluate or execute shell text.
  const count = /for\s+i\s+in\s+\{1\.\.(\d+)\}/.exec(text);
  if (!count || !/RANDOM\s*%\s*40\s*\+\s*60/.test(text) || !/jot\s+-r\s+10\s+80\s+120/.test(text)) throw new Error('Paste the supported RANDOM/jot loop, or use the JSON example. Shell commands are not executed.');
  const packets = Number(count[1]);
  if (packets < 1 || packets > 3600) throw new Error('Choose between 1 and 3600 packets.');
  return { packets };
}
