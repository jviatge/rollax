import { cn } from "@/lib/utils";
import { noteIndex, notes } from "@/notes";
import { useEffect, useRef, useState } from "react";
import { TTrackData } from "../providers/Track.provider";
import { useTrack } from "../hooks/useTrack";
import { getChordDrag, hasChordDrag, setChordDrag } from "./chordDrag";
import { useSequencer } from "./hooks/useSequencer";

const KEY_W = 64;
const ROW_H = 20;
const RULER_H = 28;
const LANE_H = 52;
const MIN_COL_W = 36;

const gridLines = (measureW: number, colW: number, measureColor: string, stepColor: string) => ({
    backgroundImage: `linear-gradient(to right, ${measureColor} 1px, transparent 1px), linear-gradient(to right, ${stepColor} 1px, transparent 1px)`,
    backgroundSize: `${measureW}px 100%, ${colW}px 100%`,
});

const Playhead = ({ x }: { x: number }) => (
    <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-daw-playhead"
        style={{ left: x }}
    />
);

const DropPreview = ({ x, w }: { x: number; w: number }) => (
    <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-10 rounded-sm border-2 border-dashed border-daw-accent bg-daw-accent/15"
        style={{ left: x, width: w }}
    />
);

type TResize = { fromStep: number; edge: "start" | "end"; step: number; len: number };

export const GridSequencer = () => {
    const { nbrSteps, nbrMeasures, totalSteps, nbrNotes, octave, playStep, selectedStep, setSelectedStep } =
        useSequencer();
    const { trackData, handleChangeChord, handleMoveChord, getChordBounds, handleResizeChord } = useTrack();
    const [dragStep, setDragStep] = useState<number | null>(null);
    const [resize, setResize] = useState<TResize | null>(null);
    const laneRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [viewW, setViewW] = useState(0);
    const baseOctave = octave - 1;

    // Fit the steps to the available width; scroll horizontally only below MIN_COL_W.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setViewW(entry.contentRect.width));
        observer.observe(el);
        // Open centered on the octave the chords play in.
        const octaveCenter = RULER_H + LANE_H + (nbrNotes - (octave - baseOctave + 1) * 12 + 6) * ROW_H;
        el.scrollTop = Math.max(0, octaveCenter - el.clientHeight / 2);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const colW = Math.max(MIN_COL_W, Math.floor((viewW - KEY_W) / totalSteps) || MIN_COL_W);
    const gridW = colW * totalSteps;
    const measureW = colW * nbrSteps;
    // While an edge is dragged, the chord is drawn at its preview size; `id` keeps its original step.
    const shownTrack = trackData.map((data) =>
        resize?.fromStep === data.step
            ? { ...data, id: data.step, step: resize.step, len: resize.len }
            : { ...data, id: data.step },
    );
    const selectedChord = shownTrack.find((data) => data.id === selectedStep);
    const selectedNotes = new Set(selectedChord?.chord.map(noteIndex) ?? []);
    const steps = [...Array(totalSteps).keys()];

    // Top row is the highest note.
    const rows = [...Array(nbrNotes).keys()].map((row) => {
        const index = nbrNotes - 1 - row;
        const name = notes[index % 12];
        const rowOctave = baseOctave + Math.floor(index / 12);
        return {
            name,
            octave: rowOctave,
            black: name.includes("#"),
            inSelectedChord: rowOctave === octave && selectedNotes.has(index % 12),
        };
    });
    const rowOf = (note: string) => nbrNotes - 1 - ((octave - baseOctave) * 12 + noteIndex(note));
    const playX = playStep * colW;
    const highlight = selectedChord
        ? { x: selectedChord.step * colW, w: selectedChord.len * colW }
        : selectedStep !== null
          ? { x: selectedStep * colW, w: colW }
          : null;

    // The chord track and the piano roll both start at the grid origin, so the step under
    // the pointer comes from its x offset.
    const stepAt = (e: React.DragEvent<HTMLElement>) =>
        Math.min(
            totalSteps - 1,
            Math.max(0, Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left) / colW)),
        );
    const startResize = (e: React.PointerEvent<HTMLSpanElement>, data: TTrackData, edge: TResize["edge"]) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setResize({ fromStep: data.step, edge, step: data.step, len: data.len });
    };
    const moveResize = (e: React.PointerEvent<HTMLSpanElement>) => {
        const lane = laneRef.current;
        if (!resize || !lane) return;
        // Snap the dragged edge to the nearest step line, inside the chord's free space.
        const line = Math.round((e.clientX - lane.getBoundingClientRect().left) / colW);
        const { min, max } = getChordBounds(resize.fromStep, totalSteps);
        const end = resize.step + resize.len;
        const next =
            resize.edge === "end"
                ? { step: resize.step, len: Math.min(Math.max(line, resize.step + 1), max) - resize.step }
                : (() => {
                      const step = Math.min(Math.max(line, min), end - 1);
                      return { step, len: end - step };
                  })();
        if (next.step !== resize.step || next.len !== resize.len) setResize({ ...resize, ...next });
    };
    const endResize = () => {
        if (!resize) return;
        handleResizeChord(resize.fromStep, resize.step, resize.len, totalSteps);
        if (selectedStep === resize.fromStep) setSelectedStep(resize.step);
        setResize(null);
    };

    const dropHandlers = {
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
            if (!hasChordDrag(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === "move" ? "move" : "copy";
            setDragStep(stepAt(e));
        },
        onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragStep(null);
        },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            const payload = getChordDrag(e);
            setDragStep(null);
            if (!payload) return;
            e.preventDefault();
            const step = stepAt(e);
            if ("fromStep" in payload) {
                handleMoveChord(payload.fromStep, step, totalSteps);
            } else {
                handleChangeChord(payload.notes, step, payload.name, totalSteps);
            }
            setSelectedStep(step);
        },
    };
    const dropPreview = dragStep !== null && <DropPreview x={dragStep * colW} w={colW} />;

    return (
        <div ref={scrollRef} className="daw-scroll relative min-h-0 flex-1 overflow-auto">
            <div
                className="grid"
                style={{
                    width: KEY_W + gridW,
                    gridTemplateColumns: `${KEY_W}px ${gridW}px`,
                    gridTemplateRows: `${RULER_H}px ${LANE_H}px auto`,
                }}
            >
                {/* Ruler */}
                <div className="sticky top-0 left-0 z-30 border-r border-b border-daw-edge bg-daw-bar" />
                <div className="sticky top-0 z-20 border-b border-daw-edge bg-daw-bar">
                    <div className="relative h-full" style={gridLines(measureW, colW, "#4a4a50", "#36363b")}>
                        {[...Array(nbrMeasures).keys()].map((measure) => (
                            <span
                                key={measure}
                                className="absolute top-1.5 font-mono text-[11px] font-bold text-daw-sub"
                                style={{ left: measure * measureW + 6 }}
                            >
                                {measure + 1}
                            </span>
                        ))}
                        <Playhead x={playX} />
                    </div>
                </div>

                {/* Chord track */}
                <div
                    className="sticky left-0 z-30 flex items-center justify-center border-r border-b border-daw-edge bg-[#26262a] text-[10px] font-semibold tracking-widest text-daw-muted"
                    style={{ top: RULER_H }}
                >
                    CHORDS
                </div>
                <div className="sticky z-20 border-b border-daw-edge bg-[#202023]" style={{ top: RULER_H }}>
                    <div
                        ref={laneRef}
                        className="relative h-full"
                        style={gridLines(measureW, colW, "#3a3a3f", "#2b2b2f")}
                        {...dropHandlers}
                    >
                        {steps.map((step) => (
                            <button
                                key={step}
                                type="button"
                                aria-label={`Bar ${Math.floor(step / nbrSteps) + 1}, step ${(step % nbrSteps) + 1}`}
                                onClick={() => setSelectedStep(step)}
                                className={cn(
                                    "absolute inset-y-0 hover:bg-white/5",
                                    selectedStep === step && !selectedChord && "bg-daw-select/25",
                                )}
                                style={{ left: step * colW, width: colW }}
                            />
                        ))}
                        {shownTrack.map((data) => (
                            <div
                                key={data.id}
                                className="group absolute top-1.75 h-9.5"
                                style={{ left: data.step * colW + 2, width: data.len * colW - 4 }}
                            >
                                <button
                                    type="button"
                                    draggable={!resize}
                                    onDragStart={(e) => setChordDrag(e, { fromStep: data.id })}
                                    onClick={(e) => {
                                        // A click past the first step selects that step, so a chord can split this one.
                                        const offset = e.clientX - e.currentTarget.getBoundingClientRect().left + 2;
                                        setSelectedStep(data.step + Math.min(data.len - 1, Math.floor(offset / colW)));
                                    }}
                                    className={cn(
                                        "flex size-full cursor-grab flex-col items-start justify-center overflow-hidden rounded-md border-2 border-transparent bg-daw-accent px-2.5 text-left text-daw-accent-ink active:cursor-grabbing",
                                        selectedStep === data.id && "border-white",
                                    )}
                                >
                                    <span className="text-[13px] leading-tight font-bold">{data.name}</span>
                                    <span className="font-mono text-[10px] whitespace-nowrap">{data.chord.join(" ")}</span>
                                </button>
                                {(["start", "end"] as const).map((edge) => (
                                    <span
                                        key={edge}
                                        aria-hidden="true"
                                        onPointerDown={(e) => startResize(e, data, edge)}
                                        onPointerMove={moveResize}
                                        onPointerUp={endResize}
                                        onPointerCancel={() => setResize(null)}
                                        className={cn(
                                            "absolute inset-y-0 z-10 flex w-2 cursor-ew-resize touch-none items-center justify-center",
                                            edge === "start" ? "left-0" : "right-0",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "h-4 w-0.5 rounded-full bg-daw-accent-ink/50 opacity-0 group-hover:opacity-100",
                                                resize?.fromStep === data.id && resize.edge === edge && "opacity-100",
                                            )}
                                        />
                                    </span>
                                ))}
                            </div>
                        ))}
                        {dropPreview}
                        <Playhead x={playX} />
                    </div>
                </div>

                {/* Keyboard */}
                <div className="sticky left-0 z-10 border-r border-daw-edge">
                    {rows.map((row, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex items-center justify-end border-b pr-1.5 text-[10px] font-semibold",
                                row.black
                                    ? "border-black bg-daw-well text-[#8e8e93]"
                                    : "border-[#c7c7cc] bg-[#e9e9ec] text-[#3a3a3d]",
                                row.name === "C" && "border-[#8e8e93]",
                                row.inSelectedChord && "bg-daw-accent text-daw-accent-ink",
                            )}
                            style={{ height: ROW_H }}
                        >
                            {row.name === "C" && `C${row.octave}`}
                        </div>
                    ))}
                </div>

                {/* Piano roll */}
                <div className="relative" {...dropHandlers}>
                    {rows.map((row, i) => (
                        <div
                            key={i}
                            className={cn(
                                "border-b",
                                row.black ? "bg-[#1e1e21]" : row.octave === octave ? "bg-[#29292d]" : "bg-[#252528]",
                                row.name === "C" ? "border-daw-line" : "border-[#1a1a1c]",
                            )}
                            style={{ height: ROW_H }}
                        />
                    ))}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        style={gridLines(measureW, colW, "#45454b", "#303035")}
                    />
                    {highlight && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 border-x border-daw-select/60 bg-daw-select/12"
                            style={{ left: highlight.x, width: highlight.w }}
                        />
                    )}
                    {shownTrack.flatMap((data) =>
                        data.chord.map((note) => (
                            <div
                                key={`${data.id}-${note}`}
                                className="absolute flex h-4 items-center overflow-hidden rounded bg-daw-accent pl-1.5 text-[10px] font-bold text-daw-accent-ink shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]"
                                style={{
                                    top: rowOf(note) * ROW_H + 2,
                                    left: data.step * colW + 2,
                                    width: data.len * colW - 4,
                                }}
                            >
                                {data.len * colW > 36 && `${note}${octave}`}
                            </div>
                        )),
                    )}
                    {dropPreview}
                    <Playhead x={playX} />
                </div>
            </div>
        </div>
    );
};
