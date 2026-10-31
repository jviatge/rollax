import { blocksShortcuts } from "@/lib/keyboard";
import { cn } from "@/lib/utils";
import {
    AudioLines,
    FastForward,
    Pause,
    Play,
    Repeat,
    Rewind,
    Square,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTrack } from "../hooks/useTrack";
import { notes } from "@/notes";
import { ExportMidiDialog } from "./ExportMidiDialog";
import { ImportMidiDialog } from "./ImportMidiDialog";
import { buildMidi, downloadMidi, midiToTrack, parseMidi } from "./midi";
import { BASS_OCTAVES_DOWN } from "./providers/Sequencer.provider";
import { useChord } from "./hooks/useChord";
import { useSequencer } from "./hooks/useSequencer";

const transportButton =
    "flex h-8 w-9 items-center justify-center rounded-md border border-daw-line bg-daw-raised text-daw-text hover:brightness-125";

/** A cell of the LCD display; an editable one highlights on hover and while its control has focus. */
const LcdCell = ({
    value,
    label,
    editable,
    last,
}: {
    value: React.ReactNode;
    label: string;
    editable?: boolean;
    last?: boolean;
}) => {
    const Cell = editable ? "label" : "div";
    return (
        <Cell
            className={cn(
                "relative flex flex-col justify-center px-3.5",
                !last && "border-r border-[#1f2a26]",
                editable && "cursor-pointer hover:bg-white/5 focus-within:bg-white/8",
            )}
        >
            <span className="text-lg leading-tight font-bold tracking-wide">{value}</span>
            <span className="text-[9px] tracking-widest text-daw-lcd-sub">{label}</span>
        </Cell>
    );
};

/** Shows the current option, with an invisible select over the whole cell to pick another one. */
const LcdSelect = <T extends string | number>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) => (
    <>
        {options.find((option) => option.value === value)?.label}
        <select
            aria-label={label}
            value={value}
            onChange={(e) => onChange(options[e.target.selectedIndex].value)}
            className="absolute inset-0 cursor-pointer appearance-none opacity-0"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value} className="bg-daw-panel text-daw-text">
                    {option.label}
                </option>
            ))}
        </select>
    </>
);

export const TransportBar = () => {
    const {
        isPlaying,
        playStep,
        nbrSteps,
        tempo,
        handleTempoChange,
        fundamentalNote,
        setFundamentalNote,
        cycle,
        toggleCycle,
        handlePlay,
        handlePause,
        handleStop,
        handlePreviousMeasure,
        handleNextMeasure,
        totalSteps,
        nbrMeasures,
        handleNbrMeasuresChange,
        handleNbrStepsChange,
        octave,
        setSelectedStep,
    } = useSequencer();
    const { ListChordsByNotes } = useChord();
    const { trackData, tracks, setTracks } = useTrack();
    const hasComposition = trackData.length > 0 || tracks.bass.length > 0;
    // The typed tempo while the field is being edited; otherwise the field shows the current tempo.
    const [tempoDraft, setTempoDraft] = useState<string | null>(null);
    const tempoText = tempoDraft ?? String(tempo);
    const cancelTempoRef = useRef(false);

    const clampTempo = (value: number) => Math.min(240, Math.max(40, value));

    // The typed tempo applies on blur or Enter, kept within 40–240 BPM; Escape restores the current one.
    const commitTempo = () => {
        const value = cancelTempoRef.current ? tempo : clampTempo(Number(tempoText) || tempo);
        cancelTempoRef.current = false;
        handleTempoChange(value);
        setTempoDraft(null);
    };

    const handleTempoKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            // Arrows step the tempo by 1 (10 with Shift) and apply it right away.
            e.preventDefault();
            const step = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1);
            const value = clampTempo((Number(tempoText) || tempo) + step);
            handleTempoChange(value);
            setTempoDraft(String(value));
        }
        if (e.key === "Escape") cancelTempoRef.current = true;
        if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
    };

    // Replaces the composition with the file's chords on the current steps per measure, and takes
    // its tempo and length (up to the 4-measure grid).
    const handleImport = async (file: File) => {
        let midi: ReturnType<typeof parseMidi>;
        try {
            midi = parseMidi(await file.arrayBuffer());
        } catch (err) {
            throw new Error(`${file.name} could not be read as a MIDI file${err instanceof Error ? ` (${err.message})` : ""}.`);
        }
        if (midi.notes.length === 0) throw new Error(`${file.name} has no notes to import.`);
        const { track, nbrMeasures } = midiToTrack({
            notes: midi.notes,
            ppq: midi.ppq,
            nbrSteps,
            maxMeasures: 4,
            library: ListChordsByNotes,
        });
        if (midi.tempo) handleTempoChange(clampTempo(Math.round(midi.tempo)));
        handleNbrMeasuresChange(nbrMeasures);
        // The import replaces the whole composition, bass included, in one undo step.
        setTracks(() => ({ chords: track, bass: [] }));
        setSelectedStep(null);
    };

    const handleExport = (filename: string) =>
        downloadMidi(
            buildMidi({
                parts: [
                    { data: tracks.chords, octave },
                    { data: tracks.bass, octave: octave - BASS_OCTAVES_DOWN },
                ],
                nbrSteps,
                totalSteps,
                tempo,
            }),
            filename,
        );

    const togglePlayback = useEffectEvent(() => (isPlaying ? handlePause() : handlePlay()));

    // Space toggles playback, except while typing in a field.
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.code !== "Space" || blocksShortcuts(e.target)) return;
            // Also stops a focused button from being clicked by the same key press.
            e.preventDefault();
            if (e.type === "keydown" && !e.repeat) togglePlayback();
        };
        window.addEventListener("keydown", handleKey);
        window.addEventListener("keyup", handleKey);
        return () => {
            window.removeEventListener("keydown", handleKey);
            window.removeEventListener("keyup", handleKey);
        };
    }, []);

    return (
        <header className="grid h-15 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-daw-edge bg-daw-bar px-4">
            <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-2">
                    <div className="flex size-6.5 items-center justify-center rounded-[7px] bg-daw-accent text-daw-accent-ink">
                        <AudioLines className="size-4" strokeWidth={2.4} />
                    </div>
                    <span className="text-[15px] font-bold">Rollax</span>
                </div>
                <span className="text-daw-muted">Untitled project</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex gap-1">
                    <button type="button" aria-label="Previous measure" className={transportButton} onClick={handlePreviousMeasure}>
                        <Rewind className="size-4" fill="currentColor" />
                    </button>
                    <button type="button" aria-label="Stop" className={transportButton} onClick={handleStop}>
                        <Square className="size-3.5" fill="currentColor" />
                    </button>
                    <button
                        type="button"
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className={cn(
                            transportButton,
                            "w-11",
                            isPlaying && "border-daw-accent bg-daw-accent text-daw-accent-ink",
                        )}
                        onClick={isPlaying ? handlePause : handlePlay}
                    >
                        {isPlaying ? (
                            <Pause className="size-4" fill="currentColor" />
                        ) : (
                            <Play className="size-4" fill="currentColor" />
                        )}
                    </button>
                    <button type="button" aria-label="Next measure" className={transportButton} onClick={handleNextMeasure}>
                        <FastForward className="size-4" fill="currentColor" />
                    </button>
                    <button
                        type="button"
                        aria-label="Loop"
                        aria-pressed={cycle}
                        className={cn(transportButton, cycle && "bg-[#2f3e5c] text-[#9fc2ff]")}
                        onClick={toggleCycle}
                    >
                        <Repeat className="size-4" />
                    </button>
                </div>

                <div className="flex h-11 items-stretch rounded-lg border border-black bg-daw-lcd font-mono text-daw-lcd-text shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
                    <LcdCell
                        value={`${Math.floor(playStep / nbrSteps) + 1} . ${(playStep % nbrSteps) + 1}`}
                        label="BAR · STEP"
                    />
                    <LcdCell
                        editable
                        label="BPM"
                        value={
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                spellCheck={false}
                                aria-label="Tempo (BPM)"
                                value={tempoText}
                                // Digits only, at most three: the tempo is 40–240 BPM.
                                onChange={(e) => setTempoDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                onFocus={(e) => {
                                    setTempoDraft(String(tempo));
                                    e.target.select();
                                }}
                                onBlur={commitTempo}
                                onKeyDown={handleTempoKey}
                                // Sized to the digits plus the 0.025em letter spacing of tracking-wide, so none is clipped.
                                style={{ width: `calc(${Math.max(1, tempoText.length)} * (1ch + 0.025em))` }}
                                className="cursor-pointer bg-transparent p-0 font-mono text-lg leading-tight font-bold tracking-wide text-daw-lcd-text outline-none focus:cursor-text"
                            />
                        }
                    />
                    <LcdCell value="4/4" label="TIME" />
                    <LcdCell
                        editable
                        label="BARS"
                        value={
                            <LcdSelect
                                label="Measures"
                                value={nbrMeasures}
                                options={[1, 2, 3, 4].map((value) => ({ value, label: String(value) }))}
                                onChange={handleNbrMeasuresChange}
                            />
                        }
                    />
                    <LcdCell
                        editable
                        label="STEPS"
                        value={
                            <LcdSelect
                                label="Steps per measure"
                                value={nbrSteps}
                                options={[2, 4, 8, 16].map((value) => ({ value, label: `1/${value}` }))}
                                onChange={handleNbrStepsChange}
                            />
                        }
                    />
                    <LcdCell
                        editable
                        last
                        label="KEY"
                        value={
                            <LcdSelect
                                label="Key"
                                value={fundamentalNote}
                                options={notes.map((note) => ({ value: note, label: note }))}
                                onChange={setFundamentalNote}
                            />
                        }
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <ImportMidiDialog hasTrack={hasComposition} onImport={handleImport} />
                <ExportMidiDialog disabled={!hasComposition} onExport={handleExport} />
            </div>
        </header>
    );
};
