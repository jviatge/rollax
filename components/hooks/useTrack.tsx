import { useContext } from "react";
import { TrackContext, TTrackData } from "../providers/Track.provider";

export const useTrack = () => {
    const { trackData, setTrackData } = useContext(TrackContext);

    /** The chord sounding at `step`, whether it starts there or earlier. */
    const getChordAt = (step: number) =>
        trackData.find((data) => step >= data.step && step < data.step + data.len) ?? null;

    /**
     * Places a chord at `step`. It lasts until the next chord, at most `maxLen` steps,
     * and shortens a previous chord that would overlap it.
     */
    const handleChangeChord = (
        chord: string[],
        step: number,
        name: string | undefined,
        maxLen: number,
        totalSteps: number,
    ) => {
        const others = trackData
            .filter((data) => data.step !== step)
            .map((data) =>
                data.step < step && data.step + data.len > step
                    ? { ...data, len: step - data.step }
                    : data,
            );
        const nextStep = Math.min(
            totalSteps,
            ...others.filter((data) => data.step > step).map((data) => data.step),
        );
        const len = Math.max(1, Math.min(maxLen, nextStep - step));

        setTrackData([...others, { step, len, chord, name }].sort((a, b) => a.step - b.step));
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
        handleDeleteChord,
        handleRescale,
    };
};
