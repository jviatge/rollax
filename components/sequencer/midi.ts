import { TTrackData } from "@/components/providers/Track.provider";
import { noteIndex } from "@/notes";

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
 * Builds a single-track Standard MIDI File of the track, as it plays: every chord note in `octave`
 * (C4 is MIDI note 60), at `tempo`, in 4/4, and lasting the whole grid so a loop keeps its length.
 */
export const buildMidi = ({
    trackData,
    nbrSteps,
    totalSteps,
    tempo,
    octave,
}: {
    trackData: TTrackData[];
    nbrSteps: number;
    totalSteps: number;
    tempo: number;
    octave: number;
}) => {
    const stepTicks = (PPQ * 4) / nbrSteps;
    const events = trackData.flatMap((data) =>
        data.chord
            .filter((note) => noteIndex(note) >= 0)
            .map((note) => (octave + 1) * 12 + noteIndex(note))
            .flatMap((pitch) => [
                { tick: data.step * stepTicks, bytes: [0x90, pitch, VELOCITY] },
                { tick: (data.step + data.len) * stepTicks, bytes: [0x80, pitch, 0] },
            ]),
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
