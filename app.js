// app.js - Punto de Entrada Principal del Juego (Versión Final Definitiva)
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
    currentRoomId, createRoom, joinRoom, attachRoomListener, leaveRoom, isReady, setReadyState 
} from './multiplayer-room.js';
import { storyNodes, resolveStoryVote, getDynamicImageForText } from './story-system.js';
import { speakNarratorText, toggleAudioSystem, repeatLastSpeech } from './audio-system.js';

let currentUser = null;
let currentHeroId = null;
let currentHero = null;

let availablePoints = 5;
let customStats = { str: 10, dex: 10, int: 10 };
let baseStats = { str: 10, dex: 10, int: 10 };
let typingTimer = null;

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

    // CONTROLES DE AUDIO
    safeAddEvent('btn-toggle-audio', 'click', () => {
        const isNowOn = toggleAudioSystem();
        const btn = document.getElementById('btn-toggle-audio');
        if (btn) {
            btn.innerText = isNowOn ? "🔊 Voz: ON" : "🔇 Voz: OFF";
            btn.style.backgroundColor = isNowOn ? "#a6e3a1" : "#f38ba8";
        }
    });

    safeAddEvent('btn-speak-narrator', 'click', () => {
        repeatLastSpeech();
    });

    // NAVBAR
    safeAddEvent('nav-lobby', 'click', () => {
        setNavActive('nav-lobby');
        switchScreen('screen-lobby');
    });

    safeAddEvent('nav-profile', 'click', () => {
        setNavActive('nav-profile');
        switchScreen('screen-profile');
        renderAccountUI();
    });

    safeAddEvent('nav-achievements', 'click', () => {
        setNavActive('nav-achievements');
        switchScreen('screen-achievements');
        renderAchievementsUI();
    });

    function setNavActive(btnId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active-nav');
    }

    // AUTH
    safeAddEvent('btn-login', 'click', async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) return showCustomModal("Ingresa correo y contraseña.");
        try { await signInWithEmailAndPassword(auth, email, pass); } 
        catch (e) { showCustomModal("Error: " + e.message); }
    });

    safeAddEvent('btn-register', 'click', async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) return showCustomModal("Ingresa correo y contraseña.");
        try { await createUserWithEmailAndPassword(auth, email, pass); } 
        catch (e) { showCustomModal("Error: " + e.message); }
    });

    safeAddEvent('btn-google', 'click', async () => {
        const provider = new GoogleAuthProvider();
        try { await signInWithPopup(auth, provider); } 
        catch (e) { showCustomModal("Error con Google: " + e.message); }
    });

    safeAddEvent('btn-logout', 'click', () => signOut(auth));

    // CREADOR Y STATS
    const classSelect = document.getElementById('hero-class');
    function updateStatUI() {
        safeSetText('stat-points-left', availablePoints);
        safeSetText('stat-str', customStats.str);
        safeSetText('stat-dex', customStats.dex);
        safeSetText('stat-int', customStats.int);
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
        safeAddEvent(`btn-${stat}-plus`, 'click', () => {
            if (availablePoints > 0) { customStats[stat]++; availablePoints--; updateStatUI(); }
        });
        safeAddEvent(`btn-${stat}-minus`, 'click', () => {
            if (customStats[stat] > baseStats[stat]) { customStats[stat]--; availablePoints++; updateStatUI(); }
        });
    }

    function showLobbyView(viewName) {
        const viewChar = document.getElementById('lobby-view-character');
        const viewAdv = document.getElementById('lobby-view-adventure');
        
        if (viewName === 'character') {
            if (viewChar) viewChar.style.display = 'block';
            if (viewAdv) viewAdv.style.display = 'none';
        } else {
            if (viewChar) viewChar.style.display = 'none';
            if (viewAdv) viewAdv.style.display = 'block';
        }
    }

    safeAddEvent('btn-show-creator', 'click', () => {
        const creator = document.getElementById('hero-creator');
        const showCreatorBtn = document.getElementById('btn-show-creator');
        if (creator) creator.style.display = 'block';
        if (showCreatorBtn) showCreatorBtn.style.display = 'none';
        resetStatsForClass("Guerrero");
    });

    safeAddEvent('btn-cancel-creator', 'click', () => {
        const creator = document.getElementById('hero-creator');
        const showCreatorBtn = document.getElementById('btn-show-creator');
        if (creator) creator.style.display = 'none';
        if (showCreatorBtn) showCreatorBtn.style.display = 'block';
    });

    async function loadUserCharacters(uid) {
        const charactersRef = collection(db, "users", uid, "characters");
        const snapshot = await getDocs(charactersRef);
        const listDiv = document.getElementById('character-list');
        if (!listDiv) return;
        listDiv.innerHTML = "";
        
        const creator = document.getElementById('hero-creator');
        const showCreatorBtn = document.getElementById('btn-show-creator');

        if (snapshot.empty) {
            listDiv.innerHTML = `<p style="color: #fab387;">No tienes personajes creados. ¡Forja uno!</p>`;
            if (creator) creator.style.display = 'block';
            if (showCreatorBtn) showCreatorBtn.style.display = 'none';
            showLobbyView('character');
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

        showLobbyView('character');
    }

    function selectCharacter(heroId, heroData) {
        currentHeroId = heroId;
        currentHero = heroData;
        showLobbyView('adventure');

        const activeHeroDisplay = document.getElementById('active-hero-display');
        if (activeHeroDisplay) {
            activeHeroDisplay.innerHTML = `
                <strong>Héroe Activo:</strong> ${currentHero.name} (${currentHero.clazz})<br>
                Nivel: ${currentHero.level} | HP: ❤️ ${currentHero.hp}/${currentHero.maxHp} | Oro: 🪙 ${currentHero.gold}
            `;
        }
    }

    safeAddEvent('btn-change-hero', 'click', () => {
        currentHero = null; 
        currentHeroId = null;
        const creator = document.getElementById('hero-creator');
        const showCreatorBtn = document.getElementById('btn-show-creator');
        if (creator) creator.style.display = 'none';
        if (showCreatorBtn) showCreatorBtn.style.display = 'block';
        loadUserCharacters(currentUser.uid);
    });

    safeAddEvent('btn-create-hero', 'click', async () => {
        const nameInput = document.getElementById('hero-name');
        const name = nameInput ? nameInput.value.trim() : "";
        const clazz = classSelect ? classSelect.value : "Guerrero";
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
            if (nameInput) nameInput.value = "";
            const creator = document.getElementById('hero-creator');
            if (creator) creator.style.display = 'none';
            selectCharacter(docRef.id, newHero);
        });
    });

    // SALAS PÚBLICAS
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
                        <span>🏰 Sala: <strong>${code}</strong> (${playerCount}/4)</span>
                        <button class="btn-join-public" data-code="${code}" style="margin:0; background-color:#a6e3a1; color:#111;">Unirse</button>
                    `;
                    listDiv.appendChild(item);
                }
            });

            if (publicCount === 0) {
                listDiv.innerHTML = `<p style="color: #6c7086; font-size: 8px;">No hay salas públicas abiertas.</p>`;
            }

            document.querySelectorAll('.btn-join-public').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
                    const code = e.target.getAttribute('data-code');
                    try {
                        await joinRoom(currentUser, currentHero, code);
                        startCampfireFlow(code, false);
                    } catch (err) {
                        showCustomModal(err.message);
                    }
                });
            });
        });
    }

    safeAddEvent('btn-refresh-rooms', 'click', listenPublicRooms);

    // PARTIDA SOLITARIO
    safeAddEvent('btn-create-solo', 'click', async () => {
        if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
        try {
            const code = await createRoom(currentUser, currentHero, false);
            const roomRef = doc(db, "rooms", code);
            await updateDoc(roomRef, { 
                status: "exploring", 
                currentNode: "start_tavern",
                storyVotes: {},
                turnOrder: [currentUser.uid], 
                activeTurnIndex: 0 
            });
            startCampfireFlow(code, true);
        } catch (e) {
            showCustomModal("Error: " + e.message);
        }
    });

    // MULTIJUGADOR
    safeAddEvent('btn-create-multi', 'click', async () => {
        if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
        try {
            const pubCheckbox = document.getElementById('chk-is-public');
            const isPublic = pubCheckbox ? pubCheckbox.checked : true;
            const code = await createRoom(currentUser, currentHero, isPublic);
            startCampfireFlow(code, false);
        } catch (e) {
            showCustomModal("Error: " + e.message);
        }
    });

    safeAddEvent('btn-join-room', 'click', async () => {
        if (!currentHero) return showCustomModal("Selecciona un personaje primero.");
        const roomInput = document.getElementById('room-code-input');
        const code = roomInput ? roomInput.value.trim().toUpperCase() : "";
        if (!code) return showCustomModal("Introduce un código válido.");
        try {
            await joinRoom(currentUser, currentHero, code);
            startCampfireFlow(code, false);
        } catch (e) {
            showCustomModal(e.message);
        }
    });

    function startCampfireFlow(code, isSolo = false) {
        attachRoomListener(code, (roomData) => {
            if (!roomData) return;

            if (roomData.players && !roomData.players[currentUser.uid]) {
                leaveRoom(currentUser.uid);
                switchScreen('screen-lobby');
                showLobbyView('adventure');
                showCustomModal("Has sido expulsado de la sala.", "❌ EXPULSADO");
                return;
            }

            if (roomData.status === "exploring") {
                switchScreen('screen-story');
                renderStoryNode(roomData, isSolo);
            } else if (roomData.status === "fighting") {
                switchScreen('screen-dungeon');
                safeSetText('room-title', "MAZMORRA - COMBATE");
                updateDungeonUI(roomData);
            } else {
                switchScreen('screen-campfire');
                safeSetText('campfire-room-code', code);
                updateCampfireUI(roomData);
            }
        });
    }

    function updateCampfireUI(room) {
        const partyListDiv = document.getElementById('campfire-party-list');
        if (!partyListDiv) return;

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
                slotDiv.innerHTML = `<span>💤 [Espacio Vacío]</span><span>---</span>`;
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
        if (startBtn) {
            if (isHost && allReady && playerCount > 0) {
                startBtn.disabled = false;
                startBtn.style.opacity = "1";
            } else {
                startBtn.disabled = true;
                startBtn.style.opacity = "0.5";
            }
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

    safeAddEvent('btn-toggle-ready', 'click', async () => {
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
            if (btn) {
                btn.innerText = isReady ? "✅ ¡ESTÁS LISTO!" : "⏳ Marcarme como LISTO";
                btn.style.backgroundColor = isReady ? "#a6e3a1" : "#f9e2af";
            }
        }
    });

    safeAddEvent('btn-start-adventure', 'click', async () => {
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

    safeAddEvent('btn-leave-campfire', 'click', async () => {
        await leaveRoom(currentUser.uid);
        switchScreen('screen-lobby');
        showLobbyView('adventure');
    });

    // NARRATIVA CON MÁQUINA DE ESCRIBIR E IMÁGENES DINÁMICAS
    function renderStoryNode(room, isSolo = false) {
        const nodeId = room.currentNode || "start_tavern";
        const node = storyNodes[nodeId];
        if (!node) return;

        if (typingTimer) clearInterval(typingTimer);

        safeSetText('story-title', node.title);
        
        const textElement = document.getElementById('story-text');
        const imgEl = document.getElementById('story-image');
        
        if (imgEl) {
            imgEl.src = node.defaultImage || "./assets/sprites/Campfire_4x.png";
            imgEl.style.display = "block";
        }

        if (textElement) {
            textElement.innerText = "";
            let charIndex = 0;
            const fullText = node.text;

            // Disparar síntesis de voz automática
            speakNarratorText(fullText, 0);

            typingTimer = setInterval(() => {
                if (charIndex < fullText.length) {
                    textElement.innerText += fullText.charAt(charIndex);
                    charIndex++;

                    if (imgEl) {
                        const currentShownText = textElement.innerText;
                        const dynamicImg = getDynamicImageForText(currentShownText, node.defaultImage);
                        if (!imgEl.src.endsWith(dynamicImg)) {
                            imgEl.src = dynamicImg;
                        }
                    }
                } else {
                    clearInterval(typingTimer);
                }
            }, 25);
        }

        const optionsContainer = document.getElementById('story-options-container');
        if (!optionsContainer) return;
        optionsContainer.innerHTML = "";

        const myVote = room.storyVotes ? room.storyVotes[currentUser.uid] : null;
        const votesHeader = document.getElementById('story-votes-header');
        if (votesHeader) {
            votesHeader.innerText = isSolo ? "¿Qué acción vas a tomar?" : "¿Qué decidirá la party? (Votación)";
        }

        node.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = "story-option-btn";
            const isSelected = (myVote === idx);
            if (isSelected) {
                btn.style.borderColor = "#a6e3a1";
                btn.style.backgroundColor = "#252538";
            }

            btn.innerText = `${opt.text} ${isSelected && !isSolo ? ' [TU VOTO]' : ''}`;
            btn.addEventListener('click', () => registerStoryVote(idx, room, isSolo));
            optionsContainer.appendChild(btn);
        });
    }

    async function registerStoryVote(optionIdx, room, isSolo = false) {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);

        const storyVotes = room.storyVotes || {};
        storyVotes[currentUser.uid] = optionIdx;

        const totalPlayers = Object.keys(room.players || {}).length;
        const currentVotesCount = Object.keys(storyVotes).length;

        if (isSolo || currentVotesCount >= totalPlayers) {
            const { selectedIndex, isTie } = resolveStoryVote(storyVotes);
            const currentNode = storyNodes[room.currentNode || "start_tavern"];
            const chosenOption = currentNode.options[selectedIndex];

            let tieText = (isTie && !isSolo) ? " 🎲 ¡Empate y decidió el destino!" : "";
            
            showCustomModal(
                isSolo ? `Elegiste: "${chosenOption.text}".` : `La party decidió: "${chosenOption.text}".${tieText}`,
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
                            showCustomModal(`🎲 Tirada: ${d20}+${mod}=${total} vs CD ${chosenOption.dc}. ¡ÉXITO!`);
                            const next = chosenOption.successNode;
                            if (next.startsWith("start_combat_")) startCombatFromStory(next, roomRef);
                            else await updateDoc(roomRef, { currentNode: next });
                        } else {
                            showCustomModal(`🎲 Tirada: ${d20}+${mod}=${total} vs CD ${chosenOption.dc}. ¡FRACASO!`);
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
            log: [`⚔️ ¡Combate iniciado contra ${enemy.name}!`]
        });
    }

    function updateDungeonUI(room) {
        const hasEnemy = room.enemy && room.enemy.hp > 0;
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;
        const currentTurnUid = turnOrder[activeTurnIndex];
        const isMyTurn = (currentTurnUid === currentUser.uid);

        const canAct = hasEnemy && isMyTurn && currentHero.hp > 0;
        
        const btnAtk = document.getElementById('btn-action-attack');
        const btnSk = document.getElementById('btn-action-skill');
        const btnPot = document.getElementById('btn-action-potion');
        const btnFl = document.getElementById('btn-action-flee');

        if (btnAtk) btnAtk.disabled = !canAct;
        if (btnSk) btnSk.disabled = !canAct;
        if (btnPot) btnPot.disabled = !canAct;
        if (btnFl) btnFl.disabled = !canAct;

        safeSetText('potion-count', currentHero.potions || 0);

        const partyListDiv = document.getElementById('party-members-list');
        if (partyListDiv) {
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
        }

        const enemyImg = document.getElementById('enemy-portrait');
        if (hasEnemy) {
            const enemyHpPct = (room.enemy.hp / room.enemy.maxHp) * 100;
            safeSetText('enemy-name', `${room.enemy.name} (CA: ${room.enemy.ac})`);
            const hpBar = document.getElementById('enemy-hp-bar');
            if (hpBar) hpBar.style.width = Math.max(0, enemyHpPct) + '%';
            safeSetText('enemy-hp-text', `HP: ${Math.max(0, room.enemy.hp)}/${room.enemy.maxHp}`);
            if (enemyImg) {
                enemyImg.src = room.enemy.image || "";
                enemyImg.style.display = 'block';
            }
        } else {
            safeSetText('enemy-name', "Sin enemigo activo");
            const hpBar = document.getElementById('enemy-hp-bar');
            if (hpBar) hpBar.style.width = '0%';
            safeSetText('enemy-hp-text', `HP: 0/0`);
            if (enemyImg) enemyImg.style.display = 'none';
        }

        const logContainer = document.getElementById('combat-log');
        if (logContainer) {
            logContainer.innerHTML = (room.log || []).map(l => `> ${l}`).join('<br>');
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        if (room.enemy && room.enemy.hp <= 0 && room.status === "fighting") {
            room.status = "victory";
            const expReward = room.enemy.expReward || 50;
            const goldReward = room.enemy.goldReward || 30;
            
            showCustomModal(
                `¡Enemigo derrotado! (+${expReward} EXP, +${goldReward} Oro).`,
                "🏆 ¡VICTORIA!",
                async () => {
                    await checkAndUnlockAchievement(currentUser.uid, "first_victory");
                    await addAccountExp(currentUser.uid, expReward);
                    leaveDungeonAndReward(expReward, goldReward);
                }
            );
        }
    }

    safeAddEvent('btn-action-attack', 'click', async () => {
        if (!currentRoomId) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        
        const room = roomSnap.data();
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;

        if (turnOrder[activeTurnIndex] !== currentUser.uid) return showCustomModal("No es tu turno.");
        if (!room.enemy || room.enemy.hp <= 0) return showCustomModal("No hay enemigo.");

        let statValue = currentHero.stats.str;
        let weaponDice = 8;
        if (currentHero.clazz === "Pícaro") { statValue = currentHero.stats.dex; weaponDice = 6; }
        else if (currentHero.clazz === "Mago") { statValue = currentHero.stats.int; weaponDice = 10; }

        const statMod = getStatModifier(statValue);
        const proficiencyBonus = 2;
        const d20Roll = rollDice(20);
        const totalAttackRoll = d20Roll + statMod + proficiencyBonus;

        if (d20Roll === 1) {
            room.log.push(`❌ ${currentHero.name} pifió su ataque.`);
        } else if (d20Roll === 20 || totalAttackRoll >= room.enemy.ac) {
            const isCritical = (d20Roll === 20);
            let damage = rollDice(weaponDice) + statMod;
            if (isCritical) damage += rollDice(weaponDice);
            if (damage < 1) damage = 1;

            room.enemy.hp -= damage;
            room.log.push(`🎯 ${currentHero.name} impacta e inflige ${damage} de daño.`);
        } else {
            room.log.push(`🛡️ El ataque de ${currentHero.name} es bloqueado.`);
        }

        let nextTurnIndex = (activeTurnIndex + 1) % turnOrder.length;

        if (nextTurnIndex === 0 && room.enemy.hp > 0) {
            const enemyD20 = rollDice(20);
            const enemyAttackTotal = enemyD20 + room.enemy.attackBonus;

            if (enemyD20 !== 1 && (enemyD20 === 20 || enemyAttackTotal >= currentHero.stats.ac)) {
                let enemyDamage = rollDice(room.enemy.damageDice) + 2;
                currentHero.hp -= enemyDamage;
                if (room.players[currentUser.uid]) room.players[currentUser.uid].hp = currentHero.hp;
                room.log.push(`👹 ${room.enemy.name} inflige ${enemyDamage} de daño.`);
            } else {
                room.log.push(`🛡️ El ataque del enemigo falló.`);
            }

            if (currentHero.hp <= 0) {
                showCustomModal(
                    `💀 ¡${currentHero.name} HA MUERTO! Personaje eliminado permanentemente.`,
                    "☠️ PERMADEATH",
                    async () => {
                        await checkAndUnlockAchievement(currentUser.uid, "first_death");
                        await addAccountExp(currentUser.uid, 25);
                        await deleteDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId));
                        await leaveRoom(currentUser.uid);
                        currentHero = null;
                        currentHeroId = null;
                        switchScreen('screen-lobby');
                        showLobbyView('adventure');
                        await loadUserCharacters(currentUser.uid);
                    }
                );
                return;
            }
        }

        room.activeTurnIndex = nextTurnIndex;
        await updateDoc(roomRef, room);
    });

    safeAddEvent('btn-action-flee', 'click', () => {
        showCustomModal("¡Has huido con éxito!", "🏃‍♂️ HUIDA", () => {
            leaveDungeonAndReward(10, 5);
        });
    });

    async function leaveDungeonAndReward(expGain, goldGain) {
        await leaveRoom(currentUser.uid);

        if (currentHero && currentHero.hp > 0) {
            currentHero.exp += expGain;
            currentHero.gold += goldGain;
            if (currentHero.gold >= 150) await checkAndUnlockAchievement(currentUser.uid, "gold_hoarder");
            
            if (currentHero.exp >= currentHero.level * 100) {
                currentHero.level += 1;
                currentHero.maxHp += 20;
                currentHero.hp = currentHero.maxHp;
                showCustomModal(`¡Nivel aumentado a ${currentHero.level}!`, "🌟 LEVEL UP");
            }

            await setDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId), currentHero);
        }

        switchScreen('screen-lobby');
        showLobbyView('adventure');
        await loadUserCharacters(currentUser.uid);
    }
});

function safeAddEvent(elementId, eventType, callback) {
    const el = document.getElementById(elementId);
    if (el) el.addEventListener(eventType, callback);
}

function safeSetText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = text;
}