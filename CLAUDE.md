@AGENTS.md

# Project guidance

- Read `README.md` for the project overview, commands, current functionality, known limitations, and architecture.
- Keep `README.md` and this file aligned with the implementation when behavior, architecture, or setup changes. Use the `update-project-docs` skill for a documentation refresh.
- Treat the source code and package scripts as authoritative. Do not document unfinished UI controls as working features.
- This project uses Next.js 16. Before changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and follow its current APIs.

## Conventions

- Use pnpm (`pnpm-lock.yaml`). There are no tests. Check changes with `pnpm lint` and `pnpm build`.
- Import from the project root with the `@/` alias.
- Add UI primitives to `components/ui/` with the shadcn CLI (configured in `components.json`), not by hand.
- Chord data lives in `chords/<root>.json` files, each mapping a chord name to an array of note names. It is read on the server in `app/page.tsx`, so a new file shows up in the chord picker without code changes.

## Sequencer state

- The tracks (`chords`, and `bass` whose entries hold one note; each entry has a start `step`, a `len` in steps, and an optional `octave` shift from its track's octave, `laneOctave()` in the provider). Octave numbers in code are Tone.js octaves (C4 = MIDI 60); the UI shows them one lower, as in Ableton, through `shownOctave()` in `notes.ts` live in `TrackProvider` (`components/providers/`). Edit them only through `useTrack(lane)`, which keeps entries from overlapping, or its `setTracks` for a change to both tracks. Every `setTrackData` or `setTracks` call is one undo step (keep randomness out of the `setTracks` updater, which React may run twice); pass `{ record: false }` for changes that invalidate the history (grid rescaling clears it). Commit drag previews once, on release, so a gesture is one undo step.
- Grid and playback settings, the selection (`selectedStep` is the anchor; `selectedRange` is set when more than one step is selected; `selectedLane` is the track it is on, or `all` from the ruler; `selectedArea` is the steps it covers; `selectedTrack` is a whole track selected from its header, which excludes a step selection), and the audio engine live in `SequencerProvider` (`components/sequencer/providers/`). Playback is scheduled with the Tone.js transport: the provider rebuilds a `Tone.Part` from the track on every change, so components only need to update the track.
- The playhead reads `getPlayPosition()` (fractional steps) every frame and moves itself with `transform`; don't put a per-frame position in React state. The level meter in `Inspector` reads `getLevels()` the same way.
- One step is `PPQ * 4 / nbrSteps` transport ticks (4/4 time). Keep that conversion in the provider.
- `components/sequencer/midi.ts` writes the exported file with its own 480 PPQ and must match playback (note octave, step length, tempo): update it when playback changes. It also parses imported files and snaps their notes to chords on the grid.
- To add an instrument, extend `Instrument` in `instruments/`, register it in `instruments/index.ts`, and add it to `TInstrumentType` and the instrument control in `Inspector` (`BusPanel`). Each track has its own instrument, connected to the output node passed to `init` (its bus in the provider's effects chains: track delay → reverb → master delay → reverb → speakers), never straight to the destination. Effect settings, on/off states and meters are keyed by bus (`chords`, `bass`, `master`).
- Style the sequencer with the `daw-*` color tokens from `app/globals.css`, not new hard-coded colors. The layout is full-screen desktop only; do not add a mobile layout unless asked.
