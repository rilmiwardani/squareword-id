/**
 * Web Audio API Sound Effects Engine untuk Squareword ID
 * Tidak memerlukan file audio eksternal dan berfungsi offline secara instan.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setEnabled(val) {
        this.enabled = !!val;
    }

    // Suara ketikan keyboard (soft mechanical click)
    playKey() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320 + Math.random() * 40, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.04);
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    // Suara tombol hapus / backspace
    playDelete() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.05);
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    // Suara saat tebakan salah / kata tidak ada di kamus
    playInvalid() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.setValueAtTime(110, now + 0.08);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {}
    }

    // Suara saat ubin flip dan mengevaluasi tebakan
    playFlip(index = 0) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime + (index * 0.06);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440 + index * 60, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    // Suara ketika pemindaian gelombang (scan wave) melewati tiap baris
    playScanRow(index = 0) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Frekuensi naik perlahan seiring baris turun (C4, D4, E4, F4, G4)
            const freqs = [261.63, 293.66, 329.63, 349.23, 392.00];
            const freq = freqs[index % freqs.length] || 300;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * 1.5, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 0.12);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {}
    }

    // Suara ketika huruf hijau ditemukan
    playGreenChime() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const notes = [587.33, 880, 1174.66]; // D5, A5, D6
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const noteTime = now + (i * 0.05);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.08, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(noteTime);
                osc.stop(noteTime + 0.25);
            });
        } catch (e) {}
    }

    // Suara perayaan saat 1 baris kata tertebak lengkap (5 hijau)
    playRowSolved() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            chord.forEach((freq, idx) => {
                const noteStart = now + (idx * 0.07);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteStart);

                gain.gain.setValueAtTime(0.12, noteStart);
                gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(noteStart);
                osc.stop(noteStart + 0.25);
            });
        } catch (e) {}
    }

    // Suara perayaan saat memenangkan game
    playWin() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const chord = [
                { f: 523.25, d: 0.15 }, // C5
                { f: 659.25, d: 0.15 }, // E5
                { f: 783.99, d: 0.15 }, // G5
                { f: 1046.50, d: 0.35 } // C6
            ];

            chord.forEach((item, idx) => {
                const noteStart = now + (idx * 0.12);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(item.f, noteStart);

                gain.gain.setValueAtTime(0.18, noteStart);
                gain.gain.exponentialRampToValueAtTime(0.001, noteStart + item.d + 0.1);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(noteStart);
                osc.stop(noteStart + item.d + 0.1);
            });
        } catch (e) {}
    }
}

const sounds = new SoundEngine();
