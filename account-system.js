// account-system.js - Metaprogresión, Camino de Niveles y Logros
import { db, doc, getDoc, setDoc } from './firebase-config.js';
import { showCustomModal, showAchievementToast } from './ui-controller.js';

export let accountData = { level: 1, exp: 0, achievements: [] };

export const ACCOUNT_MILESTONES = [
    { level: 1, icon: "⚔️", desc: "Iniciación de Aventurero", perk: "Atributos Base Standard" },
    { level: 2, icon: "🧪", desc: "Suministro extra", perk: "+1 Poción al crear héroes (Total: 4)" },
    { level: 3, icon: "📈", desc: "Veteranía", perk: "+15% de Boost de EXP ganada" },
    { level: 4, icon: "🗡️", desc: "Armería de Clan", perk: "+2 Daño Base adicional en todos los ataques" },
    { level: 5, icon: "❤️", desc: "Vigor Ancestral", perk: "+20 HP Máxima inicial en héroes" },
    { level: 6, icon: "🪙", desc: "Fortuna de Cripta", perk: "Comienzas con +50 de Oro adicional" },
    { level: 7, icon: "✨", desc: "Poder Arcano", perk: "+1 Punto de Atributo Libre en Creador" },
    { level: 8, icon: "👑", desc: "Leyenda Viva", perk: "Inicias con 1 Petición de Resucitar" }
];

// LISTA DE LOGROS DEL JUEGO
export const GAME_ACHIEVEMENTS = [
    { id: "first_hero", name: "Primer Forjador", icon: "🛡️", desc: "Forja tu primer personaje en el juego." },
    { id: "first_victory", name: "Bautismo de Sangre", icon: "⚔️", desc: "Gana tu primer combate en una mazmorra." },
    { id: "first_death", name: "Caída Honorable", icon: "💀", desc: "Sufre tu primera muerte de personaje (Permadeath)." },
    { id: "level_5_account", name: "Veterano del Gremio", icon: "🌟", desc: "Alcanza el Nivel 5 de Cuenta." },
    { id: "gold_hoarder", name: "Cofre del Tesoro", icon: "🪙", desc: "Acumula 150 de Oro con un solo personaje." }
];

export async function loadAccountData(uid) {
    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists() && userSnap.data().accountLevel) {
        accountData = userSnap.data();
        if (!accountData.achievements) accountData.achievements = [];
    } else {
        accountData = { level: 1, exp: 0, achievements: [] };
        await setDoc(userDocRef, accountData, { merge: true });
    }

    renderAccountUI();
    renderAchievementsUI();
}

export function renderAccountUI() {
    const reqExp = accountData.level * 200;
    const expPct = Math.min(100, (accountData.exp / reqExp) * 100);

    const levelElem = document.getElementById('account-level');
    const expBarElem = document.getElementById('account-exp-bar');
    const expTextElem = document.getElementById('account-exp-text');

    if (levelElem) levelElem.innerText = accountData.level;
    if (expBarElem) expBarElem.style.width = expPct + '%';
    if (expTextElem) expTextElem.innerText = `EXP Cuenta: ${accountData.exp} / ${reqExp}`;

    const roadElem = document.getElementById('level-road');
    if (roadElem) {
        roadElem.innerHTML = "";
        ACCOUNT_MILESTONES.forEach(m => {
            const isUnlocked = accountData.level >= m.level;
            const isCurrent = accountData.level === m.level;
            
            let statusText = isUnlocked ? "🟢 DESBLOQUEADO" : "🔒 BLOQUEADO";
            let statusColor = isUnlocked ? "#a6e3a1" : "#6c7086";
            if (isCurrent) statusText = "⭐ NIVEL ACTUAL";

            let classNames = "level-node";
            if (isUnlocked) classNames += " unlocked";
            if (isCurrent) classNames += " current";

            roadElem.innerHTML += `
                <div class="${classNames}">
                    <div class="level-number">Nivel ${m.level}</div>
                    <div class="level-icon">${m.icon}</div>
                    <div class="level-desc"><strong>${m.desc}</strong><br><br>${m.perk}</div>
                    <div class="level-status" style="color: ${statusColor};">${statusText}</div>
                </div>
            `;
        });
    }
}

export function renderAchievementsUI() {
    const listElem = document.getElementById('achievements-list');
    const progressElem = document.getElementById('achievements-progress-text');
    if (!listElem) return;

    const unlockedSet = new Set(accountData.achievements || []);
    if (progressElem) {
        progressElem.innerText = `${unlockedSet.size} / ${GAME_ACHIEVEMENTS.length}`;
    }

    listElem.innerHTML = "";
    GAME_ACHIEVEMENTS.forEach(ach => {
        const isUnlocked = unlockedSet.has(ach.id);
        const statusText = isUnlocked ? "🟢 COMPLETADO" : "🔒 BLOQUEADO";
        const statusColor = isUnlocked ? "#a6e3a1" : "#6c7086";

        listElem.innerHTML += `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                <div class="achievement-card-icon">${ach.icon}</div>
                <div class="achievement-card-info">
                    <div class="achievement-card-title">${ach.name}</div>
                    <div class="achievement-card-desc">${ach.desc}</div>
                </div>
                <div class="achievement-card-status" style="color: ${statusColor};">${statusText}</div>
            </div>
        `;
    });
}

// FUNCIÓN PARA REVISAR Y DESBLOQUEAR UN LOGRO
export async function checkAndUnlockAchievement(uid, achievementId) {
    if (!accountData.achievements) accountData.achievements = [];
    
    // Si no lo tiene aún
    if (!accountData.achievements.includes(achievementId)) {
        accountData.achievements.push(achievementId);
        
        const ach = GAME_ACHIEVEMENTS.find(a => a.id === achievementId);
        if (ach) {
            showAchievementToast(ach.name, ach.icon);
        }

        const userDocRef = doc(db, "users", uid);
        await setDoc(userDocRef, { achievements: accountData.achievements }, { merge: true });
        renderAchievementsUI();
    }
}

export async function addAccountExp(uid, expGained) {
    if (accountData.level >= 3) expGained = Math.floor(expGained * 1.15);

    accountData.exp += expGained;
    let reqExp = accountData.level * 200;

    if (accountData.exp >= reqExp) {
        accountData.level += 1;
        accountData.exp -= reqExp;
        showCustomModal(`🌟 ¡TU CUENTA HA SUBIDO AL NIVEL ${accountData.level}! Revisa tu perfil para ver tu nueva mejora.`, "🎉 LEVEL UP DE CUENTA");

        if (accountData.level >= 5) {
            checkAndUnlockAchievement(uid, "level_5_account");
        }
    }

    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, { level: accountData.level, exp: accountData.exp }, { merge: true });
    renderAccountUI();
}