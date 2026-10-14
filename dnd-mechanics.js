// dnd-mechanics.js - Sistema de Combate D&D 5e, Monstruos e Historias

export function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

export function getStatModifier(statScore) {
    return Math.floor((statScore - 10) / 2);
}

// Base de Datos de Enemigos por Nivel de Dificultad (Tiers)
export const ENEMY_DATABASE = {
    // Tier 1: Nivel de Party 1 - 2 (Fácil / Inicio)
    1: [
        {
            name: "Goblin Explorador",
            hp: 25,
            maxHp: 25,
            ac: 12,
            attackBonus: 3,
            damageDice: 6,
            expReward: 35,
            goldReward: 15,
            image: "https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/19.png", // Sprite Pixel Temp / Reemplazable
            introText: "Escuchas pisadas rápidas sobre la hojarasca. Un Goblin desnutrido blande su daga en las sombras."
        },
        {
            name: "Rata Gigante de Cripta",
            hp: 20,
            maxHp: 20,
            ac: 11,
            attackBonus: 2,
            damageDice: 4,
            expReward: 25,
            goldReward: 10,
            image: "https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/20.png",
            introText: "Un chillido agudo resuena en la humedad del pasillo. Una rata del tamaño de un lobo enseña sus colmillos."
        },
        {
            name: "Esqueleto Reanimado",
            hp: 30,
            maxHp: 30,
            ac: 13,
            attackBonus: 3,
            damageDice: 6,
            expReward: 40,
            goldReward: 20,
            image: "https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/104.png",
            introText: "Los huesos crujen sobre el suelo de piedra seco. Una fuerza nigromántica alza a un antiguo guerrero olvidado."
        }
    ],

    // Tier 2: Nivel de Party 3 - 4 (Medio)
    2: [
        {
            name: "Orco Guerrero",
            hp: 55,
            maxHp: 55,
            ac: 14,
            attackBonus: 5,
            damageDice: 8,
            expReward: 80,
            goldReward: 45,
            image: "https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/67.png",
            introText: "Un rugido ensordecedor retumba en la sala de armas. Un gran Orco se interpone con un hacha pesada."
        },
        {
            name: "Araña Tejedora de Sombras",
            hp: 45,
            maxHp: 45,
            ac: 14,
            attackBonus: 5,
            damageDice: 8,
            expReward: 75,
            goldReward: 35,
            image: "https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/168.png",
            introText: "Telarañas densas caen del techo. Una enorme araña de ojos brillantes se descolgará directamente sobre la party."
        }
    ],

    // Tier 3: Nivel de Party 5+ (Difícil / Jefe)
    3: [
        {
            name: "Rey Esqueleto de la Cripta",
            hp: 110,
            maxHp: 110,
            ac: 16,
            attackBonus: 6,
            damageDice: 10,
            expReward: 180,
            goldReward: 120,
            image: "https://raw.githubusercontent.com/pokeapi/sprites/master/sprites/pokemon/105.png",
            introText: "El trono de piedra tiembla. El antiguo monarca de las catacumbas se levanta empuñando su mandoble maldito."
        }
    ]
};

// Función para seleccionar un enemigo adecuado al Nivel de la Party
export function getRandomEnemyForLevel(partyLevel = 1) {
    let tier = 1;
    if (partyLevel >= 5) tier = 3;
    else if (partyLevel >= 3) tier = 2;

    const possibleEnemies = ENEMY_DATABASE[tier];
    const randomIndex = Math.floor(Math.random() * possibleEnemies.length);
    return JSON.parse(JSON.stringify(possibleEnemies[randomIndex])); // Copia limpia
}