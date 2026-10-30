"use client";

import { TrackProvider } from "@/components/providers/Track.provider";
import { Sequencer } from "@/components/sequencer";

export const PageClient = ({
    listNotes,
    ListChordsByNotes,
}: {
    listNotes: string[];
    ListChordsByNotes: Record<string, Record<string, string[]>>;
}) => {
    return (
        <TrackProvider>
            <Sequencer listNotes={listNotes} ListChordsByNotes={ListChordsByNotes} />
        </TrackProvider>
    );
};
