// multiplayer-room.js - Gestión de Salas, Fogata y Sincronización
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
        status: "waiting",
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
        log: ["🏕️ La party se ha reunido."]
    };

    await setDoc(doc(db, "rooms", roomCode), roomData);
    return roomCode;
}

export async function joinRoom(currentUser, currentHero, roomCode) {
    const roomRef = doc(db, "rooms", roomCode);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error("La sala no existe.");

    const room = roomSnap.data();
    if (room.status !== "waiting") throw new Error("La partida ya ha comenzado.");

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

export function leaveRoomListener() {
    if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }
    currentRoomId = null;
}

export function attachRoomListener(roomCode, onRoomUpdate) {
    currentRoomId = roomCode;
    const roomRef = doc(db, "rooms", roomCode);
    
    unsubscribeRoom = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
            onRoomUpdate(docSnap.data());
        }
    });
}