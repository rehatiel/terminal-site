/* =========================================================
   Configuration — Customize your terminal
   ========================================================= */
'use strict';

(function() {
    window.SynthDistrict = window.SynthDistrict || {};
    const SD = window.SynthDistrict;

    SD.config = {
        // Site name and branding
        siteName: 'Synth District',
        siteUrl: 'https://synthdistrict.dev',

        // Operating system identity
        osName: 'Synth District Linux',
        osVersion: '1.0',
        osCodename: 'Neon',
        kernelName: 'synth-district',

        // System info
        cityName: 'Synth City',
        regionName: 'Neon State',
        companyName: 'Synth Systems Inc.',

        // User defaults
        defaultUsername: 'user',
        defaultUserFullName: 'Synth District User',
        defaultEmail: 'user@synthdistrict.dev',

        // Logo (ASCII art shown on login)
        logo: `<span class="ansi-fg-cyan ansi-bold"> ███████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗</span>
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
<span class="ansi-fg-bright-magenta ansi-bold"> ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝   ╚═╝  </span>`,

        // Get derived values
        getOsPrettyName() {
            return `${this.osName} ${this.osVersion} (${this.osCodename})`;
        },

        getKernelVersion() {
            return `6.6.0-${this.kernelName}`;
        }
    };
})();
