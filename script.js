const mapContainer = document.getElementById('map');
const generateBtn = document.getElementById('generateBtn');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const generateLowerWallsBtn = document.getElementById('generateLowerWalls');

let tileSize = 32;
let mapWidth = parseInt(widthInput.value);
let mapHeight = parseInt(heightInput.value);
let generateLowerWalls = false;

generateBtn.addEventListener('click', generateCave);
widthInput.addEventListener('change', updateMapSize);
heightInput.addEventListener('change', updateMapSize);
generateLowerWallsBtn.addEventListener('change', toggleGenerateLowerWalls);

function updateMapSize() {
    mapWidth = parseInt(widthInput.value);
    mapHeight = parseInt(heightInput.value);
    generateCave();
}

function toggleGenerateLowerWalls() {
    generateLowerWalls = generateLowerWallsBtn.checked;
    generateCave();
}

function generateCave() {
    mapContainer.innerHTML = '';

    const map = generateInitialMap(mapWidth, mapHeight);
    const newMap = simulateAutomata(map, 5);

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');

            if (newMap[y][x] === 1) {
                tile.classList.add('empty');
            } else {
                tile.classList.add('floor');
            }

            mapContainer.appendChild(tile);
        }
        mapContainer.appendChild(document.createElement('br')); 
    }

    // Generate lower walls
    if (generateLowerWalls) {
        for (let y = 1; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                if (newMap[y][x] === 0 && newMap[y - 1][x] === 1) {
                    const tileBelow = mapContainer.children[(y * mapWidth) + x];
                    tileBelow.classList.remove('empty');
                    tileBelow.classList.add('wall');
                }
            }
        }
    }
}

function generateInitialMap(width, height) {
    const map = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push(Math.random() < 0.45 ? 1 : 0);
        }
        map.push(row);
    }
    return map;
}

function simulateAutomata(map, iterations) {
    for (let i = 0; i < iterations; i++) {
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const neighbors = countWallNeighbors(map, x, y);
                if (neighbors > 4) {
                    map[y][x] = 1;
                } else if (neighbors < 4) {
                    map[y][x] = 0;
                }
            }
        }
    }
    return map;
}

function countWallNeighbors(map, cx, cy) {
    let count = 0;
    for (let y = cy - 1; y <= cy + 1; y++) {
        for (let x = cx - 1; x <= cx + 1; x++) {
            if (x === cx && y === cy) continue; 
            if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
                count++;
            } else if (map[y][x] === 1) {
                count++;
            }
        }
    }
    return count;
}
