"use client";

import { useTrack } from "@/components/hooks/useTrack";
import { TLane } from "@/components/providers/Track.provider";
import { instruments, TInstrumentType } from "@/instruments";
import { Instrument } from "@/instruments/instrument";
import { createContext, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";

type TPartEvent = { time: Tone.Unit.Time; lane: TLane; notes: string[]; duration: Tone.Unit.Time };

/** Mixes are 0–1; the reverb size is its decay in seconds and the delay feedback 0–0.9. */
export type TEffects = { reverbMix: number; reverbSize: number; delayMix: number; delayFeedback: number };

export type TEffectId = "reverb" | "delay";

/** Where effects apply: each track, then the master bus that mixes them to the speakers. */
export type TBus = TLane | "master";

const BUSES: TBus[] = ["chords", "bass", "master"];

const TRACK_EFFECTS: TEffects = { reverbMix: 0, reverbSize: 2.5, delayMix: 0, delayFeedback: 0.35 };
const ALL_ON: Record<TEffectId, boolean> = { reverb: true, delay: true };

/** The track a selection is on; a selection made in the ruler covers every track. */
export type TSelectionLane = TLane | "all";

/** The bass plays this many octaves below the chords. */
export const BASS_OCTAVES_DOWN = 2;

type TEffectsChain = { delay: Tone.FeedbackDelay; reverb: Tone.Reverb; meter: Tone.Meter };

type TSequencerContext = {
    /** The instrument each track plays. */
    instrumentsByLane: Record<TLane, TInstrumentType>;
    handleSelectInstrument: (lane: TLane, instrument: TInstrumentType) => void;
    effects: Record<TBus, TEffects>;
    handleEffectChange: (bus: TBus, effect: keyof TEffects, value: number) => void;
    /** Whether each effect is on; an effect that is off keeps its settings but is silent. */
    effectsOn: Record<TBus, Record<TEffectId, boolean>>;
    toggleEffect: (bus: TBus, effect: TEffectId) => void;
    /** A bus's output level for each stereo channel in dB (-Infinity when silent). */
    getLevels: (bus: TBus) => number[];
    /** The track selected as a whole (from its header), shown in the Selection column. */
    selectedTrack: TLane | null;
    /** Selects a whole track; this clears the step selection. */
    setSelectedTrack: (lane: TLane | null) => void;
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
    /** Selects `step` (or nothing) on `lane`, which defaults to the track already selected. */
    setSelectedStep: (step: number | null, lane?: TSelectionLane) => void;
    selectedLane: TSelectionLane;
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

/**
 * Each bus is delay → reverb, with a meter after the reverb. The tracks feed the master bus, which
 * plays to the speakers.
 */
const createChains = (): Record<TBus, TEffectsChain> => {
    const createChain = (output: Tone.InputNode): TEffectsChain => {
        const meter = new Tone.Meter({ channelCount: 2, smoothing: 0.8 });
        const reverb = new Tone.Reverb().connect(output);
        reverb.connect(meter);
        const delay = new Tone.FeedbackDelay().connect(reverb);
        return { delay, reverb, meter };
    };
    const master = createChain(Tone.getDestination());
    return { master, chords: createChain(master.delay), bass: createChain(master.delay) };
};

/** Creates a track's instrument, connected to the start of its effects chain, and swaps it on change. */
const useLaneInstrument = (type: TInstrumentType, getChains: () => Record<TBus, TEffectsChain>, lane: TLane) => {
    const ref = useRef<Instrument | null>(null);
    useEffect(() => {
        const instrument = instruments(type, getChains()[lane].delay);
        ref.current = instrument;
        return () => {
            instrument.dispose();
            if (ref.current === instrument) ref.current = null;
        };
    }, [type, getChains, lane]);
    return ref;
};

export const SequencerProvider = ({ children }: { children: React.ReactNode }) => {
    const { tracks, handleRescale } = useTrack();
    const [instrumentsByLane, setInstrumentsByLane] = useState<Record<TLane, TInstrumentType>>({
        chords: "synth",
        bass: "synth",
    });
    // Only the master reverb starts on, so the tracks don't stack reverbs by default.
    const [effects, setEffects] = useState<Record<TBus, TEffects>>({
        chords: TRACK_EFFECTS,
        bass: TRACK_EFFECTS,
        master: { ...TRACK_EFFECTS, reverbMix: 0.2 },
    });
    const [effectsOn, setEffectsOn] = useState<Record<TBus, Record<TEffectId, boolean>>>({
        chords: ALL_ON,
        bass: ALL_ON,
        master: ALL_ON,
    });
    const [selectedTrack, setSelectedTrackState] = useState<TLane | null>(null);
    const [tempo, setTempo] = useState(120);
    const [nbrMeasures, setNbrMeasures] = useState(4);
    const [nbrSteps, setNbrSteps] = useState(4);
    const [fundamentalNote, setFundamentalNote] = useState("C");
    const [selectedStep, setSelectedAnchor] = useState<number | null>(null);
    const [selectedLane, setSelectedLane] = useState<TSelectionLane>("chords");
    const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [playStep, setPlayStep] = useState(0);
    const [cycle, setCycle] = useState(true);
    const nbrNotes = 36;
    const octave = 4;
    const totalSteps = nbrSteps * nbrMeasures;
    const chainsRef = useRef<Record<TBus, TEffectsChain> | null>(null);
    // Created on first use, so the instruments can connect to it whatever order the effects run in.
    const getChains = useCallback(() => (chainsRef.current ??= createChains()), []);
    useEffect(
        () => () => {
            Object.values(chainsRef.current ?? {}).forEach(({ delay, reverb, meter }) =>
                [delay, reverb, meter].forEach((node) => node.dispose()),
            );
            chainsRef.current = null;
        },
        [],
    );
    const chordsInstrument = useLaneInstrument(instrumentsByLane.chords, getChains, "chords");
    const bassInstrument = useLaneInstrument(instrumentsByLane.bass, getChains, "bass");
    const instrumentRefs: Record<TLane, RefObject<Instrument | null>> = useMemo(
        () => ({ chords: chordsInstrument, bass: bassInstrument }),
        [chordsInstrument, bassInstrument],
    );
    const releaseAll = useCallback(
        () => Object.values(instrumentRefs).forEach((ref) => ref.current?.releaseAll()),
        [instrumentRefs],
    );
    const selectedRange =
        selectedStep !== null && selectionEnd !== null && selectionEnd !== selectedStep
            ? { start: Math.min(selectedStep, selectionEnd), end: Math.max(selectedStep, selectionEnd) + 1 }
            : null;

    // A chord (or bass note) selected from its first step selects all of it.
    const chordOnStep =
        selectedLane === "all" ? undefined : tracks[selectedLane].find((data) => data.step === selectedStep);
    const selectedArea =
        selectedRange ??
        (chordOnStep
            ? { start: chordOnStep.step, end: chordOnStep.step + chordOnStep.len }
            : selectedStep !== null
              ? { start: selectedStep, end: selectedStep + 1 }
              : null);

    const setSelectedStep = (step: number | null, lane?: TSelectionLane) => {
        if (lane) setSelectedLane(lane);
        setSelectedTrackState(null);
        setSelectedAnchor(step);
        setSelectionEnd(null);
    };

    const setSelectedTrack = (lane: TLane | null) => {
        setSelectedTrackState(lane);
        setSelectedAnchor(null);
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
        releaseAll();
        setIsPlaying(false);
        setIsPaused(false);
        setPlayStep(0);
    }, [releaseAll]);

    // The delays repeat on eighth notes, so they follow the tempo.
    useEffect(() => {
        const chains = getChains();
        for (const bus of BUSES) {
            const { delay, reverb } = chains[bus];
            const settings = effects[bus];
            reverb.wet.value = effectsOn[bus].reverb ? settings.reverbMix : 0;
            // Setting the decay regenerates the reverb's impulse response, so only do it when it changes.
            if (reverb.decay !== settings.reverbSize) reverb.decay = settings.reverbSize;
            delay.wet.value = effectsOn[bus].delay ? settings.delayMix : 0;
            delay.feedback.value = settings.delayFeedback;
            delay.delayTime.value = 60 / tempo / 2;
        }
    }, [effects, effectsOn, tempo, getChains]);

    const getLevels = useCallback((bus: TBus) => {
        const value = chainsRef.current?.[bus].meter.getValue() ?? -Infinity;
        return Array.isArray(value) ? value : [value, value];
    }, []);

    // Rebuild the scheduled chords and bass notes whenever the tracks or the grid change.
    useEffect(() => {
        const stepTicks = getStepTicks();
        const events = (lane: TLane, noteOctave: number) =>
            tracks[lane].map((data) => ({
                time: `${data.step * stepTicks}i`,
                lane,
                notes: data.chord.map((note) => `${note}${noteOctave}`),
                duration: `${data.len * stepTicks}i`,
            }));
        const part = new Tone.Part<TPartEvent>(
            (time, event) => instrumentRefs[event.lane].current?.playChord(event.notes, event.duration, time),
            [...events("chords", octave), ...events("bass", octave - BASS_OCTAVES_DOWN)],
        );
        part.start(0);
        return () => {
            part.dispose();
        };
    }, [tracks, getStepTicks, instrumentRefs]);

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
        releaseAll();
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
                instrumentsByLane,
                handleSelectInstrument: (lane, instrument) =>
                    setInstrumentsByLane((current) => ({ ...current, [lane]: instrument })),
                effects,
                handleEffectChange: (bus, effect, value) =>
                    setEffects((current) => ({ ...current, [bus]: { ...current[bus], [effect]: value } })),
                effectsOn,
                toggleEffect: (bus, effect) =>
                    setEffectsOn((current) => ({
                        ...current,
                        [bus]: { ...current[bus], [effect]: !current[bus][effect] },
                    })),
                selectedTrack,
                setSelectedTrack,
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
                selectedLane,
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
