// audio-system.js - Sistema de Síntesis de Voz
let soundEnabled = true;
let lastSpokenText = "";

export function toggleAudioSystem() {
    soundEnabled = !soundEnabled;
    if (!soundEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    return soundEnabled;
}

export function isAudioEnabled() {
    return soundEnabled;
}

export async function speakNarratorText(text, speakerId = 0) {
    if (!soundEnabled || !text) return;
    lastSpokenText = text;

    // Intentar VibeVoice local si estuviera activo
    try {
        const response = await fetch('http://localhost:8000/v1/audio/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "vibevoice-1.5b",
                input: text,
                voice: `speaker_${speakerId}`,
                response_format: "mp3"
            })
        });

        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            await audio.play();
            return;
        }
    } catch (e) {
        // Ignora si no hay servidor local VibeVoice y pasa al respaldo nativo
    }

    // Respaldo robusto con síntesis de voz nativa del navegador
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 0.9;
        
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('es'));
        if (spanishVoice) utterance.voice = spanishVoice;

        window.speechSynthesis.speak(utterance);
    }
}

export function repeatLastSpeech() {
    if (lastSpokenText) {
        speakNarratorText(lastSpokenText);
    }
}