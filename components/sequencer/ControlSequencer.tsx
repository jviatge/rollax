import { Button } from "@/components/ui/button";
import { FastForward, Pause, Play, Square } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { useSequencer } from "./hooks/useSequencer";

export const ControlSequencer = () => {
    const { handlePause, isPlaying, handleStop, handlePlay } = useSequencer();
    return (
        <div className="w-full p-0 p-0 gap-4 p-1 flex items-center justify-center">
            <Card className="gap-1 p-1">
                <CardContent className="p-0 space-x-1">
                    <Button variant={"secondary"} size={"icon"}>
                        <FastForward className="rotate-180" />
                    </Button>
                    <Button variant={"secondary"} size={"icon"} onClick={handleStop}>
                        <Square />
                    </Button>
                    <Button
                        /* variant={isPaused ? "default" : "secondary"} */
                        variant={"secondary"}
                        size={"icon"}
                        onClick={isPlaying ? handlePause : handlePlay}
                    >
                        {isPlaying ? <Pause /> : <Play />}
                    </Button>

                    <Button variant={"secondary"} size={"icon"}>
                        <FastForward />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
