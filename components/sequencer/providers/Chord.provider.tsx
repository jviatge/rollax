import { createContext } from "react";

export const ChordContext = createContext({
    listNotes: [] as string[],
    ListChordsByNotes: {} as Record<string, Record<string, string[]>>,
});

export const ChordProvider = ({
    children,
    listNotes,
    ListChordsByNotes,
}: {
    children: React.ReactNode;
    listNotes: string[];
    ListChordsByNotes: Record<string, Record<string, string[]>>;
}) => {
    return (
        <ChordContext.Provider
            value={{
                listNotes,
                ListChordsByNotes,
            }}
        >
            {children}
        </ChordContext.Provider>
    );
};
