import { TLane } from "@/components/providers/Track.provider";

/** Drag-and-drop payload: a new chord from the library, or a chord or bass note moved within its track. */
export const CHORD_DRAG_TYPE = "application/x-rollax-chord";

export type TChordDrag = { name: string; notes: string[] } | { fromStep: number; lane: TLane };

export const setChordDrag = (e: React.DragEvent, payload: TChordDrag) => {
    e.dataTransfer.setData(CHORD_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "fromStep" in payload ? "move" : "copy";
};

export const hasChordDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(CHORD_DRAG_TYPE);

export const getChordDrag = (e: React.DragEvent): TChordDrag | null => {
    const raw = e.dataTransfer.getData(CHORD_DRAG_TYPE);
    return raw ? (JSON.parse(raw) as TChordDrag) : null;
};
