# Contributing to Synth District Terminal

Thanks for your interest in contributing! This is a pure vanilla JavaScript project with zero dependencies, so contributions are straightforward.

## Getting Started

1. **Fork & clone** the repository
2. **Open `index.html` in your browser** to test changes (no build step needed)
3. **Make your changes** in the appropriate file(s)
4. **Test thoroughly** in your browser
5. **Submit a pull request** with a clear description

## Project Structure

- **`index.html`** — Main entry point; loads CSS and JS in dependency order
- **`js/filesystem.js`** — Virtual filesystem tree and FS operations
- **`js/commands.js`** — Command registry and execution engine
- **`js/easter-eggs.js`** — Special effects and overlay-based easter eggs
- **`js/terminal.js`** — Core Terminal class and UI rendering
- **`css/terminal.css`** — Styling and ANSI color themes
- **`Dockerfile` & `docker-compose.yml`** — Optional Docker setup for serving

## Making Changes

### Adding a New Command

Edit `js/commands.js` and register it using the `reg()` function:

```js
reg('mycommand', async (args, ctx) => {
    // args: array of arguments
    // ctx: { term, fs, stdin, signal, raw }
    
    ctx.term.println(c('Hello!', 'ansi-fg-green ansi-bold'));
    return { exitCode: 0 };
});
```

**Async support**: Use `await delay(ms, ctx.signal)` for timed operations; it respects Ctrl+C.

**Return values**: Commands output via `ctx.term.println()` but should return `{ exitCode, stdout? }` for pipeline support.

### Adding an Easter Egg

Add a function to `SD.EasterEggs` in `js/easter-eggs.js`:

```js
async function myEffect(ctx) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'term-overlay';
        document.body.appendChild(overlay);
        
        const onKey = (e) => {
            if (e.key === 'q') {
                overlay.remove();
                document.removeEventListener('keydown', onKey);
                resolve({ exitCode: 0 });
            }
        };
        setTimeout(() => document.addEventListener('keydown', onKey), 100);
    });
}
```

Then call it from a command in `js/commands.js`:

```js
reg('myeffect', async (args, ctx) => {
    return SD.EasterEggs.myEffect(ctx);
});
```

### Modifying the Filesystem

Edit `SD.fsTree` in `js/filesystem.js` using `file()` and `dir()` helpers:

```js
const fsTree = {
    home: dir({
        user: dir({
            documents: dir({
                readme: file('Hello, world!')
            })
        })
    })
};
```

Files can have:
- **String content**: `file('static content')`
- **Dynamic content**: `file(() => new Date().toString())`
- **Permissions**: `file('content', 0o644, 'user')`

### Styling Changes

Edit `css/terminal.css`. Follow these conventions:

- **ANSI colors**: Classes `ansi-fg-{color}`, `ansi-bg-{color}`, `ansi-bold`, `ansi-dim`
- **Overlays**: Always use `class="term-overlay"` base class
- **Root prompt**: Red color applied via `ansi-fg-red` class when `USER === 'root'`
- **CRT effect**: Controlled by `body.crt-on` class

## Code Style

### JavaScript

- Use **ES2020+ features** freely (async/await, arrow functions, destructuring, etc.)
- Wrap each module in an **IIFE** to create a local scope: `(function() { ... })()`
- Store everything on the global namespace: `window.SynthDistrict` (aliased as `SD`)
- Keep functions **async** to support cancellation via `AbortSignal`
- Use descriptive names; prefer clarity over brevity

### HTML/CSS

- Keep **no whitespace between flex children** in `#input-line` (whitespace becomes anonymous flex items)
- Use **semantic HTML** when reasonable
- Keep CSS specific to the terminal (no global resets)

## Testing Your Changes

1. **Open `index.html` in your browser** — reload after each change
2. **Test your command/feature** thoroughly:
   - Happy path scenarios
   - Edge cases (empty input, special characters, etc.)
   - Interaction with other features (pipelines, redirects, history)
   - Ctrl+C interruption
3. **Check for console errors** (F12 → Console tab)
4. **Test on different browsers** if possible (Chrome, Firefox, Safari, Edge)

## Pull Request Guidelines

When submitting a PR:

1. **Create a feature branch** from main
2. **Keep commits atomic** — each commit should be a logical unit
3. **Write clear commit messages**:
   - First line: concise summary (50 chars or less)
   - Body: explain *why*, not what (the code shows what)
4. **Update README.md** if adding significant features
5. **Test thoroughly** and mention what you tested in the PR description
6. **Link any related issues**

Example PR description:

```
Add grep command with -i flag support

- Implements case-insensitive search with -i flag
- Supports pipelines and output redirection
- Tested with various file types and patterns
- Fixes #42
```

## Architecture Notes

### Key Constraints

- **Zero dependencies**: No npm packages, no build step, no frameworks
- **Single global namespace**: All code shares `window.SynthDistrict`
- **Async everything**: Commands are async for Ctrl+C support
- **Virtual filesystem**: Real persistence uses only localStorage

### Load Order

Scripts load in order (dependencies first):

```
filesystem.js → commands.js → easter-eggs.js → terminal.js
```

This ensures `SD.FS` exists before `commands.js` uses it, etc.

## Questions?

Open an issue if you have questions or need clarification. Happy hacking! 🔌

---

**Remember**: No build step, no package manager. Just vanilla JS. Keep it simple.
