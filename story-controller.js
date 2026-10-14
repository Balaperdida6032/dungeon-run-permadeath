// story-controller.js - Gestión de Nodos de Historia y Votaciones
import { db, doc, updateDoc } from './firebase-config.js';
import { storyNodes, resolveStoryVote, getDynamicImageForText } from './story-system.js';
import { speakNarratorText } from './audio-system.js';
import { rollDice, getStatModifier } from './dnd-mechanics.js';
import { showCustomModal } from './ui-controller.js';

let typingTimer = null;

export function renderStoryNode(room, currentUser, isSolo = false) {
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
        btn.addEventListener('click', () => registerStoryVote(idx, room, currentUser, isSolo));
        optionsContainer.appendChild(btn);
    });
}

async function registerStoryVote(optionIdx, room, currentUser, isSolo = false, onMissionComplete) {
    if (!room) return;
    // currentRoomId se obtiene desde el scope o parámetro
    const roomRef = doc(db, "rooms", room.id || window.currentRoomId);

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
                
                if (room.currentNode === "mission_complete") {
                    if (window.handleMissionComplete) window.handleMissionComplete();
                    return;
                }

                if (chosenOption.nextNode) {
                    if (chosenOption.nextNode.startsWith("start_combat_")) {
                        if (window.startCombatFromStory) window.startCombatFromStory(chosenOption.nextNode, roomRef);
                    } else {
                        await updateDoc(roomRef, { currentNode: chosenOption.nextNode });
                    }
                } else if (chosenOption.check) {
                    const currentHero = window.getCurrentHero ? window.getCurrentHero() : { stats: { str: 10, dex: 10, int: 10 } };
                    const statVal = currentHero.stats[chosenOption.check] || 10;
                    const mod = getStatModifier(statVal);
                    const d20 = rollDice(20);
                    const total = d20 + mod;

                    if (total >= chosenOption.dc) {
                        showCustomModal(`🎲 Tirada: ${d20}+${mod}=${total} vs CD ${chosenOption.dc}. ¡ÉXITO!`);
                        const next = chosenOption.successNode;
                        if (next.startsWith("start_combat_")) {
                            if (window.startCombatFromStory) window.startCombatFromStory(next, roomRef);
                        } else {
                            await updateDoc(roomRef, { currentNode: next });
                        }
                    } else {
                        showCustomModal(`🎲 Tirada: ${d20}+${mod}=${total} vs CD ${chosenOption.dc}. ¡FRACASO!`);
                        const next = chosenOption.failNode;
                        if (next.startsWith("start_combat_")) {
                            if (window.startCombatFromStory) window.startCombatFromStory(next, roomRef);
                        } else {
                            await updateDoc(roomRef, { currentNode: next });
                        }
                    }
                }
            }
        );
    } else {
        await updateDoc(roomRef, { storyVotes });
    }
}

function safeSetText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = text;
}