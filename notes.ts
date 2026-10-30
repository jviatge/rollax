export const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const flatToSharp: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
};

/** Index of a note name (sharp or flat spelling) in `notes`, or -1. */
export const noteIndex = (note: string) => notes.indexOf(flatToSharp[note] ?? note);
