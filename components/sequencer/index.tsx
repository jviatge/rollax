"use client";

import { ChordLibrary } from "./ChordLibrary";
import { GridSequencer } from "./GridSequencer";
import { Inspector } from "./Inspector";
import { ChordProvider } from "./providers/Chord.provider";
import { SequencerProvider } from "./providers/Sequencer.provider";
import { StatusBar } from "./StatusBar";
import { TransportBar } from "./TransportBar";

export const Sequencer = ({
    listNotes,
    ListChordsByNotes,
}: {
    listNotes: string[];
    ListChordsByNotes: Record<string, Record<string, string[]>>;
}) => {
    return (
        <ChordProvider listNotes={listNotes} ListChordsByNotes={ListChordsByNotes}>
            <SequencerProvider>
                <div className="flex h-screen min-w-[1200px] flex-col overflow-hidden bg-daw-ground text-[13px] text-daw-text">
                    <TransportBar />
                    <div className="flex min-h-0 flex-1">
                        <Inspector />
                        <main className="flex min-w-0 flex-1 flex-col">
                            <GridSequencer />
                            <StatusBar />
                        </main>
                        <ChordLibrary />
                    </div>
                </div>
            </SequencerProvider>
        </ChordProvider>
    );
};
