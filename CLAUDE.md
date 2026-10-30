@AGENTS.md

# Project guidance

- Read `README.md` for the project overview, commands, current functionality, known limitations, and architecture.
- Keep `README.md` and this file aligned with the implementation when behavior, architecture, or setup changes. Use the `update-project-docs` skill for a documentation refresh.
- Treat the source code and package scripts as authoritative. Do not document unfinished UI controls (Export MIDI) as working features.
- This project uses Next.js 16. Before changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and follow its current APIs.

## Conventions

- Use pnpm (`pnpm-lock.yaml`). There are no tests. Check changes with `pnpm lint` and `pnpm build`.
- Import from the project root with the `@/` alias.
- Add UI primitives to `components/ui/` with the shadcn CLI (configured in `components.json`), not by hand.
- Chord data lives in `chords/<root>.json` files, each mapping a chord name to an array of note names. It is read on the server in `app/page.tsx`, so a new file shows up in the chord picker without code changes.

## Sequencer state

- The track (the placed chords, each with a start `step` and a `len` in steps) lives in `TrackProvider` (`components/providers/`). Edit it only through `useTrack`, which keeps chords from overlapping. Every `setTrackData` call is an undo step; pass `{ record: false }` for changes that invalidate the history (grid rescaling clears it). Commit drag previews once, on release, so a gesture is one undo step.
- Grid and playback settings, the selection (`selectedStep` is the anchor; `selectedRange` is set when more than one step is selected), and the audio engine live in `SequencerProvider` (`components/sequencer/providers/`). Playback is scheduled with the Tone.js transport: the provider rebuilds a `Tone.Part` from the track on every change, so components only need to update the track.
- The playhead reads `getPlayPosition()` (fractional steps) every frame and moves itself with `transform`; don't put a per-frame position in React state.
- One step is `PPQ * 4 / nbrSteps` transport ticks (4/4 time). Keep that conversion in the provider.
- To add an instrument, extend `Instrument` in `instruments/`, register it in `instruments/index.ts`, and add it to `TInstrumentType` and the instrument control in `Inspector`.
- Style the sequencer with the `daw-*` color tokens from `app/globals.css`, not new hard-coded colors. The layout is full-screen desktop only; do not add a mobile layout unless asked.
