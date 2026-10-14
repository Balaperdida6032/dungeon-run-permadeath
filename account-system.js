// account-system.js - Metaprogresión y Pasivas de Cuenta
import { db, doc, getDoc, setDoc } from './firebase-config.js';
import { showCustomModal } from './ui-controller.js';

export let accountData = { level: 1, exp: 0 };

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
    const perksListElem = document.getElementById('account-perks-list');

    if (levelElem) levelElem.innerText = accountData.level;
    if (expBarElem) expBarElem.style.width = expPct + '%';
    if (expTextElem) expTextElem.innerText = `EXP Cuenta: ${accountData.exp} / ${reqExp}`;

    let perksHTML = "";
    if (accountData.level >= 2) perksHTML += "🧪 +1 Poción Inicial en nuevos personajes<br>";
    if (accountData.level >= 3) perksHTML += "📈 +15% Boost de EXP Ganada<br>";
    if (accountData.level >= 4) perksHTML += "🗡️ Arma de Iniciado (Ataque base mejorado)<br>";
    if (accountData.level >= 5) perksHTML += "❤️ +20 HP Máxima base extra<br>";
    if (perksHTML === "") perksHTML = "🔒 *Sube a Nivel 2 para desbloquear tu primera mejora permanente*";

    if (perksListElem) perksListElem.innerHTML = perksHTML;
}

export async function addAccountExp(uid, expGained) {
    if (accountData.level >= 3) expGained = Math.floor(expGained * 1.15);

    accountData.exp += expGained;
    let reqExp = accountData.level * 200;

    if (accountData.exp >= reqExp) {
        accountData.level += 1;
        accountData.exp -= reqExp;
        showCustomModal(`🌟 ¡TU CUENTA HA SUBIDO AL NIVEL ${accountData.level}! Has desbloqueado nuevas pasivas permanentes.`, "🎉 LEVEL UP DE CUENTA");
    }

    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, accountData, { merge: true });
    renderAccountUI();
}