import { useContext } from "react";
import { SequencerContext } from "../providers/Sequencer.provider";

export const useSequencer = () => {
    const context = useContext(SequencerContext);
    if (!context) {
        throw new Error("useSequencer must be used inside SequencerProvider");
    }
    return context;
};
