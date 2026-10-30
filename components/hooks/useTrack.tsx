import { useContext } from "react";
import { TrackContext, TTrackData } from "../providers/Track.provider";

export const useTrack = () => {
    const { trackData, setTrackData, undo, redo } = useContext(TrackContext);

    /** The chord sounding at `step`, whether it starts there or earlier. */
    const getChordAt = (step: number) =>
        trackData.find((data) => step >= data.step && step < data.step + data.len) ?? null;

    /**
     * Puts `entry` on the grid, replacing a chord on the same step, shortening a previous
     * chord that would overlap it, and cutting it before the next chord or the grid end.
     */
    const placeChord = (entry: TTrackData, totalSteps: number, track: TTrackData[]) => {
        const others = track
            .filter((data) => data.step !== entry.step)
            .map((data) =>
                data.step < entry.step && data.step + data.len > entry.step
                    ? { ...data, len: entry.step - data.step }
                    : data,
            );
        const nextStep = Math.min(
            totalSteps,
            ...others.filter((data) => data.step > entry.step).map((data) => data.step),
        );
        const len = Math.max(1, Math.min(entry.len, nextStep - entry.step));

        setTrackData([...others, { ...entry, len }].sort((a, b) => a.step - b.step));
    };

    /** Places a new one-step chord at `step`. */
    const handleChangeChord = (chord: string[], step: number, name: string | undefined, totalSteps: number) => {
        placeChord({ step, len: 1, chord, name }, totalSteps, trackData);
    };

    const handleMoveChord = (fromStep: number, toStep: number, totalSteps: number) => {
        const moved = trackData.find((data) => data.step === fromStep);
        if (!moved || fromStep === toStep) return;
        placeChord(
            { ...moved, step: toStep },
            totalSteps,
            trackData.filter((data) => data.step !== fromStep),
        );
    };

    /** The free space around the chord at `step`: from the previous chord's end to the next chord's start. */
    const getChordBounds = (step: number, totalSteps: number) => ({
        min: Math.max(0, ...trackData.filter((data) => data.step < step).map((data) => data.step + data.len)),
        max: Math.min(totalSteps, ...trackData.filter((data) => data.step > step).map((data) => data.step)),
    });

    /** Moves the edges of the chord at `fromStep`, kept inside its free space. */
    const handleResizeChord = (fromStep: number, step: number, len: number, totalSteps: number) => {
        const { min, max } = getChordBounds(fromStep, totalSteps);
        const start = Math.min(Math.max(step, min), max - 1);
        const end = Math.min(Math.max(step + len, start + 1), max);
        setTrackData(
            trackData
                .map((data) => (data.step === fromStep ? { ...data, step: start, len: end - start } : data))
                .sort((a, b) => a.step - b.step),
        );
    };

    const handleReplaceTrack = (track: TTrackData[]) => {
        setTrackData([...track].sort((a, b) => a.step - b.step));
    };

    /**
     * Replaces the chords between `start` and `end` (exclusive) with `chords`. Chords crossing an edge
     * of the range are cut back to the part outside it.
     */
    const handleReplaceRange = (start: number, end: number, chords: TTrackData[]) => {
        const outside = trackData.flatMap((data) => {
            const dataEnd = data.step + data.len;
            if (dataEnd <= start || data.step >= end) return [data];
            const parts: TTrackData[] = [];
            if (data.step < start) parts.push({ ...data, len: start - data.step });
            if (dataEnd > end) parts.push({ ...data, step: end, len: dataEnd - end });
            return parts;
        });
        setTrackData([...outside, ...chords].sort((a, b) => a.step - b.step));
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
        getChordBounds,
        handleResizeChord,
        handleReplaceTrack,
        handleReplaceRange,
        handleDeleteChord,
        handleRescale,
        undo,
        redo,
    };
};
