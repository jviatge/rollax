import * as Tone from "tone";
import { TInstrumentType } from "./instrument";
import { InstruPiano } from "./piano";
import { InstruSynth } from "./synth";

export type { TInstrumentType } from "./instrument";

export const instruments = (type: TInstrumentType, output: Tone.InputNode) => {
    const instrument = type === "piano" ? new InstruPiano() : new InstruSynth();
    instrument.init(output);
    return instrument;
};
