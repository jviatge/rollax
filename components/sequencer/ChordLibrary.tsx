import { cn } from "@/lib/utils";
import { noteIndex } from "@/notes";
import { Search } from "lucide-react";
import { useState } from "react";
import { setChordDrag } from "./chordDrag";
import { useChord } from "./hooks/useChord";
import { useSequencer } from "./hooks/useSequencer";

/** Chord files are named by root, with enharmonic spellings joined by "-" (e.g. "Db-C#"). */
const rootSpellings = (root: string) => root.split("-");

export const ChordLibrary = () => {
    const { listNotes, ListChordsByNotes } = useChord();
    const { fundamentalNote } = useSequencer();
    const [query, setQuery] = useState("");
    const [pickedRoot, setPickedRoot] = useState<string | null>(null);
    const [prevFundamental, setPrevFundamental] = useState(fundamentalNote);

    // Changing the key in the inspector shows that root again.
    if (prevFundamental !== fundamentalNote) {
        setPrevFundamental(fundamentalNote);
        setPickedRoot(null);
    }

    const roots = [...listNotes].sort(
        (a, b) => noteIndex(rootSpellings(a)[0]) - noteIndex(rootSpellings(b)[0]),
    );
    const fundamentalRoot =
        roots.find((root) => rootSpellings(root).includes(fundamentalNote)) ?? roots[0];
    const activeRoot = pickedRoot ?? fundamentalRoot;
    const search = query.trim().toLowerCase();

    const chords = (search ? roots : [activeRoot]).flatMap((root) =>
        Object.entries(ListChordsByNotes[root] ?? {})
            .filter(([name]) => !search || name.toLowerCase().includes(search))
            .map(([name, chordNotes]) => ({ name, notes: chordNotes })),
    );

    return (
        <aside className="flex min-h-0 w-74 shrink-0 flex-col border-l border-daw-edge bg-daw-panel">
            <div className="flex flex-col gap-3 border-b border-daw-edge px-4 pt-4 pb-3">
                <h2 className="text-[11px] font-semibold tracking-widest text-daw-muted uppercase">
                    Chord library
                </h2>
                <label className="relative block">
                    <span className="sr-only">Search chords</span>
                    <Search className="absolute top-2.5 left-2.5 size-3.5 text-daw-muted" />
                    <input
                        type="search"
                        placeholder="Search: Am7, dim…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="h-8.5 w-full rounded-[7px] border border-daw-line bg-daw-well pr-2.5 pl-8 text-daw-text"
                    />
                </label>
                <div role="group" aria-label="Root note" className="grid grid-cols-4 gap-1">
                    {roots.map((root) => {
                        const active = !search && root === activeRoot;
                        return (
                            <button
                                key={root}
                                type="button"
                                aria-pressed={active}
                                onClick={() => {
                                    setPickedRoot(root);
                                    setQuery("");
                                }}
                                className={cn(
                                    "h-7.5 rounded-md border border-daw-line bg-daw-bar text-xs font-semibold text-daw-sub",
                                    active && "border-daw-accent bg-daw-accent text-daw-accent-ink",
                                )}
                            >
                                {root}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="daw-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
                {chords.map((chord) => (
                    <div
                        key={chord.name}
                        draggable
                        onDragStart={(e) => setChordDrag(e, { name: chord.name, notes: chord.notes })}
                        className="flex min-h-11 w-full cursor-grab items-center justify-between gap-2 rounded-lg border border-daw-raised bg-daw-bar px-3 py-2 select-none hover:border-daw-line hover:brightness-110 active:cursor-grabbing"
                    >
                        <span className="text-sm font-bold">{chord.name}</span>
                        <span className="font-mono text-[11px] text-daw-sub">{chord.notes.join(" ")}</span>
                    </div>
                ))}
                {chords.length === 0 && <p className="m-2 text-daw-muted">No matching chord.</p>}
            </div>
            <p className="border-t border-daw-edge px-4 py-3 text-[11px] leading-normal text-daw-muted">
                Drag a chord onto a step of the chord track or the piano roll.
            </p>
        </aside>
    );
};
