"use client";

import { useTrack } from "@/components/hooks/useTrack";
import { instruments, TInstrumentType } from "@/instruments";
import { Instrument } from "@/instruments/instrument";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";

type TPartEvent = { time: Tone.Unit.Time; notes: string[]; duration: Tone.Unit.Time };

type TSequencerContext = {
    selectedInstrument: TInstrumentType;
    handleSelectInstrument: (instrument: TInstrumentType) => void;
    tempo: number;
    handleTempoChange: (tempo: number) => void;
    nbrMeasures: number;
    handleNbrMeasuresChange: (nbrMeasures: number) => void;
    nbrSteps: number;
    handleNbrStepsChange: (nbrSteps: number) => void;
    totalSteps: number;
    nbrNotes: number;
    octave: number;
    fundamentalNote: string;
    setFundamentalNote: (note: string) => void;
    selectedStep: number | null;
    setSelectedStep: (step: number | null) => void;
    isPlaying: boolean;
    isPaused: boolean;
    playStep: number;
    cycle: boolean;
    toggleCycle: () => void;
    handlePlay: () => Promise<void>;
    handlePause: () => void;
    handleStop: () => void;
    handlePreviousMeasure: () => void;
    handleNextMeasure: () => void;
};

export const SequencerContext = createContext<TSequencerContext | null>(null);

export const SequencerProvider = ({ children }: { children: React.ReactNode }) => {
    const { trackData, handleRescale } = useTrack();
    const [selectedInstrument, setSelectedInstrument] = useState<TInstrumentType>("synth");
    const [tempo, setTempo] = useState(120);
    const [nbrMeasures, setNbrMeasures] = useState(1);
    const [nbrSteps, setNbrSteps] = useState(4);
    const [fundamentalNote, setFundamentalNote] = useState("C");
    const [selectedStep, setSelectedStep] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [playStep, setPlayStep] = useState(0);
    const [cycle, setCycle] = useState(true);
    const nbrNotes = 36;
    const octave = 4;
    const totalSteps = nbrSteps * nbrMeasures;
    const instrumentRef = useRef<Instrument | null>(null);

    /** Transport ticks in one grid step (a step is a 1/nbrSteps note). */
    const getStepTicks = useCallback(() => (Tone.getTransport().PPQ * 4) / nbrSteps, [nbrSteps]);

    const handleStop = useCallback(() => {
        Tone.getTransport().stop();
        instrumentRef.current?.releaseAll();
        setIsPlaying(false);
        setIsPaused(false);
        setPlayStep(0);
    }, []);

    useEffect(() => {
        const instrument = instruments(selectedInstrument);
        instrumentRef.current = instrument;
        return () => {
            instrument.dispose();
            if (instrumentRef.current === instrument) instrumentRef.current = null;
        };
    }, [selectedInstrument]);

    // Rebuild the scheduled chords whenever the track or the grid changes.
    useEffect(() => {
        const stepTicks = getStepTicks();
        const part = new Tone.Part<TPartEvent>(
            (time, event) => instrumentRef.current?.playChord(event.notes, event.duration, time),
            trackData.map((data) => ({
                time: `${data.step * stepTicks}i`,
                notes: data.chord.map((note) => `${note}${octave}`),
                duration: `${data.len * stepTicks}i`,
            })),
        );
        part.start(0);
        return () => {
            part.dispose();
        };
    }, [trackData, getStepTicks]);

    // Tempo, loop region, and the end of the grid when the loop is off.
    useEffect(() => {
        const transport = Tone.getTransport();
        const end = `${nbrMeasures * 4 * transport.PPQ}i`;
        transport.bpm.value = tempo;
        transport.loop = cycle;
        transport.loopStart = 0;
        transport.loopEnd = end;
        if (cycle) return;
        const eventId = transport.schedule((time) => {
            Tone.getDraw().schedule(handleStop, time);
        }, end);
        return () => {
            transport.clear(eventId);
        };
    }, [tempo, nbrMeasures, cycle, handleStop]);

    // Move the playhead with the transport.
    useEffect(() => {
        if (!isPlaying) return;
        const transport = Tone.getTransport();
        const stepTicks = getStepTicks();
        let frame = 0;
        const update = () => {
            const ticks = transport.getTicksAtTime(Tone.immediate());
            setPlayStep(Math.floor(ticks / stepTicks) % totalSteps);
            frame = requestAnimationFrame(update);
        };
        frame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    }, [isPlaying, totalSteps, getStepTicks]);

    useEffect(() => {
        return () => {
            Tone.getTransport().stop();
        };
    }, []);

    const handlePlay = async () => {
        await Tone.start();
        await Tone.loaded();
        const transport = Tone.getTransport();
        if (isPaused) {
            transport.start();
        } else {
            transport.start(undefined, `${playStep * getStepTicks()}i`);
        }
        setIsPlaying(true);
        setIsPaused(false);
    };

    const handlePause = () => {
        Tone.getTransport().pause();
        instrumentRef.current?.releaseAll();
        setIsPlaying(false);
        setIsPaused(true);
    };

    const seek = (step: number) => {
        const transport = Tone.getTransport();
        if (transport.state !== "stopped") {
            transport.ticks = step * getStepTicks();
        }
        setPlayStep(step);
    };

    const handlePreviousMeasure = () => {
        const measureStart = Math.floor(playStep / nbrSteps) * nbrSteps;
        seek(Math.max(0, measureStart === playStep ? playStep - nbrSteps : measureStart));
    };

    const handleNextMeasure = () => {
        const next = (Math.floor(playStep / nbrSteps) + 1) * nbrSteps;
        seek(next >= totalSteps ? 0 : next);
    };

    const handleNbrStepsChange = (value: number) => {
        handleRescale(value / nbrSteps, value * nbrMeasures);
        setNbrSteps(value);
        setSelectedStep(null);
        setPlayStep(0);
    };

    const handleNbrMeasuresChange = (value: number) => {
        handleRescale(1, nbrSteps * value);
        setNbrMeasures(value);
        setSelectedStep(null);
        setPlayStep(0);
    };

    return (
        <SequencerContext.Provider
            value={{
                selectedInstrument,
                handleSelectInstrument: setSelectedInstrument,
                tempo,
                handleTempoChange: setTempo,
                nbrMeasures,
                handleNbrMeasuresChange,
                nbrSteps,
                handleNbrStepsChange,
                totalSteps,
                nbrNotes,
                octave,
                fundamentalNote,
                setFundamentalNote,
                selectedStep,
                setSelectedStep,
                isPlaying,
                isPaused,
                playStep,
                cycle,
                toggleCycle: () => setCycle((value) => !value),
                handlePlay,
                handlePause,
                handleStop,
                handlePreviousMeasure,
                handleNextMeasure,
            }}
        >
            {children}
        </SequencerContext.Provider>
    );
};
