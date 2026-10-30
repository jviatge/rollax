# Rollax

Rollax is a browser-based chord sequencer built with Next.js, React, and Tone.js. It shows a piano-roll-style grid where you place chords on steps and play them back with a piano sampler or a synth.

## Requirements

- Node.js 20.9 or later (required by Next.js 16)
- pnpm
- Network access in the browser when using the piano: its samples are loaded from `https://tonejs.github.io/audio/salamander/`

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
pnpm lint    # ESLint
pnpm build   # production build
pnpm start   # serve the production build
```

The project has no automated tests yet.

## Current functionality

The app is a full-screen, desktop-only layout (minimum width 1200 px; narrower windows scroll horizontally).

- **Transport bar:** previous/next measure, stop, play/pause, and loop (on by default). The Space bar toggles play/pause, and Cmd/Ctrl+Z undoes track changes (Cmd/Ctrl+Shift+Z or Ctrl+Y redoes), except while typing in a field. Undo keeps the last 100 changes; changing the steps or removing measures clears it. An LCD-style display shows the playhead position (bar · step), tempo, time signature (always 4/4), and the selected key.
- **Inspector (left):** instrument (Synth by default, or Piano), tempo (40–240 BPM, applied on blur or Enter), key, number of measures (1–4, 4 by default), and steps per measure (1/2, 1/4, 1/8, 1/16). Measures and steps can be changed at any time, including during playback; changing the steps keeps chords and the playhead at the same musical position, and shortening the grid past the playhead sends it back to the start. The selected step section shows its chord and a delete button.
- **Grid (center):** a bar ruler, a chord track, and a piano roll of 36 rows (C3–B5). Click a chord or a step on the chord track to select it; drag a placed chord to move it to another step, or drag its left or right edge to resize it. Edges snap to the steps and stop at the neighbouring chords and the grid edges. The steps stretch to fill the width and only scroll horizontally below 36 px per step. The playhead glides with the transport during playback and stays where it paused. The ruler, chord track, and keyboard stay pinned while scrolling, and the view opens centered on octave 4.
- **Generate:** replaces the track with a common progression (such as I–V–vi–IV or ii–V–I) in the major key selected in the inspector, one chord per measure lasting the whole measure. Each click picks a different progression than the last one, and the V chord is sometimes a dominant seventh.
- **Chord library (right):** chords from `chords/`, filtered by root note or by a search across all roots. Drag a chord onto a step of the chord track or the piano roll to place it there; a dashed outline shows the target step. A dropped chord lasts one step and replaces a chord already on that step; dropping inside a longer chord shortens it.
- **Playback:** chords play at their grid position for their length through the Tone.js transport. With loop off, playback stops at the end of the grid.

### Known limitations

- Chords always play in octave 4, in root position (every note in that octave).
- The key sets the chord library's root and the key used by Generate, which only generates in major keys. Chord names keep the spelling of the chord files, so some keys show enharmonic names (for example `Db` instead of `C#` in F# major).
- Placing, moving, and resizing chords needs a mouse: there is no keyboard alternative.
- **Export MIDI** is shown but disabled.
- The UI is not designed for mobile.

## Chord data

`chords/` holds one JSON file per root note (for example `C.json`, `Db-C#.json`). Each file maps a chord name to its notes:

```json
{ "Cm": ["C", "Eb", "G"] }
```

`app/page.tsx` reads every `chords/*.json` file on the server at render time and passes the data to the client. The file name, without its extension, is used as the root button label in the chord library.

## Architecture

- `app/page.tsx` is a Server Component that loads the chord data. `app/page.client.tsx` wraps the sequencer in `TrackProvider`.
- `components/providers/Track.provider.tsx` holds the track and its undo history, a list of `{ step, len, chord, name }` entries (start step and length in steps), and `components/hooks/useTrack.tsx` edits it (placing, moving, resizing, splitting, deleting, and rescaling chords). The drag-and-drop payload is defined in `components/sequencer/chordDrag.ts`, and `components/sequencer/generate.ts` builds Generate's progressions from the chord files.
- `components/sequencer/` contains the sequencer:
  - `TransportBar`, `Inspector`, `GridSequencer`, `ChordLibrary`, `StatusBar`: the UI, laid out in `index.tsx`.
  - `providers/Sequencer.provider.tsx`: grid and playback settings, the selected step, and the audio engine. It rebuilds a `Tone.Part` whenever the track changes, sets the transport tempo and loop, and follows the transport position for the playhead.
  - `providers/Chord.provider.tsx`: the chord data loaded on the server.
  - `hooks/useSequencer.tsx`: reads the sequencer context.
- `instruments/` contains the Tone.js instruments (`piano`: `Tone.Sampler`; `synth`: `Tone.PolySynth`), which share `playChord`, `releaseAll`, and `dispose` from `instrument.ts`. `instruments/index.ts` creates an instrument by name.
- The DAW color palette is defined as `--color-daw-*` theme tokens in `app/globals.css` (used as `bg-daw-panel`, `text-daw-muted`, …). The page is always in dark mode (`dark` class on `<html>`).
- `components/ui/` contains shadcn/ui components (configured in `components.json`).
- `notes.ts` lists the 12 chromatic note names used for the grid rows, and `noteIndex` maps sharp or flat spellings to them.
- `midi-writer-js` and `midi-player-js` are still installed (with local types in `types/midi-writer-js.d.ts`) but are no longer used.

## Technology

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui (Radix), lucide-react
- Tone.js
