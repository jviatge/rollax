import { useContext } from "react";
import { TrackContext, TTrackData } from "../providers/Track.provider";

export const useTrack = () => {
    const { trackData, setTrackData } = useContext(TrackContext);

    const handleChangeChord = (chord: string[], step: number, name?: string): TTrackData[] => {
        const newtrackData: TTrackData[] = trackData.map((data) => {
            if (data.step === step) {
                return {
                    step,
                    chord,
                    name,
                };
            }
            return data;
        });

        const isStepAlreadyInTrack = trackData.some((data) => data.step === step);

        if (!isStepAlreadyInTrack) {
            newtrackData.push({
                step,
                chord,
                name,
            });
        }

        setTrackData(newtrackData);
        return newtrackData;
    };

    const getChordAtStep = (step: number) => {
        const chordData = trackData.find((data) => data.step === step);
        return chordData ? chordData.chord : null;
    };

    const handleDeleteChord = (step: number): TTrackData[] => {
        const newtrackData = trackData.filter((data) => data.step !== step);
        setTrackData(newtrackData);
        return newtrackData;
    };

    return {
        trackData,
        getChordAtStep,
        handleChangeChord,
        handleDeleteChord,
    };
};
