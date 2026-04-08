const mapContainer = document.getElementById('map');
const stats = document.getElementById('stats');

const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const tileSizeInput = document.getElementById('tileSize');
const densityInput = document.getElementById('density');
const densityValue = document.getElementById('densityValue');
const iterationsInput = document.getElementById('iterations');
const seedInput = document.getElementById('seed');
const showFrontWallsInput = document.getElementById('showFrontWalls');
const showSideShadingInput = document.getElementById('showSideShading');

const generateBtn = document.getElementById('generateBtn');
const randomSeedBtn = document.getElementById('randomSeedBtn');
const copyBtn = document.getElementById('copyBtn');

let currentMap = [];
let currentSeed = '';

function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function hash() {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

function mulberry32(seed) {
    return function random() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function getRng(seedText) {
    const normalized = seedText?.trim() || String(Date.now());
    const hasher = xmur3(normalized);
    currentSeed = normalized;
    return mulberry32(hasher());
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function generateInitialMap(width, height, wallProbability, rng) {
    const map = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
            if (isEdge) {
                row.push(1);
            } else {
                row.push(rng() < wallProbability ? 1 : 0);
            }
        }
        map.push(row);
    }
    return map;
}

function countWallNeighbors(map, cx, cy, width, height) {
    let count = 0;
    for (let y = cy - 1; y <= cy + 1; y++) {
        for (let x = cx - 1; x <= cx + 1; x++) {
            if (x === cx && y === cy) continue;
            if (x < 0 || y < 0 || x >= width || y >= height) {
                count++;
            } else if (map[y][x] === 1) {
                count++;
            }
        }
    }
    return count;
}

function simulateAutomata(map, iterations, width, height) {
    let work = map.map((row) => [...row]);

    for (let i = 0; i < iterations; i++) {
        const next = work.map((row) => [...row]);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const neighbors = countWallNeighbors(work, x, y, width, height);
                if (neighbors > 4) {
                    next[y][x] = 1;
                } else if (neighbors < 4) {
                    next[y][x] = 0;
                }
            }
        }
        work = next;
    }

    return work;
}

function renderMap(map, width, height, tileSize, showFrontWalls, showSideShading) {
    mapContainer.innerHTML = '';
    mapContainer.style.gridTemplateColumns = `repeat(${width}, ${tileSize}px)`;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;

            const isRock = map[y][x] === 1;
            if (isRock) {
                tile.classList.add('rock');
            } else {
                tile.classList.add('floor');
            }

            if (showFrontWalls && !isRock && y > 0 && map[y - 1][x] === 1) {
                tile.classList.remove('floor');
                tile.classList.add('wall-front');
            }

            if (showSideShading && !isRock) {
                if (x < width - 1 && map[y][x + 1] === 1) tile.classList.add('shadow-right');
                if (x > 0 && map[y][x - 1] === 1) tile.classList.add('shadow-left');
            }

            mapContainer.appendChild(tile);
        }
    }
}

function formatStats(map) {
    const total = map.flat().length;
    const walls = map.flat().filter((v) => v === 1).length;
    const floors = total - walls;
    const floorRatio = ((floors / total) * 100).toFixed(1);
    return `Seed: ${currentSeed} · Sol: ${floors} · Roche: ${walls} · Surface jouable: ${floorRatio}%`;
}

function generateCave() {
    const width = clamp(parseInt(widthInput.value, 10) || 42, 12, 120);
    const height = clamp(parseInt(heightInput.value, 10) || 28, 12, 120);
    const tileSize = clamp(parseInt(tileSizeInput.value, 10) || 24, 12, 48);
    const density = clamp(parseInt(densityInput.value, 10) || 46, 30, 65);
    const iterations = clamp(parseInt(iterationsInput.value, 10) || 5, 1, 10);

    widthInput.value = width;
    heightInput.value = height;
    tileSizeInput.value = tileSize;
    densityInput.value = density;
    densityValue.textContent = `${density}%`;
    iterationsInput.value = iterations;

    const rng = getRng(seedInput.value);
    const initialMap = generateInitialMap(width, height, density / 100, rng);
    currentMap = simulateAutomata(initialMap, iterations, width, height);

    renderMap(
        currentMap,
        width,
        height,
        tileSize,
        showFrontWallsInput.checked,
        showSideShadingInput.checked,
    );

    stats.textContent = formatStats(currentMap);
}

function generateRandomSeed() {
    seedInput.value = crypto.randomUUID().split('-')[0];
    generateCave();
}

async function copyMapAsJson() {
    if (!currentMap.length) return;

    const payload = {
        seed: currentSeed,
        width: currentMap[0].length,
        height: currentMap.length,
        map: currentMap,
    };

    const text = JSON.stringify(payload);

    try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'JSON copié ✓';
    } catch {
        copyBtn.textContent = 'Copie impossible';
    }

    setTimeout(() => {
        copyBtn.textContent = 'Copier JSON';
    }, 1500);
}

[densityInput, widthInput, heightInput, tileSizeInput, iterationsInput, showFrontWallsInput, showSideShadingInput]
    .forEach((input) => input.addEventListener('input', generateCave));

generateBtn.addEventListener('click', generateCave);
randomSeedBtn.addEventListener('click', generateRandomSeed);
copyBtn.addEventListener('click', copyMapAsJson);

if (!seedInput.value.trim()) {
    seedInput.value = 'cave-rpg';
}

generateCave();
