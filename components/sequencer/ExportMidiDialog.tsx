import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { useState } from "react";

export const dialogButton = "flex h-8.5 items-center gap-2 rounded-[7px] px-3.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50";

/** Today's local date as YYYY-MM-DD. */
const today = () => {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** The file name without a typed .mid extension or characters that file systems reject. */
const cleanName = (name: string) =>
    name
        .trim()
        .replace(/\.midi?$/i, "")
        .replace(/[\\/:*?"<>|]/g, "-");

/** The Export MIDI button, which asks for a file name (today's date by default) before downloading. */
export const ExportMidiDialog = ({ disabled, onExport }: { disabled: boolean; onExport: (filename: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const filename = cleanName(name);

    const handleOpenChange = (value: boolean) => {
        if (value) setName(`${today()}-midi`);
        setOpen(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!filename) return;
        onExport(`${filename}.mid`);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    title={disabled ? "Add chords to export them" : "Download the track as a MIDI file"}
                    className={cn(dialogButton, "border border-daw-line bg-daw-raised")}
                >
                    <Download className="size-4" />
                    Export MIDI
                </button>
            </DialogTrigger>
            <DialogContent
                showCloseButton={false}
                className="rounded-xl border border-daw-line bg-daw-panel text-daw-text ring-0 sm:max-w-sm"
            >
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <DialogHeader>
                        <DialogTitle className="text-[15px] font-bold">Export MIDI</DialogTitle>
                        <DialogDescription className="text-daw-muted">
                            The track is saved as a MIDI file in your downloads.
                        </DialogDescription>
                    </DialogHeader>
                    <label className="flex flex-col gap-1.5 text-xs text-daw-sub">
                        File name
                        <span className="flex h-8 items-center rounded-md border border-daw-line bg-daw-well pr-2.5 focus-within:border-daw-select">
                            <input
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="h-full min-w-0 flex-1 bg-transparent px-2.5 font-mono text-[13px] text-daw-text outline-none"
                            />
                            <span className="font-mono text-[13px] text-daw-muted">.mid</span>
                        </span>
                    </label>
                    <DialogFooter>
                        <DialogClose asChild>
                            <button type="button" className={cn(dialogButton, "border border-daw-line bg-daw-raised")}>
                                Cancel
                            </button>
                        </DialogClose>
                        <button
                            type="submit"
                            disabled={!filename}
                            className={cn(dialogButton, "bg-daw-accent text-daw-accent-ink hover:brightness-110")}
                        >
                            <Download className="size-4" />
                            Export
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
