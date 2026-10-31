import { TTrackData } from "@/components/providers/Track.provider";
import { noteIndex, notes } from "@/notes";
import { TChordLibrary } from "./generate";

/** Ticks per quarter note in the exported file. */
const PPQ = 480;
const VELOCITY = 100;

/** A MIDI variable-length quantity: 7 bits per byte, high bit set on all but the last. */
const varLen = (value: number) => {
    const bytes = [value & 0x7f];
    for (let rest = value >> 7; rest > 0; rest >>= 7) bytes.unshift((rest & 0x7f) | 0x80);
    return bytes;
};

const uint32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];

/**
 * Builds a single-track Standard MIDI File of the tracks as they play: each part's notes in its
 * octave (C4 is MIDI note 60), at `tempo`, in 4/4, and lasting the whole grid so a loop keeps its length.
 */
export const buildMidi = ({
    parts,
    nbrSteps,
    totalSteps,
    tempo,
}: {
    /** Each track with the octave its notes play in (the chords, and the bass lower). */
    parts: { data: TTrackData[]; octave: number }[];
    nbrSteps: number;
    totalSteps: number;
    tempo: number;
}) => {
    const stepTicks = (PPQ * 4) / nbrSteps;
    const events = parts.flatMap(({ data: track, octave }) =>
        track.flatMap((data) =>
            data.chord
                .filter((note) => noteIndex(note) >= 0)
                .map((note) => (octave + 1) * 12 + noteIndex(note))
                .flatMap((pitch) => [
                    { tick: data.step * stepTicks, bytes: [0x90, pitch, VELOCITY] },
                    { tick: (data.step + data.len) * stepTicks, bytes: [0x80, pitch, 0] },
                ]),
        ),
    );
    // Note offs go first on a shared tick, so a note repeated by the next chord sounds again.
    events.sort((a, b) => a.tick - b.tick || a.bytes[0] - b.bytes[0]);

    const microsPerQuarter = Math.round(60_000_000 / tempo);
    const name = [..."Rollax"].map((char) => char.charCodeAt(0));
    const body: number[] = [
        ...[0x00, 0xff, 0x03, name.length, ...name],
        ...[0x00, 0xff, 0x51, 0x03, (microsPerQuarter >> 16) & 0xff, (microsPerQuarter >> 8) & 0xff, microsPerQuarter & 0xff],
        ...[0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08],
    ];
    let lastTick = 0;
    for (const { tick, bytes } of events) {
        body.push(...varLen(tick - lastTick), ...bytes);
        lastTick = tick;
    }
    body.push(...varLen(Math.max(0, totalSteps * stepTicks - lastTick)), 0xff, 0x2f, 0x00);

    return new Uint8Array([
        ...[0x4d, 0x54, 0x68, 0x64, ...uint32(6), 0x00, 0x00, 0x00, 0x01, (PPQ >> 8) & 0xff, PPQ & 0xff],
        ...[0x4d, 0x54, 0x72, 0x6b, ...uint32(body.length), ...body],
    ]);
};

/** Saves `data` as `filename` through a temporary download link. */
export const downloadMidi = (data: Uint8Array<ArrayBuffer>, filename: string) => {
    const url = URL.createObjectURL(new Blob([data], { type: "audio/midi" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url));
};

type TMidiNote = { pitch: number; start: number; end: number };

/** Reads the notes, ticks per quarter note, and first tempo of a Standard MIDI File (format 0 or 1). */
export const parseMidi = (buffer: ArrayBuffer) => {
    const data = new Uint8Array(buffer);
    let pos = 0;
    const text = (length: number) => String.fromCharCode(...data.subarray(pos, (pos += length)));
    const read32 = () => ((data[pos++] << 24) | (data[pos++] << 16) | (data[pos++] << 8) | data[pos++]) >>> 0;
    const read16 = () => (data[pos++] << 8) | data[pos++];
    const readVarLen = () => {
        let value = 0;
        let byte;
        do {
            byte = data[pos++];
            value = (value << 7) | (byte & 0x7f);
        } while (byte & 0x80 && pos < data.length);
        return value;
    };

    if (text(4) !== "MThd") throw new Error("Not a MIDI file");
    const headerEnd = read32() + pos;
    read16();
    const trackCount = read16();
    const ppq = read16();
    if (ppq & 0x8000) throw new Error("SMPTE time division is not supported");
    pos = headerEnd;

    const notes: TMidiNote[] = [];
    let tempo: number | null = null;
    for (let track = 0; track < trackCount && pos < data.length; track++) {
        const id = text(4);
        const end = read32() + pos;
        if (id !== "MTrk") {
            pos = end;
            continue;
        }
        // Started notes by channel and pitch, oldest first, to pair each note off with its note on.
        const open = new Map<number, number[]>();
        let tick = 0;
        let status = 0;
        while (pos < end) {
            tick += readVarLen();
            // Running status: a data byte reuses the previous channel status.
            if (data[pos] & 0x80) status = data[pos++];
            const type = status & 0xf0;
            if (status === 0xff) {
                const metaType = data[pos++];
                const length = readVarLen();
                if (metaType === 0x51 && tempo === null) {
                    tempo = 60_000_000 / ((data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2]);
                }
                pos += length;
            } else if (status === 0xf0 || status === 0xf7) {
                pos += readVarLen();
            } else if (type === 0x90 || type === 0x80) {
                const pitch = data[pos++];
                const velocity = data[pos++];
                const key = ((status & 0x0f) << 7) | pitch;
                if (type === 0x90 && velocity > 0) {
                    open.set(key, [...(open.get(key) ?? []), tick]);
                } else {
                    const [start, ...rest] = open.get(key) ?? [];
                    if (start !== undefined) notes.push({ pitch, start, end: tick });
                    open.set(key, rest);
                }
            } else {
                // Program change and channel pressure carry one data byte; the other channel messages two.
                pos += type === 0xc0 || type === 0xd0 ? 1 : 2;
            }
        }
        pos = end;
    }
    return { notes, ppq, tempo };
};

/**
 * Turns MIDI notes into chords on a grid of `nbrSteps` steps per measure, at most `maxMeasures` long.
 * Notes are snapped to the steps; each run of steps sounding the same notes, without a new note
 * starting, becomes one chord, named from `library` when its notes match one of its chords.
 */
export const midiToTrack = ({
    notes: midiNotes,
    ppq,
    nbrSteps,
    maxMeasures,
    library,
}: {
    notes: TMidiNote[];
    ppq: number;
    nbrSteps: number;
    maxMeasures: number;
    library: TChordLibrary;
}) => {
    const stepTicks = (ppq * 4) / nbrSteps;
    const snapped = midiNotes.map((note) => {
        const start = Math.round(note.start / stepTicks);
        return { pitch: note.pitch, start, end: Math.max(start + 1, Math.round(note.end / stepTicks)) };
    });
    const lastStep = Math.max(0, ...snapped.map((note) => note.end));
    const nbrMeasures = Math.min(maxMeasures, Math.max(1, Math.ceil(lastStep / nbrSteps)));
    const totalSteps = nbrMeasures * nbrSteps;

    // The notes sounding on each step, lowest first, as pitch classes.
    const stepNotes = [...Array(totalSteps).keys()].map((step) => {
        const pitches = snapped
            .filter((note) => note.start <= step && note.end > step)
            .map((note) => note.pitch)
            .sort((a, b) => a - b);
        return [...new Set(pitches.map((pitch) => pitch % 12))];
    });
    const sameNotes = (a: number[], b: number[]) => a.length === b.length && a.every((pc, i) => pc === b[i]);
    const onsets = new Set(snapped.map((note) => note.start));

    const track: TTrackData[] = [];
    for (let step = 0; step < totalSteps; ) {
        let end = step + 1;
        while (end < totalSteps && !onsets.has(end) && sameNotes(stepNotes[end], stepNotes[step])) end++;
        if (stepNotes[step].length > 0) track.push({ step, len: end - step, ...nameChord(stepNotes[step], library) });
        step = end;
    }
    return { track, nbrMeasures };
};

/** The library chord with exactly these pitch classes, preferring one rooted on the lowest note. */
const nameChord = (pitchClasses: number[], library: TChordLibrary) => {
    const key = [...pitchClasses].sort((a, b) => a - b).join();
    const matches = Object.values(library)
        .flatMap((chords) => Object.entries(chords))
        .filter(([, chordNotes]) =>
            [...new Set(chordNotes.map(noteIndex))].sort((a, b) => a - b).join() === key,
        );
    const match = matches.find(([, chordNotes]) => noteIndex(chordNotes[0]) === pitchClasses[0]) ?? matches[0];
    return match ? { name: match[0], chord: match[1] } : { chord: pitchClasses.map((pc) => notes[pc]) };
};
