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

- **Transport bar:** previous/next measure, stop, play/pause, and loop (on by default). An LCD-style display shows the playhead position (bar · step), tempo, time signature (always 4/4), and the selected key.
- **Inspector (left):** instrument (Synth by default, or Piano), tempo (40–240 BPM, applied on blur or Enter), key, number of measures (1–4), and steps per measure (1/2, 1/4, 1/8, 1/16). Measures and steps are locked while playing or paused; changing the steps keeps chords at the same musical position. The selected step section shows its chord and a delete button.
- **Grid (center):** a bar ruler, a chord track, and a piano roll of 36 rows (C3–B5). Click a step on the chord track to select it. The steps stretch to fill the width and only scroll horizontally below 36 px per step. The ruler, chord track, and keyboard stay pinned while scrolling, and the view opens centered on octave 4.
- **Chord library (right):** chords from `chords/`, filtered by root note or by a search across all roots. Clicking a chord places it on the selected step. A chord lasts until the next chord, at most one measure; placing a chord inside another one shortens the earlier chord.
- **Playback:** chords play at their grid position for their length through the Tone.js transport. With loop off, playback stops at the end of the grid.

### Known limitations

- Chords always play in octave 4, in root position (every note in that octave).
- The key only sets which root the chord library shows; it does not affect sound.
- Chord length can't be edited directly; it comes from where the next chord starts.
- **Generate** and **Export MIDI** are shown but disabled.
- The UI is not designed for mobile.

## Chord data

`chords/` holds one JSON file per root note (for example `C.json`, `Db-C#.json`). Each file maps a chord name to its notes:

```json
{ "Cm": ["C", "Eb", "G"] }
```

`app/page.tsx` reads every `chords/*.json` file on the server at render time and passes the data to the client. The file name, without its extension, is used as the root button label in the chord library.

## Architecture

- `app/page.tsx` is a Server Component that loads the chord data. `app/page.client.tsx` wraps the sequencer in `TrackProvider`.
- `components/providers/Track.provider.tsx` holds the track, a list of `{ step, len, chord, name }` entries (start step and length in steps), and `components/hooks/useTrack.tsx` edits it (placing, splitting, deleting, and rescaling chords).
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
