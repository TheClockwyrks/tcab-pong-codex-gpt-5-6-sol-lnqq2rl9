# Carom

Carom is a top-down browser paddle duel built around curved shots and moving bank-shot obstacles. Paddle motion adds spin at contact, letting a player bend the ball around two swaying, rotating bars. Play against the computer or share a keyboard for a local versus match. The first player to 11 wins, with a two-point lead required.

## Run locally

Install the locked dependencies and start the Vite development server:

```sh
npm ci
npm run dev
```

Open the address Vite prints. The game runs entirely in the browser and needs no server or credentials.

## Production build

```sh
npm run build
```

The complete static site is written to `dist/`; serve that directory at the root of any static host. `npm run preview` serves the production build locally.

## Controls

- Player one: `W` / `S`
- Player two: `↑` / `↓`
- Menus: either player's movement keys, then `Enter` or `Space`
- Pause or resume: `P` or `Escape`
- Mute: `M`

In Solo, either pair of movement keys controls the left paddle. Menus also support mouse and touch. Move a paddle as the ball strikes it to add spin; contact near a paddle's end changes the reflection angle.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test` to execute the repository's compile, lint, formatting, and simulation checks.
