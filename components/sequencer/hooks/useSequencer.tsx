"use client";

import { TTrackData } from "@/components/providers/Track.provider";
import { instruments } from "@/instruments";
import MidiPlayer from "midi-player-js";
import MidiWriter from "midi-writer-js";
import { useContext, useEffect } from "react";
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

export const useSequencer = () => {
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

    useEffect(() => {
        instrumentRef.current = instruments(selectedInstrument);

        const player = new MidiPlayer.Player((event: EventMidiPlayer) => {
            instrumentRef.current?.playKey(event);
        });

        player.on("endOfFile", () => {
            setIsPlaying(false);
            setIsPaused(false);
        });

        playerRef.current = player;

        // Initialize an empty writer
        const emptyTrack = new MidiWriter.Track();
        writerRef.current = new MidiWriter.Writer(emptyTrack);

        return () => {
            playerRef.current?.stop();
            playerRef.current = null;
        };
    }, [selectedInstrument]);

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

    const handleSelectInstrument = (instrument: "piano" | "synth") => {
        setSelectedInstrument(instrument);
    };

    const handleNbrStepsChange = (nbrSteps: number) => {
        setNbrSteps(nbrSteps);
    };

    const handleNbrMeasuresChange = (nbrMeasures: number) => {
        setNbrMeasures(nbrMeasures);
    };

    const handleTempoChange = (tempo: number, newtrackData: TTrackData[]) => {
        setTempo(tempo);
        handleChangeChord(newtrackData);
    };

    const handleChangeChord = (newtrackData: TTrackData[]) => {
        const newTrack = new MidiWriter.Track();
        newtrackData.forEach((data) => {
            if (data.chord) {
                const chordWithOctave = data.chord.map((note) => `${note}${octave}`);
                console.log("chordWithOctave", chordWithOctave);
                newTrack.addEvent(
                    new MidiWriter.NoteEvent({
                        pitch: chordWithOctave,
                        duration: "2",
                    }),
                );
            }
        });
        newTrack.setTempo(tempo);
        writerRef.current = new MidiWriter.Writer(newTrack);
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
