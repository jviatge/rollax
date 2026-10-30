import { useContext } from "react";
import { TrackContext, TTrackData } from "../providers/Track.provider";

export const useTrack = () => {
    const { trackData, setTrackData } = useContext(TrackContext);

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

    const handleReplaceTrack = (track: TTrackData[]) => {
        setTrackData([...track].sort((a, b) => a.step - b.step));
    };

    const handleDeleteChord = (step: number) => {
        setTrackData(trackData.filter((data) => data.step !== step));
    };

    /** Keeps chords at the same musical position when the steps per measure change. */
    const handleRescale = (ratio: number, totalSteps: number) => {
        const rescaled: TTrackData[] = trackData
            .map((data) => ({
                ...data,
                step: Math.round(data.step * ratio),
                len: Math.max(1, Math.round(data.len * ratio)),
            }))
            .filter((data) => data.step < totalSteps)
            .map((data) => ({ ...data, len: Math.min(data.len, totalSteps - data.step) }));
        setTrackData(rescaled);
    };

    return {
        trackData,
        getChordAt,
        handleChangeChord,
        handleMoveChord,
        handleReplaceTrack,
        handleDeleteChord,
        handleRescale,
    };
};
