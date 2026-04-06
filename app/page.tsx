import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PageClient } from "./page.client";

export default async function Home() {
    const getListNotes = async () => {
        const chordsDir = join(process.cwd(), "chords");
        const files = await readdir(chordsDir);

        return files
            .filter((file) => file.endsWith(".json"))
            .map((file) => file.replace(".json", ""));
    };

    const getListChordsByNotes = async (notes: string[]) => {
        const ListChordsByNotes: Record<string, Record<string, string[]>> = {};
        await Promise.all(
            notes.map(async (note) => {
                const chordPath = join(process.cwd(), "chords", `${note}.json`);
                const chordContent = await readFile(chordPath, "utf-8");
                const chordData = JSON.parse(chordContent) as Record<string, string[]>;
                ListChordsByNotes[note] = chordData ?? [];
            }),
        );
        return ListChordsByNotes;
    };

    const listNotes = await getListNotes();
    const listChordsByNotes = await getListChordsByNotes(listNotes);

    return (
        <main className="flex min-h-screen min-w-screen flex items-center justify-center">
            <PageClient listNotes={listNotes} ListChordsByNotes={listChordsByNotes} />
        </main>
    );
}
