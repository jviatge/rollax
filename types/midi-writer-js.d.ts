declare module "midi-writer-js" {
    interface MidiWriterStatic {
        Track: new () => {
            addEvent(event: unknown): void;
            setTempo(tempo: number): void;
        };
        ProgramChangeEvent: new (options: { instrument: number }) => unknown;
        NoteEvent: new (options: {
            pitch: string | string[];
            duration: string;
            velocity?: number;
            sequential?: boolean;
        }) => unknown;
        Writer: new (track: unknown) => { dataUri(): string };
    }

    const MidiWriter: MidiWriterStatic;
    export default MidiWriter;
}
