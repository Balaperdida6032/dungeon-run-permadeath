// app.js - Punto de Entrada Principal del Juego (Versión Completa e Integrada)
import { 
    auth, db, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, onSnapshot
} from './firebase-config.js';

import { rollDice, getStatModifier } from './dnd-mechanics.js';
import { switchScreen, showCustomModal } from './ui-controller.js';
import { 
    accountData, loadAccountData, addAccountExp, renderAccountUI, renderAchievementsUI, checkAndUnlockAchievement 
} from './account-system.js';
import { 
    currentRoomId, createRoom, joinRoom, attachRoomListener, leaveRoomListener, isReady, setReadyState 
} from './multiplayer-room.js';
import { storyNodes, resolveStoryVote } from './story-system.js';

let currentUser = null;
let currentHeroId = null;
let currentHero = null;

let availablePoints = 5;
let customStats = { str: 10, dex: 10, int: 10 };
let baseStats = { str: 10, dex: 10, int: 10 };

window.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.getElementById('sidebar');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            if (sidebar) sidebar.classList.remove('sidebar-hidden');
            switchScreen('screen-lobby');
            await loadAccountData(user.uid);
            await loadUserCharacters(user.uid);
            listenPublicRooms();
        } else {
            currentUser = null;
            currentHero = null;
            currentHeroId = null;
            if (sidebar) sidebar.classList.add('sidebar-hidden');
            switchScreen('screen-auth');
        }
    });

    // CONTROL DEL NAVBAR LATERAL
    document.getElementById('nav-lobby').addEventListener('click', () => {
        setNavActive('nav-lobby');
        switchScreen('screen-lobby');
    });

    document.getElementById('nav-profile').addEventListener('click', () => {
        setNavActive('nav-profile');
        switchScreen('screen-profile');
        renderAccountUI();
    });

    document.getElementById('nav-achievements').addEventListener('click', () => {
        setNavActive('nav-achievements');
        switchScreen('screen-achievements');
        renderAchievementsUI();
    });

    function setNavActive(btnId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active-nav');
    }

    // AUTH LISTENERS
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

    // CREADOR DE PERSONAJES
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
        availablePoints = (accountData.level >= 7) ? 6 : 5;
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
        document.getElementById('public-rooms-section').style.display = 'none';
        resetStatsForClass("Guerrero");
    });

    document.getElementById('btn-cancel-creator').addEventListener('click', () => {
        document.getElementById('hero-creator').style.display = 'none';
        document.getElementById('btn-show-creator').style.display = 'block';
        if (currentHero) {
            document.getElementById('party-section').style.display = 'block';
            document.getElementById('public-rooms-section').style.display = 'block';
        }
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
            document.getElementById('public-rooms-section').style.display = 'none';
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
        document.getElementById('public-rooms-section').style.display = 'block';
        document.getElementById('active-hero-display').innerHTML = `
            <strong>Héroe Seleccionado:</strong> ${currentHero.name} (${currentHero.clazz})<br>
            Nivel: ${currentHero.level} | HP: ❤️ ${currentHero.hp}/${currentHero.maxHp} | Oro: 🪙 ${currentHero.gold}
        `;
    }

    document.getElementById('btn-change-hero').addEventListener('click', () => {
        currentHero = null; currentHeroId = null;
        document.getElementById('party-section').style.display = 'none';
        document.getElementById('public-rooms-section').style.display = 'none';
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
        let startGold = (accountData.level >= 6) ? 100 : 50;

        const newHero = {
            name, clazz, level: 1, exp: 0, gold: startGold, hp: baseHp, maxHp: baseHp, potions: initialPotions,
            stats: { ...customStats, ac }
        };

        const charactersRef = collection(db, "users", currentUser.uid, "characters");
        const docRef = await addDoc(charactersRef, newHero);
        
        await checkAndUnlockAchievement(currentUser.uid, "first_hero");

        showCustomModal(`¡Personaje ${name} forjado con éxito!`, "✨ HÉROE CREADO", () => {
            document.getElementById('hero-name').value = "";
            document.getElementById('hero-creator').style.display = 'none';
            selectCharacter(docRef.id, newHero);
        });
    });

    // PARTIDAS PÚBLICAS Y LISTENER
    function listenPublicRooms() {
        const roomsRef = collection(db, "rooms");
        onSnapshot(roomsRef, (snapshot) => {
            const listDiv = document.getElementById('public-rooms-list');
            if (!listDiv) return;
            listDiv.innerHTML = "";
            let publicCount = 0;

            snapshot.forEach((docSnap) => {
                const room = docSnap.data();
                const code = docSnap.id;
                if (room.isPublic && room.status === "waiting") {
                    publicCount++;
                    const playerCount = Object.keys(room.players || {}).length;
                    const item = document.createElement('div');
                    item.className = "pixel-box";
                    item.style.padding = "10px";
                    item.style.marginBottom = "8px";
                    item.style.display = "flex";
                    item.style.justifyContent = "space-between";
                    item.style.alignItems = "center";
                    item.innerHTML = `
                        <span>🏰 Sala: <strong>${code}</strong> (${playerCount}/4 Jugadores)</span>
                        <button class="btn-join-public" data-code="${code}" style="margin:0; background-color:#a6e3a1; color:#111;">Unirse</button>
                    `;
                    listDiv.appendChild(item);
                }
            });

            if (publicCount === 0) {
                listDiv.innerHTML = `<p style="color: #6c7086; font-size: 8px;">No hay salas públicas abiertas en este momento.</p>`;
            }

            document.querySelectorAll('.btn-join-public').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
                    const code = e.target.getAttribute('data-code');
                    try {
                        await joinRoom(currentUser, currentHero, code);
                        startCampfireFlow(code);
                    } catch (err) {
                        showCustomModal(err.message);
                    }
                });
            });
        });
    }

    document.getElementById('btn-refresh-rooms').addEventListener('click', listenPublicRooms);

    // CREACIÓN Y UNIÓN DE SALAS
    document.getElementById('btn-create-room').addEventListener('click', async () => {
        if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
        const isPublic = document.getElementById('chk-is-public').checked;
        const code = await createRoom(currentUser, currentHero, isPublic);
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

    // FLUJO DE LA FOGATA
    function startCampfireFlow(code) {
        switchScreen('screen-campfire');
        document.getElementById('campfire-room-code').innerText = code;
        
        attachRoomListener(code, (roomData) => {
            // Comprobar si fui expulsado
            if (roomData.players && !roomData.players[currentUser.uid]) {
                leaveRoomListener();
                switchScreen('screen-lobby');
                showCustomModal("Has sido expulsado de la sala por el host.", "❌ EXPULSADO");
                return;
            }

            if (roomData.status === "exploring") {
                switchScreen('screen-story');
                renderStoryNode(roomData);
            } else if (roomData.status === "fighting") {
                switchScreen('screen-dungeon');
                document.getElementById('room-title').innerText = `MAZMORRA - COMBATE`;
                updateDungeonUI(roomData);
            } else {
                updateCampfireUI(roomData);
            }
        });
    }

    // CAMPAMENTO CON 4 SLOTS FIJOS Y BOTÓN DE KICK
    function updateCampfireUI(room) {
        const partyListDiv = document.getElementById('campfire-party-list');
        const players = room.players || {};
        const playerEntries = Object.entries(players);
        
        let allReady = true;
        let playerCount = playerEntries.length;
        const maxSlots = 4;

        partyListDiv.innerHTML = "";

        for (let i = 0; i < maxSlots; i++) {
            const slotDiv = document.createElement('div');
            
            if (i < playerEntries.length) {
                const [uid, player] = playerEntries[i];
                const isMe = (uid === currentUser.uid);
                const isHost = (room.host === uid);
                const amIHost = (room.host === currentUser.uid);
                
                const readyText = player.ready ? "🟢 LISTO" : "⏳ Esperando...";
                const readyColor = player.ready ? "#a6e3a1" : "#fab387";

                slotDiv.className = "campfire-slot occupied";
                
                let kickButtonHTML = "";
                if (amIHost && !isMe) {
                    kickButtonHTML = `<button class="btn-kick" data-uid="${uid}">❌ Expulsar</button>`;
                }

                slotDiv.innerHTML = `
                    <span>⚔️ <strong>${player.name}</strong> (${player.clazz}) ${isHost ? '👑 [Host]' : ''} ${isMe ? '(Tú)' : ''}</span>
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <span style="color: ${readyColor}; font-weight: bold;">${readyText}</span>
                        ${kickButtonHTML}
                    </div>
                `;

                if (!player.ready) allReady = false;
            } else {
                slotDiv.className = "campfire-slot";
                slotDiv.innerHTML = `<span>💤 [Espacio Vacío - Esperando aventurero...]</span><span>---</span>`;
                allReady = false;
            }

            partyListDiv.appendChild(slotDiv);
        }

        document.querySelectorAll('.btn-kick').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const targetUid = e.target.getAttribute('data-uid');
                await kickPlayerFromRoom(room, targetUid);
            });
        });

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

    async function kickPlayerFromRoom(room, targetUid) {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        delete room.players[targetUid];
        if (room.turnOrder) {
            room.turnOrder = room.turnOrder.filter(id => id !== targetUid);
        }
        await updateDoc(roomRef, { 
            players: room.players,
            turnOrder: room.turnOrder || []
        });
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
        await updateDoc(roomRef, { 
            status: "exploring", 
            currentNode: "start_tavern",
            storyVotes: {},
            turnOrder, 
            activeTurnIndex: 0 
        });
    });

    document.getElementById('btn-leave-campfire').addEventListener('click', async () => {
        leaveRoomListener();
        switchScreen('screen-lobby');
        await loadUserCharacters(currentUser.uid);
    });

    // SISTEMA NARRATIVO Y DE VOTACIÓN
    function renderStoryNode(room) {
        const nodeId = room.currentNode || "start_tavern";
        const node = storyNodes[nodeId];
        if (!node) return;

        document.getElementById('story-title').innerText = node.title;
        document.getElementById('story-text').innerText = node.text;

        const imgEl = document.getElementById('story-image');
        if (node.image) {
            imgEl.src = node.image;
            imgEl.style.display = "block";
        } else {
            imgEl.style.display = "none";
        }

        const optionsContainer = document.getElementById('story-options-container');
        optionsContainer.innerHTML = "";

        const myVote = room.storyVotes ? room.storyVotes[currentUser.uid] : null;

        node.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = "story-option-btn";
            const isSelected = (myVote === idx);
            if (isSelected) {
                btn.style.borderColor = "#a6e3a1";
                btn.style.backgroundColor = "#252538";
            }

            btn.innerText = `${opt.text} ${isSelected ? ' [TU VOTO]' : ''}`;
            btn.addEventListener('click', () => registerStoryVote(idx, room));
            optionsContainer.appendChild(btn);
        });
    }

    async function registerStoryVote(optionIdx, room) {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);

        const storyVotes = room.storyVotes || {};
        storyVotes[currentUser.uid] = optionIdx;

        const totalPlayers = Object.keys(room.players || {}).length;
        const currentVotesCount = Object.keys(storyVotes).length;

        if (currentVotesCount >= totalPlayers) {
            const { selectedIndex, isTie } = resolveStoryVote(storyVotes);
            const currentNode = storyNodes[room.currentNode || "start_tavern"];
            const chosenOption = currentNode.options[selectedIndex];

            let tieText = isTie ? " 🎲 ¡Había un empate y la suerte decidió el camino!" : "";
            
            showCustomModal(
                `La party decidió: "${chosenOption.text}".${tieText}`,
                "🗳️ DECISIÓN TOMADA",
                async () => {
                    await updateDoc(roomRef, { storyVotes: {} });
                    
                    if (chosenOption.nextNode) {
                        if (chosenOption.nextNode.startsWith("start_combat_")) {
                            startCombatFromStory(chosenOption.nextNode, roomRef);
                        } else {
                            await updateDoc(roomRef, { currentNode: chosenOption.nextNode });
                        }
                    } else if (chosenOption.check) {
                        const statVal = currentHero.stats[chosenOption.check] || 10;
                        const mod = getStatModifier(statVal);
                        const d20 = rollDice(20);
                        const total = d20 + mod;

                        if (total >= chosenOption.dc) {
                            showCustomModal(`🎲 Tirada de Chequeo: ${d20}+${mod}=${total} vs CD ${chosenOption.dc}. ¡ÉXITO!`);
                            const next = chosenOption.successNode;
                            if (next.startsWith("start_combat_")) startCombatFromStory(next, roomRef);
                            else await updateDoc(roomRef, { currentNode: next });
                        } else {
                            showCustomModal(`🎲 Tirada de Chequeo: ${d20}+${mod}=${total} vs CD ${chosenOption.dc}. ¡FRACASO!`);
                            const next = chosenOption.failNode;
                            if (next.startsWith("start_combat_")) startCombatFromStory(next, roomRef);
                            else await updateDoc(roomRef, { currentNode: next });
                        }
                    }
                }
            );
        } else {
            await updateDoc(roomRef, { storyVotes });
        }
    }

    async function startCombatFromStory(combatType, roomRef) {
        let enemy = {
            name: "Goblin Asaltante", hp: 45, maxHp: 45, ac: 12, attackBonus: 3, damageDice: 6, expReward: 50, goldReward: 25,
            image: "./assets/sprites/goblin.png"
        };

        if (combatType === "start_combat_rats") {
            enemy = {
                name: "Rata Gigante de las Cloacas", hp: 30, maxHp: 30, ac: 10, attackBonus: 2, damageDice: 4, expReward: 30, goldReward: 10,
                image: "./assets/sprites/rat.png"
            };
        }

        await updateDoc(roomRef, {
            status: "fighting",
            enemy,
            log: [`⚔️ ¡Ha comenzado un combate contra ${enemy.name}!`]
        });
    }

    // COMBATE TÁCTICO POR TURNOS
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

        document.getElementById('potion-count').innerText = currentHero.potions || 0;

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
        logContainer.innerHTML = (room.log || []).map(l => `> ${l}`).join('<br>');
        logContainer.scrollTop = logContainer.scrollHeight;

        if (room.enemy && room.enemy.hp <= 0 && room.status === "fighting") {
            room.status = "victory";
            const expReward = room.enemy.expReward || 50;
            const goldReward = room.enemy.goldReward || 30;
            
            showCustomModal(
                `¡Enemigo derrotado! Te extraes con éxito (+${expReward} EXP Héroe, +${expReward} EXP Cuenta, +${goldReward} Oro).`,
                "🏆 ¡VICTORIA!",
                async () => {
                    await checkAndUnlockAchievement(currentUser.uid, "first_victory");
                    await addAccountExp(currentUser.uid, expReward);
                    leaveDungeonAndReward(expReward, goldReward);
                }
            );
        }
    }

    document.getElementById('btn-action-attack').addEventListener('click', async () => {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        
        const room = roomSnap.data();
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;

        if (turnOrder[activeTurnIndex] !== currentUser.uid) return showCustomModal("Aún no es tu turno.");
        if (!room.enemy || room.enemy.hp <= 0) return showCustomModal("No hay enemigo para atacar.");

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
                        await checkAndUnlockAchievement(currentUser.uid, "first_death");
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

            if (currentHero.gold >= 150) {
                await checkAndUnlockAchievement(currentUser.uid, "gold_hoarder");
            }
            
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