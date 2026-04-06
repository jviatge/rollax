"use client";

import { ConfigSequencer } from "./ConfigSequencer";
import { ControlSequencer } from "./ControlSequencer";
import { GridSequencer } from "./GridSequencer";
import { ChordProvider } from "./providers/Chord.provider";
import { SequencerProvider } from "./providers/Sequencer.provider";

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
                <ConfigSequencer />
                <GridSequencer />
                <ControlSequencer />
            </SequencerProvider>
        </ChordProvider>
    );
};
