// multiplayer-room.js - Gestión de Salas, Fogata y Sincronización con Autoeliminación
import { db, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot } from './firebase-config.js';

export let currentRoomId = null;
export let unsubscribeRoom = null;
export let isReady = false;

export function setReadyState(state) {
    isReady = state;
}

export async function createRoom(currentUser, currentHero, isPublic = true) {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    currentRoomId = roomCode;
    isReady = false;

    const roomData = {
        host: currentUser.uid,
        isPublic: isPublic,
        status: "waiting", // waiting, exploring, fighting
        currentNode: "start_tavern",
        turnOrder: [],
        activeTurnIndex: 0,
        storyVotes: {},
        players: {
            [currentUser.uid]: {
                name: currentHero.name,
                clazz: currentHero.clazz,
                hp: currentHero.hp,
                maxHp: currentHero.maxHp,
                ready: false
            }
        },
        log: ["🏕️ La party se ha reunido en la fogata del campamento."]
    };

    await setDoc(doc(db, "rooms", roomCode), roomData);
    return roomCode;
}

export async function joinRoom(currentUser, currentHero, roomCode) {
    const roomRef = doc(db, "rooms", roomCode);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error("La sala con ese código no existe.");

    const room = roomSnap.data();
    if (room.status !== "waiting") throw new Error("La partida ya ha comenzado.");

    const playersCount = Object.keys(room.players || {}).length;
    if (playersCount >= 4 && !room.players[currentUser.uid]) {
        throw new Error("La sala está llena (máximo 4 jugadores).");
    }

    currentRoomId = roomCode;
    isReady = false;

    room.players[currentUser.uid] = {
        name: currentHero.name,
        clazz: currentHero.clazz,
        hp: currentHero.hp,
        maxHp: currentHero.maxHp,
        ready: false
    };

    await updateDoc(roomRef, { players: room.players });
    return roomCode;
}

export async function leaveRoom(currentUserUid) {
    if (!currentRoomId) return;
    const roomRef = doc(db, "rooms", currentRoomId);
    
    try {
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            if (roomData.players && roomData.players[currentUserUid]) {
                delete roomData.players[currentUserUid];
                
                // 🧹 AUTOELIMINACIÓN: Si la sala se queda sin jugadores, se borra de Firestore
                if (Object.keys(roomData.players).length === 0) {
                    await deleteDoc(roomRef);
                } else {
                    // Si el host se fue, transferir el host al primer jugador restante
                    if (roomData.host === currentUserUid) {
                        const remainingUids = Object.keys(roomData.players);
                        roomData.host = remainingUids[0];
                    }
                    await updateDoc(roomRef, { 
                        players: roomData.players,
                        host: roomData.host
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error al abandonar la sala:", e);
    } finally {
        leaveRoomListener();
    }
}

export function leaveRoomListener() {
    if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }
    currentRoomId = null;
    isReady = false;
}

export function attachRoomListener(roomCode, onRoomUpdate) {
    currentRoomId = roomCode;
    const roomRef = doc(db, "rooms", roomCode);
    
    unsubscribeRoom = onSnapshot(roomRef, async (docSnap) => {
        if (docSnap.exists()) {
            const roomData = docSnap.data();
            
            // Verificación de seguridad por si la sala se quedó vacía externamente
            if (!roomData.players || Object.keys(roomData.players).length === 0) {
                await deleteDoc(roomRef).catch(() => {});
                return;
            }
            
            onRoomUpdate(roomData);
        } else {
            // Si la sala fue eliminada, forzar salida del listener
            leaveRoomListener();
        }
    });
}