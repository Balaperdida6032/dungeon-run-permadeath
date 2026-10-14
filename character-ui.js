// character-ui.js - Gestión de Héroes, Inventario y Equipamiento
import { db, collection, addDoc, getDocs, setDoc, doc } from './firebase-config.js';
import { getStatModifier } from './dnd-mechanics.js';
import { showCustomModal, switchScreen } from './ui-controller.js';
import { checkAndUnlockAchievement } from './account-system.js';

let currentHeroId = null;
let currentHero = null;
let availablePoints = 5;
let customStats = { str: 10, dex: 10, int: 10 };
let baseStats = { str: 10, dex: 10, int: 10 };

export function getCurrentHero() { return currentHero; }
export function getCurrentHeroId() { return currentHeroId; }
export function resetCurrentHero() {
    currentHero = null;
    currentHeroId = null;
}

export function initCharacterManager(currentUser, onHeroSelected, accountData) {
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

    setupStatButton('str', updateStatUI);
    setupStatButton('dex', updateStatUI);
    setupStatButton('int', updateStatUI);

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

    safeAddEvent('btn-create-hero', 'click', async () => {
        if (!currentUser) return;
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
            stats: { ...customStats, ac },
            inventory: [
                { name: "Espada de Acero de Prueba", type: "weapon", stat: "str", bonus: 2 },
                { name: "Armadura de Cuero Reforzado", type: "armor", stat: "dex", bonus: 1 }
            ],
            equipment: { weapon: null, armor: null }
        };

        const charactersRef = collection(db, "users", currentUser.uid, "characters");
        const docRef = await addDoc(charactersRef, newHero);
        
        await checkAndUnlockAchievement(currentUser.uid, "first_hero");

        showCustomModal(`¡Personaje ${name} forjado con éxito!`, "✨ HÉROE CREADO", () => {
            if (nameInput) nameInput.value = "";
            const creator = document.getElementById('hero-creator');
            if (creator) creator.style.display = 'none';
            selectCharacter(docRef.id, newHero, onHeroSelected, currentUser);
        });
    });

    safeAddEvent('btn-change-hero', 'click', () => {
        currentHero = null; 
        currentHeroId = null;
        const creator = document.getElementById('hero-creator');
        const showCreatorBtn = document.getElementById('btn-show-creator');
        if (creator) creator.style.display = 'none';
        if (showCreatorBtn) showCreatorBtn.style.display = 'block';
        loadUserCharacters(currentUser, onHeroSelected);
    });
}

export async function loadUserCharacters(currentUser, onHeroSelected) {
    if (!currentUser) return;
    const charactersRef = collection(db, "users", currentUser.uid, "characters");
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
        btn.addEventListener('click', () => selectCharacter(heroId, hero, onHeroSelected, currentUser));
        listDiv.appendChild(btn);
    });

    showLobbyView('character');
}

function selectCharacter(heroId, heroData, onHeroSelected, currentUser) {
    currentHeroId = heroId;
    currentHero = heroData;
    showLobbyView('adventure');

    updateActiveHeroDisplay(currentUser);
    if (onHeroSelected) onHeroSelected(currentHeroId, currentHero);
}

export function updateActiveHeroDisplay(currentUser) {
    if (!currentHero) return;
    const activeHeroDisplay = document.getElementById('active-hero-display');
    if (activeHeroDisplay) {
        activeHeroDisplay.innerHTML = `
            <strong>Héroe Activo:</strong> ${currentHero.name} (${currentHero.clazz})<br>
            Nivel: ${currentHero.level} | HP: ❤️ ${currentHero.hp}/${currentHero.maxHp} | Oro: 🪙 ${currentHero.gold}
        `;
    }
    renderInventoryUI(currentUser);
}

export function renderInventoryUI(currentUser) {
    if (!currentHero) return;
    const invDiv = document.getElementById('hero-inventory-list');
    const eqWeapon = document.getElementById('eq-weapon');
    const eqArmor = document.getElementById('eq-armor');
    
    if (!invDiv) return;

    if (!currentHero.equipment) currentHero.equipment = { weapon: null, armor: null };
    if (!currentHero.inventory) currentHero.inventory = [];

    if (eqWeapon) {
        eqWeapon.innerHTML = currentHero.equipment.weapon ? 
            `Arma: <strong style="color:#a6e3a1;">${currentHero.equipment.weapon.name} (+${currentHero.equipment.weapon.bonus} ${currentHero.equipment.weapon.stat.toUpperCase()})</strong> <button class="btn-unequip" data-type="weapon" style="padding:2px 6px; font-size:6px; margin:0;">Quitar</button>` : 
            `Arma: Ninguna`;
    }
    if (eqArmor) {
        eqArmor.innerHTML = currentHero.equipment.armor ? 
            `Armadura: <strong style="color:#a6e3a1;">${currentHero.equipment.armor.name} (+${currentHero.equipment.armor.bonus} ${currentHero.equipment.armor.stat.toUpperCase()})</strong> <button class="btn-unequip" data-type="armor" style="padding:2px 6px; font-size:6px; margin:0;">Quitar</button>` : 
            `Armadura: Ninguna`;
    }

    invDiv.innerHTML = "";
    if (currentHero.inventory.length === 0) {
        invDiv.innerHTML = `<span style="font-size: 8px; color: #6c7086;">Inventario vacío</span>`;
    } else {
        currentHero.inventory.forEach((item, index) => {
            const itemBox = document.createElement('div');
            itemBox.style.display = "flex";
            itemBox.style.justifyContent = "space-between";
            itemBox.style.alignItems = "center";
            itemBox.style.background = "#1e1e2e";
            itemBox.style.padding = "4px 8px";
            itemBox.style.border = "1px solid #313244";
            itemBox.innerHTML = `
                <span style="font-size: 8px; color: #cdd6f4;">⚔️ ${item.name} (+${item.bonus} ${item.stat.toUpperCase()})</span>
                <button class="btn-equip-item" data-index="${index}" style="padding:2px 6px; font-size:6px; margin:0; background-color:#a6e3a1; color:#111;">Equipar</button>
            `;
            invDiv.appendChild(itemBox);
        });
    }

    // Equipar ítem
    document.querySelectorAll('.btn-equip-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            const item = currentHero.inventory[idx];
            const slot = item.type; // 'weapon' o 'armor'

            if (currentHero.equipment[slot]) {
                currentHero.inventory.push(currentHero.equipment[slot]);
            }

            currentHero.equipment[slot] = item;
            currentHero.inventory.splice(idx, 1);

            // Aplicar bono a estadísticas temporal/permanente en base a equipo
            currentHero.stats[item.stat] += item.bonus;

            await setDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId), currentHero);
            updateActiveHeroDisplay(currentUser);
        });
    });

    // Desequipar ítem
    document.querySelectorAll('.btn-unequip').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const slot = e.target.getAttribute('data-type');
            const item = currentHero.equipment[slot];
            if (item) {
                currentHero.inventory.push(item);
                currentHero.equipment[slot] = null;
                currentHero.stats[item.stat] -= item.bonus;

                await setDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId), currentHero);
                updateActiveHeroDisplay(currentUser);
            }
        });
    });
}

export function showLobbyView(viewName) {
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

export function showAttributeSelectorModal(currentUser, onComplete) {
    const modal = document.getElementById('level-up-modal');
    if (!modal) {
        if (onComplete) onComplete();
        return;
    }

    modal.style.display = 'flex';
    let tempStats = { ...currentHero.stats };
    let pointAssigned = false;

    const strEl = document.getElementById('levelup-str');
    const dexEl = document.getElementById('levelup-dex');
    const intEl = document.getElementById('levelup-int');
    const confirmBtn = document.getElementById('btn-confirm-levelup');

    function updateModalStats() {
        if (strEl) strEl.innerText = tempStats.str;
        if (dexEl) dexEl.innerText = tempStats.dex;
        if (intEl) intEl.innerText = tempStats.int;
        
        if (confirmBtn) {
            confirmBtn.disabled = !pointAssigned;
            confirmBtn.style.opacity = pointAssigned ? "1" : "0.5";
        }
    }

    updateModalStats();

    setupLevelUpButton('str', () => {
        if (!pointAssigned) { tempStats.str++; pointAssigned = true; updateModalStats(); disableStatButtons(); }
    });
    setupLevelUpButton('dex', () => {
        if (!pointAssigned) { tempStats.dex++; pointAssigned = true; updateModalStats(); disableStatButtons(); }
    });
    setupLevelUpButton('int', () => {
        if (!pointAssigned) { tempStats.int++; pointAssigned = true; updateModalStats(); disableStatButtons(); }
    });

    function disableStatButtons() {
        ['str', 'dex', 'int'].forEach(s => {
            const b = document.getElementById(`btn-levelup-${s}`);
            if (b) b.disabled = true;
        });
    }

    const oldConfirm = document.getElementById('btn-confirm-levelup');
    const newConfirm = oldConfirm.cloneNode(true);
    oldConfirm.parentNode.replaceChild(newConfirm, oldConfirm);

    newConfirm.addEventListener('click', async () => {
        if (!pointAssigned) return;
        
        const dexDiff = tempStats.dex - currentHero.stats.dex;
        if (dexDiff > 0 && currentHero.clazz === "Pícaro") tempStats.ac += 1;

        currentHero.stats = { ...tempStats };
        await setDoc(doc(db, "users", currentUser.uid, "characters", currentHeroId), currentHero);

        modal.style.display = 'none';
        if (onComplete) onComplete();
    });
}

function setupStatButton(stat, updateCallback) {
    safeAddEvent(`btn-${stat}-plus`, 'click', () => {
        if (availablePoints > 0) { customStats[stat]++; availablePoints--; updateCallback(); }
    });
    safeAddEvent(`btn-${stat}-minus`, 'click', () => {
        if (customStats[stat] > baseStats[stat]) { customStats[stat]--; availablePoints++; updateCallback(); }
    });
}

function setupLevelUpButton(stat, callback) {
    const oldBtn = document.getElementById(`btn-levelup-${stat}`);
    if (!oldBtn) return;
    const newBtn = oldBtn.cloneNode(true);
    newBtn.disabled = false;
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.addEventListener('click', callback);
}

function safeAddEvent(elementId, eventType, callback) {
    const el = document.getElementById(elementId);
    if (el) el.addEventListener(eventType, callback);
}

function safeSetText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = text;
}