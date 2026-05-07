/* =========================================================
   Synth District — Terminal
   ========================================================= */
'use strict';

window.SynthDistrict = window.SynthDistrict || {};

(function (SD) {

    function esc(s) {
        return String(s)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function c(text, cls) { return `<span class="${cls}">${esc(text)}</span>`; }
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const MOTD = `
<span class="ansi-fg-cyan ansi-bold"> ███████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗</span>
<span class="ansi-fg-cyan ansi-bold"> ██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║</span>
<span class="ansi-fg-cyan ansi-bold"> ███████╗ ╚████╔╝ ██╔██╗ ██║   ██║   ███████║</span>
<span class="ansi-fg-blue ansi-bold"> ╚════██║  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║</span>
<span class="ansi-fg-blue ansi-bold"> ███████║   ██║   ██║ ╚████║   ██║   ██║  ██║</span>
<span class="ansi-fg-blue ansi-bold"> ╚══════╝   ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝</span>
<span class="ansi-fg-magenta ansi-bold"> ██████╗ ██╗███████╗████████╗██████╗ ██╗ ██████╗████████╗</span>
<span class="ansi-fg-magenta ansi-bold"> ██╔══██╗██║██╔════╝╚══██╔══╝██╔══██╗██║██╔════╝╚══██╔══╝</span>
<span class="ansi-fg-magenta ansi-bold"> ██║  ██║██║███████╗   ██║   ██████╔╝██║██║        ██║   </span>
<span class="ansi-fg-bright-magenta ansi-bold"> ██║  ██║██║╚════██║   ██║   ██╔══██╗██║██║        ██║   </span>
<span class="ansi-fg-bright-magenta ansi-bold"> ██████╔╝██║███████║   ██║   ██║  ██║██║╚██████╗   ██║   </span>
<span class="ansi-fg-bright-magenta ansi-bold"> ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝   ╚═╝  </span>`;

    const BOOT_LINES = [
        [0,   '[    0.000000] Booting Linux kernel 6.6.0-synth-district #1 SMP PREEMPT_DYNAMIC'],
        [60,  '[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-6.6.0-synth-district root=/dev/sda1 ro quiet'],
        [80,  '[    0.128432] ACPI: IRQ0 used by override.'],
        [60,  '[    0.183421] ACPI: IRQ2 used by override.'],
        [80,  '[    0.312837] PCI: Using configuration type 1 for base access'],
        [100, '[    0.421938] clocksource: tsc-early: mask: 0xffffffffffffffff max_cycles: 0x'],
        [80,  '[    0.512445] Detected 3400.000 MHz processor.'],
        [120, '[    1.234123] ACPI: BIOS _OSI(Linux) query ignored'],
        [100, '[    1.445288] pci 0000:00:00.0: [8086:a700] type 00 class 0x060000'],
        [80,  '[    2.112331] input: Power Button as /devices/LNXSYSTM:00/LNXPWRBN:00'],
        [100, '[    2.443829] NET: Registered PF_INET protocol family'],
        [80,  '[    2.889201] NET: Registered PF_INET6 protocol family'],
        [120, '[    3.124882] clocksource: Switched to clocksource tsc'],
        [100, '[    4.001234] EXT4-fs (sda1): mounted filesystem with ordered data mode'],
        [150, '[    4.441293] systemd[1]: systemd 252 running in system mode (+PAM +AUDIT)'],
        [200, '[    4.892341] systemd[1]: Detected architecture x86-64.'],
        [100, '[    5.123456] systemd[1]: Hostname set to <synth-district>.'],
        [300, '[    6.234567] Started Network Time Synchronization.'],
        [200, '[    7.345678] Started OpenSSH Server Daemon.'],
        [150, '[    7.891234] Started nginx.service.'],
        [200, '[    8.123456] Reached target Multi-User System.'],
        [300, '[    8.441293] Reached target Graphical Interface.'],
        [200, ''],
        [100, 'Synth District Linux 1.0 synth-district tty1'],
        [300, 'synth-district login: '],
    ];

    class Terminal {
        constructor() {
            this.fs = new SD.FS(SD.fsTree);
            this.history = [];
            this.historyIndex = -1;
            this.historySaved = '';
            this.aliases = {
                'll': 'ls -alF',
                'la': 'ls -A',
                'l': 'ls -CF',
                '..': 'cd ..',
                '...': 'cd ../..',
                'grep': 'grep --color=auto',
            };
            this.lastExitCode = 0;
            this.inputBuffer = '';
            this.cursorPos = 0;
            this.isBlocked = false;
            this.abortController = null;
            this.tabCompletionState = null;
            this.startTime = Date.now();
            SD._bootTime = this.startTime;
            SD._term = this;

            this.$output = document.getElementById('terminal-output');
            this.$inputLine = document.getElementById('input-line');
            this.$hiddenInput = document.getElementById('hidden-input');
            this.$beforeCursor = document.getElementById('input-before-cursor');
            this.$cursor = document.getElementById('cursor');
            this.$afterCursor = document.getElementById('input-after-cursor');
            this.$prompt = document.getElementById('prompt-text');

            this._typingTimer = null;
            this._scrollPending = false;
        }

        start() {
            this.bindEvents();
            const booted = localStorage.getItem('sd_booted');
            if (booted) {
                this.showMOTD();
            } else {
                this.showBoot();
            }
        }

        /* ── DOM output ── */

        println(html) {
            const div = document.createElement('div');
            div.className = 'line';
            div.innerHTML = html;
            this.$output.appendChild(div);
            this.scheduleScroll();
        }

        print(html) { this.println(html); }

        clear() {
            this.$output.innerHTML = '';
        }

        scheduleScroll() {
            if (!this._scrollPending) {
                this._scrollPending = true;
                requestAnimationFrame(() => {
                    this.$output.scrollTop = this.$output.scrollHeight;
                    this._scrollPending = false;
                });
            }
        }

        /* ── Prompt ── */

        renderPrompt() {
            const cwd = this.fs.cwd;
            const home = this.fs.env.HOME;
            const display = cwd.startsWith(home)
                ? '~' + cwd.slice(home.length)
                : cwd;
            const isRoot = this.fs.env.USER === 'root';
            const userColor = isRoot ? 'ansi-fg-red ansi-bold' : 'ansi-fg-green ansi-bold';
            const promptChar = isRoot ? '#' : '$';
            this.$prompt.innerHTML =
                `<span class="${userColor}">${esc(this.fs.env.USER)}@${esc(this.fs.env.HOSTNAME)}</span>` +
                `<span class="ansi-fg-white">:</span>` +
                `<span class="ansi-fg-blue ansi-bold">${esc(display)}</span>` +
                `<span class="ansi-fg-white">${promptChar} </span>`;
        }

        /* ── Password prompt (no echo) ── */

        promptPassword(promptText) {
            return new Promise((resolve) => {
                this.println(esc(promptText));
                let buf = '';

                const onKey = (e) => {
                    e.stopImmediatePropagation();
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        document.removeEventListener('keydown', onKey, true);
                        resolve(buf);
                    } else if (e.key === 'Backspace') {
                        e.preventDefault();
                        buf = buf.slice(0, -1);
                    } else if (e.ctrlKey && e.key === 'c') {
                        e.preventDefault();
                        document.removeEventListener('keydown', onKey, true);
                        this.println(c('^C', 'ansi-fg-white'));
                        resolve(null);
                    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                        e.preventDefault();
                        buf += e.key;
                    }
                };

                // Capture phase runs before the blocked isBlocked guard on $hiddenInput
                document.addEventListener('keydown', onKey, true);
                this.$hiddenInput.focus();
            });
        }

        /* ── Input display ── */

        renderInput() {
            const before = esc(this.inputBuffer.slice(0, this.cursorPos));
            const atCursor = this.inputBuffer[this.cursorPos];
            const cursorChar = atCursor ? esc(atCursor) : '&nbsp;';
            const after = esc(this.inputBuffer.slice(this.cursorPos + 1));
            this.$beforeCursor.innerHTML = before;
            this.$cursor.innerHTML = cursorChar;
            this.$afterCursor.innerHTML = after;
        }

        /* ── Events ── */

        bindEvents() {
            document.addEventListener('click', () => {
                if (!window.getSelection().toString()) {
                    this.$hiddenInput.focus();
                }
            });

            this.$hiddenInput.addEventListener('keydown', (e) => {
                if (this.isBlocked && e.key !== 'c' && !e.ctrlKey) return;
                this.handleKeydown(e);
            });

            this.$hiddenInput.addEventListener('paste', (e) => {
                e.preventDefault();
                if (this.isBlocked) return;
                const text = (e.clipboardData || window.clipboardData).getData('text');
                const clean = text.replace(/\r?\n/g, '');
                this.insertText(clean);
                this.renderInput();
            });

            // Keep cursor "active" styling on typing
            this.$hiddenInput.addEventListener('keydown', () => {
                document.body.classList.add('typing');
                clearTimeout(this._typingTimer);
                this._typingTimer = setTimeout(() => document.body.classList.remove('typing'), 500);
            });

            // Re-focus on visible area click
            this.$inputLine.addEventListener('click', () => this.$hiddenInput.focus());
            this.$output.addEventListener('click', () => {
                if (!window.getSelection().toString()) this.$hiddenInput.focus();
            });

            this.$hiddenInput.focus();
        }

        handleKeydown(e) {
            if (e.key !== 'Tab') this.tabCompletionState = null;

            const ctrl = e.ctrlKey;
            const alt = e.altKey;

            if (ctrl && e.key === 'c') {
                e.preventDefault();
                this.interrupt();
                return;
            }
            if (ctrl && e.key === 'l') { e.preventDefault(); this.clear(); this.renderPrompt(); this.renderInput(); return; }
            if (ctrl && e.key === 'd') { e.preventDefault(); this.ctrlD(); return; }
            if (ctrl && e.key === 'a') { e.preventDefault(); this.cursorPos = 0; this.renderInput(); return; }
            if (ctrl && e.key === 'e') { e.preventDefault(); this.cursorPos = this.inputBuffer.length; this.renderInput(); return; }
            if (ctrl && e.key === 'u') { e.preventDefault(); this.inputBuffer = this.inputBuffer.slice(this.cursorPos); this.cursorPos = 0; this.renderInput(); return; }
            if (ctrl && e.key === 'k') { e.preventDefault(); this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos); this.renderInput(); return; }
            if (ctrl && e.key === 'w') { e.preventDefault(); this.deleteWordBack(); this.renderInput(); return; }
            if (alt && e.key === 'b') { e.preventDefault(); this.moveCursorWordBack(); this.renderInput(); return; }
            if (alt && e.key === 'f') { e.preventDefault(); this.moveCursorWordForward(); this.renderInput(); return; }

            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    if (!this.isBlocked) this.submit();
                    break;
                case 'Tab':
                    e.preventDefault();
                    if (!this.isBlocked) { this.tabComplete(); this.renderInput(); }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (!this.isBlocked) { this.historyUp(); this.renderInput(); }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (!this.isBlocked) { this.historyDown(); this.renderInput(); }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.cursorPos = Math.max(0, this.cursorPos - 1);
                    this.renderInput();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.cursorPos = Math.min(this.inputBuffer.length, this.cursorPos + 1);
                    this.renderInput();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.cursorPos = 0;
                    this.renderInput();
                    break;
                case 'End':
                    e.preventDefault();
                    this.cursorPos = this.inputBuffer.length;
                    this.renderInput();
                    break;
                case 'Backspace':
                    e.preventDefault();
                    if (!this.isBlocked) { this.backspace(); this.renderInput(); }
                    break;
                case 'Delete':
                    e.preventDefault();
                    if (!this.isBlocked) { this.deleteForward(); this.renderInput(); }
                    break;
                default:
                    if (e.key.length === 1 && !ctrl && !alt) {
                        e.preventDefault();
                        if (!this.isBlocked) { this.insertChar(e.key); this.renderInput(); }
                    }
            }
        }

        /* ── Input manipulation ── */

        insertChar(ch) {
            this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + ch + this.inputBuffer.slice(this.cursorPos);
            this.cursorPos++;
        }

        insertText(text) {
            this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + text + this.inputBuffer.slice(this.cursorPos);
            this.cursorPos += text.length;
        }

        backspace() {
            if (this.cursorPos > 0) {
                this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos - 1) + this.inputBuffer.slice(this.cursorPos);
                this.cursorPos--;
            }
        }

        deleteForward() {
            if (this.cursorPos < this.inputBuffer.length) {
                this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + this.inputBuffer.slice(this.cursorPos + 1);
            }
        }

        deleteWordBack() {
            let pos = this.cursorPos;
            while (pos > 0 && this.inputBuffer[pos-1] === ' ') pos--;
            while (pos > 0 && this.inputBuffer[pos-1] !== ' ') pos--;
            this.inputBuffer = this.inputBuffer.slice(0, pos) + this.inputBuffer.slice(this.cursorPos);
            this.cursorPos = pos;
        }

        moveCursorWordBack() {
            let pos = this.cursorPos;
            while (pos > 0 && this.inputBuffer[pos-1] === ' ') pos--;
            while (pos > 0 && this.inputBuffer[pos-1] !== ' ') pos--;
            this.cursorPos = pos;
        }

        moveCursorWordForward() {
            let pos = this.cursorPos;
            while (pos < this.inputBuffer.length && this.inputBuffer[pos] === ' ') pos++;
            while (pos < this.inputBuffer.length && this.inputBuffer[pos] !== ' ') pos++;
            this.cursorPos = pos;
        }

        /* ── History ── */

        historyUp() {
            if (this.historyIndex === -1) this.historySaved = this.inputBuffer;
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.inputBuffer = this.history[this.history.length - 1 - this.historyIndex];
                this.cursorPos = this.inputBuffer.length;
            }
        }

        historyDown() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.inputBuffer = this.history[this.history.length - 1 - this.historyIndex];
            } else if (this.historyIndex === 0) {
                this.historyIndex = -1;
                this.inputBuffer = this.historySaved || '';
            }
            this.cursorPos = this.inputBuffer.length;
        }

        /* ── Tab completion ── */

        tabComplete() {
            const line = this.inputBuffer.slice(0, this.cursorPos);
            const tokens = line.trimStart().split(/\s+/);

            const allCommands = Object.keys(SD.Commands.registry);

            if (tokens.length <= 1) {
                const partial = tokens[0] || '';
                const matches = allCommands.filter(c => c.startsWith(partial)).sort();
                this.applyCompletion(line, partial, matches);
            } else {
                const partial = tokens[tokens.length - 1];
                const matches = this.getPathCompletions(partial);
                this.applyCompletion(line, partial, matches);
            }
        }

        getPathCompletions(partial) {
            let dir, prefix, slashInPartial = false;
            const lastSlash = partial.lastIndexOf('/');
            if (lastSlash === -1) {
                dir = this.fs.cwd;
                prefix = partial;
            } else {
                slashInPartial = true;
                const dirPart = partial.slice(0, lastSlash) || '/';
                dir = this.fs.resolve(dirPart);
                prefix = partial.slice(lastSlash + 1);
            }
            const node = this.fs.getNode(dir);
            if (!node || node.type !== 'dir') return [];
            return Object.entries(node.children)
                .filter(([name]) => name.startsWith(prefix))
                .map(([name, n]) => {
                    const full = slashInPartial ? partial.slice(0, lastSlash + 1) + name : name;
                    return n.type === 'dir' ? full + '/' : full;
                })
                .sort();
        }

        applyCompletion(line, partial, matches) {
            if (!matches.length) return;

            if (matches.length === 1) {
                const completed = matches[0];
                const before = line.slice(0, line.length - partial.length);
                const after = this.inputBuffer.slice(this.cursorPos);
                this.inputBuffer = before + completed + after;
                this.cursorPos = before.length + completed.length;
            } else {
                const common = longestCommonPrefix(matches);
                if (common.length > partial.length) {
                    const before = line.slice(0, line.length - partial.length);
                    const after = this.inputBuffer.slice(this.cursorPos);
                    this.inputBuffer = before + common + after;
                    this.cursorPos = before.length + common.length;
                    this.tabCompletionState = 'extended';
                } else {
                    if (this.tabCompletionState === 'extended' || this.tabCompletionState === 'showing') {
                        this.println(matches.join('&nbsp;&nbsp;&nbsp;'));
                        this.tabCompletionState = null;
                    } else {
                        this.tabCompletionState = 'extended';
                    }
                }
            }
        }

        /* ── Submit ── */

        async submit() {
            const raw = this.inputBuffer;
            const trimmed = raw.trim();

            // Echo the input line
            this.println(this.$prompt.innerHTML + esc(this.inputBuffer));

            this.inputBuffer = '';
            this.cursorPos = 0;
            this.historyIndex = -1;
            this.historySaved = '';
            this.renderInput();

            if (!trimmed) {
                this.renderPrompt();
                return;
            }

            // Dedup history
            if (trimmed !== this.history[this.history.length - 1]) {
                this.history.push(trimmed);
            }

            this.isBlocked = true;
            this.$inputLine.style.visibility = 'hidden';

            this.abortController = new AbortController();
            try {
                await SD.Commands.execute(trimmed, this);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    this.println(`<span class="ansi-fg-red">bash: internal error: ${esc(e.message)}</span>`);
                }
            } finally {
                this.isBlocked = false;
                this.abortController = null;
                this.$inputLine.style.visibility = 'visible';
                this.renderPrompt();
                this.renderInput();
                this.scheduleScroll();
                this.$hiddenInput.focus();
            }
        }

        /* ── Ctrl+C ── */

        interrupt() {
            if (this.abortController) {
                this.abortController.abort();
            }
            if (this.isBlocked) {
                // Let the async unwind handle cleanup
                this.println(esc(this.inputBuffer) + c('^C', 'ansi-fg-white'));
            } else {
                this.println(this.$prompt.innerHTML + esc(this.inputBuffer) + c('^C', 'ansi-fg-white'));
                this.inputBuffer = '';
                this.cursorPos = 0;
                this.historyIndex = -1;
                this.renderPrompt();
                this.renderInput();
            }
        }

        /* ── Ctrl+D ── */

        ctrlD() {
            if (this.inputBuffer === '' && !this.isBlocked) {
                this.println(this.$prompt.innerHTML + c('logout', 'ansi-dim'));
                this.println(c('(Ctrl+D at empty prompt — use `exit` to quit)', 'ansi-dim'));
                this.renderPrompt();
                this.renderInput();
            }
        }

        /* ── Boot sequence ── */

        async showBoot() {
            this.$inputLine.style.visibility = 'hidden';
            this.isBlocked = true;

            for (const [ms, text] of BOOT_LINES) {
                await delay(ms);
                if (text === '') { this.println(''); continue; }
                this.println(c(text, 'ansi-fg-bright-black'));
            }

            // Auto-type login
            await delay(400);
            const loginLine = document.querySelector('.line:last-child');
            if (loginLine) loginLine.innerHTML = c('synth-district login: ', 'ansi-fg-bright-white ansi-bold');

            await this.typeOut('user', 120);
            await delay(200);
            this.println(c('synth-district login: ', 'ansi-fg-bright-white ansi-bold') + c('user', 'ansi-fg-white'));
            this.println(c('Password: ', 'ansi-fg-bright-white ansi-bold'));
            await delay(800);
            this.println('');

            localStorage.setItem('sd_booted', '1');
            await this.showMOTD();
        }

        async typeOut(text, intervalMs) {
            // Visual typing effect for boot sequence
            for (const ch of text) {
                await delay(intervalMs + Math.random() * 60 - 30);
            }
        }

        async showMOTD() {
            // ASCII banner
            MOTD.split('\n').forEach(line => this.println(line));
            this.println('');

            const now = new Date();
            this.println(`Last login: ${now.toDateString()} ${now.toTimeString().slice(0,8)} from 10.0.0.5 on pts/0`);
            this.println('');
            this.println(c('Welcome to Synth District Linux 1.0 (Neon)', 'ansi-fg-green ansi-bold'));
            this.println('');
            this.println(c('  * Documentation:  https://synthdistrict.dev/docs', 'ansi-fg-white'));
            this.println(c('  * Support:        https://synthdistrict.dev/support', 'ansi-fg-white'));
            this.println('');
            this.println(esc(`System information as of ${now.toDateString()}`));
            this.println('');
            const mem = Math.floor(Math.random() * 2000 + 1500);
            this.println(esc(`  System load:   0.12                Processes:    42`));
            this.println(esc(`  Memory usage:  ${Math.floor(mem/327.68)}%                  Users logged in: 1`));
            this.println(esc(`  Swap usage:    0%                  IPv4 address: 192.168.1.42`));
            this.println('');
            this.println(c('  Type `help` for available commands.', 'ansi-fg-cyan'));
            this.println(c('  Type `neofetch` for system info.', 'ansi-fg-cyan'));
            this.println(c('  Type `sl` if you\'re bored.', 'ansi-dim'));
            this.println('');

            this.isBlocked = false;
            this.$inputLine.style.visibility = 'visible';
            this.renderPrompt();
            this.renderInput();
            this.$hiddenInput.focus();
        }
    }

    function longestCommonPrefix(strs) {
        if (!strs.length) return '';
        let prefix = strs[0];
        for (let i = 1; i < strs.length; i++) {
            while (!strs[i].startsWith(prefix)) {
                prefix = prefix.slice(0, -1);
                if (!prefix) return '';
            }
        }
        return prefix;
    }

    /* ── Init ── */

    document.addEventListener('DOMContentLoaded', () => {
        const term = new Terminal();
        term.start();
    });

})(window.SynthDistrict);
