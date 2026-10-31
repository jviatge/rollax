import { useTrack, writeRange } from "@/components/hooks/useTrack";
import { TTrackData } from "@/components/providers/Track.provider";
import { useRef } from "react";
import { generateProgression, measureSegments, PROGRESSIONS } from "../generate";
import { useChord } from "./useChord";
import { useSequencer } from "./useSequencer";

/** A bass note on each chord's root, for the part of each chord between `start` and `end`. */
const bassFromChords = (chords: TTrackData[], start: number, end: number): TTrackData[] =>
    chords
        .filter((data) => data.chord.length > 0 && data.step < end && data.step + data.len > start)
        .map((data) => {
            const step = Math.max(start, data.step);
            const root = data.chord[0];
            return { step, len: Math.min(end, data.step + data.len) - step, chord: [root], name: root };
        });

/**
 * Generate actions: a random chord progression in the key, never the same one twice in a row, and a
 * bass line following the chords' roots, over the whole track or only the selection.
 */
export const useGenerate = () => {
    const { nbrSteps, totalSteps, fundamentalNote, selectedArea, selectedLane, setSelectedStep } = useSequencer();
    const { ListChordsByNotes } = useChord();
    const { setTracks } = useTrack();
    const lastProgressionRef = useRef<number | null>(null);

    const progression = (start: number, end: number) => {
        const choices = PROGRESSIONS.map((_, i) => i).filter((i) => i !== lastProgressionRef.current);
        const progressionIndex = choices[Math.floor(Math.random() * choices.length)];
        lastProgressionRef.current = progressionIndex;
        return generateProgression({
            library: ListChordsByNotes,
            tonic: fundamentalNote,
            progressionIndex,
            segments: measureSegments(start, end, nbrSteps),
            withSeventh: Math.random() < 0.3,
        });
    };

    /** Replaces the whole chord track and clears the selection; the bass is left as it is. */
    const generateTrack = () => {
        const chords = progression(0, totalSteps);
        setTracks((current) => ({ ...current, chords }));
        setSelectedStep(null);
    };

    /** Replaces the whole bass line with the roots of the current chords. */
    const generateBass = () => setTracks((current) => ({ ...current, bass: bassFromChords(current.chords, 0, totalSteps) }));

    /**
     * Fills the selection on its track: chords on the chord track, the chords' roots on the bass
     * track, and both when the selection covers every track.
     */
    const generateSelection = () => {
        if (!selectedArea) return;
        const { start, end } = selectedArea;
        // Picked outside the state update, which React may run twice.
        const generated = selectedLane === "bass" ? null : progression(start, end);
        setTracks((current) => {
            const chords = generated ? writeRange(current.chords, start, end, generated) : current.chords;
            const bass =
                selectedLane === "chords" ? current.bass : writeRange(current.bass, start, end, bassFromChords(chords, start, end));
            return { chords, bass };
        });
    };

    return { generateTrack, generateBass, generateSelection };
};
