import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronsLeft, ChevronsRight, Eraser, Power, Trash2, WandSparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTrack } from "../hooks/useTrack";
import { TLane } from "../providers/Track.provider";
import { dialogButton } from "./ExportMidiDialog";
import { useGenerate } from "./hooks/useGenerate";
import { useSequencer } from "./hooks/useSequencer";
import { TBus, TEffectId, TEffects } from "./providers/Sequencer.provider";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-[11px] font-semibold tracking-widest text-daw-muted uppercase">
        {children}
    </h2>
);

const Segmented = <T extends string | number>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) => (
    <div className="flex flex-col gap-1.5">
        <SectionTitle>{label}</SectionTitle>
        <div
            role="group"
            aria-label={label}
            className="grid gap-0.5 rounded-[7px] bg-daw-well p-0.5"
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={option.value === value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "h-7.5 rounded-[5px] font-semibold text-[#a1a1a6]",
                        option.value === value && "bg-[#45454b] text-white",
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    </div>
);

const EffectSlider = ({
    label,
    value,
    min,
    max,
    step,
    format,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    format: (value: number) => string;
    onChange: (value: number) => void;
}) => (
    <label className="flex flex-col gap-1 text-xs text-daw-sub">
        <span className="flex justify-between">
            {label}
            <span className="font-mono text-daw-muted">{format(value)}</span>
        </span>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-4 w-full cursor-pointer accent-daw-accent"
        />
    </label>
);

const percent = (value: number) => `${Math.round(value * 100)}%`;

type TEffectParam = {
    key: keyof TEffects;
    label: string;
    min: number;
    max: number;
    step: number;
    format: (value: number) => string;
};

const EFFECTS: { id: TEffectId; name: string; description: string; params: TEffectParam[] }[] = [
    {
        id: "reverb",
        name: "Reverb",
        description: "Adds a room around the sound. Size is how long the reverb tail lasts.",
        params: [
            { key: "reverbMix", label: "Mix", min: 0, max: 1, step: 0.01, format: percent },
            {
                key: "reverbSize",
                label: "Size",
                min: 0.5,
                max: 8,
                step: 0.1,
                format: (value) => `${value.toFixed(1)} s`,
            },
        ],
    },
    {
        id: "delay",
        name: "Delay",
        description:
            "Echoes the sound on eighth notes at the current tempo. Feedback sets how long the echoes last.",
        params: [
            { key: "delayMix", label: "Mix", min: 0, max: 1, step: 0.01, format: percent },
            {
                key: "delayFeedback",
                label: "Feedback",
                min: 0,
                max: 0.9,
                step: 0.01,
                format: percent,
            },
        ],
    },
];

/**
 * An effect's row: the name and settings open a dialog to adjust them, and the power icon turns the
 * effect on or off without losing its settings.
 */
const BUS_NAMES: Record<TBus, string> = { master: "Master", chords: "Chords", bass: "Bass" };

const EffectButton = ({ effect, bus }: { effect: (typeof EFFECTS)[number]; bus: TBus }) => {
    const { effects, handleEffectChange, effectsOn, toggleEffect } = useSequencer();
    const [open, setOpen] = useState(false);
    const on = effectsOn[bus][effect.id];

    return (
        <>
            <div
                className={cn(
                    "flex h-6 items-stretch overflow-hidden rounded-[7px] border border-daw-line bg-daw-raised",
                    !on && "opacity-60",
                )}
            >
                <button
                    type="button"
                    aria-label={`Turn ${effect.name} ${on ? "off" : "on"}`}
                    aria-pressed={on}
                    title={on ? "On" : "Off"}
                    onClick={() => toggleEffect(bus, effect.id)}
                    className={cn(
                        "flex w-6 shrink-0 items-center justify-center border-r border-daw-line",
                        on ? "text-daw-accent" : "text-daw-muted",
                    )}
                >
                    <Power className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    title={`Configure ${effect.name}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 text-left hover:bg-white/5"
                >
                    <span className="flex min-w-0 flex-col">
                        <span className="font-semibold">{effect.name}</span>
                    </span>
                </button>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    showCloseButton={false}
                    className="rounded-xl border border-daw-line bg-daw-panel text-daw-text ring-0 sm:max-w-sm"
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between text-[15px] font-bold">
                            <span>
                                {effect.name}
                                <span className="ml-2 text-xs font-semibold text-daw-muted">
                                    {BUS_NAMES[bus]}
                                </span>
                            </span>
                            <button
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleEffect(bus, effect.id)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                                    on
                                        ? "border-daw-accent text-daw-accent"
                                        : "border-daw-line text-daw-muted",
                                )}
                            >
                                <Power className="size-3.5" />
                                {on ? "On" : "Off"}
                            </button>
                        </DialogTitle>
                        <DialogDescription className="leading-normal text-daw-muted">
                            {effect.description}
                        </DialogDescription>
                    </DialogHeader>
                    <div className={cn("flex flex-col gap-4", !on && "opacity-50")}>
                        {effect.params.map((param) => (
                            <EffectSlider
                                key={param.key}
                                label={param.label}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                format={param.format}
                                value={effects[bus][param.key]}
                                onChange={(value) => handleEffectChange(bus, param.key, value)}
                            />
                        ))}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <button
                                type="button"
                                className={cn(dialogButton, "bg-daw-accent text-daw-accent-ink")}
                            >
                                Done
                            </button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Labels wrap onto two lines in the narrow drawer columns.
const actionButton =
    "flex min-h-8.5 items-center justify-center gap-2 rounded-[7px] px-2 py-1 text-center leading-tight font-semibold disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:shrink-0";

/** Lowest level shown by the meter, in dB. */
const METER_FLOOR = -60;
const METER_MARKS = [0, -6, -12, -24, -48];

/**
 * A stereo level meter. It reads the output level every frame and moves the bars itself, so the
 * sequencer doesn't re-render at 60 fps.
 */
const VuMeter = ({ bus }: { bus: TBus }) => {
    const { getLevels } = useSequencer();
    const coverRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            getLevels(bus).forEach((db, channel) => {
                const level = Math.min(1, Math.max(0, (db - METER_FLOOR) / -METER_FLOOR));
                const cover = coverRefs.current[channel];
                // The cover hides the unlit top of the gradient.
                if (cover) cover.style.height = `${(1 - level) * 100}%`;
            });
            frame = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(frame);
    }, [getLevels, bus]);

    return (
        <div className="flex h-60 w-2/3 gap-2" aria-hidden="true">
            <div className="relative w-6 font-mono text-[9px] text-daw-muted">
                {METER_MARKS.map((db) => (
                    <span
                        key={db}
                        className="absolute right-0 -translate-y-1/2"
                        style={{ top: `${(db / METER_FLOOR) * 100}%` }}
                    >
                        {db}
                    </span>
                ))}
            </div>
            {["L", "R"].map((channel, i) => (
                <div key={channel} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative w-full flex-1 overflow-hidden rounded-sm bg-linear-to-t from-daw-accent via-daw-playhead via-80% to-[#ff5f57]">
                        <div
                            ref={(el) => {
                                coverRefs.current[i] = el;
                            }}
                            className="absolute inset-x-0 top-0 h-full bg-daw-well"
                        />
                    </div>
                    <span className="font-mono text-[9px] text-daw-muted">{channel}</span>
                </div>
            ))}
        </div>
    );
};

/** A bus's effects; a track also gets its instrument. */
const BusPanel = ({ bus }: { bus: TBus }) => {
    const { instrumentsByLane, handleSelectInstrument } = useSequencer();

    return (
        <div className="flex flex-col gap-5 p-4">
            {bus !== "master" && (
                <Segmented
                    label="Instrument"
                    value={instrumentsByLane[bus]}
                    options={[
                        { value: "synth", label: "Synth" },
                        { value: "piano", label: "Piano" },
                    ]}
                    onChange={(instrument) => handleSelectInstrument(bus, instrument)}
                />
            )}
            <div className="flex flex-col gap-2">
                <SectionTitle>Effects</SectionTitle>
                {EFFECTS.map((effect) => (
                    <EffectButton key={effect.id} effect={effect} bus={bus} />
                ))}
            </div>
        </div>
    );
};

/** The output meter of a bus, filling the rest of its column. */
const OutputSection = ({ bus }: { bus: TBus }) => (
    <div className="flex min-h-40 flex-col gap-2 border-t border-daw-edge p-4">
        <SectionTitle>Output</SectionTitle>
        <VuMeter bus={bus} />
    </div>
);

const SelectionPanel = ({ onGenerate }: { onGenerate: () => void }) => {
    const { nbrSteps, selectedStep, selectedLane, selectedRange, selectedArea, setSelectedStep } =
        useSequencer();
    const { tracks, handleClearRange } = useTrack();
    // The tracks the selection acts on: its own, or both for a selection made in the ruler.
    const lanes: TLane[] = selectedLane === "all" ? ["chords", "bass"] : [selectedLane];
    const laneTrack = selectedLane === "all" ? [] : tracks[selectedLane];
    const selectedChord = selectedRange
        ? undefined
        : laneTrack.find((data) => data.step === selectedStep);
    const chordAt = (step: number) =>
        laneTrack.find((data) => step >= data.step && step < data.step + data.len);
    const stepLabel = (step: number) =>
        `Bar ${Math.floor(step / nbrSteps) + 1} · Step ${(step % nbrSteps) + 1}`;
    const hasChords =
        !!selectedArea &&
        lanes.some((lane) =>
            tracks[lane].some(
                (data) => data.step < selectedArea.end && data.step + data.len > selectedArea.start,
            ),
        );
    const laneLabel = { chords: "Chords", bass: "Bass", all: "Chords + bass" }[selectedLane];

    return (
        <div className="flex flex-col gap-3 p-4">
            <div className="font-mono text-xs text-daw-sub">
                {selectedStep !== null && (
                    <span className={selectedLane === "bass" ? "text-daw-bass" : "text-daw-accent"}>
                        {laneLabel} ·{" "}
                    </span>
                )}
                {selectedRange
                    ? `${stepLabel(selectedRange.start)} – ${stepLabel(selectedRange.end - 1)}`
                    : selectedStep === null
                      ? "No step selected"
                      : stepLabel(selectedStep)}
            </div>
            {selectedChord ? (
                <div className="flex flex-col gap-3 rounded-[10px] border border-daw-raised bg-[#1a1a1c] p-3.5">
                    <div
                        className={cn(
                            "text-3xl font-bold",
                            selectedLane === "bass" ? "text-daw-bass" : "text-daw-accent",
                        )}
                    >
                        {selectedChord.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {selectedChord.chord.map((note) => (
                            <span
                                key={note}
                                className="rounded-full bg-[#2e2e32] px-2.5 py-0.5 font-mono text-xs"
                            >
                                {note}
                            </span>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="rounded-[10px] border border-dashed border-daw-line p-3.5 leading-normal text-daw-muted">
                    {selectedRange
                        ? `${selectedRange.end - selectedRange.start} steps selected.`
                        : selectedStep === null
                          ? "Click or drag across steps to select them. Click a track name to manage the track."
                          : chordAt(selectedStep)
                            ? `Inside ${chordAt(selectedStep)?.name}. Drop a chord here to split it.`
                            : "Empty step. Drag a chord from the library onto it."}
                </p>
            )}
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={!selectedArea}
                    title={
                        selectedLane === "bass"
                            ? "Bass on the roots of the chords in the selection"
                            : selectedLane === "all"
                              ? "Chords, then a bass on their roots, in the selection"
                              : "Chords in the selection"
                    }
                    className={cn(
                        actionButton,
                        "border border-daw-accent text-daw-accent hover:bg-daw-accent/10",
                    )}
                >
                    <WandSparkles className="size-4" />
                    Generate selection
                </button>
                <button
                    type="button"
                    onClick={() =>
                        selectedArea &&
                        handleClearRange(selectedArea.start, selectedArea.end, lanes)
                    }
                    disabled={!hasChords}
                    title="Delete or Backspace"
                    className={cn(
                        actionButton,
                        "border border-[#5a2a2a] bg-[#3a1f1f] text-[#ffb4ab]",
                    )}
                >
                    {selectedChord ? <Trash2 className="size-4" /> : <Eraser className="size-4" />}
                    {selectedChord
                        ? selectedLane === "bass"
                            ? "Delete note"
                            : "Delete chord"
                        : "Clear steps"}
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedStep(null)}
                    disabled={selectedStep === null}
                    title="Escape"
                    className={cn(actionButton, "border border-daw-line bg-daw-raised")}
                >
                    <X className="size-4" />
                    Deselect
                </button>
            </div>
        </div>
    );
};

/** A whole track selected from its header: its Generate, instrument, effects and output meter. */
const TrackPanel = ({ lane, onGenerate }: { lane: TLane; onGenerate: () => void }) => {
    const bass = lane === "bass";
    return (
        <>
            <div className="flex shrink-0 flex-col gap-3 border-b border-daw-edge p-4">
                <span
                    className={cn("font-mono text-xs", bass ? "text-daw-bass" : "text-daw-accent")}
                >
                    {BUS_NAMES[lane]} track
                </span>
                <button
                    type="button"
                    onClick={onGenerate}
                    title={
                        bass
                            ? "Replaces the bass line with the roots of the chords"
                            : "Replaces the chords with a progression in the key"
                    }
                    className={cn(
                        actionButton,
                        bass
                            ? "border border-daw-bass text-daw-bass hover:bg-daw-bass/10"
                            : "border border-daw-accent text-daw-accent hover:bg-daw-accent/10",
                    )}
                >
                    <WandSparkles className="size-4" />
                    <span className="text-xs">Generate</span>
                </button>
            </div>
            {/* Pushed to the bottom of the column, like the master section in General. */}
            <div className="daw-scroll flex min-h-0 flex-1 flex-col justify-end overflow-y-auto">
                <BusPanel bus={lane} />
                <OutputSection bus={lane} />
            </div>
        </>
    );
};

const ColumnHeader = ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-daw-edge px-4">
        <SectionTitle>{title}</SectionTitle>
        {children}
    </div>
);

/**
 * The retractable drawer on the left: a General column (instrument, effects, Generate for the whole
 * track, level meter) and a Selection column (what is selected, Generate and delete for it).
 */
export const Inspector = () => {
    const [open, setOpen] = useState(true);
    const { generateTrack, generateBass, generateSelection } = useGenerate();
    const { selectedTrack } = useSequencer();

    if (!open) {
        return (
            <aside className="flex w-9 shrink-0 flex-col items-center border-r border-daw-edge bg-daw-panel">
                <button
                    type="button"
                    aria-label="Open the drawer"
                    title="Open the drawer"
                    onClick={() => setOpen(true)}
                    className="flex h-10 w-full items-center justify-center text-daw-muted hover:text-daw-text"
                >
                    <ChevronsRight className="size-4" />
                </button>
                <span className="mt-2 text-[11px] font-semibold tracking-widest text-daw-muted uppercase [writing-mode:vertical-rl]">
                    General · Selection
                </span>
            </aside>
        );
    }

    return (
        // Clicks in the drawer keep the selection, so the panels can act on it.
        <aside data-keeps-selection className="flex shrink-0 border-r border-daw-edge bg-daw-panel">
            <section aria-label="General" className="flex w-30 flex-col border-r border-daw-edge">
                <ColumnHeader title="General" />
                <div className="daw-scroll flex min-h-0 flex-1 flex-col overflow-y-auto justify-end">
                    <BusPanel bus="master" />
                    <OutputSection bus="master" />
                </div>
            </section>
            <section aria-label="Selection" className="flex w-30 flex-col">
                <ColumnHeader title="Selection">
                    <button
                        type="button"
                        aria-label="Close the drawer"
                        title="Close the drawer"
                        onClick={() => setOpen(false)}
                        className="text-daw-muted hover:text-daw-text"
                    >
                        <ChevronsLeft className="size-4" />
                    </button>
                </ColumnHeader>
                {selectedTrack ? (
                    <TrackPanel
                        lane={selectedTrack}
                        onGenerate={selectedTrack === "bass" ? generateBass : generateTrack}
                    />
                ) : (
                    <div className="daw-scroll min-h-0 flex-1 overflow-y-auto">
                        <SelectionPanel onGenerate={generateSelection} />
                    </div>
                )}
            </section>
        </aside>
    );
};
