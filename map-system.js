// map-system.js - Motor de Exploración y Movimiento por Votación Democrática
import { switchScreen, showCustomModal } from './ui-controller.js';

const TILE_SIZE = 40;
const MAP_SIZE = 10;

// Matriz base: 0 = Camino, 1 = Pared, 2 = Salida, 3 = Cofre, 4 = Enemigo
export let dungeonMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 4, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 4, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 4, 1],
    [1, 3, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

export let playerPos = { x: 1, y: 1 };

export function drawDungeonMap() {
    const canvas = document.getElementById('dungeon-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < MAP_SIZE; row++) {
        for (let col = 0; col < MAP_SIZE; col++) {
            const tile = dungeonMap[row][col];
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;

            if (tile === 1) {
                // Pared
                ctx.fillStyle = "#313244";
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = "#11111b";
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            } else {
                // Suelo
                ctx.fillStyle = "#181825";
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                if (tile === 4) {
                    ctx.fillStyle = "#f38ba8"; // Enemigo
                    ctx.beginPath();
                    ctx.arc(x + 20, y + 20, 10, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tile === 3) {
                    ctx.fillStyle = "#f9e2af"; // Cofre
                    ctx.fillRect(x + 10, y + 10, 20, 20);
                } else if (tile === 2) {
                    ctx.fillStyle = "#a6e3a1"; // Salida
                    ctx.fillRect(x + 5, y + 5, 30, 30);
                }
            }
        }
    }

    // Ficha del Grupo de Aventureros
    ctx.fillStyle = "#89b4fa";
    ctx.beginPath();
    ctx.arc(playerPos.x * TILE_SIZE + 20, playerPos.y * TILE_SIZE + 20, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#cdd6f4";
    ctx.stroke();
}

// SISTEMA DEMOCRÁTICO DE RECUENTO DE VOTOS
export function resolveDemocraticMove(votes) {
    // votes = { "uid1": "UP", "uid2": "LEFT", "uid3": "LEFT" }
    const voteCounts = { UP: 0, DOWN: 0, LEFT: 0, RIGHT: 0 };

    Object.values(votes).forEach(dir => {
        if (voteCounts[dir] !== undefined) {
            voteCounts[dir]++;
        }
    });

    // Encontrar la dirección o direcciones con más votos
    let maxVotes = 0;
    let winningDirections = [];

    for (const [dir, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            winningDirections = [dir];
        } else if (count === maxVotes && count > 0) {
            winningDirections.push(dir);
        }
    }

    if (winningDirections.length === 0) return null;

    // Si hay empate, elegir una dirección al azar entre las ganadoras
    let selectedDirection = winningDirections[0];
    let isTie = false;

    if (winningDirections.length > 1) {
        isTie = true;
        const randomIndex = Math.floor(Math.random() * winningDirections.length);
        selectedDirection = winningDirections[randomIndex];
    }

    // Convertir dirección a deltas (dx, dy)
    let dx = 0, dy = 0;
    if (selectedDirection === "UP") dy = -1;
    if (selectedDirection === "DOWN") dy = 1;
    if (selectedDirection === "LEFT") dx = -1;
    if (selectedDirection === "RIGHT") dx = 1;

    return { selectedDirection, dx, dy, isTie, maxVotes };
}

export function executeMove(dx, dy, onEncounter) {
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    // Validar si la casilla destino es una pared
    if (dungeonMap[newY] && dungeonMap[newY][newX] !== 1) {
        playerPos.x = newX;
        playerPos.y = newY;
        drawDungeonMap();

        // Si se entra en la casilla de un enemigo (4)
        if (dungeonMap[newY][newX] === 4) {
            dungeonMap[newY][newX] = 0; // Se remueve del mapa
            onEncounter(); // Iniciar combate
        }
    }
}