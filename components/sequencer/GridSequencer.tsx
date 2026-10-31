import { blocksShortcuts } from "@/lib/keyboard";
import { cn } from "@/lib/utils";
import { noteIndex, notes, shownOctave } from "@/notes";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { TLane, TTrackData } from "../providers/Track.provider";
import { useTrack, writeRange } from "../hooks/useTrack";
import { getChordDrag, hasChordDrag, setChordDrag } from "./chordDrag";
import { useSequencer } from "./hooks/useSequencer";
import { laneOctave, LOWEST_OCTAVE } from "./providers/Sequencer.provider";

const KEY_W = 64;
const ROW_H = 20;
const RULER_H = 28;
const LANE_H = 52;
const BASS_H = 40;
const MIN_COL_W = 36;

const gridLines = (measureW: number, colW: number, measureColor: string, stepColor: string) => ({
    backgroundImage: `linear-gradient(to right, ${measureColor} 1px, transparent 1px), linear-gradient(to right, ${stepColor} 1px, transparent 1px)`,
    backgroundSize: `${measureW}px 100%, ${colW}px 100%`,
});

/** Glides with the transport while playing, stays where it paused, and sits on the play step when stopped. */
const Playhead = ({ colW }: { colW: number }) => {
    const { isPlaying, isPaused, playStep, getPlayPosition } = useSequencer();
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const place = (position: number) => (el.style.transform = `translateX(${position * colW}px)`);
        if (!isPlaying) {
            place(isPaused ? getPlayPosition() : playStep);
            return;
        }
        let frame = 0;
        const update = () => {
            place(getPlayPosition());
            frame = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(frame);
    }, [isPlaying, isPaused, playStep, getPlayPosition, colW]);

    return (
        <div
            ref={ref}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 bg-daw-playhead will-change-transform"
        />
    );
};

const DropPreview = ({ x, w }: { x: number; w: number }) => (
    <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-10 rounded-sm border-2 border-dashed border-daw-accent bg-daw-accent/15"
        style={{ left: x, width: w }}
    />
);

type TResize = { lane: TLane; fromStep: number; edge: "start" | "end"; step: number; len: number };

/** How each track is drawn: its label, sticky offset below the ruler, region size, and colors. */
const LANES: Record<TLane, { label: string; top: number; region: string; colors: string; handle: string }> = {
    chords: {
        label: "CHORDS",
        top: RULER_H,
        region: "top-1.75 h-9.5",
        colors: "bg-daw-accent text-daw-accent-ink",
        handle: "bg-daw-accent-ink/50",
    },
    bass: {
        label: "BASS",
        top: RULER_H + LANE_H,
        region: "top-1 h-8",
        colors: "bg-daw-bass text-daw-bass-ink",
        handle: "bg-daw-bass-ink/50",
    },
};

export const GridSequencer = () => {
    const {
        nbrSteps,
        nbrMeasures,
        totalSteps,
        nbrNotes,
        octave,
        selectedStep,
        setSelectedStep,
        selectedLane,
        selectedRange,
        selectedArea,
        extendSelection,
        selectedTrack,
        setSelectedTrack,
    } = useSequencer();
    const chordsTrack = useTrack("chords");
    const bassTrack = useTrack("bass");
    const trackApi: Record<TLane, ReturnType<typeof useTrack>> = { chords: chordsTrack, bass: bassTrack };
    const { tracks, handleClearRange } = chordsTrack;
    // The step under a drag, on the track it is over (the piano roll counts as the chord track).
    const [drag, setDrag] = useState<{ lane: TLane; step: number } | null>(null);
    // The placed chord being dragged, kept because a drag's data can only be read on drop.
    const [moving, setMoving] = useState<{ lane: TLane; chord: TTrackData } | null>(null);
    const [resize, setResize] = useState<TResize | null>(null);
    const [selecting, setSelecting] = useState(false);
    const laneRefs = useRef<Record<TLane, HTMLDivElement | null>>({ chords: null, bass: null });
    const rulerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [viewW, setViewW] = useState(0);
    const baseOctave = LOWEST_OCTAVE;

    // Fit the steps to the available width; scroll horizontally only below MIN_COL_W.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => setViewW(entry.contentRect.width));
        observer.observe(el);
        // Open centered on the octave the chords play in.
        const octaveCenter = RULER_H + LANE_H + BASS_H + (nbrNotes - (octave - baseOctave + 1) * 12 + 6) * ROW_H;
        el.scrollTop = Math.max(0, octaveCenter - el.clientHeight / 2);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearSelection = useEffectEvent(() => setSelectedStep(null));
    // Removes what the selection covers on its track (or every track), splitting chords selected in
    // their middle.
    const deleteSelection = useEffectEvent(() => {
        if (!selectedArea) return;
        handleClearRange(selectedArea.start, selectedArea.end, selectedLane === "all" ? ["chords", "bass"] : [selectedLane]);
    });

    // A press outside the ruler and the tracks, or Escape, clears the selection. Controls are left
    // out so they can act on it, and so is the grid's own scrollbar. Delete or Backspace deletes
    // what is selected.
    useEffect(() => {
        const handlePointer = (e: PointerEvent) => {
            const target = e.target;
            if (!(target instanceof Element) || target === scrollRef.current) return;
            const inGrid = [laneRefs.current.chords, laneRefs.current.bass, rulerRef.current].some((el) =>
                el?.contains(target),
            );
            if (inGrid) return;
            const keeps = "button, input, select, textarea, a, label, [draggable='true'], [role='dialog'], [data-keeps-selection]";
            if (target.closest(keeps)) return;
            clearSelection();
        };
        const handleKey = (e: KeyboardEvent) => {
            if (blocksShortcuts(e.target)) return;
            if (e.key === "Escape") clearSelection();
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                deleteSelection();
            }
        };
        window.addEventListener("pointerdown", handlePointer);
        window.addEventListener("keydown", handleKey);
        return () => {
            window.removeEventListener("pointerdown", handlePointer);
            window.removeEventListener("keydown", handleKey);
        };
    }, []);

    const colW = Math.max(MIN_COL_W, Math.floor((viewW - KEY_W) / totalSteps) || MIN_COL_W);
    const gridW = colW * totalSteps;
    const measureW = colW * nbrSteps;
    const steps = [...Array(totalSteps).keys()];

    // While an edge is dragged, the chord is drawn at its preview size and the chords it covers are
    // split as they will be on release. `id` keeps the resized chord's original step.
    const shownTrack = (lane: TLane) =>
        (resize?.lane === lane
            ? writeRange<TTrackData & { id: number | null }>(
                  tracks[lane].filter((data) => data.step !== resize.fromStep).map((data) => ({ ...data, id: null })),
                  resize.step,
                  resize.step + resize.len,
                  tracks[lane]
                      .filter((data) => data.step === resize.fromStep)
                      .map((data) => ({ ...data, id: resize.fromStep, step: resize.step, len: resize.len })),
              )
            : tracks[lane].map((data) => ({ ...data, id: null }))
        ).map((data) => ({ ...data, id: data.id ?? data.step }));
    const shown: Record<TLane, ReturnType<typeof shownTrack>> = { chords: shownTrack("chords"), bass: shownTrack("bass") };

    // A chord (or bass note) is selected when its track's selection starts on it.
    const selectedChordOn = (lane: TLane) =>
        selectedRange || selectedLane !== lane ? undefined : shown[lane].find((data) => data.id === selectedStep);
    const highlightOn = (lane: TLane) => {
        if (selectedLane !== lane && selectedLane !== "all") return null;
        const chord = selectedChordOn(lane);
        return selectedRange
            ? { x: selectedRange.start * colW, w: (selectedRange.end - selectedRange.start) * colW }
            : chord
              ? { x: chord.step * colW, w: chord.len * colW }
              : selectedStep !== null
                ? { x: selectedStep * colW, w: colW }
                : null;
    };
    const highlight = highlightOn(selectedLane === "all" ? "chords" : selectedLane);
    const inRange = (step: number) => !!selectedRange && step >= selectedRange.start && step < selectedRange.end;

    // The selected chord or bass note, whose notes are lit on the keyboard in its track's color.
    const keyboardLane: TLane = selectedLane === "bass" ? "bass" : "chords";
    const shownChord = selectedChordOn(keyboardLane);
    const shownOctaveOf = (lane: TLane, data: { octave?: number }) => laneOctave(lane, octave) + (data.octave ?? 0);
    const selectedNotes = new Set(shownChord?.chord.map(noteIndex) ?? []);
    // Top row is the highest note.
    const rows = [...Array(nbrNotes).keys()].map((row) => {
        const index = nbrNotes - 1 - row;
        const name = notes[index % 12];
        const rowOctave = baseOctave + Math.floor(index / 12);
        return {
            name,
            octave: rowOctave,
            black: name.includes("#"),
            inSelectedChord: !!shownChord && rowOctave === shownOctaveOf(keyboardLane, shownChord) && selectedNotes.has(index % 12),
        };
    });
    const rowOf = (note: string, noteOctave: number) => nbrNotes - 1 - ((noteOctave - baseOctave) * 12 + noteIndex(note));

    // The ruler, the tracks and the piano roll all start at the grid origin, so the step under the
    // pointer comes from its x offset.
    const stepAt = (e: React.DragEvent<HTMLElement>) =>
        Math.min(
            totalSteps - 1,
            Math.max(0, Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left) / colW)),
        );
    const rulerStepAt = (clientX: number) =>
        Math.min(
            totalSteps - 1,
            Math.max(0, Math.floor((clientX - (rulerRef.current?.getBoundingClientRect().left ?? 0)) / colW)),
        );
    // Pressing a step selects it on its track, and dragging across empty steps or the ruler, or
    // Shift-clicking, selects a range. The ruler selects on every track.
    const startSelect = (e: React.PointerEvent<HTMLElement>, lane: TLane | "all", step = rulerStepAt(e.clientX)) => {
        if (e.button !== 0) return;
        if (e.shiftKey) extendSelection(step);
        else setSelectedStep(step, lane);
        e.currentTarget.setPointerCapture(e.pointerId);
        setSelecting(true);
    };
    const selectHandlers = {
        onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
            if (selecting) extendSelection(rulerStepAt(e.clientX));
        },
        onPointerUp: () => setSelecting(false),
        onPointerCancel: () => setSelecting(false),
    };

    const startResize = (e: React.PointerEvent<HTMLSpanElement>, lane: TLane, data: TTrackData, edge: TResize["edge"]) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setResize({ lane, fromStep: data.step, edge, step: data.step, len: data.len });
    };
    const moveResize = (e: React.PointerEvent<HTMLSpanElement>) => {
        const lane = resize && laneRefs.current[resize.lane];
        if (!resize || !lane) return;
        // Snap the dragged edge to the nearest step line, inside the grid.
        const line = Math.round((e.clientX - lane.getBoundingClientRect().left) / colW);
        const end = resize.step + resize.len;
        const next =
            resize.edge === "end"
                ? { step: resize.step, len: Math.min(Math.max(line, resize.step + 1), totalSteps) - resize.step }
                : (() => {
                      const step = Math.min(Math.max(line, 0), end - 1);
                      return { step, len: end - step };
                  })();
        if (next.step !== resize.step || next.len !== resize.len) setResize({ ...resize, ...next });
    };
    const endResize = () => {
        if (!resize) return;
        trackApi[resize.lane].handleResizeChord(resize.fromStep, resize.step, resize.len, totalSteps);
        if (selectedLane === resize.lane && selectedStep === resize.fromStep) setSelectedStep(resize.step);
        setResize(null);
    };

    // Library chords drop on either track (the bass track keeps the root); a placed chord only
    // moves within its own track.
    const dropHandlers = (lane: TLane) => ({
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
            if (!hasChordDrag(e) || (moving && moving.lane !== lane)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === "move" ? "move" : "copy";
            setDrag({ lane, step: stepAt(e) });
        },
        onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(null);
        },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            const payload = getChordDrag(e);
            setDrag(null);
            setMoving(null);
            if (!payload) return;
            e.preventDefault();
            const step = stepAt(e);
            if ("fromStep" in payload) {
                if (payload.lane !== lane) return;
                trackApi[lane].handleMoveChord(payload.fromStep, step, totalSteps);
            } else if (lane === "bass") {
                trackApi.bass.handleChangeChord([payload.notes[0]], step, payload.notes[0]);
            } else {
                trackApi.chords.handleChangeChord(payload.notes, step, payload.name);
            }
            setSelectedStep(step, lane);
        },
    });
    // A moved chord keeps its length, cut only at the grid end, and replaces what it covers.
    const dropPreview = (lane: TLane) => {
        if (drag?.lane !== lane) return null;
        const len = Math.min(moving?.lane === lane ? moving.chord.len : 1, totalSteps - drag.step);
        return <DropPreview x={drag.step * colW} w={len * colW} />;
    };

    const renderLane = (lane: TLane) => {
        const config = LANES[lane];
        const laneHighlight = highlightOn(lane);
        const selectedChord = selectedChordOn(lane);
        return (
            <>
                {/* The track header selects the whole track. */}
                <button
                    type="button"
                    aria-pressed={selectedTrack === lane}
                    title={`Select the ${lane} track`}
                    onClick={() => setSelectedTrack(selectedTrack === lane ? null : lane)}
                    className={cn(
                        "sticky left-0 z-30 flex items-center justify-center border-r border-b border-daw-edge text-[10px] font-semibold tracking-widest hover:bg-[#2e2e33]",
                        lane === "bass" ? "text-daw-bass" : "text-daw-muted",
                        // Opaque, since the piano roll scrolls under the sticky header.
                        selectedTrack === lane ? "bg-[#2c3a55] text-white" : "bg-[#26262a]",
                    )}
                    style={{ top: config.top }}
                >
                    {config.label}
                </button>
                <div className="sticky z-20 border-b border-daw-edge bg-[#202023]" style={{ top: config.top }}>
                    <div
                        ref={(el) => {
                            laneRefs.current[lane] = el;
                        }}
                        className="relative h-full"
                        style={gridLines(measureW, colW, "#3a3a3f", "#2b2b2f")}
                        {...dropHandlers(lane)}
                    >
                        {steps.map((step) => (
                            <button
                                key={step}
                                type="button"
                                aria-label={`${lane === "bass" ? "Bass, bar" : "Bar"} ${Math.floor(step / nbrSteps) + 1}, step ${(step % nbrSteps) + 1}`}
                                onPointerDown={(e) => startSelect(e, lane, step)}
                                {...selectHandlers}
                                // Keyboard activation; pointer presses are handled above.
                                onClick={(e) => e.detail === 0 && setSelectedStep(step, lane)}
                                className={cn(
                                    "absolute inset-y-0 touch-none hover:bg-white/5",
                                    laneHighlight &&
                                        (inRange(step) || (selectedStep === step && !selectedChord)) &&
                                        "bg-daw-select/25",
                                )}
                                style={{ left: step * colW, width: colW }}
                            />
                        ))}
                        {shown[lane].map((data) => (
                            <div
                                key={data.id}
                                className={cn("group absolute", config.region)}
                                style={{ left: data.step * colW + 2, width: data.len * colW - 4 }}
                            >
                                <button
                                    type="button"
                                    draggable={!resize}
                                    onDragStart={(e) => {
                                        setChordDrag(e, { fromStep: data.id, lane });
                                        const chord = tracks[lane].find((entry) => entry.step === data.id);
                                        setMoving(chord ? { lane, chord } : null);
                                    }}
                                    onDragEnd={() => {
                                        setMoving(null);
                                        setDrag(null);
                                    }}
                                    onClick={(e) => {
                                        // A click past the first step selects that step, so a chord can split this one.
                                        const offset = e.clientX - e.currentTarget.getBoundingClientRect().left + 2;
                                        // Keyboard clicks have no pointer position and select the first step.
                                        const step =
                                            data.step + Math.min(data.len - 1, Math.max(0, Math.floor(offset / colW)));
                                        if (e.shiftKey) extendSelection(step);
                                        else setSelectedStep(step, lane);
                                    }}
                                    className={cn(
                                        "flex size-full cursor-grab flex-col items-start justify-center overflow-hidden rounded-md px-3 text-left active:cursor-grabbing",
                                        config.colors,
                                    )}
                                >
                                    <span className="text-[13px] leading-tight font-bold">{data.name}</span>
                                    {lane === "chords" ? (
                                        <span className="font-mono text-[10px] whitespace-nowrap">{data.chord.join(" ")}</span>
                                    ) : (
                                        data.len * colW > 48 && (
                                            <span className="font-mono text-[10px] leading-none whitespace-nowrap">
                                                {data.chord[0]}
                                                {shownOctave(laneOctave("bass", octave) + (data.octave ?? 0))}
                                            </span>
                                        )
                                    )}
                                </button>
                                {(["start", "end"] as const).map((edge) => (
                                    <span
                                        key={edge}
                                        aria-hidden="true"
                                        onPointerDown={(e) => startResize(e, lane, data, edge)}
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
                                                "h-4 w-0.5 rounded-full opacity-0 group-hover:opacity-100",
                                                config.handle,
                                                resize?.lane === lane &&
                                                    resize.fromStep === data.id &&
                                                    resize.edge === edge &&
                                                    "opacity-100",
                                            )}
                                        />
                                    </span>
                                ))}
                            </div>
                        ))}
                        {laneHighlight && (
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 z-10 rounded-sm border-2 border-daw-select bg-daw-select/15"
                                style={{ left: laneHighlight.x, width: laneHighlight.w }}
                            />
                        )}
                        {selectedTrack === lane && (
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-10 border-2 border-daw-select/70"
                            />
                        )}
                        {dropPreview(lane)}
                        <Playhead colW={colW} />
                    </div>
                </div>
            </>
        );
    };

    return (
        <div ref={scrollRef} className="daw-scroll relative min-h-0 flex-1 overflow-auto">
            <div
                className="grid"
                style={{
                    width: KEY_W + gridW,
                    gridTemplateColumns: `${KEY_W}px ${gridW}px`,
                    gridTemplateRows: `${RULER_H}px ${LANE_H}px ${BASS_H}px auto`,
                }}
            >
                {/* Ruler */}
                <div className="sticky top-0 left-0 z-30 border-r border-b border-daw-edge bg-daw-bar" />
                <div className="sticky top-0 z-20 border-b border-daw-edge bg-daw-bar">
                    <div
                        ref={rulerRef}
                        className="relative h-full cursor-text touch-none select-none"
                        style={gridLines(measureW, colW, "#4a4a50", "#36363b")}
                        onPointerDown={(e) => startSelect(e, "all")}
                        {...selectHandlers}
                    >
                        {highlight && (
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-1 rounded-sm bg-daw-select/40"
                                style={{ left: highlight.x, width: highlight.w }}
                            />
                        )}
                        {[...Array(nbrMeasures).keys()].map((measure) => (
                            <span
                                key={measure}
                                className="absolute top-1.5 font-mono text-[11px] font-bold text-daw-sub"
                                style={{ left: measure * measureW + 6 }}
                            >
                                {measure + 1}
                            </span>
                        ))}
                        <Playhead colW={colW} />
                    </div>
                </div>

                {renderLane("chords")}
                {renderLane("bass")}

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
                                row.inSelectedChord &&
                                    (keyboardLane === "bass"
                                        ? "bg-daw-bass text-daw-bass-ink"
                                        : "bg-daw-accent text-daw-accent-ink"),
                            )}
                            style={{ height: ROW_H }}
                        >
                            {row.name === "C" && `C${shownOctave(row.octave)}`}
                        </div>
                    ))}
                </div>

                {/* Piano roll: the chords and the bass notes; drops here go to the chord track. */}
                <div className="relative" {...dropHandlers("chords")}>
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
                    {(["bass", "chords"] as const).flatMap((lane) =>
                        shown[lane].flatMap((data) =>
                            data.chord.map((note) => (
                                <div
                                    key={`${lane}-${data.id}-${note}`}
                                    className={cn(
                                        "absolute flex h-4 items-center overflow-hidden rounded pl-1.5 text-[10px] font-bold shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]",
                                        lane === "bass"
                                            ? "bg-daw-bass text-daw-bass-ink"
                                            : "bg-daw-accent text-daw-accent-ink",
                                    )}
                                    style={{
                                        top: rowOf(note, shownOctaveOf(lane, data)) * ROW_H + 2,
                                        left: data.step * colW + 2,
                                        width: data.len * colW - 4,
                                    }}
                                >
                                    {data.len * colW > 36 && `${note}${shownOctave(shownOctaveOf(lane, data))}`}
                                </div>
                            )),
                        ),
                    )}
                    {dropPreview("chords")}
                    <Playhead colW={colW} />
                </div>
            </div>
        </div>
    );
};
