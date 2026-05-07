/* =========================================================
   Synth District — Virtual Filesystem
   ========================================================= */
'use strict';

window.SynthDistrict = window.SynthDistrict || {};

(function (SD) {

    /* ── Static file content ── */

    const BASHRC = `# ~/.bashrc: executed by bash(1) for non-login shells.

export PS1='\\u@\\h:\\w\\$ '
export EDITOR=nano
export PAGER=less
export TERM=xterm-256color

# Aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'
alias fgrep='fgrep --color=auto'
alias egrep='egrep --color=auto'
alias cls='clear'
alias df='df -h'
alias du='du -h'

# Safety
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'

# Functions
mkcd() { mkdir -p "$1" && cd "$1"; }
extract() {
    case $1 in
        *.tar.bz2) tar xjf "$1" ;;
        *.tar.gz)  tar xzf "$1" ;;
        *.zip)     unzip "$1" ;;
        *)         echo "Unknown archive: $1" ;;
    esac
}
`;

    const BASH_HISTORY = `ls -la
cd Documents
cat notes.txt
cd ..
sudo apt update
sudo apt upgrade -y
ping google.com -c 4
ssh root@192.168.1.100
grep -r "TODO" ~/Documents/
find / -name "*.conf" 2>/dev/null
ps aux | grep nginx
tail -f /var/log/syslog
df -h
free -m
uptime
git status
git pull origin main
npm install
python3 -m pytest
cat /etc/os-release
uname -a
whoami
hostname
ip addr show
netstat -tulpn
curl https://api.ipify.org
wget https://example.com/file.tar.gz
history | grep sudo
export PATH=$PATH:/usr/local/bin
echo $HOME
source ~/.bashrc
nano ~/.bashrc
`;

    const SECRET_FILE = `You found me. Nice persistence.

The flag is: synth{c0ns0le_c0wboy_f0und_th3_s3cr3t}

If you found this, try:
  synth --flag c0ns0le_c0wboy_f0und_th3_s3cr3t

There are more secrets. Keep looking.
  Hint: What does /etc/synth-district/config say?
`;

    const NOTES_TXT = `TODO:
=====
[x] Set up SSH keys on all servers
[x] Configure nginx reverse proxy
[ ] Update server configs before Friday
[ ] Check cron jobs (see /etc/cron.d/)
[ ] Write the thing (you know the one)
[ ] Look into that weird error in /var/log/syslog
[ ] Ask about the deployment pipeline

IMPORTANT:
- Password is in KeePass. NOT in plain text. Stop it.
- The API key should NEVER be committed to git
- Check with Sarah before touching the prod database

RANDOM THOUGHTS:
- Should we migrate to k8s? Probably overkill for now.
- The monitoring dashboard needs labels
- Coffee machine on 3rd floor still broken

Last updated: $(date +%Y-%m-%d)
`;

    const TODO_MD = `# Projects

## Active
- [ ] Terminal website redesign
- [ ] Fix memory leak in event handler
- [ ] Write unit tests for auth module
- [x] Set up CI/CD pipeline

## Backlog
- [ ] Refactor database layer
- [ ] Improve error messages
- [ ] Documentation update
- [ ] Performance audit

## Done
- [x] Deploy to production
- [x] SSL certificate renewal
- [x] Security audit
`;

    const ARCHIVE_TGZ_CONTENT = `Cannot display binary file: archive.tar.gz
`;

    const OS_RELEASE = () => {
        const cfg = SD.config;
        return `NAME="${cfg.osName}"
VERSION="${cfg.osVersion} (${cfg.osCodename})"
ID=${cfg.kernelName}
ID_LIKE=debian
PRETTY_NAME="${cfg.getOsPrettyName()}"
VERSION_ID="${cfg.osVersion}"
HOME_URL="${cfg.siteUrl}"
SUPPORT_URL="${cfg.siteUrl}/support"
BUG_REPORT_URL="${cfg.siteUrl}/bugs"
VERSION_CODENAME=${cfg.osCodename.toLowerCase()}
UBUNTU_CODENAME=${cfg.osCodename.toLowerCase()}
`;
    };

    const HOSTNAME_FILE = () => `${SD.config.kernelName}\n`;

    const PASSWD_FILE = () => `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/usr/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System:/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-network:x:100:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:101:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
syslog:x:102:106::/home/syslog:/usr/sbin/nologin
messagebus:x:103:107::/nonexistent:/usr/sbin/nologin
_apt:x:104:65534::/nonexistent:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin
user:x:1000:1000:${SD.config.defaultUserFullName},,,:/home/user:/bin/bash
`;

    const SHADOW_FILE = `root:*:19800:0:99999:7:::
daemon:*:19800:0:99999:7:::
user:$6$rounds=65536$synth$HASH_GOES_HERE:19800:0:99999:7:::
`;

    const FSTAB = `# /etc/fstab: static file system information.
#
# <file system> <mount point>   <type>  <options>       <dump>  <pass>
UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890 /               ext4    errors=remount-ro 0       1
UUID=b2c3d4e5-f6a7-8901-bcde-f12345678901 /boot           ext4    defaults        0       2
UUID=c3d4e5f6-a7b8-9012-cdef-123456789012 none            swap    sw              0       0
tmpfs           /tmp            tmpfs   nosuid,nodev    0       0
`;

    const HOSTS_FILE = `127.0.0.1       localhost
127.0.1.1       synth-district
::1             localhost ip6-localhost ip6-loopback
ff02::1         ip6-allnodes
ff02::2         ip6-allrouters

# Custom entries
192.168.1.1     gateway router
192.168.1.10    nas.local
192.168.1.20    pihole.local
`;

    const SYNTH_CONFIG = () => {
        const cfg = SD.config;
        return `# ${cfg.siteName} Configuration
# /etc/${cfg.kernelName}/config

[system]
hostname = ${cfg.kernelName}
domain = ${cfg.siteUrl.replace('https://', '')}
timezone = UTC
locale = en_US.UTF-8

[network]
interface = eth0
ip_mode = dhcp
dns_primary = 1.1.1.1
dns_secondary = 8.8.8.8

[security]
# Note: actual secrets are in /etc/${cfg.kernelName}/.secrets (read-restricted)
# There is another flag hidden somewhere on this system.
# Try: find / -name "*.key" 2>/dev/null
allow_root_login = no
fail2ban_enabled = yes

[easter]
# You found another hint. Good.
# Flag part 2: _4nd_3xpl0r3r}
# Combine with the flag in ~/.secret to get the full picture.
`;
    };

    const PROC_VERSION = `Linux version 6.6.0-synth-district (gcc (Ubuntu 12.3.0-1ubuntu1) 12.3.0, GNU ld (GNU Binutils for Ubuntu) 2.40) #1 SMP PREEMPT_DYNAMIC Mon Jan 15 08:00:00 UTC 2024\n`;

    const PROC_CPUINFO = `processor	: 0
vendor_id	: GenuineIntel
cpu family	: 6
model		: 186
model name	: 13th Gen Intel(R) Core(TM) i7-13700K
stepping	: 2
microcode	: 0x411c
cpu MHz		: 3400.000
cache size	: 30720 KB
physical id	: 0
siblings	: 16
core id		: 0
cpu cores	: 8
apicid		: 0
flags		: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx pdpe1gb rdtscp lm constant_tsc
bogomips	: 6800.00
clflush size	: 64
cache_alignment	: 64
address sizes	: 46 bits physical, 48 bits virtual

processor	: 1
vendor_id	: GenuineIntel
cpu family	: 6
model		: 186
model name	: 13th Gen Intel(R) Core(TM) i7-13700K
stepping	: 2
microcode	: 0x411c
cpu MHz		: 3400.000
cache size	: 30720 KB
physical id	: 0
siblings	: 16
core id		: 1
cpu cores	: 8
apicid		: 2
flags		: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx pdpe1gb rdtscp lm constant_tsc
bogomips	: 6800.00
clflush size	: 64
cache_alignment	: 64
address sizes	: 46 bits physical, 48 bits virtual
`;

    const PROC_MEMINFO = `MemTotal:       32768000 kB
MemFree:         8192000 kB
MemAvailable:   22016000 kB
Buffers:          512000 kB
Cached:          5120000 kB
SwapCached:            0 kB
Active:          8448000 kB
Inactive:        4096000 kB
SwapTotal:       8388608 kB
SwapFree:        8388608 kB
Dirty:               256 kB
Writeback:             0 kB
AnonPages:       6144000 kB
Mapped:           512000 kB
Shmem:            128000 kB
KReclaimable:    512000 kB
Slab:             768000 kB
SReclaimable:    512000 kB
SUnreclaim:       256000 kB
VmallocTotal:   34359738367 kB
VmallocUsed:      65536 kB
HugePages_Total:       0
HugePages_Free:        0
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
`;

    const CRONTAB = `# /etc/crontab: system-wide crontab
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# m h dom mon dow user	command
17 *	* * *	root    cd / && run-parts --report /etc/cron.hourly
25 6	* * *	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6	* * 7	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6	1 * *	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
*/5 * * * *	user	/home/user/scripts/health-check.sh >> /var/log/health.log 2>&1
0 2 * * *	root	/usr/local/bin/backup.sh
`;

    const NGINX_CONF = `user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
`;

    const RESOLV_CONF = `# Generated by NetworkManager
nameserver 1.1.1.1
nameserver 8.8.8.8
search synthdistrict.dev local
`;

    const MOTD_FILE = `
 ███████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗
 ██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║
 ███████╗ ╚████╔╝ ██╔██╗ ██║   ██║   ███████║
 ╚════██║  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║
 ███████║   ██║   ██║ ╚████║   ██║   ██║  ██║
 ╚══════╝   ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝

 ██████╗ ██╗███████╗████████╗██████╗ ██╗ ██████╗████████╗
 ██╔══██╗██║██╔════╝╚══██╔══╝██╔══██╗██║██╔════╝╚══██╔══╝
 ██║  ██║██║███████╗   ██║   ██████╔╝██║██║        ██║
 ██║  ██║██║╚════██║   ██║   ██╔══██╗██║██║        ██║
 ██████╔╝██║███████║   ██║   ██║  ██║██║╚██████╗   ██║
 ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝   ╚═╝

`;

    function generateSyslog() {
        const now = new Date();
        const lines = [];
        const hosts = ['synth-district'];
        const services = [
            ['kernel', ['[UFW BLOCK] IN=eth0 OUT= MAC=ff:ff:ff:ff:ff:ff SRC=192.168.1.254 DST=255.255.255.255 LEN=342',
                         'EXT4-fs (sda1): mounted filesystem without journal',
                         'audit: type=1400 audit(0.0:1): apparmor="STATUS" operation="profile_load"']],
            ['systemd[1]', ['Started Network Time Synchronization.', 'Started Session 1 of user user.', 'Reached target Multi-User System.']],
            ['sshd[1124]', ['Server listening on 0.0.0.0 port 22.', 'Accepted publickey for user from 10.0.0.5 port 44321 ssh2',
                             'Disconnected from user 10.0.0.5 port 44321']],
            ['cron[892]', ['(CRON) INFO (pidfile fd = 3)', '(user) CMD (/home/user/scripts/health-check.sh)']],
            ['NetworkManager[654]', ['<info>  [1705000000.0000] Starting NetworkManager (version 1.42.4)',
                                      '<info>  [1705000000.5000] device (eth0): state change: ip-config -> ip-check',
                                      '<info>  [1705000001.0000] device (eth0): Activation: successful']],
            ['dbus-daemon[502]', ['[system] Successfully activated service \'org.freedesktop.hostname1\'',
                                   '[system] Successfully activated service \'org.freedesktop.NetworkManager\'']],
            ['systemd-resolved[503]', ['Using system hostname \'synth-district\'.']],
            ['nginx[1200]', ['2024/01/15 08:00:00 [notice] 1200#1200: start worker processes',
                              '2024/01/15 08:00:00 [notice] 1200#1200: signal process started']],
        ];

        for (let i = 0; i < 80; i++) {
            const t = new Date(now - (80 - i) * 60000 + Math.random() * 30000);
            const month = t.toLocaleString('en', { month: 'short' });
            const day = String(t.getDate()).padStart(2, ' ');
            const time = t.toTimeString().slice(0, 8);
            const host = hosts[0];
            const svc = services[Math.floor(Math.random() * services.length)];
            const msg = svc[1][Math.floor(Math.random() * svc[1].length)];
            lines.push(`${month} ${day} ${time} ${host} ${svc[0]}: ${msg}`);
        }
        return lines.join('\n') + '\n';
    }

    const AUTH_LOG = `Jan 15 08:12:01 synth-district sshd[1124]: Server listening on 0.0.0.0 port 22.
Jan 15 08:15:33 synth-district sshd[1245]: Accepted publickey for user from 10.0.0.5 port 44321 ssh2: RSA SHA256:abc123
Jan 15 08:15:33 synth-district sshd[1245]: pam_unix(sshd:session): session opened for user user by (uid=0)
Jan 15 09:01:15 synth-district sudo: user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/apt update
Jan 15 09:01:16 synth-district sudo: pam_unix(sudo:session): session opened for user root by user(uid=1000)
Jan 15 09:01:19 synth-district sudo: pam_unix(sudo:session): session closed for user root
`;

    const DPKG_LOG = `2024-01-15 08:00:01 startup packages configure
2024-01-15 08:00:01 configure nginx:amd64 1.24.0-2ubuntu7 <none>
2024-01-15 08:00:02 status half-configured nginx:amd64 1.24.0-2ubuntu7
2024-01-15 08:00:03 status installed nginx:amd64 1.24.0-2ubuntu7
2024-01-15 09:01:16 startup packages install
2024-01-15 09:01:17 install curl:amd64 <none> 7.88.1-10+deb12u4
2024-01-15 09:01:18 status half-installed curl:amd64 7.88.1-10+deb12u4
2024-01-15 09:01:19 status installed curl:amd64 7.88.1-10+deb12u4
`;

    const MUSIC_README = `~/Music/
No music files here yet. But the terminal plays a different kind of music.
`;

    const DOWNLOADS_README = `~/Downloads/
archive.tar.gz - Downloaded 2024-01-10 (source code, probably)
`;

    const GITCONFIG = () => `[user]
	name = ${SD.config.defaultUserFullName}
	email = ${SD.config.defaultEmail}
[core]
	editor = nano
	autocrlf = input
[alias]
	co = checkout
	br = branch
	ci = commit
	st = status
	lg = log --oneline --graph --decorate
[pull]
	rebase = false
[push]
	default = simple
`;

    const VIMRC = `" ~/.vimrc
set nocompatible
set number
set relativenumber
set tabstop=4
set shiftwidth=4
set expandtab
set autoindent
set smartindent
set hlsearch
set incsearch
set ignorecase
set smartcase
set wrap
set linebreak
syntax on
colorscheme desert
set background=dark
`;

    const HEALTH_CHECK_SH = `#!/bin/bash
# Health check script
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOAD=$(uptime | awk -F'average:' '{print $2}' | tr -d ' ')
DISK=$(df -h / | awk 'NR==2{print $5}')
MEM=$(free -m | awk 'NR==2{printf "%.0f%%", $3*100/$2}')
echo "[$TIMESTAMP] load=$LOAD disk=$DISK mem=$MEM OK"
`;

    const BACKUP_SH = `#!/bin/bash
# Daily backup script
BACKUP_DIR="/var/backups"
DATE=$(date +%Y%m%d)
tar -czf "$BACKUP_DIR/home-$DATE.tar.gz" /home/user/ 2>/dev/null
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
echo "Backup completed: $BACKUP_DIR/home-$DATE.tar.gz"
`;

    const SECRET_KEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACB... [REDACTED FOR SECURITY] ...
# If you found this, you're a real hacker. But it's fake.
# Flag part 3 hint: check /etc/synth-district/config
-----END OPENSSH PRIVATE KEY-----
`;

    const ISSUE_FILE = () => `${SD.config.getOsPrettyName()} \\n \\l\n`;

    const ISSUE_NET_FILE = () => `${SD.config.getOsPrettyName()}\nKernel \\r on an \\m (\\l)\n`;

    const GROUP_FILE = `root:x:0:
daemon:x:1:
bin:x:2:
sys:x:3:
adm:x:4:syslog,user
tty:x:5:
disk:x:6:
lp:x:7:
mail:x:8:
news:x:9:
uucp:x:10:
man:x:12:
proxy:x:13:
kmem:x:9:
dialout:x:20:
fax:x:21:
voice:x:22:
cdrom:x:24:user
floppy:x:25:
tape:x:26:
sudo:x:27:user
audio:x:29:user
dip:x:30:user
www-data:x:33:
backup:x:34:
list:x:38:
irc:x:39:
gnats:x:41:
systemd-journal:x:101:
systemd-network:x:102:
systemd-resolve:x:103:
input:x:104:
render:x:106:
ssh:x:999:
user:x:1000:
`;

    const SUDOERS_FILE = `# This file MUST be edited with the 'visudo' command as root.
# See the man page for details on how to write other entries to this file.
Defaults	env_reset
Defaults	mail_badpass
Defaults	secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
root	ALL=(ALL:ALL) ALL
%sudo	ALL=(ALL:ALL) ALL
user	ALL=(ALL:ALL) NOPASSWD: /usr/bin/apt
`;

    const LIMITS_CONF = `# /etc/security/limits.conf
# Hard limit for core dumps
* soft core unlimited
* hard core unlimited
# Limit for maximum locked-in memory address space
* soft memlock unlimited
* hard memlock unlimited
`;

    const SUDOERS_D_CONTENT = `# This file is part of the sudo package and controlled by dpkg.
# Please use 'visudo' to edit this file.
`;

    const SYSTEMD_SYSTEM_CONF = `[Manager]
#LogLevel=info
#LogTarget=journal-or-kmsg
#LogColor=yes
#LogLocation=no
#DumpCore=yes
#CrashChangeVT=no
#RuntimeWatchdogSec=0
#RebootWatchdogSec=10min
#KExecWatchdogSec=0
#DefaultTimeoutStopSec=90s
#DefaultTimeoutAbortSec=
#DefaultDeviceTimeoutSec=90s
#DefaultRestartSec=100ms
#DefaultStartLimitBurst=5
#DefaultStartLimitIntervalSec=10s
DefaultStandardOutput=journal
#DefaultStandardError=inherit
#DefaultMemoryAccounting=yes
#DefaultTasksAccounting=yes
#DefaultTasksMax=infinity
#DefaultTimeoutStartSec=90s
`;

    const LOCALE_GEN_FILE = `# This file lists locales that you wish to have compiled on the system.
# Uncomment the ones you want built. After uncommenting, run 'locale-gen'.
en_US.UTF-8 UTF-8
en_US ISO-8859-1
`;

    const APT_SOURCES_FILE = `# Debian package sources
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://deb.debian.org/debian-security/ bookworm-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
deb http://deb.debian.org/debian bookworm-backports main contrib non-free non-free-firmware
`;

    const APT_PREFERENCES = `Package: *
Pin: release a=stable
Pin-Priority: 990

Package: *
Pin: release a=unstable
Pin-Priority: -10
`;

    const SOURCES_LIST_D_COMMENT = `# This file specifies additional repositories for apt.
# See sources.list(5) for details.
`;

    const LSB_RELEASE = () => {
        const cfg = SD.config;
        return `DISTRIB_ID=Synth
DISTRIB_RELEASE=${cfg.osVersion}
DISTRIB_CODENAME=${cfg.osCodename.toLowerCase()}
DISTRIB_DESCRIPTION="${cfg.getOsPrettyName()}"
`;
    };

    const NSSWITCH_CONF = `# /etc/nsswitch.conf
passwd:         files systemd
group:          files systemd
shadow:         files
gshadow:        files

hosts:          files mdns4_minimal [NOTFOUND=return] dns myhostname
networks:       files
protocols:      db files
services:       db files
ethers:         db files
rpc:            db files

netgroup:       nis
`;

    const PROFILE_FILE = `# /etc/profile: system-wide .profile file for sh(1)

# system-wide environment extensions
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

if [ "\${PS1-}" ]; then
  if [ "\${BASH-}" ] && [ "\${BASH}" != "/bin/sh" ]; then
    [ -f /etc/bash.bashrc ] && . /etc/bash.bashrc
  fi
fi

# variable declarations for login shells
MANPATH=/usr/local/man:/usr/share/man
INFOPATH=/usr/local/info:/usr/share/info
`;

    const DEFAULT_LOCALE = `# File generation of locales.conf
# See "systemd-localed.service(8)" for details.
LANG=en_US.UTF-8
`;

    const MODULES_LOAD_CONF = `# Load kernel modules
# This file contains the names of kernel modules that should be loaded at boot time,
# one per line. Lines beginning with "#" are ignored.
`;

    const MODPROBE_CONF = `# /etc/modprobe.d/modprobe.conf
# Include all .conf files in /etc/modprobe.d/
`;

    const SYSCTL_CONF = `# /etc/sysctl.conf
# Kernel sysctl configuration file for Linux
# For binary values, 0 is disabled, 1 is enabled. See sysctl(8) and sysctl.conf(5) for more details.

# kernel.domainname=example.com
# kernel.printk = 4 4 1 7
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1
kernel.sysrq = 438
kernel.panic = 3
kernel.panic_on_oops = 1
fs.file-max = 2097152
fs.inode-max = 1048576
`;

    const LOGROTATE_CONF = `# /etc/logrotate.conf: logrotate configuration
/var/log/wtmp {
    monthly
    create 0664 root utmp
    rotate 1
}

/var/log/btmp {
    missingok
    monthly
    create 0660 root utmp
    rotate 1
}
`;

    const APT_APT_CONF = `APT {
  Architecture "amd64";
};
`;

    /* ── Node constructors ── */

    function file(content, perms, owner, mtime) {
        const now = new Date('2024-01-15T08:12:00Z');
        return {
            type: 'file',
            content: content,
            perms: perms || '-rw-r--r--',
            owner: owner || 'root',
            group: owner || 'root',
            mtime: mtime || now,
            get size() {
                const c = typeof this.content === 'function' ? this.content() : this.content;
                return c.length;
            }
        };
    }

    function dir(children, perms, owner, mtime) {
        const now = new Date('2024-01-15T08:12:00Z');
        return {
            type: 'dir',
            children: children || {},
            perms: perms || 'drwxr-xr-x',
            owner: owner || 'root',
            group: owner || 'root',
            mtime: mtime || now
        };
    }

    function userFile(content, perms) { return file(content, perms || '-rw-r--r--', 'user'); }
    function execFile(content) { return file(content, '-rwxr-xr-x', 'root'); }

    /* ── Filesystem tree ── */

    SD.fsTree = {
        '/': dir({
            'bin': dir({
                'bash': execFile(''), 'sh': execFile(''), 'ls': execFile(''), 'cat': execFile(''),
                'grep': execFile(''), 'find': execFile(''), 'cp': execFile(''), 'mv': execFile(''),
                'rm': execFile(''), 'mkdir': execFile(''), 'touch': execFile(''), 'chmod': execFile(''),
                'chown': execFile(''), 'ln': execFile(''), 'ps': execFile(''), 'kill': execFile(''),
                'mount': execFile(''), 'umount': execFile(''), 'df': execFile(''), 'du': execFile(''),
                'pwd': execFile(''), 'echo': execFile(''), 'date': execFile(''), 'sleep': execFile(''),
                'true': execFile(''), 'false': execFile(''), 'test': execFile(''),
            }),
            'sbin': dir({
                'init': execFile(''), 'sshd': execFile(''), 'nginx': execFile(''),
                'reboot': execFile(''), 'shutdown': execFile(''), 'ifconfig': execFile(''),
            }),
            'etc': dir({
                'hostname': file(HOSTNAME_FILE),
                'hosts': file(HOSTS_FILE),
                'passwd': file(PASSWD_FILE),
                'shadow': file(SHADOW_FILE, '-rw-r-----', 'root'),
                'group': file(GROUP_FILE),
                'gshadow': file('', '-rw-r-----', 'root'),
                'fstab': file(FSTAB),
                'crontab': file(CRONTAB),
                'os-release': file(OS_RELEASE),
                'lsb-release': file(LSB_RELEASE),
                'issue': file(ISSUE_FILE),
                'issue.net': file(ISSUE_NET_FILE),
                'resolv.conf': file(RESOLV_CONF),
                'motd': file(MOTD_FILE),
                'nsswitch.conf': file(NSSWITCH_CONF),
                'profile': file(PROFILE_FILE),
                'bash.bashrc': file(`# System-wide .bashrc file for interactive bash(1) shells.
if [ -z "$PS1" ]; then return; fi
shopt -s checkwinsize
`),
                'environment': file(`PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
LANG="en_US.UTF-8"
`),
                'timezone': file(`UTC\n`),
                'locale.gen': file(LOCALE_GEN_FILE),
                'default.locale': file(DEFAULT_LOCALE),
                'sysctl.conf': file(SYSCTL_CONF),
                'logrotate.conf': file(LOGROTATE_CONF),
                'modules-load.d': dir({
                    'modules.conf': file(MODULES_LOAD_CONF),
                }),
                'modprobe.d': dir({
                    'modprobe.conf': file(MODPROBE_CONF),
                }),
                'security': dir({
                    'limits.conf': file(LIMITS_CONF),
                    'limits.d': dir({}),
                }),
                'nginx': dir({ 'nginx.conf': file(NGINX_CONF) }),
                'synth-district': dir({
                    'config': file(SYNTH_CONFIG)
                }),
                'ssh': dir({
                    'sshd_config': file(`# This is the sshd server system-wide configuration file.
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
X11Forwarding no
PrintMotd yes
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
`),
                    'ssh_config': file(`# This is the ssh client system-wide configuration file.
Host *
    SendEnv LANG LC_*
    HashKnownHosts yes
`),
                }),
                'apt': dir({
                    'sources.list': file(APT_SOURCES_FILE),
                    'sources.list.d': dir({}),
                    'preferences': file(APT_PREFERENCES),
                    'preferences.d': dir({}),
                    'apt.conf.d': dir({
                        '99-quiet': file(`APT::Quiet "1";\n`),
                        'periodic': file(`APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n`),
                    }),
                    'trusted.gpg.d': dir({}),
                }),
                'sudoers': file(SUDOERS_FILE, '-r--r-----', 'root'),
                'sudoers.d': dir({
                    'README': file(SUDOERS_D_CONTENT),
                }),
                'systemd': dir({
                    'system.conf': file(SYSTEMD_SYSTEM_CONF),
                    'user.conf': file(`# /etc/systemd/user.conf\n`),
                    'journald.conf': file(`[Journal]\nStorage=persistent\n`),
                    'logind.conf': file(`[Login]\nNAutoVTs=6\nReserveVT=6\n`),
                    'timesyncd.conf': file(`[Time]\nNTP=0.debian.pool.ntp.org 1.debian.pool.ntp.org\n`),
                    'resolved.conf': file(`[Resolve]\nDNS=1.1.1.1 8.8.8.8\n`),
                    'system': dir({
                        'multi-user.target.wants': dir({}),
                        'network-online.target.wants': dir({}),
                    }),
                }),
                'default': dir({
                    'locale': file(DEFAULT_LOCALE),
                    'grub': file(() => `GRUB_DEFAULT=0\nGRUB_TIMEOUT=5\nGRUB_DISTRIBUTOR="${SD.config.siteName}"\n`),
                    'keyboard': file(`# Consoles\nFORMAT="us"\n`),
                    'console-setup': file(`FONTFACE="Fixed"\nFONTSIZE="8x16"\n`),
                    'locale': file(DEFAULT_LOCALE),
                }),
                'cron.d': dir({
                    'hourly': file(`#!/bin/bash\necho "Hourly cron job"\n`, '-rwxr-xr-x'),
                    'daily': file(`#!/bin/bash\necho "Daily cron job"\n`, '-rwxr-xr-x'),
                    'weekly': file(`#!/bin/bash\necho "Weekly cron job"\n`, '-rwxr-xr-x'),
                    'monthly': file(`#!/bin/bash\necho "Monthly cron job"\n`, '-rwxr-xr-x'),
                }),
                'init.d': dir({
                    'skeleton': file(`#!/bin/sh
### BEGIN INIT INFO
# Provides:          skeleton
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Example initscript
### END INIT INFO
`, '-rwxr-xr-x'),
                }),
                'alternatives': dir({}),
            }),
            'home': dir({
                'user': dir({
                    '.bashrc': userFile(BASHRC, '-rw-r--r--'),
                    '.bash_history': userFile(BASH_HISTORY, '-rw-------'),
                    '.bash_logout': userFile(`# ~/.bash_logout: executed by bash when login shell exits.\nclear\n`),
                    '.profile': userFile(`# ~/.profile: executed by the command interpreter for login shells.\nif [ -f ~/.bashrc ]; then . ~/.bashrc; fi\n`),
                    '.secret': userFile(SECRET_FILE, '-rw-------'),
                    '.gitconfig': userFile(GITCONFIG),
                    '.git': dir({
                        'HEAD': file('ref: refs/heads/main\n'),
                        'config': file('[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/user/synth-district.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n'),
                        'objects': dir({}),
                        'refs': dir({
                            'heads': dir({'main': file('3f8c9a2a5d1e9f4b6c7a8e9f0d1c2b3a\n')}),
                            'remotes': dir({'origin': dir({'main': file('a1f7e32b8c9d0e1f2a3b4c5d6e7f8a9b\n')})}),
                            'tags': dir({}),
                        }),
                    }, 'drwxr-xr-x', 'user'),
                    '.vimrc': userFile(VIMRC),
                    '.ssh': dir({
                        'id_ed25519': userFile(SECRET_KEY, '-rw-------'),
                        'id_ed25519.pub': userFile('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFakePublicKeyForSynthDistrict user@synth-district\n', '-rw-r--r--'),
                        'authorized_keys': userFile('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFakePublicKeyForSynthDistrict user@workstation\n', '-rw-------'),
                        'known_hosts': userFile('github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GkZI\n'),
                    }, 'drwx------', 'user'),
                    'Documents': dir({
                        'notes.txt': userFile(NOTES_TXT),
                        'todo.md': userFile(TODO_MD),
                        'readme.txt': userFile(() => `Welcome to ${SD.config.osName}.

This is your home directory. Feel free to explore.
The system is yours to command.

For help, type: help
For system info: neofetch
For something fun: sl

Happy hacking.
`),
                    }, 'drwxr-xr-x', 'user'),
                    'Downloads': dir({
                        'archive.tar.gz': userFile(ARCHIVE_TGZ_CONTENT),
                        'README.txt': userFile(DOWNLOADS_README),
                    }, 'drwxr-xr-x', 'user'),
                    'Music': dir({
                        'README.txt': userFile(MUSIC_README),
                    }, 'drwxr-xr-x', 'user'),
                    'Desktop': dir({}, 'drwxr-xr-x', 'user'),
                    'Pictures': dir({}, 'drwxr-xr-x', 'user'),
                    'scripts': dir({
                        'health-check.sh': userFile(HEALTH_CHECK_SH, '-rwxr-xr-x'),
                        'backup.sh': userFile(BACKUP_SH, '-rwxr-xr-x'),
                        'deploy.sh': userFile(`#!/bin/bash\n# Deploy script\nset -e\necho "Deploying...\n`, '-rwxr-xr-x'),
                    }, 'drwxr-xr-x', 'user'),
                    '.config': dir({
                        'git': dir({
                            'config': userFile(() => `[user]\n\tname = ${SD.config.defaultUserFullName}\n\temail = ${SD.config.defaultEmail}\n`),
                        }, 'drwxr-xr-x', 'user'),
                        'nano': dir({
                            'nanorc': userFile(`set linenumbers\nset autoindent\n`),
                        }, 'drwxr-xr-x', 'user'),
                        'htop': dir({
                            'htoprc': userFile(`# htop configuration\n`),
                        }, 'drwxr-xr-x', 'user'),
                        'systemd': dir({
                            'user.conf': userFile(`# User systemd configuration\n`),
                        }, 'drwxr-xr-x', 'user'),
                    }, 'drwxr-xr-x', 'user'),
                    '.local': dir({
                        'bin': dir({
                            'custom-script': userFile(`#!/bin/bash\necho "Custom script"\n`, '-rwxr-xr-x'),
                        }, 'drwxr-xr-x', 'user'),
                        'share': dir({
                            'applications': dir({}, 'drwxr-xr-x', 'user'),
                            'icons': dir({}, 'drwxr-xr-x', 'user'),
                            'fonts': dir({}, 'drwxr-xr-x', 'user'),
                            'man': dir({}, 'drwxr-xr-x', 'user'),
                        }, 'drwxr-xr-x', 'user'),
                        'lib': dir({
                            'python3.11': dir({
                                'site-packages': dir({}, 'drwxr-xr-x', 'user'),
                            }, 'drwxr-xr-x', 'user'),
                        }, 'drwxr-xr-x', 'user'),
                    }, 'drwxr-xr-x', 'user'),
                    '.cache': dir({
                        'pip': dir({}, 'drwxr-xr-x', 'user'),
                        'fontconfig': dir({}, 'drwxr-xr-x', 'user'),
                        'thumbnails': dir({
                            'normal': dir({}, 'drwxr-xr-x', 'user'),
                            'large': dir({}, 'drwxr-xr-x', 'user'),
                        }, 'drwxr-xr-x', 'user'),
                    }, 'drwxr-xr-x', 'user'),
                    '.npm': dir({}, 'drwxr-xr-x', 'user'),
                    '.cargo': dir({
                        'bin': dir({}, 'drwxr-xr-x', 'user'),
                    }, 'drwxr-xr-x', 'user'),
                    '.gem': dir({
                        'ruby': dir({}, 'drwxr-xr-x', 'user'),
                    }, 'drwxr-xr-x', 'user'),
                    '.composer': dir({}, 'drwxr-xr-x', 'user'),
                    '.gradle': dir({}, 'drwxr-xr-x', 'user'),
                    '.m2': dir({
                        'repository': dir({}, 'drwxr-xr-x', 'user'),
                    }, 'drwxr-xr-x', 'user'),
                }, 'drwx------', 'user'),
            }),
            'root': dir({
                '.bashrc': file(`# Root's .bashrc\nexport PS1='\\[\\033[01;31m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]# '\n`),
                '.ssh': dir({}, 'drwx------', 'root'),
            }, 'drwx------', 'root'),
            'var': dir({
                'log': dir({
                    'syslog': file(generateSyslog, '-rw-r-----', 'syslog'),
                    'auth.log': file(AUTH_LOG, '-rw-r-----', 'syslog'),
                    'dpkg.log': file(DPKG_LOG),
                    'kern.log': file(`Jan 15 08:00:00 synth-district kernel: [    0.000000] Linux version 6.6.0-synth-district\n`),
                    'messages': file(`Jan 15 08:00:00 synth-district kernel: Linux version 6.6.0-synth-district\n`),
                    'debug': file(`Jan 15 08:00:00 synth-district systemd[1]: systemd 252.22-1-debian started\n`),
                    'faillog': file('', '-rw-r--r--'),
                    'lastlog': file('', '-rw-rw-r--'),
                    'wtmp': file('', '-rw-rw-r--'),
                    'btmp': file('', '-rw-rw----'),
                    'nginx': dir({
                        'access.log': file(`10.0.0.5 - - [15/Jan/2024:08:15:33 +0000] "GET / HTTP/1.1" 200 1024 "-" "Mozilla/5.0"\n10.0.0.5 - - [15/Jan/2024:08:15:34 +0000] "GET /style.css HTTP/1.1" 200 4096 "/" "Mozilla/5.0"\n`),
                        'error.log': file(`2024/01/15 08:00:00 [notice] 1200#1200: signal process started\n`),
                    }),
                    'apt': dir({
                        'history.log': file(`Start-Date: 2024-01-15  08:00:00\nCommandline: apt-get update\nInstall: nginx:amd64 (1.24.0-2ubuntu7)\nEnd-Date: 2024-01-15  08:01:00\n`),
                    }),
                    'health.log': file(`[2024-01-15 08:00:00] load=0.12,0.15,0.10 disk=12% mem=42% OK\n[2024-01-15 08:05:00] load=0.08,0.12,0.09 disk=12% mem=43% OK\n`),
                }),
                'www': dir({
                    'html': dir({
                        'index.html': file(`<!DOCTYPE html>\n<html><body><h1>It works!</h1></body></html>\n`),
                    }),
                }),
                'lib': dir({
                    'apt': dir({
                        'periodic': dir({
                            'download-upgradable': file(`#!/bin/bash\n`),
                            'update-success-stamp': file(``, '-rw-r--r--'),
                        }),
                    }),
                    'dpkg': dir({
                        'status': file(`Package: nginx\nStatus: install ok installed\nVersion: 1.24.0-2ubuntu7\n`),
                        'status-old': file(``),
                        'lock': file(``),
                    }),
                    'man-db': dir({}),
                    'systemd': dir({
                        'catalog': dir({}),
                    }),
                }),
                'cache': dir({
                    'apt': dir({
                        'archives': dir({}),
                        'pkgcache.bin': file('', '-rw-r--r--'),
                        'srcpkgcache.bin': file('', '-rw-r--r--'),
                    }),
                    'fontconfig': dir({}),
                    'man-db': dir({}),
                }),
                'spool': dir({
                    'mail': dir({}, 'drwxrwsr-x', 'root'),
                    'at': dir({}, 'drwxr-xr-x', 'root'),
                    'cron': dir({}, 'drwxr-xr-x', 'root'),
                    'lpr': dir({}, 'drwxr-xr-x', 'root'),
                }),
                'backups': dir({}, 'drwxr-xr-x', 'root'),
                'tmp': dir({}, 'drwxrwxrwt', 'root'),
                'lock': dir({}, 'drwxrwxr-x', 'root'),
                'run': dir({
                    'sshd.pid': file('1124\n'),
                    'user': dir({}, 'drwxr-xr-x', 'root'),
                    'systemd': dir({}),
                }, 'drwxr-xr-x', 'root'),
            }),
            'tmp': dir({}, 'drwxrwxrwt', 'root'),
            'proc': dir({
                'version': file(PROC_VERSION),
                'cpuinfo': file(PROC_CPUINFO),
                'meminfo': file(PROC_MEMINFO),
                'uptime': file(function() {
                    const sec = Math.floor((Date.now() - (SD._bootTime || Date.now())) / 1000) + 3600;
                    return `${sec} ${Math.floor(sec * 0.7)}\n`;
                }),
                'loadavg': file(function() {
                    const a = (Math.random() * 0.5 + 0.1).toFixed(2);
                    const b = (Math.random() * 0.5 + 0.1).toFixed(2);
                    const c = (Math.random() * 0.5 + 0.1).toFixed(2);
                    return `${a} ${b} ${c} 2/312 1025\n`;
                }),
                'hostname': file(HOSTNAME_FILE),
            }),
            'dev': dir({
                'null': file('', '-rw-rw-rw-'),
                'zero': file('', '-rw-rw-rw-'),
                'urandom': file('', '-crw-rw-rw-'),
                'tty': file('', '-crw-rw-rw-'),
                'sda': file('', '-brw-rw----', 'root'),
                'sda1': file('', '-brw-rw----', 'root'),
            }),
            'usr': dir({
                'bin': dir({
                    'python3': execFile(''), 'python3.11': execFile(''), 'python': execFile(''),
                    'node': execFile(''), 'npm': execFile(''), 'npx': execFile(''),
                    'pip3': execFile(''), 'pip': execFile(''),
                    'git': execFile(''), 'git-flow': execFile(''),
                    'vim': execFile(''), 'vi': execFile(''), 'nano': execFile(''), 'pico': execFile(''),
                    'ssh': execFile(''), 'ssh-keygen': execFile(''), 'scp': execFile(''), 'sftp': execFile(''),
                    'curl': execFile(''), 'wget': execFile(''), 'lynx': execFile(''), 'w3m': execFile(''),
                    'htop': execFile(''), 'top': execFile(''), 'btop': execFile(''), 'iotop': execFile(''),
                    'man': execFile(''), 'info': execFile(''), 'which': execFile(''), 'whereis': execFile(''),
                    'wc': execFile(''), 'sort': execFile(''), 'uniq': execFile(''),
                    'grep': execFile(''), 'egrep': execFile(''), 'fgrep': execFile(''), 'sed': execFile(''), 'awk': execFile(''),
                    'cut': execFile(''), 'tr': execFile(''), 'tee': execFile(''),
                    'head': execFile(''), 'tail': execFile(''), 'less': execFile(''), 'lesskey': execFile(''),
                    'more': execFile(''), 'most': execFile(''), 'diff': execFile(''), 'patch': execFile(''),
                    'tar': execFile(''), 'gzip': execFile(''), 'gunzip': execFile(''), 'zip': execFile(''),
                    'unzip': execFile(''), 'zcat': execFile(''), 'xz': execFile(''), 'bzip2': execFile(''),
                    'bc': execFile(''), 'cal': execFile(''), 'date': execFile(''), 'dc': execFile(''),
                    'ping': execFile(''), 'ping6': execFile(''), 'traceroute': execFile(''), 'traceroute6': execFile(''),
                    'netstat': execFile(''), 'ss': execFile(''), 'ip': execFile(''), 'route': execFile(''),
                    'hostname': execFile(''), 'hostid': execFile(''), 'domainname': execFile(''),
                    'nmap': execFile(''), 'ncat': execFile(''), 'nc': execFile(''), 'tcpdump': execFile(''),
                    'cowsay': execFile(''), 'fortune': execFile(''), 'sl': execFile(''), 'lolcat': execFile(''),
                    'neofetch': execFile(''), 'screenfetch': execFile(''), 'lsb_release': execFile(''),
                    'file': execFile(''), 'identify': execFile(''), 'strings': execFile(''), 'hexdump': execFile(''),
                    'od': execFile(''), 'xxd': execFile(''), 'base64': execFile(''), 'md5sum': execFile(''),
                    'sha1sum': execFile(''), 'sha256sum': execFile(''), 'sha512sum': execFile(''),
                    'gpg': execFile(''), 'gpg2': execFile(''), 'openssl': execFile(''), 'ssh-keyscan': execFile(''),
                    'make': execFile(''), 'cmake': execFile(''), 'autoconf': execFile(''), 'automake': execFile(''),
                    'gcc': execFile(''), 'g++': execFile(''), 'gdb': execFile(''), 'lldb': execFile(''), 'valgrind': execFile(''),
                    'docker': execFile(''), 'docker-compose': execFile(''),
                    'systemctl': execFile(''), 'journalctl': execFile(''), 'loginctl': execFile(''),
                    'uname': execFile(''), 'uptime': execFile(''), 'w': execFile(''), 'who': execFile(''), 'whoami': execFile(''),
                    'id': execFile(''), 'groups': execFile(''), 'sudo': execFile(''), 'sudoedit': execFile(''),
                    'su': execFile(''), 'login': execFile(''), 'chsh': execFile(''), 'chfn': execFile(''),
                    'passwd': execFile(''), 'userdel': execFile(''), 'usermod': execFile(''),
                    'xargs': execFile(''), 'parallel': execFile(''), 'watch': execFile(''),
                    'seq': execFile(''), 'yes': execFile(''), 'yes': execFile(''), 'env': execFile(''),
                    'timeout': execFile(''), 'nohup': execFile(''), 'nice': execFile(''), 'renice': execFile(''),
                    'curl': execFile(''), 'wget': execFile(''), 'ftp': execFile(''), 'rsync': execFile(''),
                    'apt-get': execFile(''), 'apt': execFile(''), 'apt-cache': execFile(''),
                    'dpkg': execFile(''), 'dpkg-deb': execFile(''), 'dpkg-query': execFile(''),
                    'dmesg': execFile(''), 'lsmod': execFile(''), 'modprobe': execFile(''), 'insmod': execFile(''),
                    'lsof': execFile(''), 'strace': execFile(''), 'ltrace': execFile(''),
                    'free': execFile(''), 'vmstat': execFile(''), 'iostat': execFile(''), 'mpstat': execFile(''),
                }),
                'sbin': dir({
                    'sysctl': execFile(''), 'syslog': execFile(''), 'service': execFile(''),
                    'update-grub': execFile(''), 'grubby': execFile(''),
                    'iptables': execFile(''), 'iptables-save': execFile(''), 'iptables-restore': execFile(''),
                    'ip6tables': execFile(''), 'iptables-apply': execFile(''),
                    'ufw': execFile(''), 'ufw-init': execFile(''),
                    'ldconfig': execFile(''), 'ldd': execFile(''),
                    'hwclock': execFile(''), 'timedatectl': execFile(''),
                    'partprobe': execFile(''), 'blkid': execFile(''), 'fdisk': execFile(''), 'parted': execFile(''),
                    'mkfs': execFile(''), 'mkfs.ext4': execFile(''), 'mkswap': execFile(''), 'fsck': execFile(''),
                    'addgroup': execFile(''), 'adduser': execFile(''), 'delgroup': execFile(''), 'deluser': execFile(''),
                    'update-initramfs': execFile(''), 'mkinitramfs': execFile(''),
                    'cryptsetup': execFile(''), 'lvm': execFile(''),
                    'ethtool': execFile(''), 'iwconfig': execFile(''), 'iw': execFile(''),
                    'wpa_supplicant': execFile(''), 'dhclient': execFile(''),
                }),
                'local': dir({
                    'bin': dir({}),
                    'sbin': dir({}),
                    'lib': dir({}),
                    'lib64': dir({}),
                    'share': dir({
                        'man': dir({}),
                        'doc': dir({}),
                        'applications': dir({}),
                    }),
                    'etc': dir({}),
                    'src': dir({}),
                }),
                'share': dir({
                    'doc': dir({
                        'curl': dir({}),
                        'wget': dir({}),
                        'git': dir({}),
                        'nginx': dir({}),
                        'openssh-client': dir({}),
                        'openssh-server': dir({}),
                    }),
                    'man': dir({
                        'man1': dir({}),
                        'man5': dir({}),
                        'man8': dir({}),
                    }),
                    'info': dir({}),
                    'applications': dir({}),
                    'locale': dir({}),
                    'zoneinfo': dir({
                        'UTC': file('TZif2...'),
                        'America': dir({}),
                        'Europe': dir({}),
                        'Asia': dir({}),
                    }),
                    'terminfo': dir({}),
                    'common-licenses': dir({
                        'GPL': file('GPL License text...'),
                        'LGPL': file('LGPL License text...'),
                        'BSD': file('BSD License text...'),
                        'MIT': file('MIT License text...'),
                    }),
                }),
                'lib': dir({
                    'x86_64-linux-gnu': dir({}),
                    'modules': dir({}),
                    'grub': dir({
                        'x86_64-pc-linux-gnu': dir({}),
                    }),
                    'openssh': dir({}),
                    'nginx': dir({}),
                }),
                'lib64': dir({}),
                'src': dir({
                    'linux-headers-6.6.0': dir({}),
                }),
            }),
            'lib': dir({
                'x86_64-linux-gnu': dir({}),
                'modules': dir({
                    '6.6.0-synth-district': dir({}),
                }),
                'grub': dir({
                    'x86_64-pc-linux-gnu': dir({}),
                }),
                'systemd': dir({
                    'system-generators': dir({}),
                    'user-generators': dir({}),
                }),
            }),
            'lib64': dir({}),
            'opt': dir({
                'applications': dir({}),
                'docker': dir({}),
            }),
            'srv': dir({
                'www': dir({
                    'default': dir({}),
                }),
                'ftp': dir({}),
                'mail': dir({}),
            }),
            'run': dir({
                'sshd.pid': file('1124\n'),
                'user': dir({}, 'drwxr-xr-x', 'root'),
                'systemd': dir({
                    'journal': dir({}, 'drwxr-s---', 'root'),
                }),
                'lock': dir({}, 'drwxrwxr-x', 'root'),
                'mount': dir({}),
            }),
            'boot': dir({
                'vmlinuz': execFile('[kernel image]'),
                'vmlinuz-6.6.0-synth-district': execFile('[kernel image]'),
                'initrd.img': file('[initrd image]'),
                'initrd.img-6.6.0-synth-district': file('[initrd image]'),
                'grub': dir({
                    'grub.cfg': file(() => `# GRUB configuration\nset default=0\nset timeout=5\n\nmenuentry "${SD.config.osName}" {\n    linux /vmlinuz root=/dev/sda1 ro quiet\n    initrd /initrd.img\n}\n`),
                    'fonts': dir({}),
                    'locale': dir({}),
                    'i386-pc': dir({}),
                }),
                'grub.d': dir({
                    '00_header': file(`#!/bin/sh\n`),
                    '10_linux': file(`#!/bin/sh\n`),
                    '30_os-prober': file(`#!/bin/sh\n`),
                    '40_custom': file(`#!/bin/sh\n`),
                }),
            }),
            'media': dir({}, 'drwxr-xr-x', 'root'),
            'mnt': dir({
                'usb': dir({}, 'drwxr-xr-x', 'root'),
                'cdrom': dir({}, 'drwxr-xr-x', 'root'),
                'nfs': dir({}, 'drwxr-xr-x', 'root'),
            }),
            'lost+found': dir({}, 'drwx------', 'root'),
            'sys': dir({
                'firmware': dir({}),
                'devices': dir({}),
                'kernel': dir({
                    'config': file(`CONFIG_64BIT=y\nCONFIG_HAVE_EFFICIENT_UNALIGNED_ACCESS=y\n`),
                }),
            }),
        }, 'drwxr-xr-x', 'root')
    };

    /* ── FS Class ── */

    class FS {
        constructor(tree) {
            this.tree = tree;
            this.cwd = '/home/user';
            this.env = {
                HOME: '/home/user',
                USER: 'user',
                LOGNAME: 'user',
                HOSTNAME: 'synth-district',
                SHELL: '/bin/bash',
                PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                TERM: 'xterm-256color',
                LANG: 'en_US.UTF-8',
                EDITOR: 'nano',
                PAGER: 'less',
                PWD: '/home/user',
                OLDPWD: '/home/user',
            };
        }

        resolve(path) {
            if (!path || path === '') path = '.';
            if (path.startsWith('~/') || path === '~') {
                path = this.env.HOME + path.slice(1);
            }
            if (!path.startsWith('/')) {
                path = this.cwd + '/' + path;
            }
            const parts = path.split('/').filter(p => p !== '');
            const resolved = [];
            for (const part of parts) {
                if (part === '.') continue;
                if (part === '..') { resolved.pop(); }
                else resolved.push(part);
            }
            return '/' + resolved.join('/');
        }

        getNode(absPath) {
            if (absPath === '/') return this.tree['/'];
            const parts = absPath.split('/').filter(p => p !== '');
            let node = this.tree['/'];
            for (const part of parts) {
                if (!node || node.type !== 'dir') return null;
                node = node.children[part];
                if (!node) return null;
            }
            return node;
        }

        _parentAndName(absPath) {
            const parts = absPath.split('/').filter(p => p !== '');
            const name = parts.pop();
            const parentPath = '/' + parts.join('/');
            const parent = this.getNode(parentPath || '/');
            return { parent, name, parentPath: parentPath || '/' };
        }

        readFile(absPath) {
            const node = this.getNode(absPath);
            if (!node) return null;
            if (node.type !== 'file') return null;
            const content = typeof node.content === 'function' ? node.content() : node.content;
            return content;
        }

        writeFile(absPath, content) {
            const { parent, name } = this._parentAndName(absPath);
            if (!parent || parent.type !== 'dir') return false;
            if (parent.children[name] && parent.children[name].type === 'dir') return false;
            parent.children[name] = {
                type: 'file',
                content: content,
                perms: '-rw-r--r--',
                owner: this.env.USER,
                group: this.env.USER,
                mtime: new Date(),
                get size() { return (typeof this.content === 'function' ? this.content() : this.content).length; }
            };
            return true;
        }

        appendFile(absPath, content) {
            const existing = this.readFile(absPath);
            if (existing === null) return this.writeFile(absPath, content);
            return this.writeFile(absPath, existing + content);
        }

        touch(absPath) {
            const node = this.getNode(absPath);
            if (node) { node.mtime = new Date(); return true; }
            return this.writeFile(absPath, '');
        }

        mkdir(absPath, recursive) {
            const { parent, name, parentPath } = this._parentAndName(absPath);
            if (!parent) {
                if (!recursive) return false;
                this.mkdir(parentPath, true);
                return this.mkdir(absPath, false);
            }
            if (parent.type !== 'dir') return false;
            if (parent.children[name]) return parent.children[name].type === 'dir';
            parent.children[name] = {
                type: 'dir',
                children: {},
                perms: 'drwxr-xr-x',
                owner: this.env.USER,
                group: this.env.USER,
                mtime: new Date()
            };
            return true;
        }

        rm(absPath, recursive) {
            const { parent, name } = this._parentAndName(absPath);
            if (!parent || !parent.children[name]) return false;
            const node = parent.children[name];
            if (node.type === 'dir' && Object.keys(node.children).length > 0 && !recursive) return false;
            delete parent.children[name];
            return true;
        }

        cp(srcPath, dstPath) {
            const srcNode = this.getNode(srcPath);
            if (!srcNode) return false;
            const dstNode = this.getNode(dstPath);
            let targetPath = dstPath;
            if (dstNode && dstNode.type === 'dir') {
                const srcName = srcPath.split('/').pop();
                targetPath = dstPath.replace(/\/$/, '') + '/' + srcName;
            }
            const { parent, name } = this._parentAndName(targetPath);
            if (!parent || parent.type !== 'dir') return false;
            parent.children[name] = JSON.parse(JSON.stringify(srcNode));
            return true;
        }

        mv(srcPath, dstPath) {
            if (!this.cp(srcPath, dstPath)) return false;
            this.rm(srcPath, true);
            return true;
        }

        readdir(absPath) {
            const node = this.getNode(absPath);
            if (!node || node.type !== 'dir') return null;
            return Object.entries(node.children).map(([name, n]) => ({
                name,
                node: n
            }));
        }

        find(startPath, predicate, maxDepth, _depth) {
            _depth = _depth || 0;
            if (maxDepth !== undefined && _depth > maxDepth) return [];
            const node = this.getNode(startPath);
            if (!node) return [];
            const results = [];
            if (node.type === 'dir') {
                for (const [name, child] of Object.entries(node.children)) {
                    const childPath = startPath.replace(/\/$/, '') + '/' + name;
                    if (predicate(name, child, childPath)) results.push(childPath);
                    if (child.type === 'dir') {
                        results.push(...this.find(childPath, predicate, maxDepth, _depth + 1));
                    }
                }
            }
            return results;
        }
    }

    SD.FS = FS;

})(window.SynthDistrict);
