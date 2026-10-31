import { useContext } from "react";
import { TrackContext, TTrackData } from "../providers/Track.provider";

/**
 * `track` with `chords` written over steps `start` to `end` (exclusive). Chords crossing an edge
 * of the range keep their part outside it.
 */
export const writeRange = <T extends TTrackData>(track: T[], start: number, end: number, chords: T[]) => {
    const outside = track.flatMap((data) => {
        const dataEnd = data.step + data.len;
        if (dataEnd <= start || data.step >= end) return [data];
        const parts: T[] = [];
        if (data.step < start) parts.push({ ...data, len: start - data.step });
        if (dataEnd > end) parts.push({ ...data, step: end, len: dataEnd - end });
        return parts;
    });
    return [...outside, ...chords].sort((a, b) => a.step - b.step);
};

export const useTrack = () => {
    const { trackData, setTrackData, undo, redo } = useContext(TrackContext);

    /** The chord sounding at `step`, whether it starts there or earlier. */
    const getChordAt = (step: number) =>
        trackData.find((data) => step >= data.step && step < data.step + data.len) ?? null;

    /** Places a new one-step chord at `step`, splitting a chord it lands in. */
    const handleChangeChord = (chord: string[], step: number, name: string | undefined) => {
        setTrackData(writeRange(trackData, step, step + 1, [{ step, len: 1, chord, name }]));
    };

    /** Moves the chord at `fromStep` to `toStep` with its length, splitting and replacing what it covers. */
    const handleMoveChord = (fromStep: number, toStep: number, totalSteps: number) => {
        const moved = trackData.find((data) => data.step === fromStep);
        if (!moved || fromStep === toStep) return;
        const end = Math.min(totalSteps, toStep + moved.len);
        setTrackData(
            writeRange(
                trackData.filter((data) => data !== moved),
                toStep,
                end,
                [{ ...moved, step: toStep, len: end - toStep }],
            ),
        );
    };

    /** Moves the edges of the chord at `fromStep`, splitting and replacing the chords it now covers. */
    const handleResizeChord = (fromStep: number, step: number, len: number, totalSteps: number) => {
        const resized = trackData.find((data) => data.step === fromStep);
        if (!resized) return;
        const start = Math.min(Math.max(step, 0), totalSteps - 1);
        const end = Math.min(Math.max(step + len, start + 1), totalSteps);
        setTrackData(
            writeRange(
                trackData.filter((data) => data !== resized),
                start,
                end,
                [{ ...resized, step: start, len: end - start }],
            ),
        );
    };

    const handleReplaceTrack = (track: TTrackData[]) => {
        setTrackData([...track].sort((a, b) => a.step - b.step));
    };

    /** Replaces the chords between `start` and `end` (exclusive) with `chords`, splitting chords crossing its edges. */
    const handleReplaceRange = (start: number, end: number, chords: TTrackData[]) => {
        setTrackData(writeRange(trackData, start, end, chords));
    };

    const handleDeleteChord = (step: number) => {
        setTrackData(trackData.filter((data) => data.step !== step));
    };

    /**
     * Keeps chords at the same musical position when the grid changes. Clears the undo history,
     * whose tracks were laid out for the old grid.
     */
    const handleRescale = (ratio: number, totalSteps: number) => {
        const rescaled: TTrackData[] = trackData
            .map((data) => ({
                ...data,
                step: Math.round(data.step * ratio),
                len: Math.max(1, Math.round(data.len * ratio)),
            }))
            .filter((data) => data.step < totalSteps)
            .map((data) => ({ ...data, len: Math.min(data.len, totalSteps - data.step) }));
        setTrackData(rescaled, { record: false });
    };

    return {
        trackData,
        getChordAt,
        handleChangeChord,
        handleMoveChord,
        handleResizeChord,
        handleReplaceTrack,
        handleReplaceRange,
        handleDeleteChord,
        handleRescale,
        undo,
        redo,
    };
};
