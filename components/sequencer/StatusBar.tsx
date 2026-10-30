import { useTrack } from "../hooks/useTrack";
import { useSequencer } from "./hooks/useSequencer";

export const StatusBar = () => {
    const { selectedInstrument, tempo, nbrMeasures, nbrSteps } = useSequencer();
    const { trackData } = useTrack();

    return (
        <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-daw-edge bg-daw-bar px-3 text-[11px] text-daw-muted">
            <span>{selectedInstrument === "piano" ? "Piano (samples)" : "Synth"}</span>
            <span>{tempo} BPM</span>
            <span>
                {nbrMeasures} {nbrMeasures > 1 ? "measures" : "measure"} × 1/{nbrSteps}
            </span>
            <span>
                {trackData.length} {trackData.length === 1 ? "chord" : "chords"}
            </span>
        </footer>
    );
};
