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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentHero = null;
let currentRoomId = null;
let unsubscribeRoom = null;

// Funciones Auxiliares D&D: Dados y Modificadores
function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function getStatModifier(statScore) {
    return Math.floor((statScore - 10) / 2);
}

window.addEventListener('DOMContentLoaded', () => {

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

    document.getElementById('btn-login').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) return alert("Ingresa tu correo y contraseña.");
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (e) { alert("Error: " + e.message); }
    });

    document.getElementById('btn-register').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) return alert("Ingresa un correo y contraseña.");
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (e) { alert("Error: " + e.message); }
    });

    document.getElementById('btn-google').addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (e) { alert("Error con Google: " + e.message); }
    });

    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

    async function loadHeroData(uid) {
        const heroDocRef = doc(db, "heroes", uid);
        const heroSnap = await getDoc(heroDocRef);
        const heroInfoDiv = document.getElementById('hero-info');
        const heroCreatorDiv = document.getElementById('hero-creator');

        if (heroSnap.exists()) {
            currentHero = heroSnap.data();
            heroCreatorDiv.style.display = 'none';
            
            // Asignación de Stats según Clase si es versión previa
            if (!currentHero.stats) {
                if (currentHero.clazz === "Guerrero") currentHero.stats = { str: 16, dex: 12, int: 8, ac: 15 };
                else if (currentHero.clazz === "Mago") currentHero.stats = { str: 8, dex: 14, int: 16, ac: 12 };
                else currentHero.stats = { str: 10, dex: 16, int: 12, ac: 14 }; // Pícaro
            }

            heroInfoDiv.innerHTML = `
                <h3>Héroe: ${currentHero.name}</h3>
                <p>Clase: ${currentHero.clazz} | Nivel: ${currentHero.level} | CA: ${currentHero.stats.ac}</p>
                <p>STR: ${currentHero.stats.str} | DEX: ${currentHero.stats.dex} | INT: ${currentHero.stats.int}</p>
                <p>EXP: ${currentHero.exp} / ${currentHero.level * 100} | Oro: 🪙 ${currentHero.gold}</p>
            `;
            document.getElementById('potion-count').innerText = currentHero.potions || 0;
        } else {
            heroCreatorDiv.style.display = 'block';
            heroInfoDiv.innerHTML = `<p class="text-danger">¡No tienes héroe activo! Si moriste, forja uno nuevo.</p>`;
        }
    }

    document.getElementById('btn-create-hero').addEventListener('click', async () => {
        const name = document.getElementById('hero-name').value.trim();
        const clazz = document.getElementById('hero-class').value;
        if (!name) return alert("Escribe un nombre para tu héroe.");

        let stats = { str: 10, dex: 10, int: 10, ac: 10 };
        if (clazz === "Guerrero") stats = { str: 16, dex: 12, int: 8, ac: 15 };
        else if (clazz === "Mago") stats = { str: 8, dex: 14, int: 16, ac: 12 };
        else if (clazz === "Pícaro") stats = { str: 10, dex: 16, int: 12, ac: 14 };

        const newHero = {
            name,
            clazz,
            level: 1,
            exp: 0,
            gold: 50,
            hp: 100,
            maxHp: 100,
            potions: 3,
            stats
        };

        await setDoc(doc(db, "heroes", currentUser.uid), newHero);
        await loadHeroData(currentUser.uid);
    });

    document.getElementById('btn-create-room').addEventListener('click', async () => {
        if (!currentHero) return alert("Necesitas forjar un héroe primero.");
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const roomData = {
            host: currentUser.uid,
            status: "fighting",
            enemy: { name: "Rey Esqueleto", hp: 120, maxHp: 120, ac: 14, attackBonus: 4, damageDice: 8 },
            log: ["La party ha descendido a las sombras de la mazmorra..."]
        };

        await setDoc(doc(db, "rooms", roomCode), roomData);
        joinRoomListener(roomCode);
    });

    document.getElementById('btn-join-room').addEventListener('click', async () => {
        if (!currentHero) return alert("Necesitas forjar un héroe primero.");
        const code = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!code) return alert("Introduce un código de sala válido.");

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return alert("La sala no existe.");

        joinRoomListener(code);
    });

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
        const hasEnemy = room.enemy && room.enemy.hp > 0;

        // Deshabilitar/Habilitar acciones si hay enemigo presente
        document.getElementById('btn-action-attack').disabled = !hasEnemy;
        document.getElementById('btn-action-skill').disabled = !hasEnemy;

        if (hasEnemy) {
            const enemyHpPct = (room.enemy.hp / room.enemy.maxHp) * 100;
            document.getElementById('enemy-name').innerText = `${room.enemy.name} (CA: ${room.enemy.ac})`;
            document.getElementById('enemy-hp-bar').style.width = Math.max(0, enemyHpPct) + '%';
            document.getElementById('enemy-hp-text').innerText = `HP: ${Math.max(0, room.enemy.hp)}/${room.enemy.maxHp}`;
        } else {
            document.getElementById('enemy-name').innerText = "Sin enemigo en combate";
            document.getElementById('enemy-hp-bar').style.width = '0%';
            document.getElementById('enemy-hp-text').innerText = `HP: 0/0`;
        }

        const logContainer = document.getElementById('combat-log');
        logContainer.innerHTML = room.log.map(l => `> ${l}`).join('<br>');
        logContainer.scrollTop = logContainer.scrollHeight;

        if (room.enemy.hp <= 0 && room.status === "fighting") {
            room.status = "victory";
            alert("¡Enemigo derrotado! Te extraes con éxito (+50 EXP, +30 Oro).");
            leaveDungeonAndReward(50, 30);
        }
    }

    // ACCIÓN: ATAQUE ESTILO D&D 5e
    document.getElementById('btn-action-attack').addEventListener('click', async () => {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        
        const room = roomSnap.data();
        if (room.enemy.hp <= 0) return alert("No hay ningún enemigo activo para atacar.");

        // 1. Determinar Atributo Clave de Ataque
        let statValue = currentHero.stats.str;
        let weaponDice = 8; // d8 (Guerrero)
        if (currentHero.clazz === "Pícaro") { statValue = currentHero.stats.dex; weaponDice = 6; }
        else if (currentHero.clazz === "Mago") { statValue = currentHero.stats.int; weaponDice = 10; }

        const statMod = getStatModifier(statValue);
        const proficiencyBonus = 2; // Bonificador de competencia nivel 1
        
        // 2. Tirada de Impacto (d20)
        const d20Roll = rollDice(20);
        const totalAttackRoll = d20Roll + statMod + proficiencyBonus;

        if (d20Roll === 1) {
            // Pifia / Fallo Crítico
            room.log.push(`❌ ${currentHero.name} tiró un 1 (¡Pifia!). Su ataque falla miserablemente.`);
        } else if (d20Roll === 20 || totalAttackRoll >= room.enemy.ac) {
            // Acierto Crítico o Impacto Exitoso
            const isCritical = (d20Roll === 20);
            let damage = rollDice(weaponDice) + statMod;
            if (isCritical) damage += rollDice(weaponDice); // Doble dado en crítico
            if (damage < 1) damage = 1;

            room.enemy.hp -= damage;
            const critText = isCritical ? "💥 ¡GOLPE CRÍTICO! " : "";
            room.log.push(`${critText}🎯 ${currentHero.name} tiró ${d20Roll}+${statMod+proficiencyBonus}=${totalAttackRoll} vs CA ${room.enemy.ac}. ¡Impacta e inflige ${damage} de daño!`);
        } else {
            // Fallo por CA alta
            room.log.push(`🛡️ ${currentHero.name} tiró ${d20Roll}+${statMod+proficiencyBonus}=${totalAttackRoll} vs CA ${room.enemy.ac}. El ataque es bloqueado.`);
        }

        // 3. Contraataque del Enemigo (Si sigue vivo)
        if (room.enemy.hp > 0) {
            const enemyD20 = rollDice(20);
            const enemyAttackTotal = enemyD20 + room.enemy.attackBonus;

            if (enemyD20 !== 1 && (enemyD20 === 20 || enemyAttackTotal >= currentHero.stats.ac)) {
                let enemyDamage = rollDice(room.enemy.damageDice) + 2;
                if (enemyD20 === 20) enemyDamage += rollDice(room.enemy.damageDice);
                currentHero.hp -= enemyDamage;
                room.log.push(`👹 ${room.enemy.name} ataca (Tirada: ${enemyAttackTotal} vs tu CA ${currentHero.stats.ac}) e inflige ${enemyDamage} de daño.`);
            } else {
                room.log.push(`🛡️ ${room.enemy.name} intenta atacarte (Tirada: ${enemyAttackTotal} vs tu CA ${currentHero.stats.ac}), pero falló.`);
            }

            // Permadeath
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

    document.getElementById('btn-action-flee').addEventListener('click', () => {
        alert("¡Has huido a salvo de la mazmorra!");
        leaveDungeonAndReward(10, 5);
    });

    async function leaveDungeonAndReward(expGain, goldGain) {
        if (unsubscribeRoom) unsubscribeRoom();

        if (currentHero) {
            currentHero.exp += expGain;
            currentHero.gold += goldGain;
            
            if (currentHero.exp >= currentHero.level * 100) {
                currentHero.level += 1;
                currentHero.maxHp += 20;
                currentHero.hp = currentHero.maxHp;
                if (currentHero.stats) {
                    currentHero.stats.str += 1;
                    currentHero.stats.dex += 1;
                    currentHero.stats.int += 1;
                }
                alert(`¡NIVEL AUMENTADO! Ahora eres nivel ${currentHero.level}`);
            }

            await setDoc(doc(db, "heroes", currentUser.uid), currentHero);
        }

        currentRoomId = null;
        switchScreen('screen-lobby');
        await loadHeroData(currentUser.uid);
    }

    function switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
        document.getElementById(screenId).classList.add('active-screen');
    }
});