/* =========================================================
   Synth District — Commands
   ========================================================= */
'use strict';

window.SynthDistrict = window.SynthDistrict || {};

(function (SD) {

    /* ── Helpers ── */

    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function c(text, classes) {
        if (!classes) return esc(text);
        return `<span class="${classes}">${esc(text)}</span>`;
    }

    function cRaw(html, classes) {
        if (!classes) return html;
        return `<span class="${classes}">${html}</span>`;
    }

    function delay(ms, signal) {
        return new Promise((resolve, reject) => {
            const id = setTimeout(resolve, ms);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(id);
                    reject(new DOMException('Aborted', 'AbortError'));
                }, { once: true });
            }
        });
    }

    function formatSize(n) {
        if (n < 1024) return String(n);
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + 'K';
        return (n / 1024 / 1024).toFixed(1) + 'M';
    }

    function formatMtime(d) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const same_year = d.getFullYear() === now.getFullYear();
        const mon = months[d.getMonth()];
        const day = String(d.getDate()).padStart(2, ' ');
        const time = same_year
            ? String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')
            : String(d.getFullYear());
        return `${mon} ${day} ${time}`;
    }

    function parseFlags(args, validFlags) {
        const flags = new Set();
        const rest = [];
        for (const a of args) {
            if (a === '--') { rest.push(...args.slice(args.indexOf(a) + 1)); break; }
            if (a.startsWith('-') && a.length > 1 && !a.startsWith('--')) {
                for (const ch of a.slice(1)) flags.add(ch);
            } else {
                rest.push(a);
            }
        }
        return { flags, rest };
    }

    /* ── Buffer terminal for pipelines ── */

    class BufferTerm {
        constructor() { this.lines = []; }
        println(html) { this.lines.push(html); }
        print(html) { this.lines.push(html); }
        getOutput() { return this.lines.join('\n'); }
        getPlainText() {
            return this.lines.map(l => l.replace(/<[^>]+>/g, '')).join('\n');
        }
    }

    /* ── Tokenizer ── */

    function expandVar(str, i, env, lastExit) {
        i++; // skip $
        if (i >= str.length) return { val: '$', i };
        if (str[i] === '?') return { val: String(lastExit || 0), i: i + 1 };
        if (str[i] === '$') return { val: '1024', i: i + 1 }; // $$
        if (str[i] === '!') return { val: '1023', i: i + 1 };
        if (str[i] === '{') {
            let j = i + 1, name = '';
            while (j < str.length && str[j] !== '}') { name += str[j++]; }
            return { val: env[name] !== undefined ? env[name] : '', i: j + 1 };
        }
        if (str[i] === 'R' && str.slice(i, i+6) === 'RANDOM') {
            return { val: String(Math.floor(Math.random() * 32767)), i: i + 6 };
        }
        let name = '';
        while (i < str.length && /[\w]/.test(str[i])) { name += str[i++]; }
        return { val: env[name] !== undefined ? env[name] : '', i };
    }

    function tokenize(input, env, lastExit) {
        const tokens = [];
        let i = 0;
        while (i < input.length) {
            while (i < input.length && (input[i] === ' ' || input[i] === '\t')) i++;
            if (i >= input.length) break;
            const ch = input[i];
            if (ch === '"') {
                i++;
                let val = '';
                while (i < input.length && input[i] !== '"') {
                    if (input[i] === '\\' && i+1 < input.length) { val += input[++i]; i++; continue; }
                    if (input[i] === '$') {
                        const r = expandVar(input, i, env, lastExit);
                        val += r.val; i = r.i;
                    } else { val += input[i++]; }
                }
                i++;
                tokens.push(val);
            } else if (ch === "'") {
                i++;
                let val = '';
                while (i < input.length && input[i] !== "'") { val += input[i++]; }
                i++;
                tokens.push(val);
            } else if (ch === '$') {
                const r = expandVar(input, i, env, lastExit);
                const start = r.i;
                let val = r.val;
                while (i < input.length && input[start] && !/[ \t|;&<>]/.test(input[start])) {
                    // already consumed
                    break;
                }
                i = start;
                // continue reading non-space chars
                let extra = '';
                while (i < input.length && !/[ \t|;&<>'"$]/.test(input[i])) { extra += input[i++]; }
                tokens.push(val + extra);
            } else if ('|;&<>'.includes(ch)) {
                let op = ch; i++;
                if (i < input.length && (input[i] === ch || (ch === '>' && input[i] === '>') || (ch === '&' && input[i] === '&') || (ch === '|' && input[i] === '|'))) {
                    op += input[i++];
                }
                tokens.push({ op });
            } else {
                let val = '';
                while (i < input.length && !/[ \t|;&<>'"$]/.test(input[i])) { val += input[i++]; }
                if (val.startsWith('$')) {
                    const r = expandVar(val, 0, env, lastExit);
                    tokens.push(r.val);
                } else {
                    tokens.push(val);
                }
            }
        }
        return tokens;
    }

    /* ── Pipeline splitter ── */

    function splitRespectingQuotes(input, delimiters) {
        // Returns array of {segment, delimiter}
        const results = [];
        let i = 0, current = '';
        while (i < input.length) {
            const ch = input[i];
            if (ch === '"') {
                current += ch; i++;
                while (i < input.length && input[i] !== '"') {
                    if (input[i] === '\\') { current += input[i++]; }
                    current += input[i++];
                }
                current += input[i++] || '';
            } else if (ch === "'") {
                current += ch; i++;
                while (i < input.length && input[i] !== "'") { current += input[i++]; }
                current += input[i++] || '';
            } else {
                let matched = false;
                for (const delim of delimiters) {
                    if (input.startsWith(delim, i)) {
                        results.push({ segment: current, delimiter: delim });
                        current = '';
                        i += delim.length;
                        matched = true;
                        break;
                    }
                }
                if (!matched) { current += ch; i++; }
            }
        }
        results.push({ segment: current, delimiter: null });
        return results;
    }

    function parseRedirects(tokens) {
        const clean = [];
        const redirects = [];
        let i = 0;
        while (i < tokens.length) {
            const t = tokens[i];
            if (typeof t === 'object') { clean.push(t); i++; continue; }
            if (t === '>' || t === '>>') {
                if (i + 1 < tokens.length) {
                    redirects.push({ type: t, file: tokens[i+1] });
                    i += 2;
                } else i++;
            } else if (t === '<') {
                if (i + 1 < tokens.length) {
                    redirects.push({ type: '<', file: tokens[i+1] });
                    i += 2;
                } else i++;
            } else { clean.push(t); i++; }
        }
        return { tokens: clean, redirects };
    }

    /* ── Command registry ── */

    const registry = {};
    function reg(names, fn) {
        (Array.isArray(names) ? names : [names]).forEach(n => { registry[n] = fn; });
    }

    /* ── Main execute ── */

    async function execute(rawInput, term) {
        const fs = term.fs;
        // Split on ; first
        const statements = splitRespectingQuotes(rawInput.trim(), [';', '&&', '||']);
        let lastCode = 0;
        let skipNext = false;
        let skipOp = null;

        for (let si = 0; si < statements.length; si++) {
            const { segment, delimiter } = statements[si];
            const cmd = segment.trim();

            // Handle && / ||
            if (delimiter === '&&' && lastCode !== 0) continue;
            if (delimiter === '||' && lastCode === 0 && si > 0) continue;

            if (!cmd) continue;

            // Split on pipe
            const pipeSegs = splitRespectingQuotes(cmd, ['|']).map(s => s.segment.trim()).filter(Boolean);

            if (pipeSegs.length > 1) {
                lastCode = await executePipeline(pipeSegs, term, fs);
            } else {
                lastCode = await executeOne(cmd, term, fs, null);
            }
            term.lastExitCode = lastCode;
        }
    }

    async function executePipeline(stages, term, fs) {
        let stdin = null;
        for (let i = 0; i < stages.length; i++) {
            const isLast = i === stages.length - 1;
            const buf = isLast ? null : new BufferTerm();
            const useTerm = isLast ? term : buf;
            const code = await executeOne(stages[i], useTerm, fs, stdin);
            if (!isLast) stdin = buf.getPlainText();
            if (isLast) return code;
        }
        return 0;
    }

    async function executeOne(raw, term, fs, stdin) {
        // Preprocess: !! history expansion
        let processed = raw;
        if (processed.includes('!!')) {
            const lastCmd = term.history[term.history.length - 1];
            if (lastCmd) {
                processed = processed.replace(/!!/g, lastCmd);
            }
        }

        // Preprocess: command substitution $(...) and arithmetic expansion $((...))
        let iteration = 0;
        const maxIterations = 10;

        // Handle command substitution $(...) and arithmetic expansion $((...))
        while (iteration < maxIterations && (processed.includes('$(') || processed.includes('$(('))){
            iteration++;
            let changed = false;

            // Arithmetic expansion first: $((expr))
            const arithPattern = /\$\(\(([^)]*)\)\)/;
            let arithMatch = processed.match(arithPattern);
            if (arithMatch) {
                try {
                    const expr = arithMatch[1];
                    const safeExpr = expr.replace(/[^0-9+\-*/%().\s]/g, '');
                    const result = Math.floor(eval(safeExpr || '0'));
                    processed = processed.slice(0, arithMatch.index) + result + processed.slice(arithMatch.index + arithMatch[0].length);
                    changed = true;
                } catch {
                    break;
                }
            }

            // Command substitution: $(cmd)
            const cmdPattern = /\$\(([^)]*(?:\([^)]*\)[^)]*)*)\)/;
            let cmdMatch = processed.match(cmdPattern);
            if (cmdMatch && !cmdMatch[1].includes('$(')) {
                const cmdStr = cmdMatch[1];
                const buf = new BufferTerm();
                try {
                    await executeOne(cmdStr, { ...term, println: (s) => buf.println(s), print: (s) => buf.print(s) }, fs, null);
                    const output = buf.getPlainText().trim();
                    processed = processed.slice(0, cmdMatch.index) + output + processed.slice(cmdMatch.index + cmdMatch[0].length);
                    changed = true;
                } catch {
                    processed = processed.slice(0, cmdMatch.index) + processed.slice(cmdMatch.index + cmdMatch[0].length);
                    changed = true;
                }
            }

            if (!changed) break;
        }

        // Preprocess: brace expansion {a,b,c} and {1..5}
        const expandBraces = (str) => {
            const bracePattern = /\{([^{}]+)\}/;
            const match = str.match(bracePattern);
            if (!match) return [str];
            const inner = match[1];
            const prefix = str.slice(0, match.index);
            const suffix = str.slice(match.index + match[0].length);

            // Range expansion {1..5}
            const rangeMatch = inner.match(/^(\d+)\.\.(\d+)$/);
            if (rangeMatch) {
                const start = parseInt(rangeMatch[1]), end = parseInt(rangeMatch[2]);
                const result = [];
                for (let i = start; i <= end; i++) {
                    result.push(...expandBraces(prefix + i + suffix));
                }
                return result;
            }

            // List expansion {a,b,c}
            const parts = inner.split(',');
            if (parts.length > 1) {
                return parts.map(p => expandBraces(prefix + p + suffix)).flat();
            }

            return [str];
        };

        const braceExpanded = expandBraces(processed);
        if (braceExpanded.length > 1) {
            // If brace expansion resulted in multiple words, execute each with the same context
            let lastCode = 0;
            for (const expanded of braceExpanded) {
                lastCode = await executeOne(expanded, term, fs, stdin);
            }
            return lastCode;
        }
        processed = braceExpanded[0];

        const rawTokens = tokenize(processed, fs.env, term.lastExitCode);
        const { tokens, redirects } = parseRedirects(rawTokens);
        const wordTokens = tokens.filter(t => typeof t === 'string');
        if (!wordTokens.length) return 0;

        // Handle input redirect
        let effectiveStdin = stdin;
        for (const r of redirects) {
            if (r.type === '<') {
                const absPath = fs.resolve(r.file);
                effectiveStdin = fs.readFile(absPath) || '';
            }
        }

        // Handle variable assignments: VAR=value command
        const assignments = {};
        let cmdStartIdx = 0;
        for (let i = 0; i < wordTokens.length; i++) {
            const token = wordTokens[i];
            if (typeof token === 'string' && token.includes('=') && !token.startsWith('=')) {
                const eqIdx = token.indexOf('=');
                const varName = token.slice(0, eqIdx);
                const varVal = token.slice(eqIdx + 1);
                if (varName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                    assignments[varName] = varVal;
                    cmdStartIdx = i + 1;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        const finalTokens = wordTokens.slice(cmdStartIdx);
        if (!finalTokens.length) {
            // Only assignments, no command
            Object.assign(fs.env, assignments);
            return 0;
        }

        const [name, ...args] = finalTokens;

        // Temporarily update env with assignments
        const originalEnv = {};
        for (const [k, v] of Object.entries(assignments)) {
            originalEnv[k] = fs.env[k];
            fs.env[k] = v;
        }

        // Aliases
        if (term.aliases && term.aliases[name]) {
            const expanded = term.aliases[name] + (args.length ? ' ' + args.join(' ') : '');
            const code = await executeOne(expanded, term, fs, effectiveStdin);
            Object.assign(fs.env, originalEnv);
            return code;
        }

        const handler = registry[name];
        if (!handler) {
            term.println(`<span class="ansi-fg-red">bash: ${esc(name)}: command not found</span>`);
            Object.assign(fs.env, originalEnv);
            return 127;
        }

        const ctx = {
            term,
            fs,
            stdin: effectiveStdin,
            signal: term.abortController ? term.abortController.signal : new AbortController().signal,
            raw
        };

        let result;
        try {
            try {
                result = await handler(args, ctx);
            } catch (e) {
                if (e.name === 'AbortError') throw e;
                term.println(`<span class="ansi-fg-red">bash: ${esc(name)}: ${esc(e.message)}</span>`);
                return 1;
            }

            const code = (result && result.exitCode !== undefined) ? result.exitCode : 0;

            // Handle output redirects
            for (const r of redirects) {
                if (r.type === '>' || r.type === '>>') {
                    const absPath = fs.resolve(r.file);
                    if (result && result.stdout) {
                        if (r.type === '>>') fs.appendFile(absPath, result.stdout);
                        else fs.writeFile(absPath, result.stdout);
                    }
                }
            }

            return code;
        } finally {
            // Restore environment variables
            Object.assign(fs.env, originalEnv);
        }
    }

    /* ══════════════════════════════════════════
       COMMANDS
    ══════════════════════════════════════════ */

    /* ── clear ── */
    reg(['clear', 'cls'], async (args, ctx) => {
        ctx.term.clear();
        return { exitCode: 0 };
    });

    /* ── echo ── */
    reg('echo', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['n', 'e']);
        let out = rest.join(' ');
        if (flags.has('e')) {
            out = out
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
                .replace(/\\\\/g, '\\');
        }
        const lines = out.split('\n');
        lines.forEach((line, i) => {
            if (i < lines.length - 1 || !flags.has('n')) {
                ctx.term.println(esc(line));
            }
        });
        return { exitCode: 0, stdout: out + (flags.has('n') ? '' : '\n') };
    });

    /* ── printf ── */
    reg('printf', async (args, ctx) => {
        if (!args.length) return { exitCode: 0 };
        let fmt = args[0];
        let out = fmt
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '');
        ctx.term.println(esc(out));
        return { exitCode: 0, stdout: out };
    });

    /* ── pwd ── */
    reg('pwd', async (args, ctx) => {
        ctx.term.println(esc(ctx.fs.cwd));
        return { exitCode: 0, stdout: ctx.fs.cwd + '\n' };
    });

    /* ── cd ── */
    reg('cd', async (args, ctx) => {
        const target = args[0] || ctx.fs.env.HOME;
        const abs = ctx.fs.resolve(target);
        const node = ctx.fs.getNode(abs);
        if (!node) {
            ctx.term.println(`<span class="ansi-fg-red">bash: cd: ${esc(target)}: No such file or directory</span>`);
            return { exitCode: 1 };
        }
        if (node.type !== 'dir') {
            ctx.term.println(`<span class="ansi-fg-red">bash: cd: ${esc(target)}: Not a directory</span>`);
            return { exitCode: 1 };
        }
        ctx.fs.env.OLDPWD = ctx.fs.cwd;
        ctx.fs.cwd = abs;
        ctx.fs.env.PWD = abs;
        ctx.term.renderPrompt();
        return { exitCode: 0 };
    });

    /* ── ls ── */
    reg('ls', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['l','a','A','h','r','t','s','1','d','F']);
        const paths = rest.length ? rest : [ctx.fs.cwd];
        const showAll = flags.has('a') || flags.has('A');
        const longFmt = flags.has('l');
        const humanSize = flags.has('h');
        const reverse = flags.has('r');
        const sortTime = flags.has('t');
        const classifyFlag = flags.has('F');
        let out = '';

        for (const p of paths) {
            const abs = ctx.fs.resolve(p);
            const node = ctx.fs.getNode(abs);
            if (!node) {
                ctx.term.println(`<span class="ansi-fg-red">ls: cannot access '${esc(p)}': No such file or directory</span>`);
                continue;
            }
            if (node.type === 'file' || flags.has('d')) {
                const name = abs.split('/').pop() || '/';
                const line = longFmt ? formatLong(name, node) : colorName(name, node, classifyFlag);
                ctx.term.println(line);
                out += name + '\n';
                continue;
            }
            if (paths.length > 1) ctx.term.println(c(p + ':', 'ansi-bold'));

            let entries = ctx.fs.readdir(abs) || [];
            if (!showAll) entries = entries.filter(e => !e.name.startsWith('.'));
            if (flags.has('A')) entries = entries.filter(e => e.name !== '.' && e.name !== '..');

            if (sortTime) entries.sort((a, b) => b.node.mtime - a.node.mtime);
            else entries.sort((a, b) => a.name.localeCompare(b.name));
            if (reverse) entries.reverse();

            if (longFmt) {
                if (flags.has('a')) {
                    ctx.term.println(formatLong('.', node));
                    const parent = ctx.fs.getNode(abs.split('/').slice(0,-1).join('/') || '/');
                    if (parent) ctx.term.println(formatLong('..', parent));
                }
                let totalBlocks = 0;
                const lines = entries.map(e => {
                    totalBlocks += Math.ceil((e.node.size || 4096) / 512);
                    return formatLong(e.name, e.node, classifyFlag);
                });
                ctx.term.println(`total ${totalBlocks}`);
                lines.forEach(l => ctx.term.println(l));
                out += entries.map(e => e.name).join('\n') + '\n';
            } else {
                const colored = entries.map(e => colorName(e.name, e.node, classifyFlag));
                const names = entries.map(e => e.name);
                if (flags.has('1')) {
                    colored.forEach(l => ctx.term.println(l));
                } else {
                    // columns
                    const maxLen = Math.max(...names.map(n => n.length), 0) + 2;
                    const cols = Math.max(1, Math.floor(80 / maxLen));
                    let row = '';
                    colored.forEach((name, i) => {
                        row += name + '&nbsp;'.repeat(Math.max(1, maxLen - names[i].length));
                        if ((i + 1) % cols === 0) { ctx.term.println(row); row = ''; }
                    });
                    if (row) ctx.term.println(row);
                }
                out += names.join('\n') + '\n';
            }
        }
        return { exitCode: 0, stdout: out };
    });

    function colorName(name, node, classify) {
        let cls = '';
        let suffix = '';
        if (node.type === 'dir') { cls = 'ls-dir'; suffix = classify ? '/' : ''; }
        else if (node.perms && node.perms.includes('x')) { cls = 'ls-exec'; suffix = classify ? '*' : ''; }
        else if (name.match(/\.(tar|gz|zip|bz2|xz|7z)$/)) cls = 'ls-archive';
        else if (name.startsWith('.')) cls = 'ls-hidden';
        if (node.type === 'file' && node.perms && node.perms[0] === 'l') cls = 'ls-symlink';
        return cls ? `<span class="${cls}">${esc(name)}${esc(suffix)}</span>` : esc(name) + esc(suffix);
    }

    function formatLong(name, node, classify) {
        const perms = node.perms || (node.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--');
        const links = node.type === 'dir' ? 2 : 1;
        const owner = node.owner || 'root';
        const group = node.group || owner;
        const size = node.type === 'dir' ? 4096 : (node.size || 0);
        const sizeStr = String(size).padStart(8);
        const mtime = formatMtime(node.mtime || new Date('2024-01-15'));
        const colored = colorName(name, node, classify);
        return `${esc(perms)} ${links} ${esc(owner.padEnd(8))} ${esc(group.padEnd(8))} ${esc(sizeStr)} ${esc(mtime)} ${colored}`;
    }

    /* ── cat ── */
    reg('cat', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['n', 'b', 'A', 'v', 'e']);
        let out = '';

        // Special /dev/urandom handler
        if (rest.includes('/dev/urandom') || rest.includes('urandom')) {
            return SD.EasterEggs ? SD.EasterEggs.devUrandom(ctx) : { exitCode: 130 };
        }

        if (rest.length === 0) {
            // Read from stdin
            if (ctx.stdin !== null) {
                ctx.term.println(esc(ctx.stdin));
                return { exitCode: 0, stdout: ctx.stdin };
            }
            return { exitCode: 0 };
        }

        for (const p of rest) {
            const abs = ctx.fs.resolve(p);
            if (p === '-') {
                if (ctx.stdin) { ctx.term.println(esc(ctx.stdin)); out += ctx.stdin; }
                continue;
            }
            const node = ctx.fs.getNode(abs);
            if (!node) {
                ctx.term.println(`<span class="ansi-fg-red">cat: ${esc(p)}: No such file or directory</span>`);
                continue;
            }
            if (node.type === 'dir') {
                ctx.term.println(`<span class="ansi-fg-red">cat: ${esc(p)}: Is a directory</span>`);
                continue;
            }
            const content = ctx.fs.readFile(abs) || '';
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (flags.has('n')) {
                    ctx.term.println(`${String(i+1).padStart(6)}\t${esc(line)}`);
                } else {
                    ctx.term.println(esc(line));
                }
            });
            out += content;
        }
        return { exitCode: 0, stdout: out };
    });

    /* ── head ── */
    reg('head', async (args, ctx) => {
        let n = 10;
        const rest = [];
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-n' && i+1 < args.length) { n = parseInt(args[++i]) || 10; }
            else if (args[i].match(/^-\d+$/)) { n = parseInt(args[i].slice(1)); }
            else rest.push(args[i]);
        }
        const sources = rest.length ? rest.map(p => ({ path: p })) : [{ stdin: true }];
        let out = '';
        for (const src of sources) {
            let content;
            if (src.stdin) content = ctx.stdin || '';
            else { const abs = ctx.fs.resolve(src.path); content = ctx.fs.readFile(abs) || ''; }
            const lines = content.split('\n').slice(0, n);
            lines.forEach(l => ctx.term.println(esc(l)));
            out += lines.join('\n') + '\n';
        }
        return { exitCode: 0, stdout: out };
    });

    /* ── tail ── */
    reg('tail', async (args, ctx) => {
        let n = 10;
        const rest = [];
        let follow = false;
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-n' && i+1 < args.length) { n = parseInt(args[++i]) || 10; }
            else if (args[i].match(/^-\d+$/)) { n = parseInt(args[i].slice(1)); }
            else if (args[i] === '-f' || args[i] === '--follow') { follow = true; }
            else rest.push(args[i]);
        }
        const sources = rest.length ? rest.map(p => ({ path: p })) : [{ stdin: true }];
        let out = '';
        for (const src of sources) {
            let content;
            if (src.stdin) content = ctx.stdin || '';
            else { const abs = ctx.fs.resolve(src.path); content = ctx.fs.readFile(abs) || ''; }
            const lines = content.split('\n');
            const slice = lines.slice(Math.max(0, lines.length - n));
            slice.forEach(l => ctx.term.println(esc(l)));
            out += slice.join('\n') + '\n';
        }
        if (follow) {
            ctx.term.println(c('tail: following not supported in browser terminal (Ctrl+C to stop)', 'ansi-fg-yellow'));
            await delay(2000, ctx.signal);
        }
        return { exitCode: 0, stdout: out };
    });

    /* ── grep ── */
    reg('grep', async (args, ctx) => {
        const flags = new Set();
        const rest = [];
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('-') && args[i] !== '--') {
                for (const ch of args[i].slice(1)) flags.add(ch);
            } else { rest.push(args[i]); }
        }
        if (!rest.length) { ctx.term.println(c('Usage: grep [OPTIONS] PATTERN [FILE...]', 'ansi-fg-yellow')); return { exitCode: 1 }; }
        const pattern = rest[0];
        const files = rest.slice(1);

        let re;
        try { re = new RegExp(pattern, flags.has('i') ? 'gi' : 'g'); }
        catch(e) { ctx.term.println(`<span class="ansi-fg-red">grep: invalid regex: ${esc(e.message)}</span>`); return { exitCode: 2 }; }

        let out = '';
        let matched = false;

        const doGrep = (content, label) => {
            const lines = content.split('\n');
            let count = 0;
            lines.forEach((line, idx) => {
                const testRe = new RegExp(pattern, flags.has('i') ? 'i' : '');
                const matches = flags.has('v') ? !testRe.test(line) : testRe.test(line);
                if (matches) {
                    matched = true; count++;
                    if (!flags.has('c') && !flags.has('l')) {
                        let displayLine = esc(line).replace(new RegExp(esc(pattern), flags.has('i') ? 'gi' : 'g'),
                            m => `<span class="grep-match">${m}</span>`);
                        const lineNum = flags.has('n') ? `<span class="ansi-fg-cyan">${idx+1}:</span>` : '';
                        const prefix = label ? `<span class="ansi-fg-magenta">${esc(label)}:</span>` : '';
                        ctx.term.println(prefix + lineNum + displayLine);
                        out += (label ? label + ':' : '') + (flags.has('n') ? (idx+1) + ':' : '') + line + '\n';
                    }
                }
            });
            if (flags.has('c')) {
                const lbl = label ? `<span class="ansi-fg-magenta">${esc(label)}:</span>` : '';
                ctx.term.println(lbl + String(count));
                out += (label ? label + ':' : '') + count + '\n';
            }
            if (flags.has('l') && count > 0) {
                ctx.term.println(esc(label || ''));
                out += (label || '') + '\n';
            }
        };

        if (files.length === 0) {
            doGrep(ctx.stdin || '', null);
        } else if (flags.has('r')) {
            for (const p of files) {
                const abs = ctx.fs.resolve(p);
                const found = ctx.fs.find(abs, (name, node, path) => node.type === 'file');
                for (const fp of found) {
                    const content = ctx.fs.readFile(fp) || '';
                    doGrep(content, fp);
                }
            }
        } else {
            for (const p of files) {
                const abs = ctx.fs.resolve(p);
                const node = ctx.fs.getNode(abs);
                if (!node) { ctx.term.println(`<span class="ansi-fg-red">grep: ${esc(p)}: No such file or directory</span>`); continue; }
                if (node.type === 'dir') { ctx.term.println(`<span class="ansi-fg-red">grep: ${esc(p)}: Is a directory</span>`); continue; }
                doGrep(ctx.fs.readFile(abs) || '', files.length > 1 ? p : null);
            }
        }
        return { exitCode: matched ? 0 : 1, stdout: out };
    });

    /* ── find ── */
    reg('find', async (args, ctx) => {
        let startPath = ctx.fs.cwd;
        let namePattern = null, typeFilter = null, maxDepth = undefined;
        const rest = [];
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-name' && i+1 < args.length) { namePattern = args[++i]; }
            else if (args[i] === '-type' && i+1 < args.length) { typeFilter = args[++i]; }
            else if (args[i] === '-maxdepth' && i+1 < args.length) { maxDepth = parseInt(args[++i]); }
            else rest.push(args[i]);
        }
        if (rest.length) startPath = ctx.fs.resolve(rest[0]);

        const nameRe = namePattern ? new RegExp('^' + namePattern.replace(/\*/g,'.*').replace(/\?/g,'.') + '$') : null;

        const results = ctx.fs.find(startPath, (name, node, path) => {
            if (nameRe && !nameRe.test(name)) return false;
            if (typeFilter === 'f' && node.type !== 'file') return false;
            if (typeFilter === 'd' && node.type !== 'dir') return false;
            return true;
        }, maxDepth);

        results.forEach(p => ctx.term.println(esc(p)));
        return { exitCode: 0, stdout: results.join('\n') + '\n' };
    });

    /* ── wc ── */
    reg('wc', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['l','w','c','m']);
        const sources = rest.length ? rest : [null];
        let totalL = 0, totalW = 0, totalC = 0, out = '';

        for (const p of sources) {
            let content;
            if (p === null) content = ctx.stdin || '';
            else { const abs = ctx.fs.resolve(p); content = ctx.fs.readFile(abs) || ''; }
            const l = (content.match(/\n/g) || []).length;
            const w = (content.trim().match(/\S+/g) || []).length;
            const ch = content.length;
            totalL += l; totalW += w; totalC += ch;
            let line = '';
            if (!flags.size || flags.has('l')) line += String(l).padStart(8);
            if (!flags.size || flags.has('w')) line += String(w).padStart(8);
            if (!flags.size || flags.has('c') || flags.has('m')) line += String(ch).padStart(8);
            if (p) line += ' ' + p;
            ctx.term.println(esc(line));
            out += line + '\n';
        }
        if (sources.length > 1) {
            let total = '';
            if (!flags.size || flags.has('l')) total += String(totalL).padStart(8);
            if (!flags.size || flags.has('w')) total += String(totalW).padStart(8);
            if (!flags.size || flags.has('c')) total += String(totalC).padStart(8);
            total += ' total';
            ctx.term.println(esc(total));
        }
        return { exitCode: 0, stdout: out };
    });

    /* ── sort ── */
    reg('sort', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['r','n','u','f','b']);
        let content = rest.length ? (ctx.fs.readFile(ctx.fs.resolve(rest[0])) || '') : (ctx.stdin || '');
        let lines = content.split('\n');
        if (lines[lines.length-1] === '') lines.pop();
        if (flags.has('n')) lines.sort((a,b) => parseFloat(a) - parseFloat(b));
        else if (flags.has('f')) lines.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        else lines.sort();
        if (flags.has('r')) lines.reverse();
        if (flags.has('u')) lines = [...new Set(lines)];
        const out = lines.join('\n') + '\n';
        lines.forEach(l => ctx.term.println(esc(l)));
        return { exitCode: 0, stdout: out };
    });

    /* ── uniq ── */
    reg('uniq', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['c','d','u']);
        const content = rest.length ? (ctx.fs.readFile(ctx.fs.resolve(rest[0])) || '') : (ctx.stdin || '');
        const lines = content.split('\n');
        if (lines[lines.length-1] === '') lines.pop();
        const result = [];
        for (let i = 0; i < lines.length; i++) {
            let count = 1;
            while (i+1 < lines.length && lines[i+1] === lines[i]) { count++; i++; }
            if (!flags.has('d') && !flags.has('u')) result.push({ line: lines[i], count });
            else if (flags.has('d') && count > 1) result.push({ line: lines[i], count });
            else if (flags.has('u') && count === 1) result.push({ line: lines[i], count });
        }
        let out = '';
        result.forEach(({ line, count }) => {
            const prefix = flags.has('c') ? `${String(count).padStart(7)} ` : '';
            ctx.term.println(esc(prefix + line));
            out += prefix + line + '\n';
        });
        return { exitCode: 0, stdout: out };
    });

    /* ── tr ── */
    reg('tr', async (args, ctx) => {
        const input = ctx.stdin || '';
        if (args.length < 2) { ctx.term.println(esc(input)); return { exitCode: 0, stdout: input }; }
        let out = input;
        const [from, to] = args.slice(-2);
        for (let i = 0; i < Math.min(from.length, to.length); i++) {
            out = out.split(from[i]).join(to[i]);
        }
        ctx.term.println(esc(out));
        return { exitCode: 0, stdout: out };
    });

    /* ── cut ── */
    reg('cut', async (args, ctx) => {
        let delim = '\t', fields = [1];
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-d' && i+1 < args.length) delim = args[++i];
            else if (args[i] === '-f' && i+1 < args.length) {
                fields = args[++i].split(',').map(Number);
            } else if (args[i].startsWith('-d')) delim = args[i].slice(2);
            else if (args[i].startsWith('-f')) fields = args[i].slice(2).split(',').map(Number);
        }
        const content = ctx.stdin || '';
        const lines = content.split('\n');
        let out = '';
        lines.forEach(line => {
            const parts = line.split(delim);
            const result = fields.map(f => parts[f-1] || '').join(delim);
            ctx.term.println(esc(result));
            out += result + '\n';
        });
        return { exitCode: 0, stdout: out };
    });

    /* ── sed ── */
    reg('sed', async (args, ctx) => {
        let script = '', files = [];
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-e' && i+1 < args.length) script = args[++i];
            else if (!script && !args[i].startsWith('-')) { script = args[i]; }
            else files.push(args[i]);
        }
        const content = files.length ? (ctx.fs.readFile(ctx.fs.resolve(files[0])) || '') : (ctx.stdin || '');
        let out = content;
        const match = script.match(/^s(.)(.*?)\1(.*?)\1([gmi]*)$/);
        if (match) {
            const [,, pat, repl, flgs] = match;
            try { out = content.replace(new RegExp(pat, flgs.includes('g') ? 'g' : ''), repl); }
            catch(e) { ctx.term.println(`<span class="ansi-fg-red">sed: ${esc(e.message)}</span>`); return { exitCode: 1 }; }
        }
        out.split('\n').forEach(l => ctx.term.println(esc(l)));
        return { exitCode: 0, stdout: out };
    });

    /* ── awk ── */
    reg('awk', async (args, ctx) => {
        let prog = '', delim = /\s+/, files = [];
        for (let i = 0; i < args.length; i++) {
            if ((args[i] === '-F' || args[i] === '-f') && i+1 < args.length && args[i] === '-F') {
                delim = new RegExp(args[++i].replace(/\//g,''));
            } else if (args[i].startsWith('-F')) { delim = new RegExp(args[i].slice(2)); }
            else if (!prog && !args[i].startsWith('-')) prog = args[i];
            else if (prog) files.push(args[i]);
        }
        const content = files.length ? (ctx.fs.readFile(ctx.fs.resolve(files[0])) || '') : (ctx.stdin || '');
        const printMatch = prog.match(/\{print\s+(\$\d+(?:,\s*\$\d+)*)\}/);
        let out = '';
        const lines = content.split('\n');
        lines.forEach(line => {
            const parts = line.split(delim);
            let result = line;
            if (printMatch) {
                result = printMatch[1].split(',').map(f => {
                    const idx = parseInt(f.trim().slice(1));
                    return idx === 0 ? line : (parts[idx-1] || '');
                }).join(' ');
            }
            ctx.term.println(esc(result));
            out += result + '\n';
        });
        return { exitCode: 0, stdout: out };
    });

    /* ── touch ── */
    reg('touch', async (args, ctx) => {
        const { rest } = parseFlags(args, []);
        if (!rest.length) { ctx.term.println(c('touch: missing file operand', 'ansi-fg-red')); return { exitCode: 1 }; }
        if (rest.length === 1 && rest[0] === 'grass') {
            return SD.EasterEggs ? SD.EasterEggs.touchGrass(ctx) : { exitCode: 0 };
        }
        for (const p of rest) {
            const abs = ctx.fs.resolve(p);
            ctx.fs.touch(abs);
        }
        return { exitCode: 0 };
    });

    /* ── mkdir ── */
    reg('mkdir', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['p','v']);
        for (const p of rest) {
            const abs = ctx.fs.resolve(p);
            const ok = ctx.fs.mkdir(abs, flags.has('p'));
            if (!ok) {
                ctx.term.println(`<span class="ansi-fg-red">mkdir: cannot create directory '${esc(p)}': File exists</span>`);
                return { exitCode: 1 };
            }
            if (flags.has('v')) ctx.term.println(`mkdir: created directory '${esc(p)}'`);
        }
        return { exitCode: 0 };
    });

    /* ── rm ── */
    reg('rm', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['r','f','R','v','i']);
        const recursive = flags.has('r') || flags.has('R');
        const force = flags.has('f');

        // Catch rm -rf / attempts
        const fullCmd = 'rm ' + args.join(' ');
        if (fullCmd.includes('-rf') && rest.includes('/') || fullCmd.includes('-rf /')) {
            if (ctx.fs.env.USER !== 'root') {
                ctx.term.println(`<span class="ansi-fg-red">rm: cannot remove '/': Permission denied</span>`);
                return { exitCode: 1 };
            }
            return SD.EasterEggs ? SD.EasterEggs.rmRf(ctx) : { exitCode: 0 };
        }

        for (const p of rest) {
            const abs = ctx.fs.resolve(p);
            const node = ctx.fs.getNode(abs);
            if (!node) {
                if (!force) ctx.term.println(`<span class="ansi-fg-red">rm: cannot remove '${esc(p)}': No such file or directory</span>`);
                continue;
            }
            if (node.type === 'dir' && !recursive) {
                ctx.term.println(`<span class="ansi-fg-red">rm: cannot remove '${esc(p)}': Is a directory</span>`);
                continue;
            }
            ctx.fs.rm(abs, recursive);
            if (flags.has('v')) ctx.term.println(`removed '${esc(p)}'`);
        }
        return { exitCode: 0 };
    });

    /* ── cp ── */
    reg('cp', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['r','R','f','v','p']);
        if (rest.length < 2) { ctx.term.println(c('cp: missing file operand', 'ansi-fg-red')); return { exitCode: 1 }; }
        const dst = ctx.fs.resolve(rest[rest.length - 1]);
        const srcs = rest.slice(0, -1);
        for (const s of srcs) {
            const abs = ctx.fs.resolve(s);
            if (!ctx.fs.getNode(abs)) { ctx.term.println(`<span class="ansi-fg-red">cp: '${esc(s)}': No such file or directory</span>`); continue; }
            ctx.fs.cp(abs, dst);
            if (flags.has('v')) ctx.term.println(`'${esc(s)}' -> '${esc(dst)}'`);
        }
        return { exitCode: 0 };
    });

    /* ── mv ── */
    reg('mv', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['f','v','n']);
        if (rest.length < 2) { ctx.term.println(c('mv: missing file operand', 'ansi-fg-red')); return { exitCode: 1 }; }
        const dst = ctx.fs.resolve(rest[rest.length - 1]);
        const srcs = rest.slice(0, -1);
        for (const s of srcs) {
            const abs = ctx.fs.resolve(s);
            if (!ctx.fs.getNode(abs)) { ctx.term.println(`<span class="ansi-fg-red">mv: '${esc(s)}': No such file or directory</span>`); continue; }
            ctx.fs.mv(abs, dst);
            if (flags.has('v')) ctx.term.println(`renamed '${esc(s)}' -> '${esc(dst)}'`);
        }
        return { exitCode: 0 };
    });

    /* ── whoami ── */
    reg('whoami', async (args, ctx) => {
        ctx.term.println(esc(ctx.fs.env.USER));
        return { exitCode: 0, stdout: ctx.fs.env.USER + '\n' };
    });

    /* ── id ── */
    reg('id', async (args, ctx) => {
        const line = 'uid=1000(user) gid=1000(user) groups=1000(user),4(adm),27(sudo),1001(docker)';
        ctx.term.println(esc(line));
        return { exitCode: 0, stdout: line + '\n' };
    });

    /* ── hostname ── */
    reg('hostname', async (args, ctx) => {
        ctx.term.println(esc(ctx.fs.env.HOSTNAME));
        return { exitCode: 0, stdout: ctx.fs.env.HOSTNAME + '\n' };
    });

    /* ── uname ── */
    reg('uname', async (args, ctx) => {
        const all = args.includes('-a') || args.includes('--all');
        const sysname = 'Linux';
        const nodename = 'synth-district';
        const release = '6.6.0-synth-district';
        const version = '#1 SMP PREEMPT_DYNAMIC Mon Jan 15 08:00:00 UTC 2024';
        const machine = 'x86_64';
        let out;
        if (all) out = `${sysname} ${nodename} ${release} ${version} ${machine} GNU/Linux`;
        else if (args.includes('-s') || !args.length) out = sysname;
        else if (args.includes('-n')) out = nodename;
        else if (args.includes('-r')) out = release;
        else if (args.includes('-v')) out = version;
        else if (args.includes('-m')) out = machine;
        else if (args.includes('-p')) out = 'x86_64';
        else if (args.includes('-i')) out = 'x86_64';
        else if (args.includes('-o')) out = 'GNU/Linux';
        else out = sysname;
        ctx.term.println(esc(out));
        return { exitCode: 0, stdout: out + '\n' };
    });

    /* ── date ── */
    reg('date', async (args, ctx) => {
        const now = new Date();
        let fmt = null;
        for (const a of args) { if (a.startsWith('+')) fmt = a.slice(1); }
        let out;
        if (fmt) {
            out = fmt
                .replace('%Y', now.getFullYear())
                .replace('%m', String(now.getMonth()+1).padStart(2,'0'))
                .replace('%d', String(now.getDate()).padStart(2,'0'))
                .replace('%H', String(now.getHours()).padStart(2,'0'))
                .replace('%M', String(now.getMinutes()).padStart(2,'0'))
                .replace('%S', String(now.getSeconds()).padStart(2,'0'))
                .replace('%s', Math.floor(now.getTime()/1000))
                .replace('%A', now.toLocaleString('en', { weekday: 'long' }))
                .replace('%B', now.toLocaleString('en', { month: 'long' }))
                .replace('%a', now.toLocaleString('en', { weekday: 'short' }))
                .replace('%b', now.toLocaleString('en', { month: 'short' }))
                .replace('%n', '\n')
                .replace('%t', '\t');
        } else {
            out = now.toString();
        }
        ctx.term.println(esc(out));
        return { exitCode: 0, stdout: out + '\n' };
    });

    /* ── uptime ── */
    reg('uptime', async (args, ctx) => {
        const elapsed = Math.floor((Date.now() - (SD._bootTime || Date.now())) / 1000) + 3600;
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 8);
        const load = (Math.random() * 0.5 + 0.1).toFixed(2);
        const out = ` ${timeStr} up ${h}:${String(m).padStart(2,'0')},  1 user,  load average: ${load}, ${(parseFloat(load)+0.05).toFixed(2)}, ${(parseFloat(load)+0.02).toFixed(2)}`;
        ctx.term.println(esc(out));
        return { exitCode: 0 };
    });

    /* ── env ── */
    reg('env', async (args, ctx) => {
        const entries = Object.entries(ctx.fs.env);
        entries.sort((a,b) => a[0].localeCompare(b[0]));
        let out = '';
        entries.forEach(([k,v]) => {
            ctx.term.println(esc(`${k}=${v}`));
            out += `${k}=${v}\n`;
        });
        return { exitCode: 0, stdout: out };
    });

    /* ── export ── */
    reg('export', async (args, ctx) => {
        for (const a of args) {
            const eq = a.indexOf('=');
            if (eq === -1) continue;
            const key = a.slice(0, eq);
            const val = a.slice(eq + 1);
            ctx.fs.env[key] = val;
        }
        return { exitCode: 0 };
    });

    /* ── history ── */
    reg('history', async (args, ctx) => {
        const h = ctx.term.history;
        const start = Math.max(0, h.length - 500);
        let out = '';
        h.slice(start).forEach((cmd, i) => {
            const line = `  ${String(start + i + 1).padStart(4)}  ${cmd}`;
            ctx.term.println(esc(line));
            out += line + '\n';
        });
        return { exitCode: 0, stdout: out };
    });

    /* ── alias ── */
    reg('alias', async (args, ctx) => {
        if (!args.length) {
            Object.entries(ctx.term.aliases).forEach(([k,v]) => {
                ctx.term.println(`alias ${esc(k)}='${esc(v)}'`);
            });
            return { exitCode: 0 };
        }
        for (const a of args) {
            const eq = a.indexOf('=');
            if (eq === -1) {
                if (ctx.term.aliases[a]) ctx.term.println(`alias ${esc(a)}='${esc(ctx.term.aliases[a])}'`);
            } else {
                ctx.term.aliases[a.slice(0, eq)] = a.slice(eq+1).replace(/^'|'$/g,'').replace(/^"|"$/g,'');
            }
        }
        return { exitCode: 0 };
    });

    /* ── unalias ── */
    reg('unalias', async (args, ctx) => {
        for (const a of args) delete ctx.term.aliases[a];
        return { exitCode: 0 };
    });

    /* ── which ── */
    reg('which', async (args, ctx) => {
        for (const a of args) {
            if (registry[a] || ctx.term.aliases[a]) {
                ctx.term.println(esc(`/usr/bin/${a}`));
            } else {
                ctx.term.println(`<span class="ansi-fg-red">${esc(a)} not found</span>`);
            }
        }
        return { exitCode: 0 };
    });

    /* ── whereis ── */
    reg('whereis', async (args, ctx) => {
        for (const a of args) {
            const has = registry[a];
            ctx.term.println(esc(`${a}: ${has ? '/usr/bin/'+a : ''} ${has ? '/usr/share/man/man1/'+a+'.1.gz' : ''}`));
        }
        return { exitCode: 0 };
    });

    /* ── ps ── */
    reg('ps', async (args, ctx) => {
        const isAux = args.includes('aux') || args.includes('-aux') || (args.includes('a') && args.includes('u'));
        if (!isAux && args.length > 0) {
            // basic ps
        }
        const rows = [
            ['root',        '1',    '0.0', '0.1', '33584',  '3808', '?',    'Ss', '08:12', '0:01', '/sbin/init'],
            ['root',        '2',    '0.0', '0.0', '0',      '0',    '?',    'S',  '08:12', '0:00', '[kthreadd]'],
            ['root',       '312',   '0.0', '0.3', '47832',  '12244','?',    'Ss', '08:12', '0:00', '/usr/sbin/sshd -D'],
            ['www-data',   '892',   '0.1', '0.5', '112432', '20480','?',    'Ss', '08:12', '0:03', 'nginx: master process /usr/sbin/nginx'],
            ['www-data',   '893',   '0.0', '0.4', '112944', '16384','?',    'S',  '08:12', '0:01', 'nginx: worker process'],
            ['root',       '921',   '0.0', '0.1', '35200',  '4096', '?',    'Ss', '08:12', '0:00', '/usr/sbin/cron -f'],
            ['user',      '1024',   '0.1', '0.8', '512432', '32168','pts/0','Ss', '08:15', '0:02', '-bash'],
            ['user',      '1025',   '0.0', '0.1', '13568',  '4096', 'pts/0','R+', '08:16', '0:00', 'ps aux'],
        ];
        const hdr = `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND`;
        ctx.term.println(`<span class="ansi-fg-bright-white ansi-bold">${esc(hdr)}</span>`);
        let out = hdr + '\n';
        for (const r of rows) {
            const [user, pid, cpu, mem, vsz, rss, tty, stat, start, time, ...cmd] = r;
            const line = `${user.padEnd(10)} ${pid.padStart(5)} ${cpu.padStart(4)} ${mem.padStart(4)} ${vsz.padStart(6)} ${rss.padStart(5)} ${tty.padEnd(8)} ${stat.padEnd(4)} ${start.padStart(5)} ${time.padStart(5)} ${cmd.join(' ')}`;
            ctx.term.println(esc(line));
            out += line + '\n';
        }
        return { exitCode: 0, stdout: out };
    });

    /* ── kill ── */
    reg('kill', async (args, ctx) => {
        const pid = args.find(a => /^\d+$/.test(a));
        if (!pid) { ctx.term.println(c('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]', 'ansi-fg-yellow')); return { exitCode: 1 }; }
        if (['1', '2', '312', '892', '893', '921', '1024'].includes(pid)) {
            ctx.term.println(`<span class="ansi-fg-red">bash: kill: (${esc(pid)}) - Operation not permitted</span>`);
            return { exitCode: 1 };
        }
        ctx.term.println(`kill: (${esc(pid)}): No such process`);
        return { exitCode: 1 };
    });

    /* ── top ── */
    reg(['top', 'htop'], async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.top(ctx) : { exitCode: 0 };
    });

    /* ── df ── */
    reg('df', async (args, ctx) => {
        const human = args.includes('-h') || args.includes('-H');
        const fmt = human ? (n) => (n >= 1024*1024 ? (n/1024/1024).toFixed(1)+'G' : (n/1024).toFixed(0)+'M') : (n) => String(n);
        const hdr = human
            ? 'Filesystem      Size  Used Avail Use% Mounted on'
            : 'Filesystem     1K-blocks    Used Available Use% Mounted on';
        ctx.term.println(`<span class="ansi-fg-bright-white ansi-bold">${esc(hdr)}</span>`);
        const rows = [
            ['/dev/sda1', human ? '234G' : '245366784', human ? '28G' : '29360128', human ? '194G' : '203268506', '12%', '/'],
            ['tmpfs',     human ? '16G' : '16777216',   human ? '0' : '0',          human ? '16G' : '16777216',  '0%', '/dev/shm'],
            ['/dev/sdb1', human ? '500G' : '524288000', human ? '120G' : '125829120',human ? '380G': '398458880', '24%', '/mnt/data'],
            ['tmpfs',     human ? '3.2G' : '3276800',   human ? '2.4M' : '2400',    human ? '3.2G' : '3274400',  '0%', '/run'],
        ];
        rows.forEach(r => ctx.term.println(esc(`${r[0].padEnd(15)} ${r[1].padStart(8)} ${r[2].padStart(6)} ${r[3].padStart(9)} ${r[4].padStart(4)} ${r[5]}`)));
        return { exitCode: 0 };
    });

    /* ── free ── */
    reg('free', async (args, ctx) => {
        const human = args.includes('-h');
        const hdr = human ? '               total        used        free      shared  buff/cache   available'
                          : '               total        used        free      shared  buff/cache   available';
        ctx.term.println(esc(hdr));
        if (human) {
            ctx.term.println(esc('Mem:            31Gi        8Gi        7Gi       256Mi        16Gi        22Gi'));
            ctx.term.println(esc('Swap:           8Gi          0B        8Gi'));
        } else {
            ctx.term.println(esc('Mem:        32768000     8388608     7340032      262144    17039360    22020096'));
            ctx.term.println(esc('Swap:        8388608           0     8388608'));
        }
        return { exitCode: 0 };
    });

    /* ── ping ── */
    reg('ping', async (args, ctx) => {
        const host = args.find(a => !a.startsWith('-')) || 'localhost';
        let count = Infinity;
        const ci = args.indexOf('-c');
        if (ci !== -1 && args[ci+1]) count = parseInt(args[ci+1]) || 4;
        const ip = host === 'localhost' ? '127.0.0.1' : '93.184.216.34';
        ctx.term.println(esc(`PING ${host} (${ip}) 56(84) bytes of data.`));
        let sent = 0, received = 0;
        const times = [];
        for (let i = 1; i <= Math.min(count, 9999); i++) {
            await delay(950 + Math.random() * 100, ctx.signal);
            const ms = (10 + Math.random() * 40).toFixed(3);
            times.push(parseFloat(ms));
            ctx.term.println(esc(`64 bytes from ${ip}: icmp_seq=${i} ttl=54 time=${ms} ms`));
            sent++; received++;
        }
        ctx.term.println('');
        ctx.term.println(esc(`--- ${host} ping statistics ---`));
        ctx.term.println(esc(`${sent} packets transmitted, ${received} received, 0% packet loss`));
        if (times.length) {
            const min = Math.min(...times).toFixed(3);
            const max = Math.max(...times).toFixed(3);
            const avg = (times.reduce((a,b)=>a+b,0)/times.length).toFixed(3);
            ctx.term.println(esc(`rtt min/avg/max/mdev = ${min}/${avg}/${max}/0.412 ms`));
        }
        return { exitCode: 0 };
    });

    /* ── ifconfig ── */
    reg('ifconfig', async (args, ctx) => {
        const output = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.42  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::1  prefixlen 64  scopeid 0x20<link>
        ether 00:11:22:33:44:55  txqueuelen 1000  (Ethernet)
        RX packets 124832  bytes 98234123 (93.7 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 87432  bytes 12423432 (11.8 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 4823  bytes 432123 (422.0 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 4823  bytes 432123 (422.0 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0`;
        output.split('\n').forEach(l => ctx.term.println(esc(l)));
        return { exitCode: 0 };
    });

    /* ── ip ── */
    reg('ip', async (args, ctx) => {
        const sub = args[0];
        if (sub === 'addr' || sub === 'a' || sub === 'address') {
            const output = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.42/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86398sec preferred_lft 86398sec
    inet6 fe80::1/64 scope link
       valid_lft forever preferred_lft forever`;
            output.split('\n').forEach(l => ctx.term.println(esc(l)));
        } else if (sub === 'route' || sub === 'r') {
            ctx.term.println(esc('default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.42 metric 100'));
            ctx.term.println(esc('192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.42'));
        } else if (sub === 'link' || sub === 'l') {
            ctx.term.println(esc('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT'));
            ctx.term.println(esc('2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP'));
        } else {
            ctx.term.println(c('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }', 'ansi-fg-yellow'));
        }
        return { exitCode: 0 };
    });

    /* ── netstat ── */
    reg(['netstat', 'ss'], async (args, ctx) => {
        const hdr = 'Proto Recv-Q Send-Q Local Address           Foreign Address         State';
        ctx.term.println(`<span class="ansi-fg-bright-white ansi-bold">${esc(hdr)}</span>`);
        const rows = [
            'tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN',
            'tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN',
            'tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN',
            'tcp        0     52 192.168.1.42:22         10.0.0.5:44321          ESTABLISHED',
            'tcp6       0      0 :::22                   :::*                    LISTEN',
            'udp        0      0 0.0.0.0:68              0.0.0.0:*',
        ];
        rows.forEach(r => ctx.term.println(esc(r)));
        return { exitCode: 0 };
    });

    /* ── curl ── */
    reg('curl', async (args, ctx) => {
        const url = args.find(a => !a.startsWith('-'));
        if (!url) { ctx.term.println(c('curl: try \'curl --help\' for more information', 'ansi-fg-red')); return { exitCode: 1 }; }
        const silent = args.includes('-s') || args.includes('--silent');

        const host = url.replace(/https?:\/\//,'').split('/')[0];
        const routes = {
            'ifconfig.me': () => '203.0.113.42',
            'icanhazip.com': () => '203.0.113.42',
            'api.ipify.org': () => '203.0.113.42',
            'ipinfo.io': () => '{\n  "ip": "203.0.113.42",\n  "city": "Synth City",\n  "region": "Neon State",\n  "country": "US",\n  "org": "AS64496 Synth District Networks"\n}',
            'wttr.in': () => WEATHER_ASCII,
        };

        if (!silent) {
            ctx.term.println(c(`  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current`, 'ansi-dim'));
            ctx.term.println(c(`                                 Dload  Upload   Total   Spent    Left  Speed`, 'ansi-dim'));
            await delay(300, ctx.signal);
            ctx.term.println(c(`100   ${String(Math.floor(Math.random()*800+200)).padStart(4)}  100   ${String(Math.floor(Math.random()*800+200)).padStart(4)}    0     0   8432      0 --:--:-- --:--:-- --:--:-- 8521`, 'ansi-dim'));
        }

        const fn = routes[host];
        if (fn) {
            const out = fn();
            out.split('\n').forEach(l => ctx.term.println(esc(l)));
            return { exitCode: 0, stdout: out };
        }

        ctx.term.println(`<span class="ansi-fg-red">curl: (6) Could not resolve host: ${esc(host)}</span>`);
        return { exitCode: 6 };
    });

    const WEATHER_ASCII = `Weather report: Synth City

    \\ /     Sunny
  - .-. -   ${new Date().toLocaleDateString('en', { weekday: 'short' })}
 — ( ) —   25 °C
  - \`-' -   ↑ 10 km/h
    / \\     10 km
             0.0 mm`;

    /* ── wget ── */
    reg('wget', async (args, ctx) => {
        const url = args.find(a => !a.startsWith('-'));
        if (!url) { ctx.term.println(c('wget: missing URL', 'ansi-fg-red')); return { exitCode: 1 }; }
        const filename = url.split('/').pop() || 'index.html';
        ctx.term.println(esc(`--${new Date().toISOString()}--  ${url}`));
        ctx.term.println(esc(`Resolving ${url.replace(/https?:\/\//,'').split('/')[0]}... failed: Name or service not known.`));
        await delay(800, ctx.signal);
        ctx.term.println(`<span class="ansi-fg-red">wget: unable to resolve host address '${esc(url.replace(/https?:\/\//,'').split('/')[0])}'</span>`);
        return { exitCode: 4 };
    });

    /* ── ssh ── */
    reg('ssh', async (args, ctx) => {
        const target = args.find(a => !a.startsWith('-'));
        if (!target) { ctx.term.println(c('usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [user@]hostname [command]', 'ansi-fg-yellow')); return { exitCode: 1 }; }
        ctx.term.println(esc(`ssh: connect to host ${target} port 22: Connection refused`));
        return { exitCode: 255 };
    });

    /* ── sudo ── */
    reg('sudo', async (args, ctx) => {
        if (!args.length) { ctx.term.println(c('usage: sudo [-AbEefHnPS] [-r role] [-t type] [-C num] [-g group] [-p prompt] [-T timeout] [-u user] [VAR=value] [-i | -s | -l [[user] command | -g group command]] [command]', 'ansi-fg-yellow')); return { exitCode: 1 }; }
        const sub = args.join(' ');
        if (sub === 'make me a sandwich') {
            ctx.term.println(c('What? Make it yourself.', 'ansi-fg-red'));
            return { exitCode: 1 };
        }
        if (sub === 'please make me a sandwich') {
            ctx.term.println(c('Okay.', 'ansi-fg-green'));
            ctx.term.println('🥪');
            return { exitCode: 0 };
        }
        if (sub === '!!') {
            const lastCmd = ctx.term.history[ctx.term.history.length - 1];
            if (lastCmd) {
                ctx.term.println(esc('sudo ' + lastCmd));
                return executeOne(lastCmd, ctx.term, ctx.fs, ctx.stdin);
            }
        }
        if ((args[0] === 'rm' && args.join(' ').includes('/')) || sub.match(/rm\s+-rf?\s+\//)) {
            return SD.EasterEggs ? SD.EasterEggs.rmRf(ctx) : { exitCode: 0 };
        }
        if (sub === 'su' || args[0] === 'su') {
            ctx.term.println('root@synth-district:~# ');
            return { exitCode: 0 };
        }
        // Run as root
        return executeOne(args.join(' '), ctx.term, ctx.fs, ctx.stdin);
    });

    /* ── su ── */
    reg('su', async (args, ctx) => {
        const targetUser = args.find(a => !a.startsWith('-')) || 'root';
        const loginShell = args.includes('-') || args.includes('-l');
        const currentUser = ctx.fs.env.USER;

        // root can su to anyone without a password
        if (currentUser === 'root') {
            ctx.term.println(c(`su: switching to ${targetUser}`, 'ansi-dim'));
            applyUser(targetUser, loginShell, ctx);
            return { exitCode: 0 };
        }

        // Non-root: prompt up to 3 times
        const MAX_TRIES = 3;
        for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
            const pw = await ctx.term.promptPassword('Password: ');
            if (pw === null) return { exitCode: 1 }; // Ctrl+C

            await delay(600, ctx.signal); // simulate auth delay

            if (pw === 'admin') {
                ctx.term.println('');
                applyUser(targetUser, loginShell, ctx);
                return { exitCode: 0 };
            }

            if (attempt < MAX_TRIES) {
                ctx.term.println(c('su: Authentication failure', 'ansi-fg-red'));
            }
        }

        ctx.term.println(c(`su: ${MAX_TRIES} incorrect password attempts`, 'ansi-fg-red'));
        return { exitCode: 1 };
    });

    function applyUser(targetUser, loginShell, ctx) {
        const fs = ctx.fs;
        const term = ctx.term;

        // Save previous state so `exit` can restore it
        term._suStack = term._suStack || [];
        term._suStack.push({
            USER: fs.env.USER,
            HOME: fs.env.HOME,
            LOGNAME: fs.env.LOGNAME,
            cwd: fs.cwd,
        });

        if (targetUser === 'root') {
            fs.env.USER    = 'root';
            fs.env.LOGNAME = 'root';
            fs.env.HOME    = '/root';
            if (loginShell) fs.cwd = '/root';
        } else {
            fs.env.USER    = targetUser;
            fs.env.LOGNAME = targetUser;
            fs.env.HOME    = `/home/${targetUser}`;
            if (loginShell) fs.cwd = `/home/${targetUser}`;
        }

        term.renderPrompt();
    }

    /* ── apt / apt-get ── */
    reg(['apt', 'apt-get'], async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.apt(args, ctx) : { exitCode: 0 };
    });

    /* ── npm ── */
    reg('npm', async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.npm(args, ctx) : { exitCode: 0 };
    });

    /* ── pip / pip3 ── */
    reg(['pip', 'pip3'], async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.pip(args, ctx) : { exitCode: 0 };
    });

    /* ── man ── */
    reg('man', async (args, ctx) => {
        const topic = args.find(a => !a.startsWith('-'));
        if (!topic) { ctx.term.println(c('What manual page do you want?', 'ansi-fg-red')); return { exitCode: 1 }; }
        if (topic === 'woman') { ctx.term.println(c('No manual entry for woman', 'ansi-fg-red')); return { exitCode: 16 }; }
        const page = MAN_PAGES[topic];
        if (!page) { ctx.term.println(`<span class="ansi-fg-red">No manual entry for ${esc(topic)}</span>`); return { exitCode: 1 }; }
        return SD.EasterEggs ? SD.EasterEggs.pager(page, ctx) : { exitCode: 0 };
    });

    /* ── vim / vi ── */
    reg(['vim', 'vi', 'nvim'], async (args, ctx) => {
        const { rest } = parseFlags(args, []);
        const filepath = rest[0];
        return SD.EasterEggs ? SD.EasterEggs.vim(filepath, ctx) : { exitCode: 0 };
    });

    /* ── nano ── */
    reg('nano', async (args, ctx) => {
        const { rest } = parseFlags(args, []);
        const filepath = rest[0];
        return SD.EasterEggs ? SD.EasterEggs.nano(filepath, ctx) : { exitCode: 0 };
    });

    /* ── cal ── */
    reg('cal', async (args, ctx) => {
        const now = new Date();
        const y = parseInt(args[1]) || now.getFullYear();
        const m = parseInt(args[0]) ? parseInt(args[0]) - 1 : now.getMonth();
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const header = `${months[m]} ${y}`;
        ctx.term.println(`<span class="ansi-bold">${esc(header.padStart(10+header.length/2).padEnd(20))}</span>`);
        ctx.term.println(esc('Su Mo Tu We Th Fr Sa'));
        const first = new Date(y, m, 1).getDay();
        const days = new Date(y, m+1, 0).getDate();
        let row = '   '.repeat(first);
        for (let d = 1; d <= days; d++) {
            const isToday = d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
            const ds = String(d).padStart(2);
            if (isToday) row += `<span class="ansi-bg-white ansi-fg-black">${esc(ds)}</span> `;
            else row += esc(ds) + ' ';
            if ((first + d) % 7 === 0) { ctx.term.println(row); row = ''; }
        }
        if (row.trim()) ctx.term.println(row);
        return { exitCode: 0 };
    });

    /* ── bc ── */
    reg('bc', async (args, ctx) => {
        if (ctx.stdin) {
            const lines = ctx.stdin.split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const result = Function('"use strict"; return (' + line + ')')();
                    ctx.term.println(esc(String(result)));
                } catch { ctx.term.println(c('(standard_in) 1: syntax error', 'ansi-fg-red')); }
            }
        } else {
            ctx.term.println(c('bc: interactive mode not supported. Use: echo "1+1" | bc', 'ansi-fg-yellow'));
        }
        return { exitCode: 0 };
    });

    /* ── seq ── */
    reg('seq', async (args, ctx) => {
        let first = 1, inc = 1, last;
        if (args.length === 1) last = parseInt(args[0]);
        else if (args.length === 2) { first = parseInt(args[0]); last = parseInt(args[1]); }
        else { first = parseInt(args[0]); inc = parseInt(args[1]); last = parseInt(args[2]); }
        if (isNaN(last)) { ctx.term.println(c('seq: invalid argument', 'ansi-fg-red')); return { exitCode: 1 }; }
        let out = '';
        for (let i = first; i <= last; i += inc) { ctx.term.println(esc(String(i))); out += i + '\n'; }
        return { exitCode: 0, stdout: out };
    });

    /* ── yes ── */
    reg('yes', async (args, ctx) => {
        const text = args.length ? args.join(' ') : 'y';
        ctx.term.println(c('yes: printing indefinitely. Use Ctrl+C to stop.', 'ansi-dim'));
        for (let i = 0; i < 20; i++) {
            await delay(50, ctx.signal);
            ctx.term.println(esc(text));
        }
        ctx.term.println(c('[truncated — use Ctrl+C to interrupt]', 'ansi-dim'));
        return { exitCode: 0 };
    });

    /* ── sleep ── */
    reg('sleep', async (args, ctx) => {
        const secs = parseFloat(args[0]) || 1;
        await delay(secs * 1000, ctx.signal);
        return { exitCode: 0 };
    });

    /* ── source ── */
    reg(['source', '.'], async (args, ctx) => {
        if (!args[0]) { ctx.term.println(c('bash: source: filename argument required', 'ansi-fg-red')); return { exitCode: 1 }; }
        const abs = ctx.fs.resolve(args[0]);
        const content = ctx.fs.readFile(abs);
        if (!content) { ctx.term.println(`<span class="ansi-fg-red">bash: ${esc(args[0])}: No such file or directory</span>`); return { exitCode: 1 }; }
        ctx.term.println(c(`Sourced: ${args[0]}`, 'ansi-dim'));
        return { exitCode: 0 };
    });

    /* ── exit / logout ── */
    reg(['exit', 'logout'], async (args, ctx) => {
        const stack = ctx.term._suStack;
        if (stack && stack.length > 0) {
            // Pop back to previous user
            const prev = stack.pop();
            ctx.fs.env.USER    = prev.USER;
            ctx.fs.env.LOGNAME = prev.LOGNAME;
            ctx.fs.env.HOME    = prev.HOME;
            ctx.fs.cwd         = prev.cwd;
            ctx.term.println(c(`exit`, 'ansi-dim'));
            ctx.term.renderPrompt();
            return { exitCode: 0 };
        }

        ctx.term.println(c('logout', 'ansi-dim'));
        await delay(500, ctx.signal);
        ctx.term.println('');
        ctx.term.println(cRaw('<span class="ansi-fg-green ansi-bold">Synth District Linux 1.0</span> — Session terminated.'));
        ctx.term.println(c('Type any key to continue...', 'ansi-dim'));
        await new Promise(resolve => {
            const handler = () => { resolve(); document.removeEventListener('keydown', handler); };
            document.addEventListener('keydown', handler);
        });
        ctx.term.println('');
        ctx.term.println(cRaw('<span class="ansi-fg-green ansi-bold">synth-district login: </span>'));
        return { exitCode: 0 };
    });

    /* ── reboot ── */
    reg('reboot', async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.reboot(ctx) : { exitCode: 0 };
    });

    /* ── shutdown ── */
    reg('shutdown', async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.shutdown(ctx) : { exitCode: 0 };
    });

    /* ── sl ── */
    reg('sl', async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.sl(ctx) : { exitCode: 0 };
    });

    /* ── matrix / cmatrix ── */
    reg(['matrix', 'cmatrix'], async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.matrix(ctx) : { exitCode: 0 };
    });

    /* ── hack ── */
    reg('hack', async (args, ctx) => {
        if (!SD.EasterEggs) return { exitCode: 0 };
        return args.includes('--loop') ? SD.EasterEggs.hackLoop(ctx) : SD.EasterEggs.hack(ctx);
    });

    /* ── neofetch / screenfetch ── */
    reg(['neofetch', 'screenfetch'], async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.neofetch(ctx) : { exitCode: 0 };
    });

    /* ── fortune ── */
    reg('fortune', async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.fortune(ctx) : { exitCode: 0 };
    });

    /* ── cowsay ── */
    reg('cowsay', async (args, ctx) => {
        const text = args.join(' ') || 'Moo!';
        return SD.EasterEggs ? SD.EasterEggs.cowsay(text, ctx) : { exitCode: 0 };
    });

    /* ── nmap ── */
    reg('nmap', async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.nmap(args, ctx) : { exitCode: 0 };
    });

    /* ── synth ── */
    reg('synth', async (args, ctx) => {
        return SD.EasterEggs ? SD.EasterEggs.synth(args, ctx) : { exitCode: 0 };
    });

    /* ── toggle-crt ── */
    reg('toggle-crt', async (args, ctx) => {
        document.body.classList.toggle('crt-on');
        const on = document.body.classList.contains('crt-on');
        ctx.term.println(c(`CRT effect ${on ? 'enabled' : 'disabled'}`, on ? 'ansi-fg-green' : 'ansi-fg-yellow'));
        return { exitCode: 0 };
    });

    /* ── lolcat ── */
    reg('lolcat', async (args, ctx) => {
        const text = ctx.stdin || args.join(' ') || 'lolcat';
        const colors = ['ansi-fg-red','ansi-fg-yellow','ansi-fg-green','ansi-fg-cyan','ansi-fg-blue','ansi-fg-magenta'];
        const lines = text.split('\n');
        lines.forEach(line => {
            let html = '';
            for (let i = 0; i < line.length; i++) {
                html += `<span class="${colors[(i) % colors.length]}">${esc(line[i])}</span>`;
            }
            ctx.term.println(html);
        });
        return { exitCode: 0 };
    });

    /* ── who ── */
    reg('who', async (args, ctx) => {
        const loginTime = new Date(ctx.term.startTime);
        const tty = 'pts/0';
        const ip = '127.0.0.1';
        const timeStr = String(loginTime.getHours()).padStart(2,'0') + ':' + String(loginTime.getMinutes()).padStart(2,'0');
        ctx.term.println(c(ctx.fs.env.USER, 'ansi-fg-green').padEnd(15) + tty.padEnd(15) + timeStr.padEnd(15) + `(${ip})`);
        return { exitCode: 0 };
    });

    /* ── w ── */
    reg('w', async (args, ctx) => {
        const now = new Date();
        const uptime = Math.floor((now - ctx.term.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const load1 = (Math.random() * 0.5).toFixed(2);
        const load5 = (Math.random() * 0.5).toFixed(2);
        const load15 = (Math.random() * 0.5).toFixed(2);
        ctx.term.println(c(` ${now.toLocaleTimeString()}  up ${hours}:${String(mins).padStart(2,'0')},  1 user,  load average: ${load1}, ${load5}, ${load15}`, 'ansi-fg-cyan'));
        ctx.term.println('');
        ctx.term.println(c('USER', 'ansi-fg-yellow ansi-bold').padEnd(10) + c('TTY', 'ansi-fg-yellow ansi-bold').padEnd(10) + c('FROM', 'ansi-fg-yellow ansi-bold').padEnd(20) + c('LOGIN@', 'ansi-fg-yellow ansi-bold').padEnd(15) + c('IDLE', 'ansi-fg-yellow ansi-bold').padEnd(8) + c('JCPU', 'ansi-fg-yellow ansi-bold').padEnd(8) + c('PCPU', 'ansi-fg-yellow ansi-bold'));
        const loginTime = new Date(ctx.term.startTime);
        const idle = Math.floor(Math.random() * 120);
        const loginStr = String(loginTime.getHours()).padStart(2,'0') + ':' + String(loginTime.getMinutes()).padStart(2,'0');
        ctx.term.println(c(ctx.fs.env.USER, 'ansi-fg-green').padEnd(10) + 'pts/0'.padEnd(10) + ':0'.padEnd(20) + loginStr.padEnd(15) + (idle + 's').padEnd(8) + '0.05s'.padEnd(8) + '0.02s');
        return { exitCode: 0 };
    });

    /* ── last ── */
    reg('last', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['n']);
        const n = flags.has('n') ? parseInt(rest[0]) || 5 : 5;
        const logins = [
            { user: 'user', tty: 'pts/1', from: '192.168.1.100', time: new Date(Date.now() - 3600000) },
            { user: 'admin', tty: 'pts/0', from: '192.168.1.50', time: new Date(Date.now() - 7200000) },
            { user: 'user', tty: 'pts/2', from: '10.0.0.5', time: new Date(Date.now() - 86400000) },
            { user: 'root', tty: 'console', from: 'localhost', time: new Date(Date.now() - 172800000) },
            { user: 'user', tty: 'pts/0', from: '192.168.1.100', time: new Date(Date.now() - 259200000) },
        ];
        ctx.term.println(c('USER', 'ansi-fg-yellow ansi-bold').padEnd(10) + c('TTY', 'ansi-fg-yellow ansi-bold').padEnd(10) + c('FROM', 'ansi-fg-yellow ansi-bold').padEnd(20) + c('LOGIN', 'ansi-fg-yellow ansi-bold'));
        for (let i = 0; i < Math.min(n, logins.length); i++) {
            const l = logins[i];
            const timeStr = l.time.toLocaleString();
            ctx.term.println(c(l.user, 'ansi-fg-green').padEnd(10) + l.tty.padEnd(10) + l.from.padEnd(20) + timeStr);
        }
        return { exitCode: 0 };
    });

    /* ── type ── */
    reg('type', async (args, ctx) => {
        if (!args.length) { ctx.term.println(c('type: usage: type [-a] name [name ...]', 'ansi-fg-red')); return { exitCode: 2 }; }
        for (const name of args) {
            if (registry[name]) {
                ctx.term.println(`${name} is a shell builtin`);
            } else if (ctx.fs.cwd && ctx.fs.getNode(ctx.fs.resolve(name))) {
                ctx.term.println(`${name} is ${ctx.fs.resolve(name)}`);
            } else if (ctx.term.aliases && ctx.term.aliases[name]) {
                ctx.term.println(`${name} is aliased to '${ctx.term.aliases[name]}'`);
            } else {
                ctx.term.println(`bash: type: ${name}: not found`);
            }
        }
        return { exitCode: 0 };
    });

    /* ── file ── */
    reg('file', async (args, ctx) => {
        if (!args.length) return { exitCode: 0 };
        for (const arg of args) {
            const absPath = ctx.fs.resolve(arg);
            const node = ctx.fs.getNode(absPath);
            let description = 'cannot open';
            if (node) {
                if (node.children) {
                    description = 'directory';
                } else if (typeof node.content === 'function') {
                    description = 'ASCII text';
                } else if (typeof node.content === 'string') {
                    if (node.content.startsWith('#!/bin/bash') || node.content.startsWith('#!/usr/bin/bash')) {
                        description = 'Bourne-Again shell script, ASCII text executable';
                    } else if (node.perms.includes('x')) {
                        description = 'ELF 64-bit LSB executable';
                    } else {
                        description = 'ASCII text';
                    }
                }
            }
            ctx.term.println(`${absPath}: ${description}`);
        }
        return { exitCode: 0 };
    });

    /* ── mount ── */
    reg('mount', async (args, ctx) => {
        const mounts = [
            { dev: '/dev/sda1', on: '/', type: 'ext4', opts: 'rw,relatime' },
            { dev: '/dev/sda2', on: '/boot', type: 'ext4', opts: 'rw,relatime' },
            { dev: 'tmpfs', on: '/run', type: 'tmpfs', opts: 'rw,nosuid,nodev,relatime' },
            { dev: 'devtmpfs', on: '/dev', type: 'devtmpfs', opts: 'rw,relatime' },
        ];
        for (const m of mounts) {
            ctx.term.println(`${m.dev} on ${m.on} type ${m.type} (${m.opts})`);
        }
        return { exitCode: 0 };
    });

    /* ── dmesg ── */
    reg('dmesg', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['n']);
        const lines = [
            '[    0.000000] Linux version 6.6.0-synth (root@synth-district)',
            '[    0.000000] Command line: BOOT_IMAGE=/vmlinuz root=/dev/sda1 ro quiet',
            '[    0.000000] KERNEL supported cpus:',
            '[    0.000000]   Intel GenuineIntel',
            '[    0.000000]   AMD AuthenticAMD',
            '[    0.000000] x86/fpu: Supporting XSAVE feature 0x001: "x87 floating point registers"',
            '[    0.000000] x86/fpu: Supporting XSAVE feature 0x002: "SSE registers"',
            '[    0.000000] x86/fpu: Supporting XSAVE feature 0x004: "AVX registers"',
            '[    0.328801] clocksource: tsc-early: mask: 0xffffffffffffffff max_cycles: 0x2',
            '[    0.328810] Calibrating delay loop (skipped), value calculated using timer frequency.',
            '[    2.451263] EXT4-fs (sda1): mounted filesystem with ordered data mode.',
            '[    3.124567] systemd[1]: systemd 252 running in system mode',
            '[    4.234567] systemd[1]: Hostname set to <synth-district>.',
            '[    5.345678] systemd[1]: Created slice system-getty.slice.',
            '[    6.456789] sshd[1234]: Server listening on 0.0.0.0 port 22.',
            '[    7.567890] systemd-journald[890]: Journal started',
        ];
        const n = flags.has('n') ? parseInt(rest[0]) || 20 : lines.length;
        const toShow = lines.slice(Math.max(0, lines.length - n));
        toShow.forEach(l => ctx.term.println(c(l, 'ansi-dim')));
        return { exitCode: 0 };
    });

    /* ── less / more ── */
    reg(['less', 'more'], async (args, ctx) => {
        if (!args.length) {
            ctx.term.println(c('less: missing file', 'ansi-fg-red'));
            return { exitCode: 1 };
        }
        const path = args[0];
        const absPath = ctx.fs.resolve(path);
        const content = ctx.fs.readFile(absPath);
        if (!content) {
            ctx.term.println(c(`less: cannot open ${path}`, 'ansi-fg-red'));
            return { exitCode: 1 };
        }
        return await SD.EasterEggs.pager(content, ctx);
    });

    /* ── diff ── */
    reg('diff', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['u', 'q', 'r']);
        if (rest.length < 2) { ctx.term.println(c('diff: missing file arguments', 'ansi-fg-red')); return { exitCode: 2 }; }
        const file1 = ctx.fs.readFile(ctx.fs.resolve(rest[0])) || '';
        const file2 = ctx.fs.readFile(ctx.fs.resolve(rest[1])) || '';
        if (file1 === file2) {
            if (!flags.has('q')) ctx.term.println('Files are identical');
            return { exitCode: 0 };
        }
        const lines1 = file1.split('\n');
        const lines2 = file2.split('\n');
        ctx.term.println(c(`--- ${rest[0]}`, 'ansi-fg-red'));
        ctx.term.println(c(`+++ ${rest[1]}`, 'ansi-fg-green'));
        const maxLen = Math.max(lines1.length, lines2.length);
        for (let i = 0; i < maxLen; i++) {
            if (i >= lines1.length) {
                ctx.term.println(c(`+ ${lines2[i]}`, 'ansi-fg-green'));
            } else if (i >= lines2.length) {
                ctx.term.println(c(`- ${lines1[i]}`, 'ansi-fg-red'));
            } else if (lines1[i] !== lines2[i]) {
                ctx.term.println(c(`- ${lines1[i]}`, 'ansi-fg-red'));
                ctx.term.println(c(`+ ${lines2[i]}`, 'ansi-fg-green'));
            }
        }
        return { exitCode: 1 };
    });

    /* ── tee ── */
    reg('tee', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['a', 'i']);
        const files = rest;
        let output = ctx.stdin || '';
        for (const file of files) {
            const absPath = ctx.fs.resolve(file);
            if (flags.has('a')) {
                ctx.fs.appendFile(absPath, output);
            } else {
                ctx.fs.writeFile(absPath, output);
            }
        }
        const lines = output.split('\n').filter(l => l);
        lines.forEach(l => ctx.term.println(esc(l)));
        return { exitCode: 0, stdout: output };
    });

    /* ── xargs ── */
    reg('xargs', async (args, ctx) => {
        if (!ctx.stdin && !args.length) { ctx.term.println(c('xargs: no input', 'ansi-fg-red')); return { exitCode: 1 }; }
        const input = ctx.stdin || '';
        const items = input.split(/\s+/).filter(Boolean);
        const cmdName = args[0] || 'echo';
        const cmdArgs = args.slice(1);
        for (const item of items) {
            await executeOne(`${cmdName} ${cmdArgs.join(' ')} ${item}`, ctx.term, ctx.fs, null);
        }
        return { exitCode: 0 };
    });

    /* ── base64 ── */
    reg('base64', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['d']);
        const input = rest.length ? rest[0] : (ctx.stdin || '');
        if (flags.has('d')) {
            try {
                const decoded = atob(input.replace(/\s/g, ''));
                ctx.term.println(decoded);
                return { exitCode: 0, stdout: decoded };
            } catch {
                ctx.term.println(c('base64: invalid input', 'ansi-fg-red'));
                return { exitCode: 1 };
            }
        } else {
            const encoded = btoa(input);
            ctx.term.println(encoded);
            return { exitCode: 0, stdout: encoded };
        }
    });

    /* ── tar ── */
    reg('tar', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['t', 'x', 'c', 'z', 'f', 'v']);
        if (!rest.length) { ctx.term.println(c('tar: must have -txc', 'ansi-fg-red')); return { exitCode: 2 }; }
        const file = rest[0];
        if (flags.has('t')) {
            ctx.term.println('archive.tar.gz:');
            ctx.term.println('drwx------   2 user  user   4096 Jan  1 12:34 src/');
            ctx.term.println('-rw-r--r--   1 user  user    145 Jan  1 12:34 README.txt');
            ctx.term.println('-rw-r--r--   1 user  user   2048 Jan  1 12:34 data.bin');
            return { exitCode: 0 };
        }
        if (flags.has('x')) {
            ctx.term.println(flags.has('v') ? 'x src/\nx README.txt\nx data.bin' : '');
            return { exitCode: 0 };
        }
        ctx.term.println(c('tar: archive would be created', 'ansi-dim'));
        return { exitCode: 0 };
    });

    /* ── gzip ── */
    reg('gzip', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['d', 'k', 'v']);
        if (!rest.length) { ctx.term.println(c('gzip: no input', 'ansi-fg-red')); return { exitCode: 1 }; }
        const file = rest[0];
        const absPath = ctx.fs.resolve(file);
        const content = ctx.fs.readFile(absPath);
        if (!content) { ctx.term.println(c(`gzip: ${file}: No such file`, 'ansi-fg-red')); return { exitCode: 1 }; }
        if (flags.has('d')) {
            ctx.term.println(flags.has('v') ? `${file}: 89.5%` : '');
            return { exitCode: 0 };
        }
        ctx.term.println(flags.has('v') ? `${file}:  62.3% -- replaced with ${file}.gz` : '');
        return { exitCode: 0 };
    });

    /* ── xxd ── */
    reg('xxd', async (args, ctx) => {
        const input = ctx.stdin || (args.length ? ctx.fs.readFile(ctx.fs.resolve(args[0])) : '');
        if (!input) return { exitCode: 0 };
        const lines = input.split('\n');
        let offset = 0;
        for (const line of lines.slice(0, 10)) {
            let hex = '';
            let ascii = '';
            for (let i = 0; i < Math.min(16, line.length); i++) {
                const code = line.charCodeAt(i);
                hex += code.toString(16).padStart(2, '0') + ' ';
                ascii += (code >= 32 && code < 127) ? line[i] : '.';
            }
            ctx.term.println(`${offset.toString(16).padStart(8, '0')}: ${hex.padEnd(48)} ${ascii}`);
            offset += line.length + 1;
        }
        return { exitCode: 0 };
    });

    /* ── od ── */
    reg('od', async (args, ctx) => {
        const input = ctx.stdin || (args.length ? ctx.fs.readFile(ctx.fs.resolve(args[0])) : '');
        if (!input) return { exitCode: 0 };
        const bytes = input.split('').map(c => c.charCodeAt(0));
        for (let i = 0; i < Math.min(8, Math.ceil(bytes.length / 8)); i++) {
            let octal = (i * 8).toString(8).padStart(7, '0');
            for (let j = 0; j < 8; j++) {
                const idx = i * 8 + j;
                if (idx < bytes.length) {
                    octal += ' ' + bytes[idx].toString(8).padStart(3, '0');
                }
            }
            ctx.term.println(octal);
        }
        return { exitCode: 0 };
    });

    /* ── git ── */
    reg('git', async (args, ctx) => {
        if (!args.length) { ctx.term.println(c('usage: git [options] <command> [<args>]', 'ansi-fg-red')); return { exitCode: 1 }; }
        const cmd = args[0];
        if (cmd === 'status') {
            ctx.term.println(c('On branch main', 'ansi-fg-cyan'));
            ctx.term.println('Your branch is up to date with \'origin/main\'.');
            ctx.term.println('');
            ctx.term.println(c('Changes not staged for commit:', 'ansi-fg-red'));
            ctx.term.println('  (use "git add <file>..." to update what will be committed)');
            ctx.term.println('  (use "git restore <file>..." to discard changes in working tree)');
            ctx.term.println(c('\tmodified:   README.md', 'ansi-fg-red'));
            ctx.term.println(c('\tmodified:   src/main.js', 'ansi-fg-red'));
            return { exitCode: 0 };
        }
        if (cmd === 'log' || cmd === 'log' && args[1] === '--oneline') {
            ctx.term.println(c('3f8c9a2', 'ansi-fg-yellow') + ' (HEAD -> main) Add command substitution support');
            ctx.term.println(c('7d2e1b5', 'ansi-fg-yellow') + ' Implement variable assignment parsing');
            ctx.term.println(c('b4c8f91', 'ansi-fg-yellow') + ' Add brace expansion {1..n} and {a,b,c}');
            ctx.term.println(c('a1f7e32', 'ansi-fg-yellow') + ' (origin/main) Initial commit');
            return { exitCode: 0 };
        }
        if (cmd === 'branch') {
            ctx.term.println(c('* main', 'ansi-fg-green'));
            ctx.term.println('  develop');
            ctx.term.println('  feature/new-ui');
            return { exitCode: 0 };
        }
        if (cmd === 'diff') {
            ctx.term.println(c('diff --git a/README.md b/README.md', 'ansi-fg-cyan'));
            ctx.term.println(c('index 1234567..abcdefg 100644', 'ansi-fg-cyan'));
            ctx.term.println(c('--- a/README.md', 'ansi-fg-red'));
            ctx.term.println(c('+++ b/README.md', 'ansi-fg-green'));
            ctx.term.println(c('@ -1,3 +1,4 @@', 'ansi-fg-cyan'));
            ctx.term.println(c('-Old version', 'ansi-fg-red'));
            ctx.term.println(c('+New version', 'ansi-fg-green'));
            return { exitCode: 0 };
        }
        if (cmd === 'checkout' && args.length > 1) {
            ctx.term.println(`Switched to branch '${args[1]}'`);
            return { exitCode: 0 };
        }
        ctx.term.println(c(`git ${cmd}: unknown command`, 'ansi-fg-red'));
        return { exitCode: 1 };
    });

    /* ── ssh-keygen ── */
    reg('ssh-keygen', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['t', 'f', 'N', 'C']);
        const keyType = args.includes('-t') ? args[args.indexOf('-t') + 1] || 'rsa' : 'rsa';
        ctx.term.println(c('Generating public/private rsa key pair.', 'ansi-fg-cyan'));
        ctx.term.println('Enter file in which to save the key (/home/user/.ssh/id_rsa): ');
        ctx.term.println('Created directory \'/home/user/.ssh\'.');
        ctx.term.println('Enter passphrase (empty for no passphrase): ');
        ctx.term.println('Enter same passphrase again: ');
        ctx.term.println(c('Your identification has been saved in /home/user/.ssh/id_rsa', 'ansi-fg-green'));
        ctx.term.println(c('Your public key has been saved in /home/user/.ssh/id_rsa.pub', 'ansi-fg-green'));
        ctx.term.println('The key fingerprint is:');
        ctx.term.println(c('SHA256:' + Math.random().toString(36).slice(2, 30) + ' user@synth-district', 'ansi-fg-yellow'));
        ctx.term.println('The key\'s randomart image is:');
        ctx.term.println(c('+--[ RSA 3072]----+', 'ansi-dim'));
        ctx.term.println(c('|     .   o.       |', 'ansi-dim'));
        ctx.term.println(c('|    . o o .      |', 'ansi-dim'));
        ctx.term.println(c('|     + + . .     |', 'ansi-dim'));
        ctx.term.println(c('|    . + .o . E   |', 'ansi-dim'));
        ctx.term.println(c('|     o.S .  o .  |', 'ansi-dim'));
        ctx.term.println(c('|      = .  o . . |', 'ansi-dim'));
        ctx.term.println(c('|     . . ..  . . |', 'ansi-dim'));
        ctx.term.println(c('|        .  o  .  |', 'ansi-dim'));
        ctx.term.println(c('|       . .   . . |', 'ansi-dim'));
        ctx.term.println(c('+----[SHA256]-----+', 'ansi-dim'));
        return { exitCode: 0 };
    });

    /* ── passwd ── */
    reg('passwd', async (args, ctx) => {
        ctx.term.println('Changing password for user.');
        ctx.term.println('Current password: ');
        const password = await ctx.term.promptPassword('');
        if (password === 'admin' || password === ctx.fs.env.USER) {
            ctx.term.println('New password: ');
            const newPass = await ctx.term.promptPassword('');
            ctx.term.println('Retype new password: ');
            const confirmPass = await ctx.term.promptPassword('');
            if (newPass === confirmPass) {
                ctx.term.println(c('passwd: password updated successfully', 'ansi-fg-green'));
                return { exitCode: 0 };
            } else {
                ctx.term.println(c('passwd: Passwords do not match', 'ansi-fg-red'));
                return { exitCode: 1 };
            }
        } else {
            ctx.term.println(c('passwd: Authentication token manipulation error', 'ansi-fg-red'));
            return { exitCode: 1 };
        }
    });

    /* ── crontab ── */
    reg('crontab', async (args, ctx) => {
        const { flags, rest } = parseFlags(args, ['l', 'e', 'r', 'i']);
        if (flags.has('l')) {
            ctx.term.println('0 * * * * /home/user/scripts/backup.sh');
            ctx.term.println('30 2 * * * /home/user/scripts/maintenance.sh');
            ctx.term.println('*/15 * * * * /home/user/scripts/health-check.sh');
            ctx.term.println('0 22 * * * /sbin/shutdown -h now');
            return { exitCode: 0 };
        }
        if (flags.has('e')) {
            ctx.term.println(c('crontab: no crontab for user, opening empty crontab', 'ansi-fg-cyan'));
            ctx.term.println('~/crontab.123456: No such file or directory');
            return { exitCode: 1 };
        }
        if (flags.has('r')) {
            ctx.term.println('crontab: no crontab for user');
            return { exitCode: 1 };
        }
        ctx.term.println(c('usage: crontab [-u user] { -e | -l | -r }', 'ansi-fg-red'));
        return { exitCode: 1 };
    });

    /* ── strace ── */
    reg('strace', async (args, ctx) => {
        if (!args.length) { ctx.term.println(c('strace: must have PROG [ARGS]', 'ansi-fg-red')); return { exitCode: 1 }; }
        const syscalls = [
            'execve("/bin/' + args[0] + '", [...], 0x7ffee1234567)',
            'brk(NULL)                              = 0x5589c6e1e000',
            'access("/etc/ld.so.preload", R_OK)     = -1 ENOENT',
            'openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY) = 3',
            'read(3, "\\x7fELF\\x02\\x01\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00", 832) = 832',
            'mmap(NULL, 2140304, PROT_READ|PROT_EXEC, MAP_PRIVATE, 3, 0) = 0x7f1234567000',
            'mmap(0x7f1234700000, 20480, PROT_READ|PROT_WRITE, MAP_PRIVATE, 3, 0x198000) = 0x7f1234700000',
            'write(1, "Hello, World!\\n", 14)         = 14',
            'exit_group(0)                           = ?',
        ];
        for (const sys of syscalls) {
            await delay(100, ctx.signal);
            ctx.term.println(c(sys, 'ansi-dim'));
        }
        ctx.term.println(c('exited with code 0', 'ansi-dim'));
        return { exitCode: 0 };
    });

    /* ── Hidden utility commands ── */
    reg('chmod', async (args, ctx) => {
        if (args.length < 2) return { exitCode: 1, stdout: 'Usage: chmod <mode> <file>' };
        const [mode, ...files] = args;
        files.forEach(f => {
            const node = ctx.fs.resolve(f);
            if (node) node.perms = mode;
        });
        return { exitCode: 0 };
    });

    reg('chown', async (args, ctx) => {
        if (args.length < 2) return { exitCode: 1, stdout: 'Usage: chown <owner> <file>' };
        const [owner, ...files] = args;
        files.forEach(f => {
            const node = ctx.fs.resolve(f);
            if (node) node.owner = owner;
        });
        return { exitCode: 0 };
    });

    reg('ln', async (args, ctx) => {
        if (args.length < 2) return { exitCode: 1, stdout: 'Usage: ln [-s] <target> <link>' };
        let isSymlink = false;
        let target, link;
        if (args[0] === '-s') {
            isSymlink = true;
            [target, link] = args.slice(1);
        } else {
            [target, link] = args.slice(0, 2);
        }
        if (!target || !link) return { exitCode: 1, stdout: 'Usage: ln [-s] <target> <link>' };
        const parent = ctx.fs.resolve(ctx.fs.dirname(link));
        if (!parent || !parent.children) return { exitCode: 1, stdout: `ln: cannot access '${link}': No such file or directory` };
        const linkName = ctx.fs.basename(link);
        if (parent.children[linkName]) return { exitCode: 1, stdout: `ln: cannot create link '${link}': File exists` };
        parent.children[linkName] = { name: linkName, isLink: true, target, isSymlink };
        return { exitCode: 0 };
    });

    reg('stat', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: stat <file>' };
        const path = args[0];
        const node = ctx.fs.resolve(path);
        if (!node) return { exitCode: 1, stdout: `stat: cannot stat '${path}': No such file or directory` };
        const isDir = !!node.children;
        const size = isDir ? 4096 : (typeof node.content === 'function' ? node.content().length : (node.content || '').length);
        const output = [
            `  File: ${path}`,
            `  Size: ${size}       Blocks: ${Math.ceil(size / 512)}     IO Block: 4096   ${isDir ? 'directory' : 'regular file'}`,
            `Access: (${node.perms || '0755'}/-rw-r--r--)  Uid: (${node.owner || '1000'}/user)   Gid: (${node.owner || '1000'}/user)`,
            `Access: 2024-01-15 10:30:45.000000000 -0500`,
            `Modify: 2024-01-15 10:30:45.000000000 -0500`,
            `Change: 2024-01-15 10:30:45.000000000 -0500`,
            ` Birth: 2024-01-15 10:30:45.000000000 -0500`
        ];
        ctx.term.println(output.join('\n'));
        return { exitCode: 0, stdout: output.join('\n') };
    });

    reg('md5sum', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: md5sum <file>' };
        const path = args[0];
        const node = ctx.fs.resolve(path);
        if (!node) return { exitCode: 1, stdout: `md5sum: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(i);
            hash = hash & hash;
        }
        const hashStr = Math.abs(hash).toString(16).padStart(32, '0').slice(0, 32);
        const output = `${hashStr}  ${path}`;
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('sha256sum', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: sha256sum <file>' };
        const path = args[0];
        const node = ctx.fs.resolve(path);
        if (!node) return { exitCode: 1, stdout: `sha256sum: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            hash = Math.imul(hash ^ content.charCodeAt(i), 2654435761);
        }
        const hashStr = (hash >>> 0).toString(16).padStart(64, '0').slice(0, 64);
        const output = `${hashStr}  ${path}`;
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('cksum', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: cksum <file>' };
        const path = args[0];
        const node = ctx.fs.resolve(path);
        if (!node) return { exitCode: 1, stdout: `cksum: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        let sum = 0;
        for (const c of content) sum += c.charCodeAt(0);
        const output = `${sum} ${content.length} ${path}`;
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('comm', async (args, ctx) => {
        if (args.length < 2) return { exitCode: 1, stdout: 'Usage: comm <file1> <file2>' };
        const file1 = ctx.fs.resolve(args[0]);
        const file2 = ctx.fs.resolve(args[1]);
        if (!file1 || file1.children) return { exitCode: 1, stdout: `comm: ${args[0]}: No such file or directory` };
        if (!file2 || file2.children) return { exitCode: 1, stdout: `comm: ${args[1]}: No such file or directory` };
        const lines1 = (typeof file1.content === 'function' ? file1.content() : (file1.content || '')).split('\n').filter(l => l);
        const lines2 = (typeof file2.content === 'function' ? file2.content() : (file2.content || '')).split('\n').filter(l => l);
        const set1 = new Set(lines1), set2 = new Set(lines2);
        const only1 = lines1.filter(l => !set2.has(l));
        const only2 = lines2.filter(l => !set1.has(l));
        const common = lines1.filter(l => set2.has(l));
        const output = [...only1.map(l => l), ...only2.map(l => '\t' + l), ...common.map(l => '\t\t' + l)].join('\n');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('paste', async (args, ctx) => {
        if (args.length < 2) return { exitCode: 1, stdout: 'Usage: paste <file1> <file2> [...]' };
        const files = args.map(f => ctx.fs.resolve(f));
        const contents = files.map(f => {
            if (!f || f.children) return [];
            return (typeof f.content === 'function' ? f.content() : (f.content || '')).split('\n').filter(l => l);
        });
        const maxLines = Math.max(...contents.map(c => c.length));
        const output = [];
        for (let i = 0; i < maxLines; i++) {
            const parts = contents.map(c => c[i] || '');
            output.push(parts.join('\t'));
        }
        const result = output.join('\n');
        ctx.term.println(result);
        return { exitCode: 0, stdout: result };
    });

    reg('fold', async (args, ctx) => {
        let width = 80;
        let fileIdx = 0;
        if (args[0] === '-w') {
            width = parseInt(args[1]) || 80;
            fileIdx = 2;
        }
        const path = args[fileIdx];
        if (!path) return { exitCode: 1, stdout: 'Usage: fold [-w width] <file>' };
        const node = ctx.fs.resolve(path);
        if (!node || node.children) return { exitCode: 1, stdout: `fold: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        const lines = content.split('\n');
        const output = lines.map(line => {
            const wrapped = [];
            for (let i = 0; i < line.length; i += width) {
                wrapped.push(line.slice(i, i + width));
            }
            return wrapped.join('\n');
        }).join('\n');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg(['fmt'], async (args, ctx) => {
        const path = args[0];
        if (!path) return { exitCode: 1, stdout: 'Usage: fmt <file>' };
        const node = ctx.fs.resolve(path);
        if (!node || node.children) return { exitCode: 1, stdout: `fmt: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        const lines = content.split('\n');
        const output = lines.map(line => line.trim()).filter(l => l).join('\n');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('rev', async (args, ctx) => {
        const path = args[0];
        if (!path) return { exitCode: 1, stdout: 'Usage: rev <file>' };
        const node = ctx.fs.resolve(path);
        if (!node || node.children) return { exitCode: 1, stdout: `rev: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        const output = content.split('\n').map(line => line.split('').reverse().join('')).join('\n');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('strings', async (args, ctx) => {
        const path = args[0];
        if (!path) return { exitCode: 1, stdout: 'Usage: strings <file>' };
        const node = ctx.fs.resolve(path);
        if (!node || node.children) return { exitCode: 1, stdout: `strings: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        const strings = content.match(/[\x20-\x7E]{4,}/g) || [];
        const output = strings.join('\n');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('expand', async (args, ctx) => {
        const path = args[0];
        if (!path) return { exitCode: 1, stdout: 'Usage: expand <file>' };
        const node = ctx.fs.resolve(path);
        if (!node || node.children) return { exitCode: 1, stdout: `expand: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        const output = content.replace(/\t/g, '        ');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('unexpand', async (args, ctx) => {
        const path = args[0];
        if (!path) return { exitCode: 1, stdout: 'Usage: unexpand <file>' };
        const node = ctx.fs.resolve(path);
        if (!node || node.children) return { exitCode: 1, stdout: `unexpand: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        const output = content.replace(/ {8}/g, '\t').replace(/ {4}/g, '\t');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('join', async (args, ctx) => {
        if (args.length < 2) return { exitCode: 1, stdout: 'Usage: join <file1> <file2>' };
        const file1 = ctx.fs.resolve(args[0]);
        const file2 = ctx.fs.resolve(args[1]);
        if (!file1 || file1.children) return { exitCode: 1, stdout: `join: ${args[0]}: No such file or directory` };
        if (!file2 || file2.children) return { exitCode: 1, stdout: `join: ${args[1]}: No such file or directory` };
        const lines1 = (typeof file1.content === 'function' ? file1.content() : (file1.content || '')).split('\n').filter(l => l);
        const lines2 = (typeof file2.content === 'function' ? file2.content() : (file2.content || '')).split('\n').filter(l => l);
        const map2 = new Map(lines2.map(l => {
            const parts = l.split(/\s+/);
            return [parts[0], l];
        }));
        const output = lines1.filter(l => {
            const key = l.split(/\s+/)[0];
            return map2.has(key);
        }).map(l => {
            const key = l.split(/\s+/)[0];
            return `${l} ${map2.get(key).split(/\s+/).slice(1).join(' ')}`;
        }).join('\n');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('time', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: time <command>' };
        const start = Date.now();
        const result = await Commands.execute(args.join(' '), ctx.term);
        const elapsed = Date.now() - start;
        const sec = (elapsed / 1000).toFixed(3);
        ctx.term.println(c(`real\t0m${sec}s`, 'ansi-dim'));
        return result;
    });

    reg('tty', async (args, ctx) => {
        const output = '/dev/pts/0';
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('reset', async (args, ctx) => {
        document.querySelector('#terminal').innerHTML = '';
        ctx.term.renderPrompt();
        return { exitCode: 0 };
    });

    reg('factor', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: factor <number>' };
        const num = parseInt(args[0]);
        if (isNaN(num) || num < 2) return { exitCode: 1, stdout: 'factor: invalid input' };
        const factors = [];
        let n = num;
        for (let i = 2; i * i <= n; i++) {
            while (n % i === 0) {
                factors.push(i);
                n /= i;
            }
        }
        if (n > 1) factors.push(n);
        const output = `${num}: ${factors.join(' ')}`;
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('lsof', async (args, ctx) => {
        const output = [
            'COMMAND     PID   USER   FD      TYPE             DEVICE  SIZE/OFF       NODE NAME',
            'bash       1234   root  cwd       DIR              16,5       4096     524288 /',
            'bash       1234   root  rtd       DIR              16,5       4096     524288 /',
            'bash       1234   root  txt       REG              16,5     987654       1048576 /bin/bash',
            'sshd       5678   root    0u      CHR               5,0        0t0       6345 /dev/null',
            'sshd       5678   root    1u      CHR               5,1        0t0       6346 /dev/null',
            'sshd       5678   root    3u     IPv4           234567      0t0        TCP *:22 (LISTEN)',
        ];
        output.forEach(line => ctx.term.println(c(line, 'ansi-dim')));
        return { exitCode: 0, stdout: output.join('\n') };
    });

    reg('true', async (args, ctx) => {
        return { exitCode: 0 };
    });

    reg('false', async (args, ctx) => {
        return { exitCode: 1 };
    });

    reg('dirname', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: dirname <path>' };
        const path = args[0];
        const dir = ctx.fs.dirname(path);
        ctx.term.println(dir);
        return { exitCode: 0, stdout: dir };
    });

    reg('basename', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: basename <path> [suffix]' };
        const path = args[0];
        let name = ctx.fs.basename(path);
        if (args[1] && name.endsWith(args[1])) {
            name = name.slice(0, -args[1].length);
        }
        ctx.term.println(name);
        return { exitCode: 0, stdout: name };
    });

    reg('realpath', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: realpath <path>' };
        const path = args[0];
        const node = ctx.fs.resolve(path);
        if (!node) return { exitCode: 1, stdout: `realpath: ${path}: No such file or directory` };
        const fullPath = ctx.fs.cwd === '/' ? '/' + path : ctx.fs.cwd + '/' + path;
        ctx.term.println(fullPath);
        return { exitCode: 0, stdout: fullPath };
    });

    reg('readlink', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: readlink <link>' };
        const path = args[0];
        const node = ctx.fs.resolve(path);
        if (!node) return { exitCode: 1, stdout: `readlink: ${path}: No such file or directory` };
        if (!node.isLink) return { exitCode: 1, stdout: `readlink: ${path}: Not a symbolic link` };
        ctx.term.println(node.target);
        return { exitCode: 0, stdout: node.target };
    });

    reg('pgrep', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: pgrep <pattern>' };
        const pattern = args[0];
        const pids = ['1234', '5678', '9012'].filter(pid => pid.includes(pattern.slice(0, 1)));
        pids.forEach(pid => ctx.term.println(pid));
        return { exitCode: 0, stdout: pids.join('\n') };
    });

    reg('killall', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: killall <name>' };
        ctx.term.println(`killall: ${args[0]}`);
        return { exitCode: 0 };
    });

    reg('wait', async (args, ctx) => {
        if (!args.length) {
            await delay(100, ctx.signal);
            return { exitCode: 0 };
        }
        const pid = args[0];
        await delay(100, ctx.signal);
        ctx.term.println(`[1]+ Done`);
        return { exitCode: 0 };
    });

    reg('nohup', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: nohup <command>' };
        ctx.term.println('nohup: ignoring input and appending output to nohup.out');
        return await Commands.execute(args.join(' '), ctx.term);
    });

    reg('du', async (args, ctx) => {
        const path = args[0] || '.';
        const node = ctx.fs.resolve(path);
        if (!node) return { exitCode: 1, stdout: `du: cannot access '${path}': No such file or directory` };
        let size = 0;
        if (node.children) {
            Object.values(node.children).forEach(child => {
                if (child.content) size += (typeof child.content === 'function' ? child.content() : child.content).length;
            });
        } else {
            size = (typeof node.content === 'function' ? node.content() : (node.content || '')).length;
        }
        const kb = Math.ceil(size / 1024);
        const output = `${kb}\t${path}`;
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('watch', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: watch <command>' };
        const cmd = args.join(' ');
        for (let i = 0; i < 3; i++) {
            ctx.term.println(c(`Every 2s: ${cmd}`, 'ansi-fg-yellow'));
            ctx.term.println('');
            await Commands.execute(cmd, ctx.term);
            await delay(2000, ctx.signal);
        }
        return { exitCode: 0 };
    });

    reg('mktemp', async (args, ctx) => {
        const template = args[0] || 'tmp.XXXXXX';
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let random = '';
        for (let i = 0; i < 6; i++) random += chars[Math.floor(Math.random() * chars.length)];
        const filename = template.replace('XXXXXX', random);
        const filepath = ctx.fs.cwd === '/' ? `/${filename}` : `${ctx.fs.cwd}/${filename}`;
        ctx.term.println(filepath);
        return { exitCode: 0, stdout: filepath };
    });

    reg('shred', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: shred <file>' };
        const path = args[0];
        const node = ctx.fs.resolve(path);
        if (!node || node.children) return { exitCode: 1, stdout: `shred: ${path}: No such file or directory` };
        const parent = ctx.fs.resolve(ctx.fs.dirname(path));
        if (parent && parent.children) delete parent.children[ctx.fs.basename(path)];
        return { exitCode: 0 };
    });

    reg('whatis', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: whatis <command>' };
        const cmd = args[0];
        const descriptions = {
            'ls': 'list directory contents',
            'cd': 'change the working directory',
            'cat': 'concatenate and print files',
            'grep': 'search text using patterns',
            'find': 'search for files',
            'sudo': 'execute as superuser',
            'git': 'version control system',
        };
        const desc = descriptions[cmd] || `${cmd} - command not found in whatis database`;
        ctx.term.println(desc);
        return { exitCode: 0, stdout: desc };
    });

    reg('printenv', async (args, ctx) => {
        if (args.length) {
            const val = ctx.fs.env[args[0]];
            if (val) ctx.term.println(val);
            return { exitCode: val ? 0 : 1 };
        }
        const output = Object.entries(ctx.fs.env).map(([k, v]) => `${k}=${v}`).join('\n');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('pushd', async (args, ctx) => {
        if (!ctx.term._dirStack) ctx.term._dirStack = [];
        ctx.term._dirStack.push(ctx.fs.cwd);
        if (args.length) {
            const result = await Commands.execute(`cd ${args[0]}`, ctx.term);
            if (result.exitCode !== 0) ctx.term._dirStack.pop();
            return result;
        }
        ctx.term.println(ctx.fs.cwd);
        return { exitCode: 0 };
    });

    reg('popd', async (args, ctx) => {
        if (!ctx.term._dirStack || ctx.term._dirStack.length === 0) {
            return { exitCode: 1, stdout: 'popd: directory stack empty' };
        }
        const prev = ctx.term._dirStack.pop();
        return await Commands.execute(`cd ${prev}`, ctx.term);
    });

    reg('dirs', async (args, ctx) => {
        if (!ctx.term._dirStack) ctx.term._dirStack = [];
        const output = [ctx.fs.cwd, ...ctx.term._dirStack].join(' ');
        ctx.term.println(output);
        return { exitCode: 0, stdout: output };
    });

    reg('install', async (args, ctx) => {
        if (args.length < 2) return { exitCode: 1, stdout: 'Usage: install <src> <dest>' };
        const [src, dest] = args;
        const node = ctx.fs.resolve(src);
        if (!node || node.children) return { exitCode: 1, stdout: `install: cannot access '${src}': No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : node.content;
        const newNode = { name: ctx.fs.basename(dest), content, perms: '0755', owner: 'root' };
        const parent = ctx.fs.resolve(ctx.fs.dirname(dest));
        if (!parent || !parent.children) return { exitCode: 1, stdout: `install: failed to install to ${dest}` };
        parent.children[ctx.fs.basename(dest)] = newNode;
        return { exitCode: 0 };
    });

    reg('iconv', async (args, ctx) => {
        if (args.length < 2) return { exitCode: 1, stdout: 'Usage: iconv -f <from> -t <to> <file>' };
        const path = args[args.length - 1];
        const node = ctx.fs.resolve(path);
        if (!node || node.children) return { exitCode: 1, stdout: `iconv: ${path}: No such file or directory` };
        const content = typeof node.content === 'function' ? node.content() : (node.content || '');
        ctx.term.println(content);
        return { exitCode: 0, stdout: content };
    });

    reg('expr', async (args, ctx) => {
        if (!args.length) return { exitCode: 1, stdout: 'Usage: expr <expression>' };
        try {
            const expr = args.join(' ');
            const result = eval(expr.replace(/[a-zA-Z_]/g, ''));
            ctx.term.println(result);
            return { exitCode: 0, stdout: result };
        } catch (e) {
            return { exitCode: 1, stdout: 'expr: syntax error' };
        }
    });

    reg('dc', async (args, ctx) => {
        const input = args.join(' ') || '2 3 +';
        const tokens = input.split(/\s+/);
        const stack = [];
        const ops = {
            '+': () => { const b = stack.pop(); const a = stack.pop(); stack.push(a + b); },
            '-': () => { const b = stack.pop(); const a = stack.pop(); stack.push(a - b); },
            '*': () => { const b = stack.pop(); const a = stack.pop(); stack.push(a * b); },
            '/': () => { const b = stack.pop(); const a = stack.pop(); stack.push(Math.floor(a / b)); },
            '%': () => { const b = stack.pop(); const a = stack.pop(); stack.push(a % b); },
            'p': () => ctx.term.println(stack[stack.length - 1]),
        };
        tokens.forEach(token => {
            if (ops[token]) ops[token]();
            else stack.push(parseFloat(token));
        });
        return { exitCode: 0 };
    });

    /* ── help ── */
    reg('help', async (args, ctx) => {
        const helps = [
            ['Navigation',  'ls, cd, pwd, find'],
            ['Files',       'cat, head, tail, touch, mkdir, rm, cp, mv, diff'],
            ['Text',        'grep, wc, sort, uniq, sed, awk, cut, tr, echo, printf, tee, xargs'],
            ['System',      'uname, hostname, whoami, id, date, uptime, env, export, ps, top, kill, df, free, who, w, last, type, file, mount, dmesg'],
            ['Network',     'ping, ifconfig, ip, netstat, curl, wget, ssh'],
            ['Packages',    'apt, apt-get, npm, pip, pip3'],
            ['Editors',     'vim, vi, nano, less, more'],
            ['Encoding',    'base64, xxd, od'],
            ['Archives',    'tar, gzip'],
            ['Git',         'git'],
            ['Tools',       'ssh-keygen, passwd, crontab, strace'],
            ['Misc',        'man, which, whereis, alias, history, source, cal, bc, seq, sleep, yes, clear'],
            ['Fun',         'sl, matrix, cmatrix, hack, neofetch, fortune, cowsay, nmap, lolcat, hacktheplanet, 8ball, flip, dice, joke, error'],
            ['Hacker',      'scan, glitch'],
            ['System Ops',  'sudo, su, shutdown, reboot, exit, logout'],
            ['Synth',       'synth, toggle-crt'],
        ];
        ctx.term.println(cRaw(`<span class="ansi-fg-bright-white ansi-bold">Synth District Linux — Available Commands</span>`));
        ctx.term.println('');
        helps.forEach(([cat, cmds]) => {
            ctx.term.println(cRaw(`  <span class="ansi-fg-yellow ansi-bold">${esc(cat.padEnd(12))}</span>  <span class="ansi-fg-white">${esc(cmds)}</span>`));
        });
        ctx.term.println('');
        ctx.term.println(c('New features: Variable assignment (X=5 cmd), Command substitution $(cmd), Arithmetic $((expr)), Braces {1..3}', 'ansi-fg-cyan'));
        ctx.term.println(c('Tip: Most commands support --help or -h. Try piping: ls | grep txt', 'ansi-dim'));
        ctx.term.println(c('Tip: Use Tab for completion, ↑↓ for history, Ctrl+C to interrupt.', 'ansi-dim'));
        return { exitCode: 0 };
    });

    /* ── Fun easter eggs ── */
    reg('hacktheplanet', async (args, ctx) => {
        const output = `MESS WITH THE BEST, DIE LIKE THE REST.
🔥🌎💻 Hack the Planet! 💻🌎🔥`;
        ctx.term.println(cRaw(output));
        return { exitCode: 0, stdout: output };
    });

    reg('fortune', async (args, ctx) => {
        const quotes = [
            "Hack the planet!",
            "Even root has a boss.",
            "rm -rf / — because you like living dangerously.",
            "Permission denied. Again.",
            "Access granted... just kidding.",
            "The Plague is watching you.",
            "Zero Cool was here.",
            "Rebooting is just a fancy logout.",
            "There is no cloud. Just someone else's computer.",
            "Your kernel has panicked. You should too."
        ];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        ctx.term.println(esc(quote));
        return { exitCode: 0, stdout: quote };
    });

    reg('cowsay', async (args, ctx) => {
        const message = args.join(' ') || 'Moo.';
        const topBorder = '_'.repeat(message.length + 2);
        const bottomBorder = '-'.repeat(message.length + 2);
        const output = ` ${topBorder}
< ${message} >
 ${bottomBorder}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`;
        ctx.term.println(cRaw(output));
        return { exitCode: 0, stdout: output };
    });

    reg('8ball', async (args, ctx) => {
        const responses = [
            "It is certain",
            "It is decidedly so",
            "Without a doubt",
            "Yes definitely",
            "You may rely on it",
            "As I see it, yes",
            "Most likely",
            "Outlook good",
            "Don't count on it",
            "My reply is no",
            "My sources say no",
            "Outlook not so good",
            "Very doubtful",
            "Ask again later",
            "Better not tell you now",
            "Cannot predict now",
            "Concentrate and ask again"
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        ctx.term.println(c(response, 'ansi-fg-magenta ansi-bold'));
        return { exitCode: 0, stdout: response };
    });

    reg('scan', async (args, ctx) => {
        const target = args[0] || 'localhost';
        const ports = [22, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 5432, 8080, 9000];
        ctx.term.println(c(`Starting scan on ${target}...`, 'ansi-fg-cyan'));
        await delay(300, ctx.signal);
        for (const port of ports) {
            const status = Math.random() > 0.7 ? 'open' : 'filtered';
            const service = {22: 'ssh', 25: 'smtp', 53: 'dns', 80: 'http', 110: 'pop3', 143: 'imap', 443: 'https', 445: 'smb', 993: 'imaps', 995: 'pop3s', 3306: 'mysql', 5432: 'postgres', 8080: 'http-alt', 9000: 'cslistener'}[port] || 'unknown';
            const color = status === 'open' ? 'ansi-fg-red' : 'ansi-fg-yellow';
            ctx.term.println(c(`Port ${String(port).padEnd(5)} ${status.padEnd(10)} ${service}`, color));
            await delay(100, ctx.signal);
        }
        ctx.term.println(c('Scan complete.', 'ansi-fg-green'));
        return { exitCode: 0 };
    });

    reg('glitch', async (args, ctx) => {
        const text = args.join(' ') || 'GLITCH';
        const chars = '▓░█▒▀▄▓ ▀▄░▒'.split('');
        let output = '';
        for (let i = 0; i < text.length; i++) {
            const r = Math.random();
            if (r < 0.15) output += chars[Math.floor(Math.random() * chars.length)];
            else if (r < 0.3) output += text[i].toUpperCase();
            else output += text[i];
        }
        ctx.term.println(c(output, 'ansi-fg-bright-red ansi-bold'));
        return { exitCode: 0, stdout: output };
    });

    reg('flip', async (args, ctx) => {
        const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
        ctx.term.println(c(result, 'ansi-fg-yellow ansi-bold'));
        return { exitCode: 0, stdout: result };
    });

    reg('dice', async (args, ctx) => {
        const sides = args[0] ? parseInt(args[0]) : 6;
        if (isNaN(sides) || sides < 2) {
            return { exitCode: 1, stdout: 'Invalid number of sides' };
        }
        const roll = Math.floor(Math.random() * sides) + 1;
        ctx.term.println(c(`You rolled a ${roll}`, 'ansi-fg-green ansi-bold'));
        return { exitCode: 0, stdout: String(roll) };
    });

    reg('joke', async (args, ctx) => {
        const jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs!",
            "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
            "Why did the developer go broke? He used up all his cache!",
            "Why do Java developers wear glasses? Because they don't C#!",
            "What's a programmer's favorite place to hang out? Foo Bar!",
            "Why did the programmer quit his job? Because he didn't get arrays.",
            "How many programmers does it take to change a lightbulb? None. That's a DevOps problem.",
            "Why do programmers always get Christmas and Halloween mixed up? Because DEC 25 is OCT 31."
        ];
        const joke = jokes[Math.floor(Math.random() * jokes.length)];
        ctx.term.println(esc(joke));
        return { exitCode: 0, stdout: joke };
    });

    reg('error', async (args, ctx) => {
        const errors = [
            "Segmentation fault (core dumped)",
            "Fatal exception in module kernel32.dll",
            "Bus error: bad address in system call",
            "Out of memory: Kill process or sacrifice child",
            "Device not ready: retry, fail, ignore?",
            "Error: File not found. Did you forget to pay your disk bill?",
            "Panic: VM page allocation failure",
            "Critical: The cake is a lie"
        ];
        const error = errors[Math.floor(Math.random() * errors.length)];
        ctx.term.println(c(error, 'ansi-fg-red'));
        return { exitCode: 1, stdout: error };
    });

    /* ── Man pages ── */
    const MAN_PAGES = {
        'ls': `LS(1)                            User Commands                           LS(1)

NAME
       ls — list directory contents

SYNOPSIS
       ls [OPTION]... [FILE]...

DESCRIPTION
       List information about the FILEs (the current directory by default).

       -a, --all
              do not ignore entries starting with .

       -l     use a long listing format

       -h, --human-readable
              with -l, print sizes in human readable format

       -r, --reverse
              reverse order while sorting

       -t     sort by modification time, newest first

       -R, --recursive
              list subdirectories recursively

EXAMPLES
       ls -la         List all files in long format
       ls -lh /var    List /var with human-readable sizes

(END)`,
        'grep': `GREP(1)                           User Commands                          GREP(1)

NAME
       grep — print lines that match patterns

SYNOPSIS
       grep [OPTIONS] PATTERN [FILE...]

DESCRIPTION
       grep searches for PATTERN in each FILE.

       -i, --ignore-case
              Ignore case distinctions

       -n, --line-number
              Prefix each line with its line number

       -v, --invert-match
              Select non-matching lines

       -r, --recursive
              Read all files under each directory, recursively

       -c, --count
              Print a count of matching lines

       -l, --files-with-matches
              Print the name of each file with a match

EXAMPLES
       grep -r "TODO" ~/Documents/
       grep -in "error" /var/log/syslog
       cat file.txt | grep -v "^#"

(END)`,
        'man': `MAN(1)                            User Commands                           MAN(1)

NAME
       man — an interface to the system reference manuals

SYNOPSIS
       man [PAGE]

DESCRIPTION
       man is the system's manual pager.

EXAMPLES
       man ls
       man grep
       man woman    (you know what happens)

(END)`,
    };

    /* ── Export ── */
    SD.Commands = { execute, registry, executeOne };

})(window.SynthDistrict);
