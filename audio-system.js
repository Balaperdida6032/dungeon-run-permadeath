// audio-system.js - Módulo de Integración con VibeVoice TTS
let soundEnabled = true;

export async function speakNarratorText(text, speakerId = 0) {
    if (!soundEnabled || !text) return;

    try {
        // Petición al endpoint compatible (por ejemplo, servidor local de VibeVoice en el puerto 8000)
        const response = await fetch('http://localhost:8000/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "vibevoice-1.5b",
                input: text,
                voice: `speaker_${speakerId}`,
                response_format: "mp3"
            })
        });

        if (!response.ok) throw new Error("Servidor VibeVoice no disponible");

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        await audio.play();
    } catch (error) {
        console.warn("VibeVoice TTS inactivo o desconectado:", error.message);
    }
}

export function toggleSound(status) {
    soundEnabled = status;
}