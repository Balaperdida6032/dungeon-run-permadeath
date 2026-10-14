// story-system.js - Motor Narrativo Avanzado con Múltiples Batallas, Tiradas de Suerte y Misiones de Entrega

export const storyNodes = {
    // ==========================================
    // ARCO 1: LA MISIÓN DE LA GEMA PERDIDA DEL MAGO
    // ==========================================
    start_tavern: {
        title: "LA TAVERNA DEL DRAGÓN TUERTO",
        text: "El calor de la fogata ilumina la taberna. Un anciano mago de túnica raída te intercepta con urgencia: 'Perdí mi Gema de Fuego Estelar en las profundidades de la cripta maldita. Si me la traes de regreso, te recompensaré con creces'.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Aceptar la misión y marchar hacia las Catacumbas.", nextNode: "crypt_entrance" },
            { text: "Intentar extorsionarlo para conseguir oro por adelantado.", check: "int", dc: 12, successNode: "tavern_extra_gold", failNode: "crypt_entrance" },
            { text: "Rechazarlo e ir al Tablón de Contratos del Gremio.", nextNode: "guild_board" }
        ]
    },

    tavern_extra_gold: {
        title: "NEGOCIACIÓN EXITOSA",
        text: "El mago frunce el ceño, pero accede a darte 25 monedas de oro para provisiones. 'No decepciones a las artes arcanas', te advierte.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Partir con el oro hacia las Catacumbas.", nextNode: "crypt_entrance" }
        ]
    },

    guild_board: {
        title: "EL TABLÓN DE LAS ALIMAÑAS",
        text: "Prefieres ignorar al mago y buscas un contrato secundario en el tablón: limpiar las cloacas infestadas de ratas y bestias.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Aceptar el contrato de las cloacas (Combate rápido).", nextNode: "start_combat_rats" },
            { text: "Volver con el mago y aceptar su misión de la gema.", nextNode: "crypt_entrance" }
        ]
    },

    // ==========================================
    // ETAPA 1: LAS CATACUMBAS Y PRIMER COMBATE
    // ==========================================
    crypt_entrance: {
        title: "LAS PUERTAS DE LA CRIPTA",
        text: "Llegas al mausoleo abandonado. La puerta de piedra está sellada con lodo y raíces centenarias. Un pestilente olor a goblin inunda el ambiente.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Forzar la puerta pesada con fuerza bruta.", check: "str", dc: 13, successNode: "crypt_hallway_safe", failNode: "crypt_door_trap" },
            { text: "Buscar un mecanismo de apertura sigiloso.", check: "dex", dc: 12, successNode: "crypt_hallway_safe", failNode: "crypt_door_trap" }
        ]
    },

    crypt_door_trap: {
        title: "¡TRAMPA DE LOSAS!",
        text: "Al empujar mal la piedra, se activa un pestillo oculto que deja caer escombros sobre ti. Te golpeas el hombro antes de lograr entrar al pasillo oscuro.",
        defaultImage: "./assets/sprites/goblin.png",
        options: [
            { text: "Avanzar adolorido hacia el interior.", nextNode: "crypt_hallway_safe" }
        ]
    },

    crypt_hallway_safe: {
        title: "EL PASILLO DE LAS TRAMPAS",
        text: "Avanzas por el corredor húmedo. De repente, de las sombras salta una criatura chillona con una daga oxidada: ¡Un Goblin explorador bloquea el paso obligatorio!",
        defaultImage: "./assets/sprites/goblin.png",
        options: [
            { text: "¡Atacar y librar el primer combate de la mazmorra!", nextNode: "start_combat_goblin_1" }
        ]
    },

    // ⚔️ BATALLA 1: Goblin Explorador
    start_combat_goblin_1: {
        title: "COMBATE: GOBLIN EXPLORADOR",
        text: "El goblin se lanza con furia para evitar que sigas avanzando hacia el interior.",
        defaultImage: "./assets/sprites/goblin.png",
        options: []
    },

    // ==========================================
    // ETAPA 2: LA SALA INTERMEDIA Y SEGUNDO COMBATE
    // ==========================================
    after_combat_goblin_1: {
        title: "LA CÁMARA DE LOS TRIBUTOS",
        text: "Tras derrotar al explorador, encuentras un cofre menor y una escalinata que desciende hacia el corazón de la cripta, donde se escucha el eco de una bestia mayor.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Investigar el altar en busca de botín.", check: "int", dc: 11, successNode: "found_potions", failNode: "crypt_deeper" },
            { text: "Bajar directamente a enfrentar al guardián de la gema.", nextNode: "crypt_deeper" }
        ]
    },

    found_potions: {
        title: "ALCANTARILLA DE SUMINISTROS",
        text: "Descubres un escondite con hierbas curativas y una poción extra para tu inventario.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Continuar hacia el santuario interior.", nextNode: "crypt_deeper" }
        ]
    },

    crypt_deeper: {
        title: "EL SANTUARIO DEL GUARDIÁN",
        text: "Llegas al altar central. Flotando sobre un pedestal se encuentra la reluciente **Gema de Fuego Estelar**. Pero al acercarte, un enorme Goblin Élite con armadura pesada emerge rugiendo para proteger su tesoro.",
        defaultImage: "./assets/sprites/goblin.png",
        options: [
            { text: "¡Enfrentar al Jefe Guardián por la Gema!", nextNode: "start_combat_boss_goblin" }
        ]
    },

    // ⚔️ BATALLA 2 (JEFE): Goblin Élite Guardián
    start_combat_boss_goblin: {
        title: "JEFE: GOBLIN ÉLITE GUARDIÁN",
        text: "El líder de los asaltantes blande una maza gigantesca y protege la gema con su vida.",
        defaultImage: "./assets/sprites/goblin.png",
        options: []
    },

    // ==========================================
    // ETAPA 3: EL VIAJE DE REGRESO Y ENTREGA DE LA MISIÓN
    // ==========================================
    after_boss_victory: {
        title: "LA GEMA RECUPERADA",
        text: "¡El guardián cae derrotado! Tomas la **Gema de Fuego Estelar** entre tus manos. Sientes su calor místico. Ahora tienes la gema, pero recuerda que el objetivo principal **es regresar a la superficie y llevársela al mago en la taberna**.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Emprender el peligroso viaje de regreso a la superficie.", nextNode: "return_journey" }
        ]
    },

    return_journey: {
        title: "EL CAMINO DE VUELTA",
        text: "Mientras cruzas los túneles oscuros de regreso, un derrumbe bloquea la salida principal. Debes improvisar una ruta alternativa por las antiguas cavernas.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Trepar por chimeneas de roca inestables.", check: "dex", dc: 13, successNode: "return_success", failNode: "return_ambush" }
        ]
    },

    return_ambush: {
        title: "¡EMBOSCADA DE ALIMAÑAS!",
        text: "Una manada de ratas gigantes hambrientas te ataca en la oscuridad durante el desvío. Tienes que abrirte paso a golpes rápidos.",
        defaultImage: "./assets/sprites/rat.png",
        options: [
            { text: "¡Luchar contra la horda para salvar la gema!", nextNode: "start_combat_rats" }
        ]
    },

    return_success: {
        title: "¡SALIDA A LA SUPERFICIE!",
        text: "Sales exhausto pero triunfante de las catacumbas con la gema intacta. El aire fresco de la noche te revitaliza mientras te diriges de vuelta a la taberna.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Entrar a la Taberna del Dragón Tuerto a entregar la gema al mago.", nextNode: "mission_complete" }
        ]
    },

    // 🏆 OBJETIVO CUMPLIDO: ENTREGA DE LA MISIÓN
    mission_complete: {
        title: "MISIÓN CUMPLIDA: LA RECOMPENSA DEL MAGO",
        text: "Colocas la Gema de Fuego Estelar sobre la mesa del mago. Sus ojos se iluminan de asombro y gratitud. '¡Lo lograste aventurero! Has salvado mis investigaciones'. Te otorga una enorme recompensa de oro, experiencia y el respeto eterno del gremio.",
        defaultImage: "./assets/sprites/Campfire_4x.png",
        options: [
            { text: "Celebrar en la taberna e iniciar una nueva leyenda.", nextNode: "start_tavern" }
        ]
    },

    // Combates secundarios de rutas alternativas
    start_combat_rats: {
        title: "COMBATE: MANADA DE RATAS",
        text: "Las alimañas de las cloacas saltan sobre ti mostrando sus colmillos.",
        defaultImage: "./assets/sprites/rat.png",
        options: []
    }
};

// Mapeo dinámico de imágenes según el contexto de la historia
export function getDynamicImageForText(text, defaultImg) {
    if (!text) return defaultImg;
    const lower = text.toLowerCase();
    
    if (lower.includes("goblin") || lower.includes("guardián") || lower.includes("monstruo") || lower.includes("jefe")) {
        return "./assets/sprites/goblin.png";
    }
    if (lower.includes("rata") || lower.includes("alimaña") || lower.includes("manada")) {
        return "./assets/sprites/rat.png";
    }
    if (lower.includes("fuego") || lower.includes("taberna") || lower.includes("cofre") || lower.includes("tesoro") || lower.includes("gema")) {
        return "./assets/sprites/Campfire_4x.png";
    }
    return defaultImg;
}

// Resolución de votaciones en multijugador con manejo de empates
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