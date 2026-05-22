// Variáveis do Jogo
let money = 15;
let ecoPoints = 0;
let water = 100;

// Inventário de colheita do jogador
let inventory = { Alface: 0, Tomate: 0, Cenoura: 0 };
// Tipos de sementes disponíveis
const cropsConfig = {
    Alface: { time: 3000, icon: "🥬", cost: 2, price: 5 },
    Tomate: { time: 6000, icon: "🍅", cost: 4, price: 10 },
    Cenoura: { time: 9000, icon: "🥕", cost: 6, price: 15 }
};

let currentOrder = { item: "Alface", quantity: 2 };

// Inicializar canteiros (9 lotes de terra)
const totalPlots = 6;
let plotsState = Array(totalPlots).fill(null).map(() => ({ status: "vazio", crop: null, timer: null }));

function initGame() {
    const grid = document.getElementById("farm-grid");
    grid.innerHTML = "";
    
    for (let i = 0; i < totalPlots; i++) {
        const plotDiv = document.createElement("div");
        plotDiv.className = "plot";
        plotDiv.id = `plot-${i}`;
        plotDiv.onclick = () => interactPlot(i);
        grid.appendChild(plotDiv);
        updatePlotUI(i);
    }
    generateNewOrder();
    updateUI();
    
    // Recuperação sustentável de água com o tempo
    setInterval(() => {
        if (water < 100) {
            water = Math.min(100, water + 5);
            updateUI();
        }
    }, 4000);
}

function updateUI() {
    document.getElementById("money").innerText = money;
    document.getElementById("water-level").innerText = water;
    document.getElementById("eco-points").innerText = ecoPoints;
}

function updatePlotUI(index) {
    const plot