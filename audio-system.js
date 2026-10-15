// audio-system.js - Control de Narración por Voz y Música de Fondo
let synth = window.speechSynthesis;
let isAudioEnabled = true;
let lastSpeechText = "";

let isMusicMuted = false;
let musicVolume = 0.3;

// --- SÍNTESIS DE VOZ (NARRADOR) ---
export function speakNarratorText(text, delay = 0) {
    if (!isAudioEnabled || !synth) return;

    lastSpeechText = text;
    synth.cancel(); // Detener cualquier lectura previa

    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95; // Velocidad ligeramente pausada para ambientación RPG
        utterance.pitch = 0.9; // Tono grave para el narrador

        // Intentar seleccionar una voz en español disponible en el sistema
        const voices = synth.getVoices();
        const spanishVoice = voices.find(v => v.lang.startsWith('es'));
        if (spanishVoice) utterance.voice = spanishVoice;

        synth.speak(utterance);
    }, delay);
}

export function repeatLastSpeech() {
    if (lastSpeechText) {
        speakNarratorText(lastSpeechText);
    }
}

export function toggleAudioSystem() {
    isAudioEnabled = !isAudioEnabled;
    if (!isAudioEnabled && synth) {
        synth.cancel();
    }
    return isAudioEnabled;
}

// --- MÚSICA DE FONDO (TABERNA) ---
export function initBackgroundMusic() {
    const bgAudio = document.getElementById('bg-music');
    const toggleBtn = document.getElementById('btn-toggle-music');
    const volumeSlider = document.getElementById('music-volume');

    if (!bgAudio) return;

    // Configuración inicial del audio
    bgAudio.volume = musicVolume;
    bgAudio.loop = true;

    // Iniciar reproducción tras la primera interacción del usuario (política de navegadores)
    const playAttempt = () => {
        if (!isMusicMuted && bgAudio.paused) {
            bgAudio.play().catch(() => {
                console.log("Esperando interacción del usuario para reproducir audio...");
            });
        }
        document.removeEventListener('click', playAttempt);
        document.removeEventListener('keydown', playAttempt);
    };

    document.addEventListener('click', playAttempt);
    document.addEventListener('keydown', playAttempt);

    // Botón para Activar/Silenciar Música
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isMusicMuted = !isMusicMuted;
            if (isMusicMuted) {
                bgAudio.pause();
                toggleBtn.innerText = "🔇 Música: OFF";
                toggleBtn.style.backgroundColor = "#f38ba8";
            } else {
                bgAudio.play();
                toggleBtn.innerText = "🎵 Música: ON";
                toggleBtn.style.backgroundColor = "#a6e3a1";
            }
        });
    }

    // Slider de control de volumen
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            musicVolume = parseFloat(e.target.value);
            bgAudio.volume = musicVolume;
            if (musicVolume === 0) {
                bgAudio.pause();
            } else if (!isMusicMuted && bgAudio.paused) {
                bgAudio.play();
            }
        });
    }
}