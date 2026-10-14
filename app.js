// app.js - Punto de Entrada Principal (Versión Final Definitiva)
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
import { toggleAudioSystem, repeatLastSpeech } from './audio-system.js';

import { initCharacterManager, loadUserCharacters, showLobbyView, showAttributeSelectorModal, updateActiveHeroDisplay, getCurrentHero, getCurrentHeroId } from './character-ui.js';
import { renderStoryNode } from './story-controller.js';
import { initAuctionSystem } from './auction-system.js';

let currentUser = null;
let currentHero = null;
let currentHeroId = null;

// Exponer funciones globales requeridas por los módulos
window.getCurrentHero = () => currentHero;
window.startCombatFromStory = startCombatFromStory;
window.handleMissionComplete = async () => {
    await checkAndUnlockAchievement(currentUser.uid, "first_victory");
    await addAccountExp(currentUser.uid, 200);
    leaveDungeonAndReward(200, 150);
};

window.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.getElementById('sidebar');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            if (sidebar) sidebar.classList.remove('sidebar-hidden');
            switchScreen('screen-lobby');
            await loadAccountData(user.uid);
            
            initCharacterManager(currentUser, (id, hero) => {
                currentHeroId = id;
                currentHero = hero;
            }, accountData);

            await loadUserCharacters(currentUser, (id, hero) => {
                currentHeroId = id;
                currentHero = hero;
            });

            initAuctionSystem(getCurrentHero, getCurrentHeroId, currentUser, () => {
                updateActiveHeroDisplay(currentUser);
            });

            listenPublicRooms();
        } else {
            currentUser = null;
            currentHero = null;
            currentHeroId = null;
            if (sidebar) sidebar.classList.add('sidebar-hidden');
            switchScreen('screen-auth');
        }
    });

    // PESTAÑAS DE AUTENTICACIÓN (LOGIN / REGISTRO)
    safeAddEvent('link-show-register', 'click', (e) => {
        e.preventDefault();
        const loginBox = document.getElementById('auth-login-box');
        const regBox = document.getElementById('auth-register-box');
        if (loginBox) loginBox.style.display = 'none';
        if (regBox) regBox.style.display = 'block';
    });

    safeAddEvent('btn-back-to-login', 'click', () => {
        const loginBox = document.getElementById('auth-login-box');
        const regBox = document.getElementById('auth-register-box');
        if (regBox) regBox.style.display = 'none';
        if (loginBox) loginBox.style.display = 'block';
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

    safeAddEvent('btn-speak-narrator', 'click', repeatLastSpeech);

    // NAVBAR LATERAL / MÓVIL
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

    safeAddEvent('nav-auction', 'click', () => {
        setNavActive('nav-auction');
        switchScreen('screen-auction');
    });

    function setNavActive(btnId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active-nav');
    }

    // LOGIN CON MANEJO DE ERRORES VISUALES
    safeAddEvent('btn-login', 'click', async () => {
        const email = document.getElementById('auth-login-email').value;
        const pass = document.getElementById('auth-login-password').value;
        const errorBox = document.getElementById('login-error-msg');
        
        if (!email || !pass) {
            if (errorBox) {
                errorBox.innerText = "Por favor, completa todos los campos.";
                errorBox.style.display = "block";
            }
            return;
        }

        try { 
            if (errorBox) errorBox.style.display = "none";
            await signInWithEmailAndPassword(auth, email, pass); 
        } 
        catch (e) { 
            if (errorBox) {
                errorBox.innerText = "Error: Credenciales incorrectas o usuario no encontrado.";
                errorBox.style.display = "block";
            }
        }
    });

    // REGISTRO CON MANEJO DE ERRORES VISUALES
    safeAddEvent('btn-register', 'click', async () => {
        const email = document.getElementById('auth-reg-email').value;
        const pass = document.getElementById('auth-reg-password').value;
        const errorBox = document.getElementById('register-error-msg');
        
        if (!email || !pass) {
            if (errorBox) {
                errorBox.innerText = "Completa correo y contraseña.";
                errorBox.style.display = "block";
            }
            return;
        }

        try { 
            if (errorBox) errorBox.style.display = "none";
            await createUserWithEmailAndPassword(auth, email, pass); 
        } 
        catch (e) { 
            if (errorBox) {
                errorBox.innerText = "Error al registrar: " + e.message;
                errorBox.style.display = "block";
            }
        }
    });

    safeAddEvent('btn-google', 'click', async () => {
        const provider = new GoogleAuthProvider();
        try { await signInWithPopup(auth, provider); } 
        catch (e) { showCustomModal("Error con Google: " + e.message); }
    });

    safeAddEvent('btn-logout', 'click', () => signOut(auth));

    // SALAS PÚBLICAS Y LOBBY
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
            roomData.id = code;

            if (roomData.players && !roomData.players[currentUser.uid]) {
                leaveRoom(currentUser.uid);
                switchScreen('screen-lobby');
                showLobbyView('adventure');
                showCustomModal("Has sido expulsado de la sala.", "❌ EXPULSADO");
                return;
            }

            if (roomData.status === "exploring" || roomData.status === "victory") {
                switchScreen('screen-story');
                renderStoryNode(roomData, currentUser, isSolo);
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

    // COMBATE TÁCTICO
    async function startCombatFromStory(combatType, roomRef) {
        let enemy = {
            name: "Goblin Explorador", hp: 35, maxHp: 35, ac: 11, attackBonus: 2, damageDice: 6, expReward: 40, goldReward: 20,
            image: "./assets/sprites/goblin.png"
        };

        if (combatType === "start_combat_boss_goblin") {
            enemy = {
                name: "Goblin Élite Guardián (Jefe)", hp: 75, maxHp: 75, ac: 14, attackBonus: 4, damageDice: 8, expReward: 120, goldReward: 80,
                image: "./assets/sprites/goblin.png"
            };
        } else if (combatType === "start_combat_rats") {
            enemy = {
                name: "Manada de Ratas Gigantes", hp: 25, maxHp: 25, ac: 10, attackBonus: 2, damageDice: 4, expReward: 30, goldReward: 10,
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
            
            let nextStoryNode = "after_combat_goblin_1";
            if (room.enemy.name.includes("Jefe")) {
                nextStoryNode = "after_boss_victory";
            }

            showCustomModal(
                `¡Enemigo derrotado! (+${expReward} EXP, +${goldReward} Oro y botín).`,
                "🏆 ¡VICTORIA!",
                async () => {
                    await checkAndUnlockAchievement(currentUser.uid, "first_victory");
                    await addAccountExp(currentUser.uid, expReward);
                    
                    if (currentHero && currentHero.hp > 0) {
                        currentHero.exp += expReward;
                        currentHero.gold += goldReward;

                        const possibleLoot = [
                            { name: "Daga Encantada", type: "weapon", stat: "dex", bonus: 2 },
                            { name: "Escudo de Bronce", type: "armor", stat: "str", bonus: 2 },
                            { name: "Anillo del Sabio", type: "armor", stat: "int", bonus: 2 }
                        ];
                        const foundItem = possibleLoot[Math.floor(Math.random() * possibleLoot.length)];
                        if (!currentHero.inventory) currentHero.inventory = [];
                        currentHero.inventory.push(foundItem);

                        await setDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId), currentHero);
                    }

                    const roomRef = doc(db, "rooms", currentRoomId);
                    await updateDoc(roomRef, {
                        status: "exploring",
                        currentNode: nextStoryNode,
                        enemy: null,
                        log: []
                    });
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

        await advanceTurnAndCheckEnemy(room, roomRef);
    });

    safeAddEvent('btn-action-potion', 'click', async () => {
        if (!currentRoomId || !currentHero) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        
        const room = roomSnap.data();
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;

        if (turnOrder[activeTurnIndex] !== currentUser.uid) return showCustomModal("No es tu turno.");
        if (currentHero.potions <= 0) return showCustomModal("¡No te quedan pociones!");
        if (currentHero.hp >= currentHero.maxHp) return showCustomModal("Salud al máximo.");

        currentHero.potions--;
        const healAmount = 40;
        currentHero.hp = Math.min(currentHero.maxHp, currentHero.hp + healAmount);

        if (room.players && room.players[currentUser.uid]) {
            room.players[currentUser.uid].hp = currentHero.hp;
        }

        room.log.push(`🧪 ${currentHero.name} recupera ${healAmount} de HP.`);
        await advanceTurnAndCheckEnemy(room, roomRef);
    });

    safeAddEvent('btn-action-skill', 'click', async () => {
        if (!currentRoomId || !currentHero) return;
        const roomRef = doc(db, "rooms", currentRoomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        
        const room = roomSnap.data();
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;

        if (turnOrder[activeTurnIndex] !== currentUser.uid) return showCustomModal("No es tu turno.");
        if (!room.enemy || room.enemy.hp <= 0) return showCustomModal("No hay enemigo.");

        let skillName = "Golpe Poderoso";
        let damageMultiplier = 1.5;

        if (currentHero.clazz === "Mago") {
            skillName = "Blast Arcano";
            damageMultiplier = 1.8;
        } else if (currentHero.clazz === "Pícaro") {
            skillName = "Puñalada Letal";
            damageMultiplier = 1.7;
        }

        const baseDmg = rollDice(10) + 6;
        const totalSkillDmg = Math.floor(baseDmg * damageMultiplier);

        room.enemy.hp -= totalSkillDmg;
        room.log.push(`✨ ${currentHero.name} usa [${skillName}] e inflige ${totalSkillDmg} de daño.`);

        await advanceTurnAndCheckEnemy(room, roomRef);
    });

    async function advanceTurnAndCheckEnemy(room, roomRef) {
        const turnOrder = room.turnOrder || [];
        const activeTurnIndex = room.activeTurnIndex || 0;
        let nextTurnIndex = (activeTurnIndex + 1) % turnOrder.length;

        if (nextTurnIndex === 0 && room.enemy && room.enemy.hp > 0) {
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
                    `💀 ¡${currentHero.name} HA MUERTO! Permadeath aplicado.`,
                    "☠️ MUERTE",
                    async () => {
                        await checkAndUnlockAchievement(currentUser.uid, "first_death");
                        await addAccountExp(currentUser.uid, 25);
                        await deleteDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId));
                        await leaveRoom(currentUser.uid);
                        currentHero = null;
                        currentHeroId = null;
                        switchScreen('screen-lobby');
                        showLobbyView('adventure');
                        await loadUserCharacters(currentUser, (id, hero) => {
                            currentHeroId = id;
                            currentHero = hero;
                        });
                    }
                );
                return;
            }
        }

        room.activeTurnIndex = nextTurnIndex;
        await updateDoc(roomRef, room);
    }

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
            
            let leveledUp = false;
            while (currentHero.exp >= currentHero.level * 100) {
                currentHero.level += 1;
                currentHero.maxHp += 20;
                currentHero.hp = currentHero.maxHp;
                leveledUp = true;
            }

            await setDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId), currentHero);

            if (leveledUp) {
                showAttributeSelectorModal(currentUser, () => {
                    finalizeReturnToLobby();
                });
                return;
            }
        }

        finalizeReturnToLobby();
    }

    function finalizeReturnToLobby() {
        switchScreen('screen-lobby');
        showLobbyView('adventure');
        if (currentUser) {
            loadUserCharacters(currentUser, (id, hero) => {
                currentHeroId = id;
                currentHero = hero;
            });
        }
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