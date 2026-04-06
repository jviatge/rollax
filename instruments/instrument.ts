import * as Tone from "tone";

export type EventMidiPlayer = {
    track: number;
    delta: number;
    tick: number;
    byteIndex: number;
    name: string;
    channel: number;
    noteNumber: number;
    noteName: string;
    velocity: number;
};

export class Instrument {
    isPlaying: boolean = false;

    checkEventKey = (
        event: EventMidiPlayer,
        instrument: Tone.Sampler | Tone.Synth | null,
    ): { noteName: string; velocity: number } | null => {
        const isPlayableMidiEvent = (event: EventMidiPlayer) => {
            if (event.name !== "Note on") {
                return false;
            }
            if (event.velocity <= 0) {
                return false;
            }
            return /^[A-G](#|b)?-?\d+$/.test(event.noteName);
        };
        if (!isPlayableMidiEvent(event)) {
            return null;
        }
        const isValidNote = /^[A-G](#|b)?-?\d+$/.test(event.noteName);
        if (!instrument || !isValidNote) {
            return null;
        }
        const safeVelocity = Number.isFinite(event.velocity)
            ? Math.min(Math.max(event.velocity, 0), 1)
            : 0.8;
        return { ...event, velocity: safeVelocity };
    };
}
