import * as Tone from "tone";

export type TInstrumentType = "piano" | "synth";

export abstract class Instrument {
    protected abstract instrument: Tone.Sampler | Tone.PolySynth | null;

    abstract init(): void;

    playChord = (notes: string[], duration: Tone.Unit.Time, time: number) => {
        this.instrument?.triggerAttackRelease(notes, duration, time);
    };

    releaseAll = () => {
        this.instrument?.releaseAll();
    };

    dispose = () => {
        this.instrument?.dispose();
        this.instrument = null;
    };
}
