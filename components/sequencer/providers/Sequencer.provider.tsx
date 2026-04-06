import { instruments } from "@/instruments";
import MidiPlayer from "midi-player-js";
import MidiWriter from "midi-writer-js";
import { createContext, useRef, useState } from "react";

export const SequencerContext = createContext({
    isPlaying: false,
    setIsPlaying: (isPlaying: boolean) => {},
    isPaused: false,
    setIsPaused: (isPaused: boolean) => {},
    selectedInstrument: "synth" as "piano" | "synth",
    setSelectedInstrument: (instrument: "piano" | "synth") => {},
    nbrSteps: 4,
    setNbrSteps: (nbrSteps: number) => {},
    nbrMeasures: 1,
    setNbrMeasures: (nbrMeasures: number) => {},
    tempo: 120,
    setTempo: (tempo: number) => {},
    octave: 4,
    setOctave: (octave: number) => {},
    instrumentRef: { current: null } as React.MutableRefObject<ReturnType<
        typeof instruments
    > | null>,
    playerRef: { current: null } as React.MutableRefObject<MidiPlayer.Player | null>,
    writerRef: { current: null } as React.MutableRefObject<InstanceType<
        typeof MidiWriter.Writer
    > | null>,
});

export const SequencerProvider = ({ children }: { children: React.ReactNode }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedInstrument, setSelectedInstrument] = useState<"piano" | "synth">("synth");
    const [nbrSteps, setNbrSteps] = useState(4);
    const [nbrMeasures, setNbrMeasures] = useState(1);
    const [tempo, setTempo] = useState(120);
    const [octave, setOctave] = useState(4);
    const instrumentRef = useRef<ReturnType<typeof instruments>>(null);
    const playerRef = useRef<MidiPlayer.Player | null>(null);
    const writerRef = useRef<InstanceType<typeof MidiWriter.Writer> | null>(null);

    return (
        <SequencerContext.Provider
            value={{
                isPlaying,
                setIsPlaying,
                isPaused,
                setIsPaused,
                selectedInstrument,
                setSelectedInstrument,
                nbrSteps,
                setNbrSteps,
                nbrMeasures,
                setNbrMeasures,
                tempo,
                setTempo,
                octave,
                setOctave,
                // REF
                instrumentRef,
                playerRef,
                writerRef,
            }}
        >
            {children}
        </SequencerContext.Provider>
    );
};
