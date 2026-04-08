const mapContainer = document.getElementById('map');
const stats = document.getElementById('stats');
const legendContainer = document.getElementById('legend');

const biomeInput = document.getElementById('biome');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const tileSizeInput = document.getElementById('tileSize');
const intensityInput = document.getElementById('intensity');
const intensityValue = document.getElementById('intensityValue');
const iterationsInput = document.getElementById('iterations');
const seedInput = document.getElementById('seed');
const showOverlayInput = document.getElementById('showOverlay');
const showGridInput = document.getElementById('showGrid');

const generateBtn = document.getElementById('generateBtn');
const randomSeedBtn = document.getElementById('randomSeedBtn');
const copyBtn = document.getElementById('copyBtn');

let currentMap = [];
let currentSeed = '';
let currentPalette = {};
let currentLegend = [];

const TILE = {
    CAVE_ROCK: 1,
    CAVE_FLOOR: 0,
    TREE: 2,
    GRASS: 3,
    WATER: 4,
    ROAD: 5,
    BUILDING: 6,
    PLAZA: 7,
    RUIN: 8,
    SWAMP_MUD: 9,
    SWAMP_REED: 10,
};

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

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function makeRng(seedText, biome) {
    const normalized = seedText?.trim() || String(Date.now());
    currentSeed = `${normalized}:${biome}`;
    const hasher = xmur3(currentSeed);
    return mulberry32(hasher());
}

function makeGrid(width, height, fill = 0) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function inBounds(x, y, width, height) {
    return x >= 0 && y >= 0 && x < width && y < height;
}

function countNeighbors(grid, x, y, value) {
    let count = 0;
    for (let yy = y - 1; yy <= y + 1; yy++) {
        for (let xx = x - 1; xx <= x + 1; xx++) {
            if (xx === x && yy === y) continue;
            if (inBounds(xx, yy, grid[0].length, grid.length) && grid[yy][xx] === value) count++;
        }
    }
    return count;
}

function carveLine(grid, x0, y0, x1, y1, value, thickness = 1) {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        for (let oy = -thickness; oy <= thickness; oy++) {
            for (let ox = -thickness; ox <= thickness; ox++) {
                const nx = x + ox;
                const ny = y + oy;
                if (inBounds(nx, ny, grid[0].length, grid.length)) {
                    grid[ny][nx] = value;
                }
            }
        }
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

function generateCave(width, height, intensity, iterations, rng) {
    const wallProbability = clamp(intensity / 100, 0.25, 0.8);
    let grid = makeGrid(width, height, TILE.CAVE_ROCK);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
            grid[y][x] = isEdge || rng() < wallProbability ? TILE.CAVE_ROCK : TILE.CAVE_FLOOR;
        }
    }

    for (let i = 0; i < iterations; i++) {
        const next = grid.map((row) => [...row]);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const walls = countNeighbors(grid, x, y, TILE.CAVE_ROCK);
                if (walls > 4) next[y][x] = TILE.CAVE_ROCK;
                else if (walls < 4) next[y][x] = TILE.CAVE_FLOOR;
            }
        }
        grid = next;
    }

    return {
        map: grid,
        palette: {
            [TILE.CAVE_ROCK]: 'tile-cave-rock',
            [TILE.CAVE_FLOOR]: 'tile-cave-floor',
        },
        legend: [
            { className: 'tile-cave-floor', label: 'Sol' },
            { className: 'tile-cave-rock', label: 'Roche' },
        ],
        label: 'Cave',
    };
}

function generateForest(width, height, intensity, iterations, rng) {
    const treeDensity = clamp(intensity / 100, 0.2, 0.88);
    let grid = makeGrid(width, height, TILE.GRASS);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (rng() < treeDensity) grid[y][x] = TILE.TREE;
        }
    }

    for (let i = 0; i < Math.max(1, iterations - 1); i++) {
        const next = grid.map((row) => [...row]);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const trees = countNeighbors(grid, x, y, TILE.TREE);
                if (trees >= 5) next[y][x] = TILE.TREE;
                else if (trees <= 2) next[y][x] = TILE.GRASS;
            }
        }
        grid = next;
    }

    const riverStartY = Math.floor(rng() * height);
    let y = riverStartY;
    for (let x = 0; x < width; x++) {
        y += Math.floor((rng() - 0.5) * 3);
        y = clamp(y, 1, height - 2);
        grid[y][x] = TILE.WATER;
        if (rng() < 0.45 && y + 1 < height) grid[y + 1][x] = TILE.WATER;
    }

    const paths = clamp(Math.floor((intensity / 25) + 1), 1, 5);
    for (let p = 0; p < paths; p++) {
        carveLine(
            grid,
            Math.floor(rng() * width),
            Math.floor(rng() * height),
            Math.floor(rng() * width),
            Math.floor(rng() * height),
            TILE.ROAD,
            0,
        );
    }

    return {
        map: grid,
        palette: {
            [TILE.TREE]: 'tile-tree',
            [TILE.GRASS]: 'tile-grass',
            [TILE.WATER]: 'tile-water',
            [TILE.ROAD]: 'tile-road',
        },
        legend: [
            { className: 'tile-grass', label: 'Herbe' },
            { className: 'tile-tree', label: 'Arbre' },
            { className: 'tile-water', label: 'Rivière' },
            { className: 'tile-road', label: 'Sentier' },
        ],
        label: 'Forêt',
    };
}

function generateCity(width, height, intensity, iterations, rng) {
    const grid = makeGrid(width, height, TILE.BUILDING);
    const roadGap = clamp(Math.floor(8 - intensity / 20), 3, 7);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x % roadGap === 0 || y % roadGap === 0) {
                grid[y][x] = TILE.ROAD;
            }
        }
    }

    const plazas = clamp(Math.floor(intensity / 20), 2, 6);
    for (let i = 0; i < plazas; i++) {
        const cx = clamp(Math.floor(rng() * width), 2, width - 3);
        const cy = clamp(Math.floor(rng() * height), 2, height - 3);
        for (let y = cy - 1; y <= cy + 1; y++) {
            for (let x = cx - 1; x <= cx + 1; x++) {
                grid[y][x] = TILE.PLAZA;
            }
        }
    }

    for (let i = 0; i < iterations; i++) {
        const bx = clamp(Math.floor(rng() * width), 1, width - 4);
        const by = clamp(Math.floor(rng() * height), 1, height - 4);
        const bw = clamp(Math.floor(rng() * 4) + 2, 2, 5);
        const bh = clamp(Math.floor(rng() * 4) + 2, 2, 5);

        for (let y = by; y < by + bh && y < height - 1; y++) {
            for (let x = bx; x < bx + bw && x < width - 1; x++) {
                if (grid[y][x] !== TILE.ROAD && grid[y][x] !== TILE.PLAZA) {
                    grid[y][x] = rng() < 0.15 ? TILE.GRASS : TILE.BUILDING;
                }
            }
        }
    }

    return {
        map: grid,
        palette: {
            [TILE.ROAD]: 'tile-road',
            [TILE.BUILDING]: 'tile-building',
            [TILE.PLAZA]: 'tile-plaza',
            [TILE.GRASS]: 'tile-garden',
        },
        legend: [
            { className: 'tile-road', label: 'Route' },
            { className: 'tile-building', label: 'Bâtiment' },
            { className: 'tile-plaza', label: 'Place' },
            { className: 'tile-garden', label: 'Jardin' },
        ],
        label: 'Ville',
    };
}

function generateRuins(width, height, intensity, iterations, rng) {
    const grid = makeGrid(width, height, TILE.GRASS);
    const chunkCount = clamp(Math.floor((width * height) / 120), 10, 55);

    for (let i = 0; i < chunkCount; i++) {
        const cx = Math.floor(rng() * width);
        const cy = Math.floor(rng() * height);
        const radius = clamp(Math.floor(rng() * (intensity / 10)) + 1, 1, 6);
        for (let y = cy - radius; y <= cy + radius; y++) {
            for (let x = cx - radius; x <= cx + radius; x++) {
                if (inBounds(x, y, width, height) && rng() < 0.65) {
                    grid[y][x] = TILE.RUIN;
                }
            }
        }
    }

    for (let i = 0; i < iterations; i++) {
        const next = grid.map((row) => [...row]);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const ruins = countNeighbors(grid, x, y, TILE.RUIN);
                if (ruins >= 5) next[y][x] = TILE.RUIN;
                if (ruins <= 1) next[y][x] = TILE.GRASS;
            }
        }
        grid.splice(0, grid.length, ...next);
    }

    carveLine(grid, 0, Math.floor(height / 2), width - 1, Math.floor(height / 2), TILE.ROAD, 0);

    return {
        map: grid,
        palette: {
            [TILE.GRASS]: 'tile-grass',
            [TILE.RUIN]: 'tile-ruin',
            [TILE.ROAD]: 'tile-road',
        },
        legend: [
            { className: 'tile-grass', label: 'Terrain' },
            { className: 'tile-ruin', label: 'Ruines' },
            { className: 'tile-road', label: 'Voie antique' },
        ],
        label: 'Ruines',
    };
}

function generateSwamp(width, height, intensity, iterations, rng) {
    const grid = makeGrid(width, height, TILE.SWAMP_MUD);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const noise = rng();
            if (noise < intensity / 140) grid[y][x] = TILE.WATER;
            else if (noise < 0.6) grid[y][x] = TILE.SWAMP_MUD;
            else grid[y][x] = TILE.SWAMP_REED;
        }
    }

    for (let i = 0; i < iterations; i++) {
        const next = grid.map((row) => [...row]);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const water = countNeighbors(grid, x, y, TILE.WATER);
                const reeds = countNeighbors(grid, x, y, TILE.SWAMP_REED);
                if (water >= 5) next[y][x] = TILE.WATER;
                else if (reeds >= 5) next[y][x] = TILE.SWAMP_REED;
            }
        }
        grid.splice(0, grid.length, ...next);
    }

    for (let i = 0; i < Math.floor(width / 3); i++) {
        const x = Math.floor(rng() * width);
        const y = Math.floor(rng() * height);
        if (grid[y][x] === TILE.SWAMP_MUD && rng() < 0.55) grid[y][x] = TILE.TREE;
    }

    return {
        map: grid,
        palette: {
            [TILE.WATER]: 'tile-water-dark',
            [TILE.SWAMP_MUD]: 'tile-mud',
            [TILE.SWAMP_REED]: 'tile-reed',
            [TILE.TREE]: 'tile-dead-tree',
        },
        legend: [
            { className: 'tile-mud', label: 'Boue' },
            { className: 'tile-water-dark', label: 'Eau trouble' },
            { className: 'tile-reed', label: 'Roseaux' },
            { className: 'tile-dead-tree', label: 'Arbre mort' },
        ],
        label: 'Marais',
    };
}

function buildMap(width, height, biome, intensity, iterations, rng) {
    if (biome === 'forest') return generateForest(width, height, intensity, iterations, rng);
    if (biome === 'city') return generateCity(width, height, intensity, iterations, rng);
    if (biome === 'ruins') return generateRuins(width, height, intensity, iterations, rng);
    if (biome === 'swamp') return generateSwamp(width, height, intensity, iterations, rng);
    return generateCave(width, height, intensity, iterations, rng);
}

function renderMap(map, width, height, tileSize, palette, showOverlay, showGrid) {
    mapContainer.innerHTML = '';
    mapContainer.style.gridTemplateColumns = `repeat(${width}, ${tileSize}px)`;
    mapContainer.classList.toggle('show-grid', showGrid);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;

            const type = map[y][x];
            tile.classList.add(palette[type] || 'tile-cave-floor');

            if (showOverlay) {
                if (x > 0 && map[y][x - 1] !== type) tile.classList.add('shade-left');
                if (x < width - 1 && map[y][x + 1] !== type) tile.classList.add('shade-right');
                if (y > 0 && map[y - 1][x] !== type) tile.classList.add('shade-top');
            }

            mapContainer.appendChild(tile);
        }
    }
}

function renderLegend(entries) {
    legendContainer.innerHTML = '';
    entries.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        const swatch = document.createElement('span');
        swatch.className = `legend-swatch ${entry.className}`;
        const label = document.createElement('span');
        label.textContent = entry.label;
        item.append(swatch, label);
        legendContainer.appendChild(item);
    });
}

function formatStats(map, label) {
    const flat = map.flat();
    const total = flat.length;
    const detail = {};
    flat.forEach((value) => {
        detail[value] = (detail[value] || 0) + 1;
    });

    const occupied = Object.values(detail).sort((a, b) => b - a)[0] || 0;
    const variety = Object.keys(detail).length;
    const diversity = ((1 - occupied / total) * 100).toFixed(1);
    return `Biome: ${label} · Seed: ${currentSeed} · Tuiles: ${total} · Types: ${variety} · Diversité: ${diversity}%`;
}

function generateWorld() {
    const biome = biomeInput.value;
    const width = clamp(parseInt(widthInput.value, 10) || 56, 18, 160);
    const height = clamp(parseInt(heightInput.value, 10) || 36, 18, 120);
    const tileSize = clamp(parseInt(tileSizeInput.value, 10) || 20, 10, 40);
    const intensity = clamp(parseInt(intensityInput.value, 10) || 60, 20, 90);
    const iterations = clamp(parseInt(iterationsInput.value, 10) || 5, 1, 12);

    widthInput.value = width;
    heightInput.value = height;
    tileSizeInput.value = tileSize;
    intensityInput.value = intensity;
    intensityValue.textContent = `${intensity}%`;
    iterationsInput.value = iterations;

    const rng = makeRng(seedInput.value, biome);
    const result = buildMap(width, height, biome, intensity, iterations, rng);
    currentMap = result.map;
    currentPalette = result.palette;
    currentLegend = result.legend;

    renderMap(currentMap, width, height, tileSize, currentPalette, showOverlayInput.checked, showGridInput.checked);
    renderLegend(currentLegend);
    stats.textContent = formatStats(currentMap, result.label);
}

function generateRandomSeed() {
    seedInput.value = crypto.randomUUID().split('-')[0];
    generateWorld();
}

async function copyMapAsJson() {
    if (!currentMap.length) return;

    const payload = {
        seed: currentSeed,
        biome: biomeInput.value,
        width: currentMap[0].length,
        height: currentMap.length,
        legend: currentLegend,
        map: currentMap,
    };

    try {
        await navigator.clipboard.writeText(JSON.stringify(payload));
        copyBtn.textContent = 'JSON copié ✓';
    } catch {
        copyBtn.textContent = 'Copie impossible';
    }

    setTimeout(() => {
        copyBtn.textContent = 'Copier JSON';
    }, 1500);
}

[biomeInput, intensityInput, widthInput, heightInput, tileSizeInput, iterationsInput, showOverlayInput, showGridInput]
    .forEach((input) => input.addEventListener('input', generateWorld));

generateBtn.addEventListener('click', generateWorld);
randomSeedBtn.addEventListener('click', generateRandomSeed);
copyBtn.addEventListener('click', copyMapAsJson);

if (!seedInput.value.trim()) {
    seedInput.value = 'world-rpg';
}

generateWorld();
