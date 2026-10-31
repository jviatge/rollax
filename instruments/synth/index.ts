import * as Tone from "tone";
import { Instrument } from "../instrument";

export class InstruSynth extends Instrument {
    protected instrument: Tone.PolySynth | null = null;

    init(output: Tone.InputNode) {
        this.instrument = new Tone.PolySynth(Tone.Synth).connect(output);
    }
}
