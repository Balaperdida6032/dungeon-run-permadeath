// script.js - Lógica principal del Juego y UI
import { 
    auth, db, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc, onSnapshot, deleteDoc 
} from './firebase-config.js';

import { 
    rollDice, getStatModifier, getRandomEnemyForLevel 
} from './dnd-mechanics.js';

let currentUser = null;
let currentHero = null;
let currentRoomId = null;
let unsubscribeRoom = null;

// Puntos de estatísticas configurables en creación
let availablePoints = 5;
let customStats = { str: 10, dex: 10, int: 10 };
let baseStats = { str: 10, dex: 10, int: 10 };

// Función para mostrar el modal personalizado
function showCustomModal(message, title = "DUNGEON RUN", callback = null) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    modal.style.display = 'flex';

    const closeBtn = document.getElementById('btn-modal-close');
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    newCloseBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (callback) callback();
    });
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

    // Auth Handlers
    document.getElementById('btn-login').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) return showCustomModal("Ingresa correo y contraseña.");
        try { await signInWithEmailAndPassword(auth, email, pass); } 
        catch (e) { showCustomModal("Error: " + e.message); }
    });

    document.getElementById('btn-register').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) return showCustomModal("Ingresa correo y contraseña.");
        try { await createUserWithEmailAndPassword(auth, email, pass); } 
        catch (e) { showCustomModal("Error: " + e.message); }
    });

    document.getElementById('btn-google').addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try { await signInWithPopup(auth, provider); } 
        catch (e) { showCustomModal("Error con Google: " + e.message); }
    });

    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

    // Lógica del Creador de Héroes con Puntos Libres
    const classSelect = document.getElementById('hero-class');
    
    function updateStatUI() {
        document.getElementById('stat-points-left').innerText = availablePoints;
        document.getElementById('stat-str').innerText = customStats.str;
        document.getElementById('stat-dex').innerText = customStats.dex;
        document.getElementById('stat-int').innerText = customStats.int;
    }

    function resetStatsForClass(clazz) {
        if (clazz === "Guerrero") baseStats = { str: 14, dex: 12, int: 8 };
        else if (clazz === "Mago") baseStats = { str: 8, dex: 12, int: 14 };
        else baseStats = { str: 10, dex: 14, int: 10 }; // Pícaro

        customStats = { ...baseStats };
        availablePoints = 5;
        updateStatUI();
    }

    if (classSelect) {
        classSelect.addEventListener('change', (e) => resetStatsForClass(e.target.value));
        resetStatsForClass("Guerrero");
    }

    // Botones de incremento/decremento
    setupStatButton('str');
    setupStatButton('dex');
    setupStatButton('int');

    function setupStatButton(stat) {
        document.getElementById(`btn-${stat}-plus`).addEventListener('click', () => {
            if (availablePoints > 0) {
                customStats[stat]++;
                availablePoints--;
                updateStatUI();
            }
        });

        document.getElementById(`btn-${stat}-minus`).addEventListener('click', () => {
            if (customStats[stat] > baseStats[stat]) {
                customStats[stat]--;
                availablePoints++;
                updateStatUI();
            }
        });
    }

    async function loadHeroData(uid) {
        const heroDocRef = doc(db, "heroes", uid);
        const heroSnap = await getDoc(heroDocRef);
        const heroInfoDiv = document.getElementById('hero-info');
        const heroCreatorDiv = document.getElementById('hero-creator');

        if (heroSnap.exists()) {
            currentHero = heroSnap.data();
            heroCreatorDiv.style.display = 'none';
            
            if (!currentHero.stats) {
                currentHero.stats = { str: 12, dex: 12, int: 12, ac: 13 };
            }

            heroInfoDiv.innerHTML = `
                <h3>Héroe: ${currentHero.name}</h3>
                <p>Clase: ${currentHero.clazz} | Nivel: ${currentHero.level} | CA: ${currentHero.stats.ac}</p>
                <p>STR: ${currentHero.stats.str} | DEX: ${currentHero.stats.dex} | INT: ${currentHero.stats.int}</p>
                <p>HP: ❤️ ${currentHero.hp}/${currentHero.maxHp} | EXP: ${currentHero.exp}/${currentHero.level * 100} | Oro: 🪙 ${currentHero.gold}</p>
            `;
            document.getElementById('potion-count').innerText = currentHero.potions || 0;
        } else {
            heroCreatorDiv.style.display = 'block';
            heroInfoDiv.innerHTML = `<p class="text-danger">¡No tienes héroe activo! Si moriste, forja uno nuevo.</p>`;
            resetStatsForClass("Guerrero");
        }
    }

    document.getElementById('btn-create-hero').addEventListener('click', async () => {
        const name = document.getElementById('hero-name').value.trim();
        const clazz = classSelect.value;
        if (!name) return showCustomModal("Escribe un nombre para tu héroe.");

        // Calcular Clase de Armadura (CA) base según Destreza
        const dexMod = getStatModifier(customStats.dex);
        let ac = 10 + dexMod;
        if (clazz === "Guerrero") ac += 4; // Armadura de cota de malla
        else if (clazz === "Pícaro") ac += 2; // Armadura de cuero

        const newHero = {
            name, clazz, level: 1, exp: 0, gold: 50, hp: 100, maxHp: 100, potions: 3,
            stats: { ...customStats, ac }
        };

        await setDoc(doc(db, "heroes", currentUser.uid), newHero);
        await loadHeroData(currentUser.uid);
    });

    document.getElementById('btn-create-room').addEventListener('click', async () => {
        if (!currentHero) return showCustomModal("Necesitas forjar un héroe primero.");
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const enemy = getRandomEnemyForLevel(currentHero.level);

        const roomData = {
            host: currentUser.uid,
            status: "fighting",
            enemy: enemy,
            log: [enemy.introText]
        };

        await setDoc(doc(db, "rooms", roomCode), roomData);
        joinRoomListener(roomCode);
    });

    document.getElementById('btn-join-room').addEventListener('click', async () => {
        if (!currentHero) return showCustomModal("Necesitas forjar un héroe primero.");
        const code = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!code) return showCustomModal("Introduce un código de sala válido.");

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return showCustomModal("La sala no existe.");

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

        document.getElementById('btn-action-attack').disabled = !hasEnemy;
        document.getElementById('btn-action-skill').disabled = !hasEnemy;

        // Renderizar Vida del Jugador Actual en la Party
        const partyListDiv = document.getElementById('party-members-list');
        if (currentHero) {
            const playerHpPct = Math.max(0, (currentHero.hp / currentHero.maxHp) * 100);
            partyListDiv.innerHTML = `
                <div class="player-card-dungeon">
                    <strong style="color: #a6e3a1;">${currentHero.name} (${currentHero.clazz})</strong>
                    <div class="hp-bar-container" style="margin-top: 5px;">
                        <div class="hp-bar-fill" style="width: ${playerHpPct}%;"></div>
                    </div>
                    <small>HP: ${Math.max(0, currentHero.hp)} / ${currentHero.maxHp}</small>
                </div>
            `;
        }

        // Renderizar Enemigo
        const enemyImg = document.getElementById('enemy-portrait');
        if (hasEnemy) {
            const enemyHpPct = (room.enemy.hp / room.enemy.maxHp) * 100;
            document.getElementById('enemy-name').innerText = `${room.enemy.name} (CA: ${room.enemy.ac})`;
            document.getElementById('enemy-hp-bar').style.width = Math.max(0, enemyHpPct) + '%';
            document.getElementById('enemy-hp-text').innerText = `HP: ${Math.max(0, room.enemy.hp)}/${room.enemy.maxHp}`;
            if (enemyImg) {
                enemyImg.src = room.enemy.image || "";
                enemyImg.style.display = 'block';
            }
        } else {
            document.getElementById('enemy-name').innerText = "Sin enemigo activo";
            document.getElementById('enemy-hp-bar').style.width = '0%';
            document.getElementById('enemy-hp-text').innerText = `HP: 0/0`;
            if (enemyImg) enemyImg.style.display = 'none';
        }

        const logContainer = document.getElementById('combat-log');
        logContainer.innerHTML = room.log.map(l => `> ${l}`).join('<br>');
        logContainer.scrollTop = logContainer.scrollHeight;

        if (room.enemy.hp <= 0 && room.status === "fighting") {
            room.status = "victory";
            const expReward = room.enemy.expReward || 50;
            const goldReward = room.enemy.goldReward || 30;
            
            showCustomModal(
                `¡Enemigo derrotado! Te extraes con éxito de la mazmorra (+${expReward} EXP, +${goldReward} Oro).`,
                "🏆 ¡VICTORIA!",
                () => leaveDungeonAndReward(expReward, goldReward)
            );
        }
    }

    // Ataque
    document.getElementById('btn-action-attack').addEventListener('click', async () => {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        
        const room = roomSnap.data();
        if (room.enemy.hp <= 0) return showCustomModal("No hay enemigo para atacar.");

        let statValue = currentHero.stats.str;
        let weaponDice = 8;
        if (currentHero.clazz === "Pícaro") { statValue = currentHero.stats.dex; weaponDice = 6; }
        else if (currentHero.clazz === "Mago") { statValue = currentHero.stats.int; weaponDice = 10; }

        const statMod = getStatModifier(statValue);
        const proficiencyBonus = 2;
        
        const d20Roll = rollDice(20);
        const totalAttackRoll = d20Roll + statMod + proficiencyBonus;

        if (d20Roll === 1) {
            room.log.push(`❌ ${currentHero.name} tiró un 1 (¡Pifia!). Su ataque falla.`);
        } else if (d20Roll === 20 || totalAttackRoll >= room.enemy.ac) {
            const isCritical = (d20Roll === 20);
            let damage = rollDice(weaponDice) + statMod;
            if (isCritical) damage += rollDice(weaponDice);
            if (damage < 1) damage = 1;

            room.enemy.hp -= damage;
            const critText = isCritical ? "💥 ¡GOLPE CRÍTICO! " : "";
            room.log.push(`${critText}🎯 ${currentHero.name} tiró ${d20Roll}+${statMod+proficiencyBonus}=${totalAttackRoll} vs CA ${room.enemy.ac}. ¡Impacta e inflige ${damage} de daño!`);
        } else {
            room.log.push(`🛡️ ${currentHero.name} tiró ${d20Roll}+${statMod+proficiencyBonus}=${totalAttackRoll} vs CA ${room.enemy.ac}. El ataque es bloqueado.`);
        }

        // Contraataque
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

            if (currentHero.hp <= 0) {
                showCustomModal(
                    "💀 ¡HAS MUERTO EN LA MAZMORRA! Tu personaje ha sido borrado permanentemente.",
                    "☠️ PERMADEATH",
                    async () => {
                        await deleteDoc(doc(db, "heroes", currentUser.uid));
                        if (unsubscribeRoom) unsubscribeRoom();
                        currentRoomId = null;
                        switchScreen('screen-lobby');
                        await loadHeroData(currentUser.uid);
                    }
                );
                return;
            }
        }

        await updateDoc(roomRef, room);
    });

    document.getElementById('btn-action-flee').addEventListener('click', () => {
        showCustomModal("¡Has huido a salvo con tus ganancias actuales!", "🏃‍♂️ HUIDA EXITOSA", () => {
            leaveDungeonAndReward(10, 5);
        });
    });

    async function leaveDungeonAndReward(expGain, goldGain) {
        if (unsubscribeRoom) unsubscribeRoom();

        if (currentHero && currentHero.hp > 0) {
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
                showCustomModal(`¡NIVEL AUMENTADO! Ahora eres nivel ${currentHero.level}`, "🌟 LEVEL UP");
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