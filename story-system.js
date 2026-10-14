// story-system.js - Motor de Narrativa, Nodos, Decisiones e Imágenes Dinámicas para Dungeon Run

export const storyNodes = {
    // 1. NODO INICIAL: LA TAVERNA
    start_tavern: {
        title: "LA TABERNA DEL DRAGÓN TUERTO",
        text: "Están todos festejando alrededor de una cálida fogata en la taberna, bebiendo jarras de hidromiel. Un misterioso mago encapuchado se te acerca con un pergamino antiguo manchado de cera negra, advirtiendo sobre catacumbas malditas llenas de riquezas y peligros.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Aceptar la misión del pergamino e ir a las ruinas malditas.", nextNode: "ruins_entrance" },
            { text: "Exigir una paga por adelantado usando astucia.", check: "int", dc: 12, successNode: "tavern_negotiate_success", failNode: "ruins_entrance" },
            { text: "Ignorar al mago y buscar un contrato alternativo en el tablón del gremio.", nextNode: "guild_board" }
        ]
    },

    // 2. NEGOCIACIÓN EXITOSA EN LA TAVERNA
    tavern_negotiate_success: {
        title: "EL ORO DEL MAGO",
        text: "Con palabras elocuentes, convences al mago de soltar 30 monedas de oro antes de partir. 'Más vale prevenir', murmura mientras te entrega la seña y señala la entrada secreta.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "marchar hacia las ruinas con los bolsillos llenos de oro.", nextNode: "ruins_entrance" }
        ]
    },

    // 3. TABLÓN DEL GREMIO (ALTERNATIVA)
    guild_board: {
        title: "EL TABLÓN DE LAS CODOS ROTOS",
        text: "El tablón está repleto de avisos de recompensa. El más suculento habla de una cripta infestada de ratas gigantes y un cofre de los lamentos olvidado.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Aceptar el contrato de las Cloacas Infestadas.", nextNode: "start_combat_rats" },
            { text: "Volver a la fogata principal con el grupo.", nextNode: "start_tavern" }
        ]
    },

    // 4. ENTRADA A LAS RUINAS MALDITAS
    ruins_entrance: {
        title: "LAS RUINAS DEL VALLE OSCURO",
        text: "La niebla cubre la escalinata de piedra carcomida por el tiempo. Al fondo, unas puertas de hierro forjado con runas de sangre crujen tenuemente con el viento helado.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Forzar las puertas pesadas de hierro con fuerza bruta.", check: "str", dc: 13, successNode: "ruins_hallway", failNode: "ruins_trap_fail" },
            { text: "Buscar un mecanismo oculto o trampa en los muros.", check: "int", dc: 11, successNode: "ruins_secret_path", failNode: "ruins_hallway" }
        ]
    },

    // 5. TRAMPA FALLIDA EN LAS RUINAS
    ruins_trap_fail: {
        title: "¡TRAMPA DE DARDOS!",
        text: "Al empujar la puerta sin cuidado, una losa se hunde bajo tus pies y una lluvia de dardos envenenados sale de las paredes. Te sacudes el dolor, pero logras entrar.",
        defaultImage: "./assets/sprites/goblin.png",
        options: [
            { text: "Avanzar adolorido hacia el gran salón.", nextNode: "ruins_hallway" }
        ]
    },

    // 6. CAMINO SECRETO EN LAS RUINAS
    ruins_secret_path: {
        title: "EL PASadizo del TESORO OCULTO",
        text: "Descubres una palanca disimulada tras una gárgola de piedra. Se abre un nicho secreto que contiene un frasco brillante y 50 monedas de oro antiguo.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Guardar el oro y continuar hacia el salón principal.", nextNode: "ruins_hallway" }
        ]
    },

    // 7. GRAN SALÓN DE LAS RUINAS (ENCUENTRO DE GOBLIN)
    ruins_hallway: {
        title: "EL SALÓN DE LOS SUSURROS",
        text: "Te adentras en un vasto salón flanqueado por estatuas decapitadas. De las sombras brota un gruñido amenazante: ¡Un Goblin Asaltante equipado con una daga herrumbrosa bloquea el paso hacia el tesoro!",
        defaultImage: "./assets/sprites/goblin.png",
        options: [
            { text: "Desenvainar el arma y abalanzarte sobre el Goblin.", nextNode: "start_combat_goblin" },
            { text: "Intentar sigilosamente rodearlo usando las sombras.", check: "dex", dc: 14, successNode: "sneak_success", failNode: "start_combat_goblin" }
        ]
    },

    // 8. SIGILO EXITOSO
    sneak_success: {
        title: "SOMBRA EVASIVA",
        text: "Te deslizas con la agilidad de un fantasma entre los pilares. El goblin ni se percata de tu presencia, dejándote vía libre hacia la cámara del tesoro principal.",
        defaultImage: "./assets/sprites/goblin.png",
        options: [
            { text: "Entrar triunfante en la Cámara del Tesoro.", nextNode: "treasure_chamber" }
        ]
    },

    // 9. COMBATE CONTRA RATAS (DESDE TABLÓN)
    start_combat_rats: {
        title: "LAS CLOACAS PROFUNDAS",
        text: "El agua pestilente te llega a las rodillas. De la oscuridad surgen docenas de ojos rojos: ¡Una horda de Ratas Gigantes salta al ataque!",
        defaultImage: "./assets/sprites/rat.png",
        options: [
            { text: "¡Luchar contra las alimañas!", nextNode: "start_combat_rats_action" }
        ]
    },

    // Nodos internos de mapeo de combate
    start_combat_goblin: {
        title: "COMBATE: GOBLIN ASALTANTE",
        text: "El goblin desenvaina su arma corta y lanza un grito de guerra.",
        defaultImage: "./assets/sprites/goblin.png",
        options: []
    },

    // 10. CÁMARA DEL TESORO FINAL
    treasure_chamber: {
        title: "EL SANGUINARIO COFRE DEL DRAGÓN",
        text: "En el centro de la sala y sobre un altar de obsidiana reposa un cofre adornado con joyas carmesí. Sientes una energía mágica palpitar en su interior.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Forzar la cerradura con destreza milimétrica.", check: "dex", dc: 12, successNode: "epic_loot", failNode: "mimic_trap" },
            { text: "Romper la cerradura a golpes limpios.", check: "str", dc: 11, successNode: "normal_loot", failNode: "mimic_trap" }
        ]
    },

    // 11. BOTÍN ÉPICO
    epic_loot: {
        title: "¡TESORO LEGENDARIO!",
        text: "¡Has abierto el cofre con maestría! En su interior encuentras gemas relucientes, un pergamino de poder arcano y una poción extraña que emite luz propia.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Celebrar la victoria y regresar a la taberna como héroe.", nextNode: "start_tavern" }
        ]
    },

    // 12. BOTÍN NORMAL
    normal_loot: {
        title: "BOTÍN DE LA CRIPTA",
        text: "El cofre se abre con estrépito. Consigues un buen fajo de monedas de oro y suministros para continuar tu camino.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Continuar la aventura.", nextNode: "start_tavern" }
        ]
    },

    // 13. TRAMPA DE MÍMICO (CURIOSIDAD PELIGROSA)
    mimic_trap: {
        title: "¡ES UN MÍMICO!",
        text: "¡El cofre cobra vida de repente con una boca llena de dientes afilados! Te muerde el brazo antes de que puedas reaccionar, pero logras zafarte a golpes y robarle unas pocas monedas de oro de su estómago.",
        defaultImage: "./assets/sprites/goblin.png",
        options: [
            { text: "Retirarse maltrecho pero con vida de la mazmorra.", nextNode: "start_tavern" }
        ]
    }
};

// Sistema de actualización dinámica de imágenes según palabras clave en la narrativa
export function getDynamicImageForText(text, defaultImg) {
    if (!text) return defaultImg;
    const lower = text.toLowerCase();
    
    if (lower.includes("goblin") || lower.includes("monstruo") || lower.includes("mímico") || lower.includes("ataque")) {
        return "./assets/sprites/goblin.png";
    }
    if (lower.includes("rata") || lower.includes("cloaca") || lower.includes("alimaña")) {
        return "./assets/sprites/rat.png";
    }
    if (lower.includes("fuego") || lower.includes("taberna") || lower.includes("cofre") || lower.includes("tesoro")) {
        return "./assets/sprites/Campfire_4x.png";
    }
    return defaultImg;
}

// Lógica de resolución de votos multijugador y empates
export function resolveStoryVote(votesObj) {
    const votesArray = Object.values(votesObj);
    if (votesArray.length === 0) return { selectedIndex: 0, isTie: false };

    const counts = {};
    votesArray.forEach(v => { counts[v] = (counts[v] || 0) + 1; });

    let maxVotes = -1;
    let winningOptions = [];

    for (const [optIdx, count] of Object.entries(counts)) {
        if (count > maxVotes) {
            maxVotes = count;
            winningOptions = [parseInt(optIdx)];
        } else if (count === maxVotes) {
            winningOptions.push(parseInt(optIdx));
        }
    }

    if (winningOptions.length > 1) {
        const randomIndex = Math.floor(Math.random() * winningOptions.length);
        return { selectedIndex: winningOptions[randomIndex], isTie: true };
    }

    return { selectedIndex: winningOptions[0], isTie: false };
}