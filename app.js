import { drawDungeonMap, resolveDemocraticMove, executeMove } from './map-system.js';

// Registrar voto de dirección del usuario actual
async function registerMoveVote(direction) {
    if (!currentRoomId) return;
    const roomRef = doc(db, "rooms", currentRoomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const room = roomSnap.data();
    const mapVotes = room.mapVotes || {};
    mapVotes[currentUser.uid] = direction;

    const totalPlayers = Object.keys(room.players || {}).length;
    const currentVotesCount = Object.keys(mapVotes).length;

    // Si todos los jugadores de la sala ya votaron, procesamos la decisión democrática
    if (currentVotesCount >= totalPlayers) {
        const result = resolveDemocraticMove(mapVotes);
        
        let tieText = result.isTie ? " 🎲 ¡Había un empate y se decidió al azar!" : "";
        showCustomModal(
            `La party votó avanzar hacia: ${result.selectedDirection}.${tieText}`,
            "🗳️ DECISIÓN DEMOCRÁTICA",
            async () => {
                // Limpiar los votos para el siguiente turno de movimiento
                await updateDoc(roomRef, { mapVotes: {} });
                
                // Ejecutar el movimiento del grupo en el mapa
                executeMove(result.dx, result.dy, () => {
                    switchScreen('screen-dungeon');
                });
            }
        );
    } else {
        // Guardar voto pendiente en Firestore y notificar que se espera al resto
        await updateDoc(roomRef, { mapVotes });
        showCustomModal(`Voto registrado (${direction}). Esperando que los demás miembros voten...`, "🗳️ VOTO REGISTRADO");
    }
}

// Eventos para los botones del mapa
document.getElementById('btn-move-up').addEventListener('click', () => registerMoveVote('UP'));
document.getElementById('btn-move-down').addEventListener('click', () => registerMoveVote('DOWN'));
document.getElementById('btn-move-left').addEventListener('click', () => registerMoveVote('LEFT'));
document.getElementById('btn-move-right').addEventListener('click', () => registerMoveVote('RIGHT'));