import * as Tone from "tone";
import { Instrument } from "../instrument";

export class InstruPiano extends Instrument {
    protected instrument: Tone.Sampler | null = null;

    init() {
        this.instrument = new Tone.Sampler({
            urls: {
                C4: "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                A4: "A4.mp3",
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/",
        }).toDestination();
    }
}
