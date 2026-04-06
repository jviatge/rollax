"use client";

import { TrackProvider } from "@/components/providers/Track.provider";
import { Sequencer } from "@/components/sequencer";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Download, WandSparkles } from "lucide-react";

export const PageClient = ({
    listNotes,
    ListChordsByNotes,
}: {
    listNotes: string[];
    ListChordsByNotes: Record<string, Record<string, string[]>>;
}) => {
    const handleGenerate = async () => {};

    return (
        <TrackProvider>
            <Card className="w-full max-w-2/3">
                <CardHeader>
                    <CardTitle>Rollax</CardTitle>
                    <CardDescription>
                        A simple music generator using Tone.js and React.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Sequencer listNotes={listNotes} ListChordsByNotes={ListChordsByNotes} />
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button type="submit" className="w-full" onClick={handleGenerate}>
                        Generate <WandSparkles className="ml-2" />
                    </Button>
                    <Button type="submit" variant={"secondary"} className="w-full">
                        Donwload <Download className="ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        </TrackProvider>
    );
};
