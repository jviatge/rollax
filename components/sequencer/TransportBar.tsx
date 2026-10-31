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
    WandSparkles,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
import { useTrack } from "../hooks/useTrack";
import { generateProgression, measureSegments, PROGRESSIONS } from "./generate";
import { ExportMidiDialog } from "./ExportMidiDialog";
import { buildMidi, downloadMidi } from "./midi";
import { useChord } from "./hooks/useChord";
import { useSequencer } from "./hooks/useSequencer";

const transportButton =
    "flex h-8 w-9 items-center justify-center rounded-md border border-daw-line bg-daw-raised text-daw-text hover:brightness-125";

const LcdCell = ({ value, label, last }: { value: React.ReactNode; label: string; last?: boolean }) => (
    <div className={cn("flex flex-col justify-center px-4", !last && "border-r border-[#1f2a26]")}>
        <span className="text-lg leading-tight font-bold tracking-wide">{value}</span>
        <span className="text-[9px] tracking-widest text-daw-lcd-sub">{label}</span>
    </div>
);

export const TransportBar = () => {
    const {
        isPlaying,
        playStep,
        nbrSteps,
        tempo,
        fundamentalNote,
        cycle,
        toggleCycle,
        handlePlay,
        handlePause,
        handleStop,
        handlePreviousMeasure,
        handleNextMeasure,
        totalSteps,
        octave,
        selectedArea,
        setSelectedStep,
    } = useSequencer();
    const { ListChordsByNotes } = useChord();
    const { trackData, handleReplaceTrack, handleReplaceRange } = useTrack();
    const lastProgressionRef = useRef<number | null>(null);

    // Fills the selected steps, or the whole track, with a random progression, never the same one
    // twice in a row.
    const handleGenerate = () => {
        const choices = PROGRESSIONS.map((_, i) => i).filter((i) => i !== lastProgressionRef.current);
        const progressionIndex = choices[Math.floor(Math.random() * choices.length)];
        lastProgressionRef.current = progressionIndex;
        const { start, end } = selectedArea ?? { start: 0, end: totalSteps };
        const chords = generateProgression({
            library: ListChordsByNotes,
            tonic: fundamentalNote,
            progressionIndex,
            segments: measureSegments(start, end, nbrSteps),
            withSeventh: Math.random() < 0.3,
        });
        if (selectedArea) {
            handleReplaceRange(start, end, chords);
        } else {
            handleReplaceTrack(chords);
            setSelectedStep(null);
        }
    };

    const handleExport = (filename: string) =>
        downloadMidi(buildMidi({ trackData, nbrSteps, totalSteps, tempo, octave }), filename);

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
                    <LcdCell value={tempo} label="BPM" />
                    <LcdCell value="4/4" label="TIME" />
                    <LcdCell value={fundamentalNote} label="KEY" last />
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={handleGenerate}
                    title={`Generate a chord progression in ${fundamentalNote} major ${selectedArea ? "in the selection" : "on the whole track"}`}
                    className="flex h-8.5 items-center gap-2 rounded-[7px] border border-daw-accent px-3.5 font-semibold text-daw-accent hover:bg-daw-accent/10"
                >
                    <WandSparkles className="size-4" />
                    Generate
                </button>
                <ExportMidiDialog disabled={trackData.length === 0} onExport={handleExport} />
            </div>
        </header>
    );
};
