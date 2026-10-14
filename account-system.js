// account-system.js - Metaprogresión y Camino de Niveles Horizontal
import { db, doc, getDoc, setDoc } from './firebase-config.js';
import { showCustomModal } from './ui-controller.js';

export let accountData = { level: 1, exp: 0 };

// Lista de recompensas permanentes por nivel de cuenta
export const ACCOUNT_MILESTONES = [
    { level: 1, icon: "⚔️", desc: "Iniciación de Aventurero", perk: "Atributos Base Standard" },
    { level: 2, icon: "🧪", desc: "Suministro extra", perk: "+1 Poción al crear héroes (Total: 4)" },
    { level: 3, icon: "📈", desc: "Veteranía", perk: "+15% de Boost de EXP ganada" },
    { level: 4, icon: "🗡️", desc: "Armería de Clan", perk: "+2 Daño Base adicional en todos los ataques" },
    { level: 5, icon: "❤️", desc: "Vigor Ancestral", perk: "+20 HP Máxima inicial en héroes" },
    { level: 6, icon: "🪙", desc: "Fortuna de Cripta", perk: "Comienzas con +50 de Oro adicional" },
    { level: 7, icon: "✨", desc: "Poder Arcano", perk: "+1 Punto de Atributo Libre en Creador" },
    { level: 8, icon: "👑", desc: "Leyenda Vivas", perk: "Inicias con 1 Petición de Resucitar" }
];

export async function loadAccountData(uid) {
    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists() && userSnap.data().accountLevel) {
        accountData = userSnap.data();
    } else {
        accountData = { level: 1, exp: 0 };
        await setDoc(userDocRef, accountData, { merge: true });
    }

    renderAccountUI();
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

    // Renderizar tarjetas en la barra de scroll horizontal
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

export async function addAccountExp(uid, expGained) {
    if (accountData.level >= 3) expGained = Math.floor(expGained * 1.15);

    accountData.exp += expGained;
    let reqExp = accountData.level * 200;

    if (accountData.exp >= reqExp) {
        accountData.level += 1;
        accountData.exp -= reqExp;
        showCustomModal(`🌟 ¡TU CUENTA HA SUBIDO AL NIVEL ${accountData.level}! Revisa tu perfil para ver tu nueva mejora.`, "🎉 LEVEL UP DE CUENTA");
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, accountData, { merge: true });
    renderAccountUI();
}