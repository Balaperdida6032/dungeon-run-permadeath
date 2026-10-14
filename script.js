// script.js - Lógica principal con Sistema de Turnos Sincronizado
import { 
    auth, db, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc, onSnapshot, deleteDoc, collection, addDoc, getDocs 
} from './firebase-config.js';

import { 
    rollDice, getStatModifier, getRandomEnemyForLevel 
} from './dnd-mechanics.js';

let currentUser = null;
let currentHeroId = null;
let currentHero = null;
let currentRoomId = null;
let unsubscribeRoom = null;
let isReady = false;

let availablePoints = 5;
let customStats = { str: 10, dex: 10, int: 10 };
let baseStats = { str: 10, dex: 10, int: 10 };

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
            await loadUserCharacters(user.uid);
        } else {
            currentUser = null;
            currentHero = null;
            currentHeroId = null;
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

    // UI del Creador
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
        else baseStats = { str: 10, dex: 14, int: 10 };

        customStats = { ...baseStats };
        availablePoints = 5;
        updateStatUI();
    }

    if (classSelect) {
        classSelect.addEventListener('change', (e) => resetStatsForClass(e.target.value));
        resetStatsForClass("Guerrero");
    }

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

    document.getElementById('btn-show-creator').addEventListener('click', () => {
        document.getElementById('hero-creator').style.display = 'block';
        document.getElementById('btn-show-creator').style.display = 'none';
        document.getElementById('party-section').style.display = 'none';
        resetStatsForClass("Guerrero");
    });

    document.getElementById('btn-cancel-creator').addEventListener('click', () => {
        document.getElementById('hero-creator').style.display = 'none';
        document.getElementById('btn-show-creator').style.display = 'block';
        if (currentHero) document.getElementById('party-section').style.display = 'block';
    });

    async function loadUserCharacters(uid) {
        const charactersRef = collection(db, "users", uid, "characters");
        const snapshot = await getDocs(charactersRef);
        const listDiv = document.getElementById('character-list');
        listDiv.innerHTML = "";
        
        if (snapshot.empty) {
            listDiv.innerHTML = `<p style="color: #fab387;">No tienes personajes creados. ¡Forja uno!</p>`;
            document.getElementById('hero-creator').style.display = 'block';
            document.getElementById('btn-show-creator').style.display = 'none';
            document.getElementById('party-section').style.display = 'none';
            return;
        }

        snapshot.forEach((docSnap) => {
            const hero = docSnap.data();
            const heroId = docSnap.id;
            
            const btn = document.createElement('button');
            btn.innerHTML = `⚔️ ${hero.name} (${hero.clazz}) - Nivel ${hero.level} [HP: ${hero.hp}/${hero.maxHp}]`;
            btn.style.marginBottom = "10px";
            btn.style.backgroundColor = "#313244";
            btn.style.color = "#cdd6f4";
            
            btn.addEventListener('click', () => selectCharacter(heroId, hero));
            listDiv.appendChild(btn);
        });
    }

    function selectCharacter(heroId, heroData) {
        currentHeroId = heroId;
        currentHero = heroData;

        document.getElementById('hero-creator').style.display = 'none';
        document.getElementById('btn-show-creator').style.display = 'none';
        document.getElementById('party-section').style.display = 'block';

        document.getElementById('active-hero-display').innerHTML = `
            <strong>Héroe Seleccionado:</strong> ${currentHero.name} (${currentHero.clazz})<br>
            Nivel: ${currentHero.level} | HP: ❤️ ${currentHero.hp}/${currentHero.maxHp} | Oro: 🪙 ${currentHero.gold}
        `;
    }

    document.getElementById('btn-change-hero').addEventListener('click', () => {
        currentHero = null;
        currentHeroId = null;
        document.getElementById('party-section').style.display = 'none';
        document.getElementById('btn-show-creator').style.display = 'block';
        loadUserCharacters(currentUser.uid);
    });

    document.getElementById('btn-create-hero').addEventListener('click', async () => {
        const name = document.getElementById('hero-name').value.trim();
        const clazz = classSelect.value;
        if (!name) return showCustomModal("Escribe un nombre para tu héroe.");

        const dexMod = getStatModifier(customStats.dex);
        let ac = 10 + dexMod;
        if (clazz === "Guerrero") ac += 4;
        else if (clazz === "Pícaro") ac += 2;

        const newHero = {
            name, clazz, level: 1, exp: 0, gold: 50, hp: 100, maxHp: 100, potions: 3,
            stats: { ...customStats, ac }
        };

        const charactersRef = collection(db, "users", currentUser.uid, "characters");
        const docRef = await addDoc(charactersRef, newHero);
        
        showCustomModal(`¡Personaje ${name} forjado con éxito!`, "✨ HÉROE CREADO", () => {
            document.getElementById('hero-name').value = "";
            document.getElementById('hero-creator').style.display = 'none';
            selectCharacter(docRef.id, newHero);
        });
    });

    // CREAR SALA (FOGATA)
    document.getElementById('btn-create-room').addEventListener('click', async () => {
        if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const enemy = getRandomEnemyForLevel(currentHero.level);

        const roomData = {
            host: currentUser.uid,
            status: "campfire",
            enemy: enemy,
            turnOrder: [],
            activeTurnIndex: 0,
            players: {
                [currentUser.uid]: {
                    name: currentHero.name,
                    clazz: currentHero.clazz,
                    hp: currentHero.hp,
                    maxHp: currentHero.maxHp,
                    ready: false
                }
            },
            log: [enemy.introText]
        };

        await setDoc(doc(db, "rooms", roomCode), roomData);
        isReady = false;
        joinCampfireListener(roomCode);
    });

    // UNIRSE A SALA (FOGATA)
    document.getElementById('btn-join-room').addEventListener('click', async () => {
        if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
        const code = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!code) return showCustomModal("Introduce un código de sala válido.");

        const roomRef = doc(db, "rooms", code);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return showCustomModal("La sala no existe.");

        const room = roomSnap.data();
        if (room.status !== "campfire") return showCustomModal("La partida ya ha comenzado.");

        room.players[currentUser.uid] = {
            name: currentHero.name,
            clazz: currentHero.clazz,
            hp: currentHero.hp,
            maxHp: currentHero.maxHp,
            ready: false
        };

        await updateDoc(roomRef, { players: room.players });
        isReady = false;
        joinCampfireListener(code);
    });

    function joinCampfireListener(roomCode) {
        currentRoomId = roomCode;
        switchScreen('screen-campfire');
        document.getElementById('campfire-room-code').innerText = roomCode;
        updateReadyButtonUI();

        unsubscribeRoom = onSnapshot(doc(db, "rooms", roomCode), async (docSnap) => {
            if (!docSnap.exists()) return;
            const room = docSnap.data();

            if (room.status === "fighting") {
                switchScreen('screen-dungeon');
                document.getElementById('room-title').innerText = `MAZMORRA - SALA: ${roomCode}`;
                updateDungeonUI(room);
                return;
            }

            updateCampfireUI(room);
        });
    }

    function updateCampfireUI(room) {
        const partyListDiv = document.getElementById('campfire-party-list');
        const players = room.players || {};
        let allReady = true;
        let playerCount = 0;

        partyListDiv.innerHTML = "";
        for (const [uid, player] of Object.entries(players)) {
            playerCount++;
            const readyText = player.ready ? "🟢 LISTO" : "⏳ Esperando...";
            const readyColor = player.ready ? "#a6e3a1" : "#fab387";

            partyListDiv.innerHTML += `
                <div class="player-card-dungeon" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>⚔️ <strong>${player.name}</strong> (${player.clazz}) ${uid === room.host ? '👑 [Host]' : ''}</span>
                    <span style="color: ${readyColor}; font-weight: bold;">${readyText}</span>
                </div>
            `;

            if (!player.ready) allReady = false;
        }

        const isHost = (room.host === currentUser.uid);
        const startBtn = document.getElementById('btn-start-adventure');

        if (isHost && allReady && playerCount > 0) {
            startBtn.disabled = false;
            startBtn.style.opacity = "1";
        } else {
            startBtn.disabled = true;
            startBtn.style.opacity = "0.5";
        }
    }

    document.getElementById('btn-toggle-ready').addEventListener('click', async () => {
        if (!currentRoomId) return;
        isReady = !isReady;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;

        const room = roomSnap.data();
        if (room.players && room.players[currentUser.uid]) {
            room.players[currentUser.uid].ready = isReady;
            await updateDoc(roomRef, { players: room.players });
            updateReadyButtonUI();
        }
    });

    function updateReadyButtonUI() {
        const btn = document.getElementById('btn-toggle-ready');
        if (isReady) {
            btn.innerText = "✅ ¡ESTÁS LISTO!";
            btn.style.backgroundColor = "#a6e3a1";
        } else {
            btn.innerText = "⏳ Marcarme como LISTO";
            btn.style.backgroundColor = "#f9e2af";
        }
    }

    // Iniciar Aventura: Host define el orden de Turnos de los Héroes
    document.getElementById('btn-start-adventure').addEventListener('click', async () => {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;

        const room = roomSnap.data();
        const turnOrder = Object.keys(room.players); // Lista de UIDs de los jugadores

        await updateDoc(roomRef, { 
            status: "fighting",
            turnOrder: turnOrder,
            activeTurnIndex: 0
        });
    });

    document.getElementById('btn-leave-campfire').addEventListener('click', async () => {
        if (currentRoomId) {
            const roomRef = doc(db, "rooms", currentRoomId);
            const roomSnap = await getDoc(roomRef);
            if (roomSnap.exists()) {
                const room = roomSnap.data();
                if (room.players && room.players[currentUser.uid]) {
                    delete room.players[currentUser.uid];
                    if (room.host === currentUser.uid && Object.keys(room.players).length === 0) {
                        await deleteDoc(roomRef);
                    } else {
                        await updateDoc(roomRef, { players: room.players });
                    }
                }
            }
        }
        if (unsubscribeRoom) unsubscribeRoom();
        currentRoomId = null;
        switchScreen('screen-lobby');
        await loadUserCharacters(currentUser.uid);
    });

    // SISTEMA DE TURNOS Y RENDERIZADO DE MAZMORRA
    function updateDungeonUI(room) {
        const hasEnemy = room.enemy && room.enemy.hp > 0;
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;
        const currentTurnUid = turnOrder[activeTurnIndex];
        const isMyTurn = (currentTurnUid === currentUser.uid);

        // Control estricto de habilitación de botones de acción
        const canAct = hasEnemy && isMyTurn && currentHero.hp > 0;
        document.getElementById('btn-action-attack').disabled = !canAct;
        document.getElementById('btn-action-skill').disabled = !canAct;
        document.getElementById('btn-action-potion').disabled = !canAct;
        document.getElementById('btn-action-flee').disabled = !canAct;

        // Renderizar Héroes y marcar de quién es el turno
        const partyListDiv = document.getElementById('party-members-list');
        partyListDiv.innerHTML = "";
        const players = room.players || {};

        for (const [uid, player] of Object.entries(players)) {
            const isMe = (uid === currentUser.uid);
            const hpToShow = isMe ? currentHero.hp : player.hp;
            const maxHpToShow = player.maxHp || 100;
            const playerHpPct = Math.max(0, (hpToShow / maxHpToShow) * 100);
            const isPlayerTurn = (uid === currentTurnUid);
            const turnBadge = isPlayerTurn ? ' <span style="color: #f9e2af; font-size: 10px;">⚡ [TURNO]</span>' : '';
            const borderStyle = isPlayerTurn ? 'border: 2px solid #f9e2af;' : 'border: 2px solid #45475a;';

            partyListDiv.innerHTML += `
                <div class="player-card-dungeon" style="${borderStyle}">
                    <strong style="color: #a6e3a1;">${player.name} (${player.clazz}) ${isMe ? '(Tú)' : ''}</strong>${turnBadge}
                    <div class="hp-bar-container" style="margin-top: 5px;">
                        <div class="hp-bar-fill" style="width: ${playerHpPct}%;"></div>
                    </div>
                    <small>HP: ${Math.max(0, hpToShow)} / ${maxHpToShow}</small>
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

        // Historial de Combate
        const logContainer = document.getElementById('combat-log');
        logContainer.innerHTML = room.log.map(l => `> ${l}`).join('<br>');
        logContainer.scrollTop = logContainer.scrollHeight;

        // Victoria
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

    // ACCIÓN: ATAQUE Y PASO DE TURNO
    document.getElementById('btn-action-attack').addEventListener('click', async () => {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        
        const room = roomSnap.data();
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;

        // Validar que realmente sea el turno del jugador
        if (turnOrder[activeTurnIndex] !== currentUser.uid) {
            return showCustomModal("Aún no es tu turno.");
        }

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

        // LÓGICA DE ROTACIÓN DE TURNO
        let nextTurnIndex = (activeTurnIndex + 1) % turnOrder.length;

        // Si la ronda volvió al inicio (siguiente índice es 0), le toca atacar al enemigo a la party
        if (nextTurnIndex === 0 && room.enemy.hp > 0) {
            const enemyD20 = rollDice(20);
            const enemyAttackTotal = enemyD20 + room.enemy.attackBonus;

            if (enemyD20 !== 1 && (enemyD20 === 20 || enemyAttackTotal >= currentHero.stats.ac)) {
                let enemyDamage = rollDice(room.enemy.damageDice) + 2;
                if (enemyD20 === 20) enemyDamage += rollDice(room.enemy.damageDice);
                
                currentHero.hp -= enemyDamage;
                if (room.players[currentUser.uid]) room.players[currentUser.uid].hp = currentHero.hp;
                room.log.push(`👹 ${room.enemy.name} contraataca (Tirada: ${enemyAttackTotal}) e inflige ${enemyDamage} de daño a la party.`);
            } else {
                room.log.push(`🛡️ ${room.enemy.name} intenta contraatacar pero su golpe es esquivado.`);
            }

            if (currentHero.hp <= 0) {
                showCustomModal(
                    `💀 ¡${currentHero.name} HA MUERTO! Tu personaje ha sido eliminado permanentemente.`,
                    "☠️ PERMADEATH",
                    async () => {
                        await deleteDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId));
                        if (unsubscribeRoom) unsubscribeRoom();
                        currentRoomId = null;
                        currentHero = null;
                        currentHeroId = null;
                        switchScreen('screen-lobby');
                        await loadUserCharacters(currentUser.uid);
                    }
                );
                return;
            }
        }

        // Guardar el nuevo turno en Firestore
        room.activeTurnIndex = nextTurnIndex;
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

            await setDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId), currentHero);
        }

        currentRoomId = null;
        switchScreen('screen-lobby');
        await loadUserCharacters(currentUser.uid);
    }

    function switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
        document.getElementById(screenId).classList.add('active-screen');
    }
});