import { blocksShortcuts } from "@/lib/keyboard";
import { createContext, useCallback, useEffect, useState } from "react";

/** A chord placed on the grid, starting at `step` and lasting `len` steps. */
export type TTrackData = {
    step: number;
    len: number;
    chord: string[];
    name?: string;
};

/** `record: false` replaces the track and clears the history, for changes that can't be undone. */
type TSetTrackOptions = { record?: boolean };

type THistory = { past: TTrackData[][]; present: TTrackData[]; future: TTrackData[][] };

const HISTORY_LIMIT = 100;

export const TrackContext = createContext({
    trackData: [] as TTrackData[],
    setTrackData: (trackData: TTrackData[], options?: TSetTrackOptions) => {
        console.warn("setTrackData not implemented", trackData, options);
    },
    undo: () => {},
    redo: () => {},
});

export const TrackProvider = ({ children }: { children: React.ReactNode }) => {
    const [history, setHistory] = useState<THistory>({ past: [], present: [], future: [] });

    const setTrackData = useCallback((trackData: TTrackData[], { record = true }: TSetTrackOptions = {}) => {
        setHistory(({ past, present, future }) => {
            if (!record) return { past: [], present: trackData, future: [] };
            if (JSON.stringify(trackData) === JSON.stringify(present)) return { past, present, future };
            return { past: [...past, present].slice(-HISTORY_LIMIT), present: trackData, future: [] };
        });
    }, []);

    const undo = useCallback(() => {
        setHistory(({ past, present, future }) =>
            past.length ? { past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] } : { past, present, future },
        );
    }, []);

    const redo = useCallback(() => {
        setHistory(({ past, present, future }) =>
            future.length ? { past: [...past, present], present: future[0], future: future.slice(1) } : { past, present, future },
        );
    }, []);

    // Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z or Ctrl+Y redoes, except while typing in a field.
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || e.altKey || blocksShortcuts(e.target)) return;
            const key = e.key.toLowerCase();
            if (key === "z") {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            } else if (key === "y" && e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [undo, redo]);

    return (
        <TrackContext.Provider
            value={{
                trackData: history.present,
                setTrackData,
                undo,
                redo,
            }}
        >
            {children}
        </TrackContext.Provider>
    );
};
