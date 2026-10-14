// app.js - Punto de Entrada Principal del Juego (Modularizado)
import { 
    auth, db, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs 
} from './firebase-config.js';

import { rollDice, getStatModifier } from './dnd-mechanics.js';
import { switchScreen, showCustomModal } from './ui-controller.js';
import { accountData, loadAccountData, addAccountExp } from './account-system.js';
import { 
    currentRoomId, createRoom, joinRoom, attachRoomListener, leaveRoomListener, isReady, setReadyState 
} from './multiplayer-room.js';

let currentUser = null;
let currentHeroId = null;
let currentHero = null;

let availablePoints = 5;
let customStats = { str: 10, dex: 10, int: 10 };
let baseStats = { str: 10, dex: 10, int: 10 };

window.addEventListener('DOMContentLoaded', () => {

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            switchScreen('screen-lobby');
            await loadAccountData(user.uid);
            await loadUserCharacters(user.uid);
        } else {
            currentUser = null;
            currentHero = null;
            currentHeroId = null;
            switchScreen('screen-auth');
        }
    });

    // Auth Listeners
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

    // Lógica Personajes y Puntos
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

    setupStatButton('str'); setupStatButton('dex'); setupStatButton('int');

    function setupStatButton(stat) {
        document.getElementById(`btn-${stat}-plus`).addEventListener('click', () => {
            if (availablePoints > 0) { customStats[stat]++; availablePoints--; updateStatUI(); }
        });
        document.getElementById(`btn-${stat}-minus`).addEventListener('click', () => {
            if (customStats[stat] > baseStats[stat]) { customStats[stat]--; availablePoints++; updateStatUI(); }
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
        currentHero = null; currentHeroId = null;
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

        let initialPotions = (accountData.level >= 2) ? 4 : 3;
        let baseHp = (accountData.level >= 5) ? 120 : 100;

        const newHero = {
            name, clazz, level: 1, exp: 0, gold: 50, hp: baseHp, maxHp: baseHp, potions: initialPotions,
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

    // Crear y Unirse a Salas
    document.getElementById('btn-create-room').addEventListener('click', async () => {
        if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
        const code = await createRoom(currentUser, currentHero);
        startCampfireFlow(code);
    });

    document.getElementById('btn-join-room').addEventListener('click', async () => {
        if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
        const code = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!code) return showCustomModal("Introduce un código de sala válido.");
        try {
            await joinRoom(currentUser, currentHero, code);
            startCampfireFlow(code);
        } catch (e) {
            showCustomModal(e.message);
        }
    });

    function startCampfireFlow(code) {
        switchScreen('screen-campfire');
        document.getElementById('campfire-room-code').innerText = code;
        
        attachRoomListener(code, (roomData) => {
            if (roomData.status === "fighting") {
                switchScreen('screen-dungeon');
                document.getElementById('room-title').innerText = `MAZMORRA - SALA: ${code}`;
                updateDungeonUI(roomData);
            } else {
                updateCampfireUI(roomData);
            }
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
        setReadyState(!isReady);
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;

        const room = roomSnap.data();
        if (room.players && room.players[currentUser.uid]) {
            room.players[currentUser.uid].ready = isReady;
            await updateDoc(roomRef, { players: room.players });
            const btn = document.getElementById('btn-toggle-ready');
            btn.innerText = isReady ? "✅ ¡ESTÁS LISTO!" : "⏳ Marcarme como LISTO";
            btn.style.backgroundColor = isReady ? "#a6e3a1" : "#f9e2af";
        }
    });

    document.getElementById('btn-start-adventure').addEventListener('click', async () => {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;

        const room = roomSnap.data();
        const turnOrder = Object.keys(room.players);
        await updateDoc(roomRef, { status: "fighting", turnOrder, activeTurnIndex: 0 });
    });

    document.getElementById('btn-leave-campfire').addEventListener('click', async () => {
        leaveRoomListener();
        switchScreen('screen-lobby');
        await loadUserCharacters(currentUser.uid);
    });

    function updateDungeonUI(room) {
        const hasEnemy = room.enemy && room.enemy.hp > 0;
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;
        const currentTurnUid = turnOrder[activeTurnIndex];
        const isMyTurn = (currentTurnUid === currentUser.uid);

        const canAct = hasEnemy && isMyTurn && currentHero.hp > 0;
        document.getElementById('btn-action-attack').disabled = !canAct;
        document.getElementById('btn-action-skill').disabled = !canAct;
        document.getElementById('btn-action-potion').disabled = !canAct;
        document.getElementById('btn-action-flee').disabled = !canAct;

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
                `¡Enemigo derrotado! Te extraes con éxito (+${expReward} EXP Héroe, +${expReward} EXP Cuenta, +${goldReward} Oro).`,
                "🏆 ¡VICTORIA!",
                async () => {
                    await addAccountExp(currentUser.uid, expReward);
                    leaveDungeonAndReward(expReward, goldReward);
                }
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
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;

        if (turnOrder[activeTurnIndex] !== currentUser.uid) return showCustomModal("Aún no es tu turno.");
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
            if (accountData.level >= 4) damage += 2;
            if (damage < 1) damage = 1;

            room.enemy.hp -= damage;
            const critText = isCritical ? "💥 ¡GOLPE CRÍTICO! " : "";
            room.log.push(`${critText}🎯 ${currentHero.name} tiró ${d20Roll}+${statMod+proficiencyBonus}=${totalAttackRoll} vs CA ${room.enemy.ac}. ¡Impacta e inflige ${damage} de daño!`);
        } else {
            room.log.push(`🛡️ ${currentHero.name} tiró ${d20Roll}+${statMod+proficiencyBonus}=${totalAttackRoll} vs CA ${room.enemy.ac}. El ataque es bloqueado.`);
        }

        let nextTurnIndex = (activeTurnIndex + 1) % turnOrder.length;

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
                const consolationExp = 25;
                showCustomModal(
                    `💀 ¡${currentHero.name} HA MUERTO! Tu héroe ha sido eliminado permanentemente, pero su valentía le otorga +${consolationExp} EXP a tu CUENTA.`,
                    "☠️ PERMADEATH",
                    async () => {
                        await addAccountExp(currentUser.uid, consolationExp);
                        await deleteDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId));
                        leaveRoomListener();
                        currentHero = null;
                        currentHeroId = null;
                        switchScreen('screen-lobby');
                        await loadUserCharacters(currentUser.uid);
                    }
                );
                return;
            }
        }

        room.activeTurnIndex = nextTurnIndex;
        await updateDoc(roomRef, room);
    });

    document.getElementById('btn-action-flee').addEventListener('click', () => {
        showCustomModal("¡Has huido a salvo con tus ganancias actuales!", "🏃‍♂️ HUIDA EXITOSA", () => {
            leaveDungeonAndReward(10, 5);
        });
    });

    async function leaveDungeonAndReward(expGain, goldGain) {
        leaveRoomListener();

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
                showCustomModal(`¡NIVEL DE HÉROE AUMENTADO! Ahora eres nivel ${currentHero.level}`, "🌟 LEVEL UP");
            }

            await setDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId), currentHero);
        }

        switchScreen('screen-lobby');
        await loadUserCharacters(currentUser.uid);
    }
});