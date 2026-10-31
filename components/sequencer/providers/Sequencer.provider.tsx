"use client";

import { useTrack } from "@/components/hooks/useTrack";
import { instruments, TInstrumentType } from "@/instruments";
import { Instrument } from "@/instruments/instrument";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";

type TPartEvent = { time: Tone.Unit.Time; notes: string[]; duration: Tone.Unit.Time };

/** Mixes are 0–1; the reverb size is its decay in seconds and the delay feedback 0–0.9. */
export type TEffects = { reverbMix: number; reverbSize: number; delayMix: number; delayFeedback: number };

export type TEffectId = "reverb" | "delay";

type TEffectsChain = { delay: Tone.FeedbackDelay; reverb: Tone.Reverb; meter: Tone.Meter };

type TSequencerContext = {
    selectedInstrument: TInstrumentType;
    handleSelectInstrument: (instrument: TInstrumentType) => void;
    effects: TEffects;
    handleEffectChange: (effect: keyof TEffects, value: number) => void;
    /** Whether each effect is on; an effect that is off keeps its settings but is silent. */
    effectsOn: Record<TEffectId, boolean>;
    toggleEffect: (effect: TEffectId) => void;
    /** The output level of each stereo channel in dB (-Infinity when silent). */
    getLevels: () => number[];
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
    /** Steps `start` to `end` (exclusive) when more than one step is selected. */
    selectedRange: { start: number; end: number } | null;
    /** The steps the selection covers: the range, the chord starting on the selected step, or the step. */
    selectedArea: { start: number; end: number } | null;
    /** Selects from the selected step to `step`, or just `step` when nothing is selected. */
    extendSelection: (step: number) => void;
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
    const [effects, setEffects] = useState<TEffects>({
        reverbMix: 0.2,
        reverbSize: 2.5,
        delayMix: 0,
        delayFeedback: 0.35,
    });
    const [effectsOn, setEffectsOn] = useState<Record<TEffectId, boolean>>({ reverb: true, delay: true });
    const [tempo, setTempo] = useState(120);
    const [nbrMeasures, setNbrMeasures] = useState(4);
    const [nbrSteps, setNbrSteps] = useState(4);
    const [fundamentalNote, setFundamentalNote] = useState("C");
    const [selectedStep, setSelectedAnchor] = useState<number | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [playStep, setPlayStep] = useState(0);
    const [cycle, setCycle] = useState(true);
    const nbrNotes = 36;
    const octave = 4;
    const totalSteps = nbrSteps * nbrMeasures;
    const instrumentRef = useRef<Instrument | null>(null);
    const chainRef = useRef<TEffectsChain | null>(null);
    const selectedRange =
        selectedStep !== null && selectionEnd !== null && selectionEnd !== selectedStep
            ? { start: Math.min(selectedStep, selectionEnd), end: Math.max(selectedStep, selectionEnd) + 1 }
            : null;

    const chordOnStep = trackData.find((data) => data.step === selectedStep);
    const selectedArea =
        selectedRange ??
        (chordOnStep
            ? { start: chordOnStep.step, end: chordOnStep.step + chordOnStep.len }
            : selectedStep !== null
              ? { start: selectedStep, end: selectedStep + 1 }
              : null);

    const setSelectedStep = (step: number | null) => {
        setSelectedAnchor(step);
        setSelectionEnd(null);
    };

    const extendSelection = (step: number) => {
        if (selectedStep === null) setSelectedAnchor(step);
        setSelectionEnd(step);
    };

    /** Transport ticks in one grid step (a step is a 1/nbrSteps note). */
    const getStepTicks = useCallback(() => (Tone.getTransport().PPQ * 4) / nbrSteps, [nbrSteps]);

    const handleStop = useCallback(() => {
        Tone.getTransport().stop();
        instrumentRef.current?.releaseAll();
        setIsPlaying(false);
        setIsPaused(false);
        setPlayStep(0);
    }, []);

    // The instrument plays through delay → reverb → speakers; the meter listens after the reverb.
    // Declared before the instrument effect so the chain exists when the instrument connects to it.
    useEffect(() => {
        const meter = new Tone.Meter({ channelCount: 2, smoothing: 0.8 });
        const reverb = new Tone.Reverb().toDestination();
        reverb.connect(meter);
        const delay = new Tone.FeedbackDelay().connect(reverb);
        chainRef.current = { delay, reverb, meter };
        return () => {
            [delay, reverb, meter].forEach((node) => node.dispose());
            chainRef.current = null;
        };
    }, []);

    // The delay repeats on eighth notes, so it follows the tempo.
    useEffect(() => {
        const chain = chainRef.current;
        if (!chain) return;
        chain.reverb.wet.value = effectsOn.reverb ? effects.reverbMix : 0;
        // Setting the decay regenerates the reverb's impulse response, so only do it when it changes.
        if (chain.reverb.decay !== effects.reverbSize) chain.reverb.decay = effects.reverbSize;
        chain.delay.wet.value = effectsOn.delay ? effects.delayMix : 0;
        chain.delay.feedback.value = effects.delayFeedback;
        chain.delay.delayTime.value = 60 / tempo / 2;
    }, [effects, effectsOn, tempo]);

    const getLevels = useCallback(() => {
        const value = chainRef.current?.meter.getValue() ?? -Infinity;
        return Array.isArray(value) ? value : [value, value];
    }, []);

    useEffect(() => {
        const instrument = instruments(selectedInstrument, chainRef.current?.delay ?? Tone.getDestination());
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
                effects,
                handleEffectChange: (effect, value) => setEffects((current) => ({ ...current, [effect]: value })),
                effectsOn,
                toggleEffect: (effect) => setEffectsOn((current) => ({ ...current, [effect]: !current[effect] })),
                getLevels,
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
                selectedRange,
                selectedArea,
                extendSelection,
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
