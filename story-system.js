// story-system.js - Motor Narrativo con Sprites Dinámicos de la carpeta assets/sprites/
import { switchScreen, showCustomModal } from './ui-controller.js';

export const storyNodes = {
    "start_tavern": {
        title: "🍺 LA TABERNA DEL DRAGÓN TUERTO",
        image: "./assets/sprites/Campfire_4x.png", // Usando la fogata o un ícono de taberna
        text: "Están todos festejando alrededor de una cálida fogata en la taberna, bebiendo jarras de hidromiel (Wooden_Barrel_4x). Un misterioso mago encapuchado se aproxima a su mesa sosteniendo un viejo pergamino (Ancient_Scroll_4x) y les ofrece oro a cambio de cazar a una bestia...",
        options: [
            { text: "⚔️ Aceptar la misión del pergamino e ir a las ruinas.", nextNode: "node_ruins_entrance" },
            { text: "💰 Exigir una paga por adelantado usando astucia.", check: "str", dc: 12, successNode: "node_bribe_success", failNode: "node_ruins_entrance" },
            { text: "📜 Buscar un contrato alternativo en el tablero del gremio.", nextNode: "node_guild_job" }
        ]
    },
    "node_ruins_entrance": {
        title: "🏛️ LAS RUINAS DEL NORTE",
        image: "./assets/sprites/Ancient_Ruine_4x.png",
        text: "Llegan a la antigua estructura de piedra. Alrededor hay restos arqueológicos y una densa niebla. En el suelo encuentran un cofre antiguo entre escombros (Treasure_Chest_4x)...",
        options: [
            { text: "🔓 Forzar la cerradura del cofre con una llave rústica.", check: "dex", dc: 11, successNode: "node_chest_loot", failNode: "node_chest_trap" },
            { text: "🚪 Ignorar el cofre y avanzar hacia el interior oscuro.", nextNode: "node_inner_dungeon" }
        ]
    },
    "node_chest_loot": {
        title: "💎 ¡TESORO ENCONTRADO!",
        image: "./assets/sprites/Treasure_Chest_4x(1).png",
        text: "¡Logran abrir el cofre con éxito! Dentro hallan gemas brillantes (Green_Gem_4x) y una poción de salud restauradora (Healing_Potion_4x). Su poder de aventura se incrementa.",
        options: [
            { text: "⚔️ Continuar hacia la cámara principal del jefe.", nextNode: "start_combat_goblin" }
        ]
    },
    "node_chest_trap": {
        title: "⚠️ ¡TRAMPA ACTIVADA!",
        image: "./assets/sprites/Spiked_Trap_4x.png",
        text: "La cerradura estaba maldita o protegida por una trampa de pinchos. La party sufre daño repentino antes de poder reaccionar.",
        options: [
            { text: "🩸 Soportar el dolor y adentrarse a la mazmorra.", nextNode: "start_combat_goblin_ambushed" }
        ]
    },
    "node_guild_job": {
        title: "📜 TABLÓN DE MISIONES DEL GREMIO",
        image: "./assets/sprites/Spellbook_4x.png",
        text: "Revisas libros de hechizos y contratos antiguos en busca de misiones secundarias de menor riesgo.",
        options: [
            { text: "🐀 Limpiar las catacumbas de ratas y criaturas menores.", nextNode: "start_combat_rats" }
        ]
    }
};

// Resolver la votación de la historia de forma democrática
export function resolveStoryVote(votes) {
    const voteCounts = {};

    Object.values(votes).forEach(optionIdx => {
        voteCounts[optionIdx] = (voteCounts[optionIdx] || 0) + 1;
    });

    let maxVotes = 0;
    let winningOptions = [];

    for (const [idx, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            winningOptions = [parseInt(idx)];
        } else if (count === maxVotes) {
            winningOptions.push(parseInt(idx));
        }
    }

    if (winningOptions.length === 0) return 0;

    let selectedIndex = winningOptions[0];
    let isTie = winningOptions.length > 1;

    if (isTie) {
        const randomIdx = Math.floor(Math.random() * winningOptions.length);
        selectedIndex = winningOptions[randomIdx];
    }

    return { selectedIndex, isTie };
}