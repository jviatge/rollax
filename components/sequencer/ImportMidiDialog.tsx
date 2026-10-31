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
import { TriangleAlert, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { dialogButton } from "./ExportMidiDialog";

const dialogClass = "rounded-xl border border-daw-line bg-daw-panel text-daw-text ring-0 sm:max-w-sm";

/**
 * The Import MIDI button. When the track has chords, it first warns that importing replaces the
 * composition; a file that can't be read shows an error.
 */
export const ImportMidiDialog = ({
    hasTrack,
    onImport,
}: {
    hasTrack: boolean;
    onImport: (file: File) => Promise<void>;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Runs in the click handler, since browsers only open the file picker from a user gesture.
    const pickFile = () => {
        setConfirming(false);
        inputRef.current?.click();
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Cleared so picking the same file again still fires a change.
        e.target.value = "";
        if (!file) return;
        try {
            await onImport(file);
        } catch (err) {
            setError(err instanceof Error ? err.message : "The file could not be read.");
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => (hasTrack ? setConfirming(true) : pickFile())}
                title="Replace the track with the chords of a MIDI file"
                className={cn(dialogButton, "border border-daw-line bg-daw-raised")}
            >
                <Upload className="size-4" />
                Import MIDI
            </button>
            <input
                ref={inputRef}
                type="file"
                accept=".mid,.midi,audio/midi"
                aria-label="MIDI file to import"
                onChange={handleFile}
                className="hidden"
            />

            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent showCloseButton={false} className={dialogClass}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[15px] font-bold">
                            <TriangleAlert className="size-4 text-daw-playhead" />
                            Replace the composition?
                        </DialogTitle>
                        <DialogDescription className="leading-normal text-daw-muted">
                            Importing a MIDI file clears the current composition: every chord on the track is
                            replaced by the file&apos;s, and the tempo and number of measures are taken from it. You
                            can undo it with Cmd/Ctrl+Z.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <button type="button" className={cn(dialogButton, "border border-daw-line bg-daw-raised")}>
                                Cancel
                            </button>
                        </DialogClose>
                        <button
                            type="button"
                            onClick={pickFile}
                            className={cn(dialogButton, "border border-[#5a2a2a] bg-[#3a1f1f] text-[#ffb4ab]")}
                        >
                            <Upload className="size-4" />
                            Choose a file
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={error !== null} onOpenChange={(open) => !open && setError(null)}>
                <DialogContent showCloseButton={false} className={dialogClass}>
                    <DialogHeader>
                        <DialogTitle className="text-[15px] font-bold">Import failed</DialogTitle>
                        <DialogDescription className="leading-normal text-daw-muted">{error}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <button type="button" className={cn(dialogButton, "border border-daw-line bg-daw-raised")}>
                                OK
                            </button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
