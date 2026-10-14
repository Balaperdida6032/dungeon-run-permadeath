// map-system.js - Motor de Exploración del Mapa 2D por Cuadrícula
import { switchScreen } from './ui-controller.js';

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

                // Elementos Especiales
                if (tile === 4) {
                    ctx.fillStyle = "#f38ba8"; // Enemigo
                    ctx.beginPath();
                    ctx.arc(x + 20, y + 20, 10, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tile === 3) {
                    ctx.fillStyle = "#f9e2af"; // Cofre
                    ctx.fillRect(x + 10, y + 10, 20, 20);
                } else if (tile === 2) {
                    ctx.fillStyle = "#a6e3a1"; // Escalera / Salida
                    ctx.fillRect(x + 5, y + 5, 30, 30);
                }
            }
        }
    }

    // Dibujar Héroe (Ficha Verde)
    ctx.fillStyle = "#89b4fa";
    ctx.beginPath();
    ctx.arc(playerPos.x * TILE_SIZE + 20, playerPos.y * TILE_SIZE + 20, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#cdd6f4";
    ctx.stroke();
}

export function movePlayer(dx, dy, onEncounter) {
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    // Verificar colisión con pared
    if (dungeonMap[newY] && dungeonMap[newY][newX] !== 1) {
        playerPos.x = newX;
        playerPos.y = newY;
        drawDungeonMap();

        // Si pisó un enemigo (4)
        if (dungeonMap[newY][newX] === 4) {
            dungeonMap[newY][newX] = 0; // Quitar el enemigo del mapa
            onEncounter(); // Disparar la transición a combate
        }
    }
}