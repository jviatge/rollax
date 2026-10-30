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
    /** The transport position in steps, with the fraction of the current step. */
    getPlayPosition: () => number;
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
    const [nbrMeasures, setNbrMeasures] = useState(4);
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

    const getPlayPosition = useCallback(
        () => (Tone.getTransport().getTicksAtTime(Tone.immediate()) / getStepTicks()) % totalSteps,
        [getStepTicks, totalSteps],
    );

    // Follow the transport step by step; the playhead itself reads getPlayPosition every frame.
    useEffect(() => {
        if (!isPlaying) return;
        let frame = 0;
        const update = () => {
            setPlayStep(Math.floor(getPlayPosition()));
            frame = requestAnimationFrame(update);
        };
        frame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    }, [isPlaying, getPlayPosition]);

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

    // Grid changes keep the transport position: steps are rescaled to the same musical time,
    // and the playhead only jumps back to the start if it falls past a shortened grid.
    const handleNbrStepsChange = (value: number) => {
        handleRescale(value / nbrSteps, value * nbrMeasures);
        setNbrSteps(value);
        setSelectedStep(null);
        setPlayStep(Math.floor((playStep * value) / nbrSteps));
    };

    const handleNbrMeasuresChange = (value: number) => {
        // A longer grid keeps every chord, so only a shorter one touches the track.
        if (value < nbrMeasures) handleRescale(1, nbrSteps * value);
        setNbrMeasures(value);
        setSelectedStep(null);
        if (playStep >= nbrSteps * value) seek(0);
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
                getPlayPosition,
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
