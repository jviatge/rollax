export const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const flatToSharp: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
};

/**
 * The octave number shown in the UI for a Tone.js octave: middle C, C4 for Tone.js (MIDI note 60), is
 * shown as C3, as in Ableton.
 */
export const shownOctave = (octave: number) => octave - 1;

/** Index of a note name (sharp or flat spelling) in `notes`, or -1. */
export const noteIndex = (note: string) => notes.indexOf(flatToSharp[note] ?? note);
