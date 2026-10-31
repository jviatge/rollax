import { useTrack } from "../hooks/useTrack";
import { TLane } from "../providers/Track.provider";
import { useSequencer } from "./hooks/useSequencer";

export const StatusBar = () => {
    const { instrumentsByLane, tempo, nbrMeasures, nbrSteps } = useSequencer();
    const instrumentName = (lane: TLane) => (instrumentsByLane[lane] === "piano" ? "Piano (samples)" : "Synth");
    const { trackData, tracks } = useTrack();

    return (
        <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-daw-edge bg-daw-bar px-3 text-[11px] text-daw-muted">
            <span>
                Chords: {instrumentName("chords")} · Bass: {instrumentName("bass")}
            </span>
            <span>{tempo} BPM</span>
            <span>
                {nbrMeasures} {nbrMeasures > 1 ? "measures" : "measure"} × 1/{nbrSteps}
            </span>
            <span>
                {trackData.length} {trackData.length === 1 ? "chord" : "chords"}
            </span>
            <span>
                {tracks.bass.length} bass {tracks.bass.length === 1 ? "note" : "notes"}
            </span>
        </footer>
    );
};
