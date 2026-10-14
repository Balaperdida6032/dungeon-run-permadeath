// Importaciones de los SDKs de Firebase v10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    onSnapshot, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBEcaaWX_6upGHY_2I5cSy3j4XZh50Q410",
    authDomain: "dungeon-run-permadeath.firebaseapp.com",
    projectId: "dungeon-run-permadeath",
    storageBucket: "dungeon-run-permadeath.firebasestorage.app",
    messagingSenderId: "1057265525316",
    appId: "1:1057265525316:web:85276d443ff52ae9b3d211",
    measurementId: "G-J4JGJSCPS8"
};

// Inicializar Firebase y Servicios
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables de estado del juego
let currentUser = null;
let currentHero = null;
let currentRoomId = null;
let unsubscribeRoom = null;

// Inicialización de eventos al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {

    // Observador de Autenticación
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            switchScreen('screen-lobby');
            await loadHeroData(user.uid);
        } else {
            currentUser = null;
            currentHero = null;
            switchScreen('screen-auth');
        }
    });

    // Iniciar Sesión con Email
    document.getElementById('btn-login').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) return alert("Ingresa tu correo y contraseña.");
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (e) { alert("Error: " + e.message); }
    });

    // Registrar Cuenta con Email
    document.getElementById('btn-register').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) return alert("Ingresa un correo y contraseña.");
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (e) { alert("Error: " + e.message); }
    });

    // Iniciar Sesión con Google
    document.getElementById('btn-google').addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (e) { alert("Error con Google: " + e.message); }
    });

    // Cerrar Sesión
    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

    // Cargar datos del héroe desde Firestore
    async function loadHeroData(uid) {
        const heroDocRef = doc(db, "heroes", uid);
        const heroSnap = await getDoc(heroDocRef);
        const heroInfoDiv = document.getElementById('hero-info');
        const heroCreatorDiv = document.getElementById('hero-creator');

        if (heroSnap.exists()) {
            currentHero = heroSnap.data();
            heroCreatorDiv.style.display = 'none';
            heroInfoDiv.innerHTML = `
                <h3>Héroe: ${currentHero.name}</h3>
                <p>Clase: ${currentHero.clazz} | Nivel: ${currentHero.level}</p>
                <p>EXP: ${currentHero.exp} / ${currentHero.level * 100}</p>
                <p>Oro: 🪙 ${currentHero.gold}</p>
            `;
            document.getElementById('potion-count').innerText = currentHero.potions || 0;
        } else {
            heroCreatorDiv.style.display = 'block';
            heroInfoDiv.innerHTML = `<p class="text-danger">¡No tienes héroe activo! Si moriste, forja uno nuevo.</p>`;
        }
    }

    // Crear Héroe
    document.getElementById('btn-create-hero').addEventListener('click', async () => {
        const name = document.getElementById('hero-name').value.trim();
        const clazz = document.getElementById('hero-class').value;
        if (!name) return alert("Escribe un nombre para tu héroe.");

        const newHero = {
            name,
            clazz,
            level: 1,
            exp: 0,
            gold: 50,
            hp: 100,
            maxHp: 100,
            potions: 3
        };

        await setDoc(doc(db, "heroes", currentUser.uid), newHero);
        await loadHeroData(currentUser.uid);
    });

    // Crear Sala Multijugador
    document.getElementById('btn-create-room').addEventListener('click', async () => {
        if (!currentHero) return alert("Necesitas forjar un héroe primero.");
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const roomData = {
            host: currentUser.uid,
            status: "fighting",
            enemy: { name: "Rey Esqueleto", hp: 120, maxHp: 120, attack: 15 },
            log: ["La party ha descendido a las sombras de la mazmorra..."]
        };

        await setDoc(doc(db, "rooms", roomCode), roomData);
        joinRoomListener(roomCode);
    });

    // Unirse a Sala
    document.getElementById('btn-join-room').addEventListener('click', async () => {
        if (!currentHero) return alert("Necesitas forjar un héroe primero.");
        const code = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!code) return alert("Introduce un código de sala válido.");

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return alert("La sala no existe.");

        joinRoomListener(code);
    });

    // Sincronización en Tiempo Real de la Mazmorra
    function joinRoomListener(roomCode) {
        currentRoomId = roomCode;
        switchScreen('screen-dungeon');
        document.getElementById('room-title').innerText = `MAZMORRA - SALA: ${roomCode}`;

        unsubscribeRoom = onSnapshot(doc(db, "rooms", roomCode), async (docSnap) => {
            if (!docSnap.exists()) return;
            const room = docSnap.data();
            updateDungeonUI(room);
        });
    }

    function updateDungeonUI(room) {
        const enemyHpPct = (room.enemy.hp / room.enemy.maxHp) * 100;
        document.getElementById('enemy-name').innerText = room.enemy.name;
        document.getElementById('enemy-hp-bar').style.width = Math.max(0, enemyHpPct) + '%';
        document.getElementById('enemy-hp-text').innerText = `HP: ${Math.max(0, room.enemy.hp)}/${room.enemy.maxHp}`;

        const logContainer = document.getElementById('combat-log');
        logContainer.innerHTML = room.log.map(l => `> ${l}`).join('<br>');
        logContainer.scrollTop = logContainer.scrollHeight;

        // Victoria
        if (room.enemy.hp <= 0) {
            alert("¡Enemigo derrotado! Te extraes con éxito (+50 EXP, +30 Oro).");
            leaveDungeonAndReward(50, 30);
        }
    }

    // Acción: Atacar
    document.getElementById('btn-action-attack').addEventListener('click', async () => {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        
        const room = roomSnap.data();
        const damage = Math.floor(Math.random() * 12) + 12;
        room.enemy.hp -= damage;
        room.log.push(`${currentHero.name} atacó al ${room.enemy.name} inflando ${damage} de daño.`);

        // Ataque del enemigo
        if (room.enemy.hp > 0) {
            const counterDamage = room.enemy.attack;
            currentHero.hp -= counterDamage;
            room.log.push(`${room.enemy.name} te ataca e inflige ${counterDamage} de daño.`);

            // Manejo de Muerte Permanente (Permadeath)
            if (currentHero.hp <= 0) {
                alert("💀 ¡HAS MUERTO EN LA MAZMORRA! Tu personaje ha sido borrado permanentemente.");
                await deleteDoc(doc(db, "heroes", currentUser.uid));
                if (unsubscribeRoom) unsubscribeRoom();
                currentRoomId = null;
                switchScreen('screen-lobby');
                await loadHeroData(currentUser.uid);
                return;
            }
        }

        await updateDoc(roomRef, room);
    });

    // Acción: Huir / Extraerse
    document.getElementById('btn-action-flee').addEventListener('click', () => {
        alert("¡Has huido a salvo de la mazmorra con tus ganancias actuales!");
        leaveDungeonAndReward(10, 5);
    });

    // Retirada exitosa y persistencia de stats
    async function leaveDungeonAndReward(expGain, goldGain) {
        if (unsubscribeRoom) unsubscribeRoom();

        if (currentHero) {
            currentHero.exp += expGain;
            currentHero.gold += goldGain;
            
            // Subida de nivel
            if (currentHero.exp >= currentHero.level * 100) {
                currentHero.level += 1;
                currentHero.maxHp += 20;
                currentHero.hp = currentHero.maxHp;
                alert(`¡NIVEL AUMENTADO! Ahora eres nivel ${currentHero.level}`);
            }

            await setDoc(doc(db, "heroes", currentUser.uid), currentHero);
        }

        currentRoomId = null;
        switchScreen('screen-lobby');
        await loadHeroData(currentUser.uid);
    }

    // Cambiar de pantallas
    function switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
        document.getElementById(screenId).classList.add('active-screen');
    }
});