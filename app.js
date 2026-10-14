import { drawDungeonMap, movePlayer, playerPos } from './map-system.js';

// Al comenzar la aventura desde la fogata, abrimos la vista del Mapa primero:
document.getElementById('btn-start-adventure').addEventListener('click', async () => {
    if (!currentRoomId) return;
    const roomRef = doc(db, "rooms", currentRoomId);
    
    // Cambiar vista al Mapa
    switchScreen('screen-map');
    drawDungeonMap();

    await updateDoc(roomRef, { status: "exploring" });
});

// Controles de exploración
document.getElementById('btn-move-up').addEventListener('click', () => handleMove(0, -1));
document.getElementById('btn-move-down').addEventListener('click', () => handleMove(0, 1));
document.getElementById('btn-move-left').addEventListener('click', () => handleMove(-1, 0));
document.getElementById('btn-move-right').addEventListener('click', () => handleMove(1, 0));

function handleMove(dx, dy) {
    movePlayer(dx, dy, () => {
        // Al encontrar un enemigo, cambiamos la vista a la Pantalla de Combate
        showCustomModal("¡Un enemigo te ha emboscado en la mazmorra!", "⚔️ ¡ENCONTRAZO!", () => {
            switchScreen('screen-dungeon');
        });
    });
}