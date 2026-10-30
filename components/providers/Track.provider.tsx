import { createContext, useState } from "react";

/** A chord placed on the grid, starting at `step` and lasting `len` steps. */
export type TTrackData = {
    step: number;
    len: number;
    chord: string[];
    name?: string;
};

export const TrackContext = createContext({
    trackData: [] as TTrackData[],
    setTrackData: (trackData: TTrackData[]) => {
        console.warn("setTrackData not implemented", trackData);
    },
});

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
