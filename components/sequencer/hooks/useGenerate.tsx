import { useTrack } from "@/components/hooks/useTrack";
import { useRef } from "react";
import { generateProgression, measureSegments, PROGRESSIONS } from "../generate";
import { useChord } from "./useChord";
import { useSequencer } from "./useSequencer";

/**
 * Generate actions: a random progression in the key, never the same one twice in a row, over the
 * whole track or only the selection.
 */
export const useGenerate = () => {
    const { nbrSteps, totalSteps, fundamentalNote, selectedArea, setSelectedStep } = useSequencer();
    const { ListChordsByNotes } = useChord();
    const { handleReplaceTrack, handleReplaceRange } = useTrack();
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

    /** Replaces the whole track and clears the selection. */
    const generateTrack = () => {
        handleReplaceTrack(progression(0, totalSteps));
        setSelectedStep(null);
    };

    /** Replaces only the selected steps, splitting the chords that cross its edges. */
    const generateSelection = () => {
        if (!selectedArea) return;
        handleReplaceRange(selectedArea.start, selectedArea.end, progression(selectedArea.start, selectedArea.end));
    };

    return { generateTrack, generateSelection };
};
