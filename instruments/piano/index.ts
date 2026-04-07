import * as Tone from "tone";
import { EventMidiPlayer, Instrument } from "../instrument";

export class InstruPiano extends Instrument {
    public instrument: Tone.Sampler | null = null;
    private tone = Tone;

    init() {
        this.tone.start();
        return (this.instrument = new this.tone.Sampler({
            urls: {
                C4: "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                A4: "A4.mp3",
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/",
        }).toDestination());
    }

    playKey = (event: EventMidiPlayer) => {
        if (!this.instrument) {
            return;
        }
        const safeEvent = this.checkEventKey(event, this.instrument);
        if (!safeEvent) {
            return;
        }

        const { noteName, velocity } = safeEvent;
        return this.instrument.triggerAttackRelease(noteName, "8n", this.tone.now(), velocity);
    };
}
