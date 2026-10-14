// story-system.js - Sistema de nodos narrativos, imágenes dinámicas y resolución de votos

export const storyNodes = {
    "start_tavern": {
        title: "LA TABERNA DEL DRAGÓN TUERTO",
        // Texto limpio sin nombres de archivo feos
        text: "Están todos festejando alrededor de una cálida fogata en la taberna, bebiendo jarras de hidromiel. Un misterioso mago encapuchado se aproxima a su mesa sosteniendo un viejo pergamino y les ofrece oro a cambio de cazar a una bestia...",
        // Imagen por defecto del nodo (la fogata)
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Aceptar la misión del pergamino e ir a las ruinas.", nextNode: "node_ruins" },
            { text: "Exigir una paga por adelantado usando astucia.", check: "int", dc: 12, successNode: "node_ruins_paid", failNode: "node_ruins" },
            { text: "Buscar un contrato alternativo en el tablero del gremio.", nextNode: "node_board" }
        ]
    },
    "node_ruins": {
        title: "LAS RUINAS ABANDONADAS",
        text: "Llegan a las oscuras ruinas marcadas en el pergamino. Entre la maleza descubren un viejo cofre de madera cubierto de musgo y runas extrañas.",
        defaultImage: "./assets/sprites/Treasure_Chest_4x.png",
        options: [
            { text: "Forzar la cerradura del cofre con fuerza.", check: "str", dc: 13, successNode: "start_combat_goblins", failNode: "start_combat_goblins" },
            { text: "Inspeccionar en busca de trampas ocultas.", check: "dex", dc: 12, successNode: "start_combat_rats", failNode: "start_combat_goblins" },
            { text: "Ignorar el cofre y adentrarse sigilosamente hacia la guarida.", nextNode: "start_combat_goblins" }
        ]
    },
    "node_ruins_paid": {
        title: "NEGOCIACIÓN EXITOSA",
        text: "Lograste convencer al mago de entregar una seña por adelantado. Tu bolsa de oro se vuelve más pesada mientras avanzan hacia el territorio del monstruo.",
        defaultImage: "./assets/sprites/Ancient_Scroll_4x.png",
        options: [
            { text: "Continuar hacia la guarida del goblin con confianza.", nextNode: "start_combat_goblins" }
        ]
    },
    "node_board": {
        title: "EL TABLERO DEL GREMIO",
        text: "Revisas los tablones de anuncios y encuentras un aviso urgente sobre una plaga de criaturas asolando los almacenes subterráneos.",
        defaultImage: "./assets/sprites/Ancient_Scroll_4x.png",
        options: [
            { text: "Aceptar el contrato de las cloacas y cazar ratas gigantes.", nextNode: "start_combat_rats" }
        ]
    }
};

// Diccionario de palabras clave en el texto para cambiar dinámicamente la imagen superior
export const keywordImageMap = [
    { keywords: ["fogata", "festejando", "taberna"], image: "./assets/sprites/Campfire_4x.png" },
    { keywords: ["hidromiel", "bebiendo", "jarras"], image: "./assets/sprites/Wooden_Barrel_4x.png" },
    { keywords: ["mago", "encapuchado", "pergamino", "oro"], image: "./assets/sprites/Ancient_Scroll_4x.png" },
    { keywords: ["ruinas", "cofre", "musgo", "cerradura"], image: "./assets/sprites/Treasure_Chest_4x.png" },
    { keywords: ["rata", "cloacas", "plaga"], image: "./assets/sprites/rat.png" },
    { keywords: ["goblin", "bestia", "monstruo"], image: "./assets/sprites/goblin.png" }
];

export function getDynamicImageForText(currentText, defaultImg) {
    const lowerText = currentText.toLowerCase();
    for (let item of keywordImageMap) {
        for (let kw of item.keywords) {
            if (lowerText.includes(kw)) {
                return item.image;
            }
        }
    }
    return defaultImg;
}

export function resolveStoryVote(storyVotes) {
    const votes = Object.values(storyVotes);
    if (votes.length === 0) return { selectedIndex: 0, isTie: false };

    const counts = {};
    votes.forEach(v => counts[v] = (counts[v] || 0) + 1);

    let maxCount = 0;
    let winners = [];

    for (const [optionIdx, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            winners = [parseInt(optionIdx)];
        } else if (count === maxCount) {
            winners.push(parseInt(optionIdx));
        }
    }

    if (winners.length > 1) {
        const randomWinner = winners[Math.floor(Math.random() * winners.length)];
        return { selectedIndex: randomWinner, isTie: true };
    }

    return { selectedIndex: winners[0], isTie: false };
}