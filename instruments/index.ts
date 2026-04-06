import { InstruPiano } from "./piano";
import { InstruSynth } from "./synth";

export const instruments = (type: "piano" | "synth") => {
    switch (type) {
        case "piano":
            const piano = new InstruPiano();
            piano.init();
            return piano;
        case "synth":
            const synth = new InstruSynth();
            synth.init();
            return synth;
        default:
            return null;
    }
};
