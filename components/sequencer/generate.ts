import { TTrackData } from "@/components/providers/Track.provider";
import { noteIndex } from "@/notes";

type TChordLibrary = Record<string, Record<string, string[]>>;

/** Semitones from the tonic and chord suffix for each degree of the major scale (I to vii°). */
const MAJOR_DEGREES = [
    { interval: 0, suffix: "" },
    { interval: 2, suffix: "m" },
    { interval: 4, suffix: "m" },
    { interval: 5, suffix: "" },
    { interval: 7, suffix: "" },
    { interval: 9, suffix: "m" },
    { interval: 11, suffix: "dim" },
];

/** Common pop and jazz progressions, as 0-based scale degrees. */
export const PROGRESSIONS = [
    [0, 4, 5, 3], // I–V–vi–IV
    [5, 3, 0, 4], // vi–IV–I–V
    [0, 5, 3, 4], // I–vi–IV–V
    [0, 3, 4, 3], // I–IV–V–IV
    [1, 4, 0, 0], // ii–V–I–I
    [0, 3, 0, 4], // I–IV–I–V
    [3, 0, 4, 5], // IV–I–V–vi
];

/** Finds `suffix` on the root `index` in the chord files, whose names use one of the file's spellings. */
const findChord = (library: TChordLibrary, index: number, suffix: string) => {
    for (const [file, chords] of Object.entries(library)) {
        const spellings = file.split("-");
        if (!spellings.some((spelling) => noteIndex(spelling) === index)) continue;
        for (const spelling of spellings) {
            const notes = chords[spelling + suffix];
            if (notes) return { name: spelling + suffix, notes };
        }
    }
    return null;
};

type TSegment = { step: number; len: number; measure: number };

/** Cuts steps `start` to `end` (exclusive) at the measure lines, so each part gets one chord. */
export const measureSegments = (start: number, end: number, nbrSteps: number) => {
    const segments: TSegment[] = [];
    for (let step = start; step < end; ) {
        const measure = Math.floor(step / nbrSteps);
        const next = Math.min(end, (measure + 1) * nbrSteps);
        segments.push({ step, len: next - step, measure });
        step = next;
    }
    return segments;
};

/**
 * Builds one chord per segment from the progression at `progressionIndex`, in the major key of
 * `tonic`. Each segment takes the progression's chord for its measure, so a partial range fits the
 * whole-track progression. The V chord becomes a dominant seventh when `withSeventh` is set.
 */
export const generateProgression = ({
    library,
    tonic,
    progressionIndex,
    segments,
    withSeventh,
}: {
    library: TChordLibrary;
    tonic: string;
    progressionIndex: number;
    segments: TSegment[];
    withSeventh: boolean;
}): TTrackData[] => {
    const progression = PROGRESSIONS[progressionIndex];
    const tonicIndex = noteIndex(tonic);

    return segments.flatMap(({ step, len, measure }) => {
        const degree = progression[measure % progression.length];
        const { interval, suffix } = MAJOR_DEGREES[degree];
        const chord = findChord(
            library,
            (tonicIndex + interval) % 12,
            degree === 4 && withSeventh ? "7" : suffix,
        );
        return chord ? [{ step, len, chord: chord.notes, name: chord.name }] : [];
    });
};
