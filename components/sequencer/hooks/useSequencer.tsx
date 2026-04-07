"use client";

import { TTrackData } from "@/components/providers/Track.provider";
import { instruments } from "@/instruments";
import MidiPlayer from "midi-player-js";
import MidiWriter from "midi-writer-js";
import { useCallback, useContext, useEffect } from "react";
import { SequencerContext } from "../providers/Sequencer.provider";

type EventMidiPlayer = {
    track: number;
    delta: number;
    tick: number;
    byteIndex: number;
    name: string;
    channel: number;
    noteNumber: number;
    noteName: string;
    velocity: number;
};

export const useSequencer = (params?: {
    init?: boolean;
    callBackProg?: (progress: { tick: number }) => void;
}) => {
    const init = params?.init ?? false;
    const callBackProg = params?.callBackProg;
    const {
        selectedInstrument,
        setSelectedInstrument,
        isPaused,
        setIsPaused,
        isPlaying,
        setIsPlaying,
        nbrSteps,
        setNbrSteps,
        nbrMeasures,
        setNbrMeasures,
        tempo,
        setTempo,
        octave,
        setOctave,
        instrumentRef,
        playerRef,
        writerRef,
    } = useContext(SequencerContext);

    const createMidiWriter = useCallback(
        (newtrackData: TTrackData[], instrument?: "piano" | "synth") => {
            /* console.log("createMidiWriter", { newtrackData, instrument }); */
            const newTrack = new MidiWriter.Track();
            newtrackData.forEach((data) => {
                if (data.chord) {
                    const chordWithOctave = data.chord.map((note) => `${note}${octave}`);
                    /* console.log("chordWithOctave", chordWithOctave); */
                    newTrack.addEvent(
                        new MidiWriter.NoteEvent({
                            pitch: chordWithOctave,
                            duration: "2",
                        }),
                    );
                }
            });

            if (instrument) instrumentRef.current = instruments(instrument);

            const player = new MidiPlayer.Player((event: EventMidiPlayer) => {
                instrumentRef.current?.playKey(event);
            });
            player.on("endOfFile", () => {
                setIsPlaying(false);
                setIsPaused(false);
            });
            player.on("playing", function (currentTick: { tick: number }) {
                if (callBackProg) {
                    callBackProg(currentTick);
                }
            });
            playerRef.current = player;
            newTrack.setTempo(tempo);
            writerRef.current = new MidiWriter.Writer(newTrack);
        },
        [
            octave,
            callBackProg,
            instrumentRef,
            playerRef,
            setIsPlaying,
            setIsPaused,
            tempo,
            writerRef,
        ],
    );

    useEffect(() => {
        if (!init) {
            return;
        }
        console.log("init sequencer");
        createMidiWriter([], selectedInstrument);

        return () => {
            playerRef.current?.stop();
            playerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStop = () => {
        playerRef.current?.stop();
        setIsPlaying(false);
        setIsPaused(false);
    };

    const handleGenerate = async () => {};

    const handlePlay = async () => {
        const player = playerRef.current;
        const writer = writerRef.current;

        if (!player || !writer) {
            return;
        }

        if (isPaused) {
            player.play();
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        const dataUri = writer.dataUri();
        player.loadDataUri(dataUri);
        player.play();
        setIsPlaying(true);
        setIsPaused(false);
    };

    const handlePause = () => {
        if (!playerRef.current?.isPlaying()) {
            return;
        }

        playerRef.current.pause();
        setIsPlaying(false);
        setIsPaused(true);
    };

    const handleSelectInstrument = (instrument: "piano" | "synth", newtrackData: TTrackData[]) => {
        setSelectedInstrument(instrument);
        createMidiWriter(newtrackData, instrument);
    };

    const handleNbrStepsChange = (nbrSteps: number) => {
        setNbrSteps(nbrSteps);
    };

    const handleNbrMeasuresChange = (nbrMeasures: number) => {
        setNbrMeasures(nbrMeasures);
    };

    const handleTempoChange = (tempo: number, newtrackData: TTrackData[]) => {
        setTempo(tempo);
        createMidiWriter(newtrackData);
    };

    const handleChangeChord = (newtrackData: TTrackData[]) => {
        createMidiWriter(newtrackData);
    };

    return {
        handleStop,
        handleGenerate,
        handlePlay,
        handlePause,
        handleSelectInstrument,
        handleNbrStepsChange,
        handleNbrMeasuresChange,
        handleChangeChord,
        handleTempoChange,
        selectedInstrument,
        isPlaying,
        nbrSteps,
        nbrMeasures,
        tempo,
        octave,
    };
};
