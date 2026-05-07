# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static, zero-dependency Linux terminal emulator for the domain Synth District. Pure vanilla HTML/CSS/JS — no build step, no package manager, no framework. Open `index.html` directly in a browser to run.

## Architecture

Scripts load in dependency order via `<script>` tags at the bottom of `index.html`:

```
filesystem.js  →  commands.js  →  easter-eggs.js  →  terminal.js
```

All modules share a single global namespace: `window.SynthDistrict` (aliased as `SD` inside each IIFE).

### `js/filesystem.js`
Defines the virtual filesystem tree (`SD.fsTree`) as a plain-object tree of file/dir nodes, and the `SD.FS` class that operates on it. File content can be a string or a zero-arg function (called lazily on read). `SD.FS` is instantiated once in `terminal.js` and stored on the `Terminal` instance as `this.fs`.

### `js/commands.js`
Registers all commands via `reg(name | names[], asyncFn)`. Every handler has the signature:
```js
async function(args, ctx) → { exitCode, stdout? }
```
`ctx` provides `{ term, fs, stdin, signal, raw }`. Commands print output by calling `ctx.term.println(html)` directly; they only need to return `stdout` when used in a pipeline. The `execute(rawInput, term)` entry point handles `;` / `&&` / `||` chaining, `|` pipelines, and `>` / `>>` / `<` redirects before dispatching to individual handlers.

### `js/easter-eggs.js`
All special effects and easter-egg commands. Exports `SD.EasterEggs` with named functions called by the relevant command handlers in `commands.js`. Overlay-based effects (vim, nano, top, matrix, pager) create DOM elements, add `keydown` listeners, and resolve a Promise when dismissed.

### `js/terminal.js`
The `Terminal` class owns: `this.fs`, `this.history`, `this.aliases`, `this.inputBuffer`, `this.cursorPos`, `this.isBlocked`, and `this._suStack` (user-switching state). Key methods:
- `renderPrompt()` — rebuilds the prompt span; shows `#` and red username when `fs.env.USER === 'root'`
- `promptPassword(text)` — captures silent input using a capture-phase `keydown` listener (bypasses the `isBlocked` guard on the hidden input)
- `submit()` — echoes the line, sets `isBlocked`, awaits `Commands.execute`, then restores input
- `interrupt()` — calls `abortController.abort()`, which rejects all in-flight `await delay()` calls via `AbortError`
- Boot sequence on first visit (fake dmesg), MOTD on subsequent visits; gated by `localStorage.sd_booted`

### Input rendering trick
A real `<input id="hidden-input">` (positioned off-screen) captures all keystrokes. Three sibling spans (`#input-before-cursor`, `#cursor`, `#input-after-cursor`) mirror `inputBuffer` split at `cursorPos` to render the visible line. The `#input-line` flex container must have **no whitespace between child elements** in the HTML — HTML whitespace between flex children becomes anonymous flex items and displaces the cursor.

## Adding commands

```js
// In js/commands.js, inside the IIFE:
reg('mycommand', async (args, ctx) => {
    ctx.term.println(esc('output'));
    return { exitCode: 0 };
});
```

Use `c(text, 'ansi-fg-green ansi-bold')` for coloured output. Use `await delay(ms, ctx.signal)` for any timed output — it respects Ctrl+C automatically.

## Adding easter eggs / overlays

Add a function to `SD.EasterEggs` in `easter-eggs.js`. Overlay pattern:
```js
async function myEffect(ctx) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'term-overlay';
        document.body.appendChild(overlay);
        const onKey = (e) => {
            if (e.key === 'q') { overlay.remove(); document.removeEventListener('keydown', onKey); resolve({ exitCode: 0 }); }
        };
        setTimeout(() => document.addEventListener('keydown', onKey), 100);
    });
}
```
Then call it from `commands.js`: `return SD.EasterEggs.myEffect(ctx)`.

## Virtual filesystem

Add files/dirs to `SD.fsTree` in `filesystem.js`. Use the `file(content, perms, owner)` and `dir(children, perms, owner)` constructor helpers defined at the top of that file. Content can be a function for dynamic values.

## CSS conventions

ANSI colour classes follow the pattern `ansi-fg-{colour}` / `ansi-bg-{colour}` / `ansi-bold` / `ansi-dim`. All overlays use `class="term-overlay"` as a base. The CRT effect is toggled via `body.crt-on`. Root prompt colour is controlled by the `ansi-fg-red` class on the user span in `renderPrompt()`.
