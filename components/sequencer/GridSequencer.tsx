import { Button } from "@/components/ui/button";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { notes } from "@/notes";
import { Pencil, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { useTrack } from "../hooks/useTrack";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { useChord } from "./hooks/useChord";
import { useSequencer } from "./hooks/useSequencer";

const nbrNotes = 24;

export const GridSequencer = () => {
    const { nbrSteps, nbrMeasures, handleChangeChord, octave } = useSequencer({ init: true });
    const { listNotes, ListChordsByNotes } = useChord();
    const {
        trackData,
        handleChangeChord: handleTrackChangeChord,
        getChordAtStep,
        handleDeleteChord: handleDeleteChordTrack,
    } = useTrack();
    const [changeChord, setChangeChord] = useState<number | null>(null);

    const getNoteName = (
        noteIndex: number,
    ): {
        name: string;
        classKey: string;
        classCell: string;
        nameWithOctave: string;
        octave: number;
    } => {
        const octaveResolved = Math.floor(noteIndex / 12) + octave - 1;
        const noteName = notes[noteIndex % 12];
        return {
            octave: octaveResolved,
            name: noteName,
            nameWithOctave: `${noteName}${octaveResolved}`,
            classKey: noteName.includes("#") ? "bg-gray-600 text-white" : "bg-white",
            classCell: noteName.includes("#") ? "bg-gray-200" : "bg-white",
        };
    };

    const handleChangeChordSelected = (note: string, chord: string) => {
        const newtrackData = handleTrackChangeChord(
            ListChordsByNotes[note][chord],
            changeChord ?? 0,
            chord,
        );
        handleChangeChord(newtrackData);
        setChangeChord(null);
    };

    const handleDeleteChord = (step: number) => {
        const newtrackData = handleDeleteChordTrack(step);
        handleChangeChord(newtrackData);
    };

    const getTrackDataByStep = (step: number) => {
        return trackData.find((data) => data.step === step);
    };

    return (
        <>
            <Card className="w-full p-0">
                <CardContent className="p-0">
                    <table className="w-full table-fixed">
                        <tbody>
                            {[...Array(nbrNotes)].map((_, i) => {
                                const note = getNoteName(i);
                                return (
                                    <tr key={i}>
                                        <td className={`border text-xs pl-2 w-12 ${note.classKey}`}>
                                            {note.nameWithOctave}
                                        </td>
                                        {[...Array(nbrSteps * nbrMeasures)].map((_, j) => (
                                            <td key={j} className={cn("border", note.classCell)}>
                                                {note.octave === octave &&
                                                    getChordAtStep(j)?.includes(note.name) && (
                                                        <div className="bg-blue-500 h-3 w-5/6 rounded-xl mx-auto" />
                                                    )}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                            <tr>
                                <td className="h-12"></td>
                                {[...Array(nbrSteps * nbrMeasures)].map((_, j) => (
                                    <td
                                        key={j}
                                        className={cn(
                                            "border",
                                            getTrackDataByStep(j) && "bg-green-100",
                                        )}
                                    >
                                        <div
                                            className={
                                                "w-full flex items-center justify-center gap-1"
                                            }
                                        >
                                            <Button
                                                onClick={() => setChangeChord(j)}
                                                variant={"outline"}
                                                size={"icon"}
                                            >
                                                {getTrackDataByStep(j) ? (
                                                    <Pencil className="h-3 w-3" />
                                                ) : (
                                                    <Plus className="h-3 w-3" />
                                                )}
                                            </Button>
                                            {getTrackDataByStep(j)?.name && (
                                                <Badge variant={"outline"}>
                                                    {getTrackDataByStep(j)?.name}
                                                </Badge>
                                            )}
                                            {getTrackDataByStep(j) && (
                                                <Button
                                                    onClick={() => handleDeleteChord(j)}
                                                    variant={"destructive"}
                                                    size={"icon"}
                                                >
                                                    <Trash className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
            <CommandDialog
                open={changeChord !== null}
                onOpenChange={(open) => setChangeChord(open ? 0 : null)}
            >
                <Command>
                    <CommandInput placeholder="Type a command or search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        {listNotes.map((note) => (
                            <CommandGroup heading={note} key={note}>
                                {Object.keys(ListChordsByNotes[note]).map((chord) => (
                                    <CommandItem
                                        key={chord}
                                        className="cursor-pointer"
                                        onSelect={() => {
                                            handleChangeChordSelected(note, chord);
                                        }}
                                    >
                                        {chord}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </CommandDialog>
        </>
    );
};
