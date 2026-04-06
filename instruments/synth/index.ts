import * as Tone from "tone";
import { EventMidiPlayer, Instrument } from "../instrument";

export class InstruSynth extends Instrument {
    public instrument: Tone.Synth | null = null;
    private tone = Tone;

    init = async () => {
        this.tone.start();
        return (this.instrument = new this.tone.Synth().toDestination());
    };

    playKey = (event: EventMidiPlayer) => {
        if (!this.instrument) {
            return;
        }
        const safeEvent = this.checkEventKey(event, this.instrument);
        if (!safeEvent) {
            return;
        }

        const { noteName, velocity } = safeEvent;
        this.instrument.triggerAttackRelease(noteName, "8n", this.tone.now(), velocity);
    };
}
