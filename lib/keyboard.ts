/** True when a key press goes to a field, which keeps its own shortcuts, or to a dialog. */
export const blocksShortcuts = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
        ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) ||
        target.closest("[role='dialog']") !== null);
