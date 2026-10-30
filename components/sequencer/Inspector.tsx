import { cn } from "@/lib/utils";
import { notes } from "@/notes";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTrack } from "../hooks/useTrack";
import { useSequencer } from "./hooks/useSequencer";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-[11px] font-semibold tracking-widest text-daw-muted uppercase">{children}</h2>
);

const Segmented = <T extends string | number>({
    label,
    options,
    value,
    disabled,
    onChange,
}: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    disabled?: boolean;
    onChange: (value: T) => void;
}) => (
    <div className="flex flex-col gap-1.5">
        <span className="text-xs text-daw-sub">{label}</span>
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
                    disabled={disabled}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "h-7.5 rounded-[5px] font-semibold text-[#a1a1a6] disabled:cursor-not-allowed disabled:opacity-50",
                        option.value === value && "bg-[#45454b] text-white",
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    </div>
);

const fieldClass =
    "h-8 rounded-md border border-daw-line bg-daw-well px-2.5 text-daw-text disabled:cursor-not-allowed disabled:opacity-50";

export const Inspector = () => {
    const {
        selectedInstrument,
        handleSelectInstrument,
        tempo,
        handleTempoChange,
        nbrMeasures,
        handleNbrMeasuresChange,
        nbrSteps,
        handleNbrStepsChange,
        fundamentalNote,
        setFundamentalNote,
        selectedStep,
    } = useSequencer();
    const { trackData, getChordAt, handleDeleteChord } = useTrack();
    const [tempoDraft, setTempoDraft] = useState(String(tempo));
    const selectedChord = trackData.find((data) => data.step === selectedStep);

    const commitTempo = () => {
        const value = Math.min(240, Math.max(40, Number(tempoDraft) || tempo));
        handleTempoChange(value);
        setTempoDraft(String(value));
    };

    return (
        <aside className="daw-scroll flex w-67 shrink-0 flex-col overflow-y-auto border-r border-daw-edge bg-daw-panel">
            <section className="flex flex-col gap-3.5 border-b border-daw-edge p-4">
                <SectionTitle>Track</SectionTitle>
                <Segmented
                    label="Instrument"
                    value={selectedInstrument}
                    options={[
                        { value: "synth", label: "Synth" },
                        { value: "piano", label: "Piano" },
                    ]}
                    onChange={handleSelectInstrument}
                />
                <div className="grid grid-cols-2 gap-2.5">
                    <label className="flex flex-col gap-1.5 text-xs text-daw-sub">
                        Tempo
                        <input
                            type="number"
                            min={40}
                            max={240}
                            value={tempoDraft}
                            onChange={(e) => setTempoDraft(e.target.value)}
                            onBlur={commitTempo}
                            onKeyDown={(e) => e.key === "Enter" && commitTempo()}
                            className={cn(fieldClass, "font-mono text-[13px]")}
                        />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs text-daw-sub">
                        Key
                        <select
                            value={fundamentalNote}
                            onChange={(e) => setFundamentalNote(e.target.value)}
                            className={cn(fieldClass, "text-[13px]")}
                        >
                            {notes.map((note) => (
                                <option key={note} value={note}>
                                    {note}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <Segmented
                    label="Measures"
                    value={nbrMeasures}
                    options={[1, 2, 3, 4].map((value) => ({ value, label: String(value) }))}
                    onChange={handleNbrMeasuresChange}
                />
                <Segmented
                    label="Steps per measure"
                    value={nbrSteps}
                    options={[2, 4, 8, 16].map((value) => ({ value, label: `1/${value}` }))}
                    onChange={handleNbrStepsChange}
                />
            </section>

            <section className="flex flex-col gap-3 p-4">
                <SectionTitle>Selected step</SectionTitle>
                <div className="font-mono text-xs text-daw-sub">
                    {selectedStep === null
                        ? "No step selected"
                        : `Bar ${Math.floor(selectedStep / nbrSteps) + 1} · Step ${(selectedStep % nbrSteps) + 1}`}
                </div>
                {selectedChord ? (
                    <div className="flex flex-col gap-3 rounded-[10px] border border-daw-raised bg-[#1a1a1c] p-3.5">
                        <div className="text-3xl font-bold text-daw-accent">{selectedChord.name}</div>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedChord.chord.map((note) => (
                                <span key={note} className="rounded-full bg-[#2e2e32] px-2.5 py-0.5 font-mono text-xs">
                                    {note}
                                </span>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleDeleteChord(selectedChord.step)}
                            className="flex h-8.5 items-center justify-center gap-2 rounded-[7px] border border-[#5a2a2a] bg-[#3a1f1f] font-semibold text-[#ffb4ab]"
                        >
                            <Trash2 className="size-4" />
                            Delete chord
                        </button>
                    </div>
                ) : (
                    <p className="rounded-[10px] border border-dashed border-daw-line p-3.5 leading-normal text-daw-muted">
                        {selectedStep === null
                            ? "Click a chord or a step on the chord track to select it."
                            : getChordAt(selectedStep)
                              ? `Inside ${getChordAt(selectedStep)?.name}. Drop a chord here to split it.`
                              : "Empty step. Drag a chord from the library onto it."}
                    </p>
                )}
            </section>
        </aside>
    );
};
