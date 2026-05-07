# Synth District Terminal

A static, zero-dependency Linux terminal emulator for the Synth District. Pure vanilla HTML/CSS/JavaScript — no build step, no package manager, no framework. Open `index.html` directly in your browser to run.

## Features

- **Full bash-like terminal emulation** — familiar shell experience in the browser
- **Virtual filesystem** — complete file tree with read/write operations
- **Command pipelines & redirects** — supports `|` (pipe), `>` (write), `>>` (append), `<` (input), `;` (chain), `&&` (conditional AND), `||` (conditional OR)
- **Built-in commands** — `ls`, `cd`, `cat`, `echo`, `pwd`, `mkdir`, `touch`, `rm`, `cp`, `mv`, `grep`, `sudo` (with password), and more
- **User switching** — `su` and `sudo` commands with simulated password authentication
- **Command history** — navigate with arrow keys, search history
- **Easter eggs** — vim editor, nano editor, top monitor, matrix effect, pager, and more
- **Persistent state** — localStorage saves history and boot state
- **ANSI colors** — full color support for rich terminal output
- **CRT effect toggle** — nostalgic screen effect available on demand

## Getting Started

Simply open `index.html` in your browser:

```bash
# Clone the repo
git clone https://github.com/yourusername/synth-district-terminal.git
cd synth-district-terminal

# Open in browser (no build step needed!)
open index.html  # macOS
# or
xdg-open index.html  # Linux
# or
start index.html  # Windows
```

No installation, no dependencies, no build step. That's it.

## Usage

Once in the terminal, try some commands:

```bash
ls              # list files
cd /home/user   # change directory
cat /etc/motd   # read files
echo "hello"    # print text
mkdir mydir     # create directory
touch myfile    # create file
grep pattern file  # search file contents
sudo su         # switch user (password: password)
vim             # edit files (type :q to quit)
nano            # another editor
top             # system monitor
matrix          # easter egg effect
```

Use arrow keys for command history, Ctrl+C to interrupt, and Ctrl+L to clear the screen.

## Architecture

The project is organized into modular JavaScript files that load in dependency order:

### `js/filesystem.js`
Defines the virtual filesystem tree (`SD.fsTree`) and the `SD.FS` class for filesystem operations. Files can have string or dynamic function content (evaluated on-demand).

### `js/commands.js`
Command registry and execution engine. All commands follow the signature:
```js
async function(args, ctx) → { exitCode, stdout? }
```

Handles command parsing, pipelines, redirects, and chaining operators.

### `js/easter-eggs.js`
Special effects and overlay-based easter eggs (vim, nano, top, matrix, pager). Exports `SD.EasterEggs` with named functions called by command handlers.

### `js/terminal.js`
Core `Terminal` class managing input/output, history, prompt rendering, and user state. Owns the filesystem instance and coordinates all terminal behavior.

## Adding Commands

Add to `js/commands.js`:

```js
reg('mycommand', async (args, ctx) => {
    ctx.term.println(c('Hello', 'ansi-fg-green ansi-bold'));
    return { exitCode: 0 };
});
```

Use `c(text, 'ansi-fg-color ansi-bold')` for colored output. Async functions can await `delay(ms, ctx.signal)` which respects Ctrl+C.

## Adding Easter Eggs

Add to `js/easter-eggs.js`:

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

Then call from `js/commands.js`: `return SD.EasterEggs.myEffect(ctx)`.

## Customizing the Filesystem

Edit `SD.fsTree` in `js/filesystem.js` using the `file()` and `dir()` helpers:

```js
const fsTree = {
    home: dir({
        user: dir({
            myfile: file('content here'),
        })
    })
};
```

## Styling

- **ANSI colors**: Classes like `ansi-fg-{color}`, `ansi-bg-{color}`, `ansi-bold`, `ansi-dim`
- **Overlays**: Base class `term-overlay` for full-screen effects
- **CRT effect**: Toggle with `body.crt-on` class
- **Root prompt**: Red username when `USER === 'root'`

See `css/terminal.css` for full styling reference.

## Docker

A `Dockerfile` and `docker-compose.yml` are included for serving via HTTP:

```bash
docker-compose up
# Visit http://localhost:8080
```

## Browser Support

Works on all modern browsers (Chrome, Firefox, Safari, Edge) that support:
- ES2020 features
- CSS Grid and Flexbox
- LocalStorage

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this project.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Inspiration

Synth District Terminal is inspired by retro cyberpunk aesthetics and the simplicity of pure web technologies. No frameworks, no dependencies, just code.

---

Enjoy your stay in Synth District. 🔌
