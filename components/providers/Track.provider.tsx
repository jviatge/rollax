import { blocksShortcuts } from "@/lib/keyboard";
import { createContext, useCallback, useEffect, useState } from "react";

/** A chord placed on the grid, starting at `step` and lasting `len` steps. */
export type TTrackData = {
    step: number;
    len: number;
    chord: string[];
    name?: string;
    /** Octaves above the track's octave (below when negative); unset is 0. */
    octave?: number;
};

/** The grid's tracks: the chords, and the bass line, whose entries hold a single note. */
export type TLane = "chords" | "bass";
export type TTracks = Record<TLane, TTrackData[]>;

/** `record: false` replaces the tracks and clears the history, for changes that can't be undone. */
export type TSetTrackOptions = { record?: boolean };

type THistory = { past: TTracks[]; present: TTracks; future: TTracks[] };

const EMPTY_TRACKS: TTracks = { chords: [], bass: [] };

const HISTORY_LIMIT = 100;

export const TrackContext = createContext({
    tracks: EMPTY_TRACKS,
    /** Updates the tracks from their current value; one call is one undo step. */
    setTracks: (update: (tracks: TTracks) => TTracks, options?: TSetTrackOptions) => {
        console.warn("setTracks not implemented", update, options);
    },
    undo: () => {},
    redo: () => {},
});

export const TrackProvider = ({ children }: { children: React.ReactNode }) => {
    const [history, setHistory] = useState<THistory>({ past: [], present: EMPTY_TRACKS, future: [] });

    const setTracks = useCallback(
        (update: (tracks: TTracks) => TTracks, { record = true }: TSetTrackOptions = {}) => {
            setHistory(({ past, present, future }) => {
                const next = update(present);
                if (!record) return { past: [], present: next, future: [] };
                if (JSON.stringify(next) === JSON.stringify(present)) return { past, present, future };
                return { past: [...past, present].slice(-HISTORY_LIMIT), present: next, future: [] };
            });
        },
        [],
    );

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
                tracks: history.present,
                setTracks,
                undo,
                redo,
            }}
        >
            {children}
        </TrackContext.Provider>
    );
};
