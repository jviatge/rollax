import { createContext, useState } from "react";

export const TrackContext = createContext({
    trackData: [] as {
        step: number;
        chord: string[] | null;
        name?: string;
    }[],
    setTrackData: (trackData: { step: number; chord: string[] | null }[]) => {
        console.warn("setTrackData not implemented", trackData);
    },
});

export type TTrackData = {
    step: number;
    chord: string[] | null;
    name?: string;
};

export const TrackProvider = ({ children }: { children: React.ReactNode }) => {
    const [trackData, setTrackData] = useState<TTrackData[]>([]);
    return (
        <TrackContext.Provider
            value={{
                trackData,
                setTrackData,
            }}
        >
            {children}
        </TrackContext.Provider>
    );
};
