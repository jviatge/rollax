import { Field, FieldLabel } from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { notes } from "@/notes";
import { useTrack } from "../hooks/useTrack";
import { Input } from "../ui/input";
import { useSequencer } from "./hooks/useSequencer";

export const ConfigSequencer = () => {
    const {
        isPlaying,
        selectedInstrument,
        tempo,
        nbrMeasures,
        nbrSteps,
        handleSelectInstrument,
        handleNbrMeasuresChange,
        handleNbrStepsChange,
        handleTempoChange,
    } = useSequencer();
    const { trackData } = useTrack();
    return (
        <div className="w-full p-0 p-0 gap-2 p-1 flex items-center justify-center">
            <Field className="w-full">
                <FieldLabel>Instrument</FieldLabel>
                <Select
                    disabled={isPlaying}
                    defaultValue={selectedInstrument}
                    onValueChange={(value) => {
                        handleSelectInstrument(value as "piano" | "synth", trackData);
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Instrument" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Instrument</SelectLabel>
                            <SelectItem value="piano">Piano</SelectItem>
                            <SelectItem value="synth">Synth</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Field>
            <Field className="w-full">
                <FieldLabel>Fundamental Note</FieldLabel>
                <Select disabled={isPlaying}>
                    <SelectTrigger>
                        <SelectValue placeholder="Note" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Note</SelectLabel>
                            {notes.map((note) => (
                                <SelectItem key={note} value={note}>
                                    {note}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Field>
            <Field className="w-full">
                <FieldLabel>Tempo</FieldLabel>
                <Input
                    type="number"
                    disabled={isPlaying}
                    value={tempo}
                    placeholder="Tempo"
                    onChange={(e) => handleTempoChange(Number(e.target.value), trackData)}
                />
            </Field>
            <Field className="w-full">
                <FieldLabel>Measure</FieldLabel>
                <Select
                    disabled={isPlaying}
                    defaultValue={String(nbrMeasures)}
                    onValueChange={(value) => handleNbrMeasuresChange(Number(value))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Measure" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Measure</SelectLabel>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Field>
            <Field className="w-full">
                <FieldLabel>Steps</FieldLabel>
                <Select
                    disabled={isPlaying}
                    defaultValue={String(nbrSteps)}
                    onValueChange={(value) => handleNbrStepsChange(Number(value))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Steps" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Steps</SelectLabel>
                            <SelectItem value="2">1/2</SelectItem>
                            <SelectItem value="4">1/4</SelectItem>
                            <SelectItem value="8">1/8</SelectItem>
                            <SelectItem value="16">1/16</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Field>
        </div>
    );
};
