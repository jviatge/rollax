import { useContext } from "react";
import { ChordContext } from "../providers/Chord.provider";

export const useChord = () => {
    return useContext(ChordContext);
};
