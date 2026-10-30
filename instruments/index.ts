import { TInstrumentType } from "./instrument";
import { InstruPiano } from "./piano";
import { InstruSynth } from "./synth";

export type { TInstrumentType } from "./instrument";

export const instruments = (type: TInstrumentType) => {
    const instrument = type === "piano" ? new InstruPiano() : new InstruSynth();
    instrument.init();
    return instrument;
};
