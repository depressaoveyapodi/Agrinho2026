// Variáveis do Jogo
let money = 50;
let ecoPoints = 0;
let water = 100;
// Estado do sistema de chuva
let isRaining = false;
let rainTimer = null;

// Inventário de colheita do jogador
let inventory = {
    Alface: { good: 0, spoiled: 0 },
    Tomate: { good: 0, spoiled: 0 },
    Cenoura: { good: 0, spoiled: 0 },
    Morango: { good: 0, spoiled: 0 },
    Abacaxi: { good: 0, spoiled: 0 },
    Batata: { good: 0, spoiled: 0 },
    Brocolis: { good: 0, spoiled: 0 },
    Pimenta: { good: 0, spoiled: 0 }
};
// Tipos de sementes disponíveis
const cropsConfig = {
    Alface: { time: 3000, icon: "🥬", cost: 2, price: 10 },
    Tomate: { time: 6000, icon: "🍅", cost: 4, price: 20 },
    Cenoura: { time: 9000, icon: "🥕", cost: 6, price: 45 },
    Morango: { time: 4000, icon: "🍓", cost: 5, price: 20 },
    Abacaxi: { time: 12000, icon: "🍍", cost: 10, price: 50 },
    Batata: { time: 5000, icon: "🥔", cost: 3, price: 15 },
    Brocolis: { time: 7000, icon: "🥦", cost: 5, price: 30 },
    Pimenta: { time: 4500, icon: "🌶️", cost: 4, price: 25 }
};

let currentOrder = null;
let selectedCrop = "Alface";
let vinegarWater = 0;
let autoPlantEnabled = false;
let autoDeliveryEnabled = false;
let autoPestDefenseEnabled = false;

// Inicializar canteiros
const totalPlots = 6;
let plotsState = Array(totalPlots).fill(null).map(() => ({ status: "vazio", crop: null, timer: null, pestStatus: "normal", pestTimer: null, protectionTimer: null }));

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

    renderCropOptions();
    generateNewOrder();
    updateUI();
    updateOrderUI();
    updateInventoryUI();
    startPestChecks();
    startAutomationLoops();
    startRainSystem();

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
    document.getElementById("vinegar-count").innerText = vinegarWater;
    document.getElementById("rain-status").innerText = isRaining ? "Chovendo" : "Nenhuma";
    updateAutomationStatus();
    updateInventoryUI();
    // Atualiza multiplicador de venda conforme eco-points
    const mult = getSellMultiplier();
    document.getElementById("sell-multiplier").innerText = `${Math.round((mult - 1) * 100)}%`;
}

function getSellMultiplier() {
    if (ecoPoints >= 500) return 1.5; // +50%
    if (ecoPoints >= 100) return 1.25; // +25%
    if (ecoPoints >= 50) return 1.10; // +10%
    return 1.0;
}

function updateAutomationStatus() {
    document.getElementById("auto-plant-status").innerText = autoPlantEnabled ? "Ativado" : "Desativado";
    document.getElementById("auto-delivery-status").innerText = autoDeliveryEnabled ? "Ativado" : "Desativado";
    document.getElementById("auto-pest-status").innerText = autoPestDefenseEnabled ? "Ativado" : "Desativado";
}

function buyVinegarWater() {
    if (money < 50) {
        alert("Você não tem moedas suficientes para comprar água com vinagre.");
        return;
    }

    money -= 50;
    vinegarWater += 1;
    updateUI();
    alert("Você comprou água com vinagre e está pronto para combater pragas!");
}

function buyAutoPlant() {
    if (autoPlantEnabled) {
        alert("Automatização de plantio já está ativada.");
        return;
    }
    if (money < 500) {
        alert("Você não tem moedas suficientes para automatizar o plantio.");
        return;
    }
    money -= 500;
    autoPlantEnabled = true;
    updateUI();
    alert("Plantio automatizado ativado! O sistema irá plantar sempre que houver canteiros livres e condições.");
}

function buyAutoDelivery() {
    if (autoDeliveryEnabled) {
        alert("Automatização de entrega já está ativada.");
        return;
    }
    if (money < 750) {
        alert("Você não tem moedas suficientes para automatizar as entregas.");
        return;
    }
    money -= 750;
    autoDeliveryEnabled = true;
    updateUI();
    alert("Entrega automatizada ativada! O pedido será enviado automaticamente quando estiver pronto.");
}

function buyAutoPestDefense() {
    if (autoPestDefenseEnabled) {
        alert("Automatização de combate a pragas já está ativada.");
        return;
    }
    if (money < 1000) {
        alert("Você não tem moedas suficientes para automatizar o combate de pragas.");
        return;
    }
    money -= 1000;
    autoPestDefenseEnabled = true;
    updateUI();
    alert("Proteção automática contra pragas ativada! O sistema usará água com vinagre em canteiros infestados.");
}

function startPestChecks() {
    setInterval(() => {
        plotsState.forEach((state, index) => {
            if (state.status === "plantado" || state.status === "pronto") {
                if (Math.random() < 0.15) {
                    handlePestAttack(index);
                }
            }
        });
    }, 6000);
}

function startAutomationLoops() {
    setInterval(() => {
        if (autoPlantEnabled) {
            autoPlant();
        }
        if (autoDeliveryEnabled) {
            autoDeliver();
        }
        if (autoPestDefenseEnabled) {
            autoPestDefense();
        }
    }, 5000);
}

function startRainSystem() {
    setInterval(() => {
        if (!isRaining && Math.random() < 0.5) {
            startRain();
        }
    }, 30000);
}

function startRain() {
    isRaining = true;
    water = 100;
    updateUI();
    alert("Começou a chover! Água disponível em 100% por 1 minuto.");
    if (rainTimer) {
        clearTimeout(rainTimer);
    }
    rainTimer = setTimeout(() => {
        isRaining = false;
        updateUI();
        alert("A chuva acabou.");
        rainTimer = null;
    }, 60000);
}

function autoPlant() {
    const emptyIndex = plotsState.findIndex(state => state.status === "vazio");
    if (emptyIndex === -1) return;
    const crop = cropsConfig[selectedCrop];
    if (money < crop.cost || water < 10) return;
    plantCrop(emptyIndex);
}

function autoDeliver() {
    if (!currentOrder) return;
    const have = getInventoryTotal(currentOrder.item);
    if (have >= currentOrder.quantity) {
        deliverOrder();
    }
}

function autoPestDefense() {
    if (vinegarWater <= 0) return;
    plotsState.forEach((state, index) => {
        if (state.pestStatus === "infestada") {
            applyVinegarProtection(index);
        }
    });
}

function handlePestAttack(index) {
    const state = plotsState[index];
    if (!state || (state.status !== "plantado" && state.status !== "pronto")) return;
    if (state.pestStatus === "protected") return;
    if (state.pestStatus === "infestada") return;

    state.pestStatus = "infestada";
    if (state.pestTimer) {
        clearTimeout(state.pestTimer);
    }
    state.pestTimer = setTimeout(() => destroyInfestedPlot(index), 15000);
    updatePlotUI(index);
    alert(`Plantação infestada! As pragas estão por perto em ${state.crop.name}. Use água com vinagre para proteger a cultura.`);
}

function applyVinegarProtection(index) {
    const state = plotsState[index];
    if (!state || state.pestStatus !== "infestada") {
        alert("Não há pragas ativos neste canteiro no momento.");
        return;
    }
    if (vinegarWater <= 0) {
        alert("Você não tem água com vinagre para proteger essa plantação.");
        return;
    }

    vinegarWater -= 1;
    ecoPoints += 10;
    state.pestStatus = "protected";
    if (state.pestTimer) {
        clearTimeout(state.pestTimer);
        state.pestTimer = null;
    }
    if (state.protectionTimer) {
        clearTimeout(state.protectionTimer);
    }
    state.protectionTimer = setTimeout(() => removeProtection(index), 90000);
    updateUI();
    updatePlotUI(index);
    alert(`Plantação protegida por 1 minuto e 30 segundos! Parabéns pelo uso livre de agrotóxicos, você ganhou 10 eco-pontos.`);
}

function removeProtection(index) {
    const state = plotsState[index];
    if (!state || state.pestStatus !== "protected") return;

    state.pestStatus = "normal";
    state.protectionTimer = null;
    updatePlotUI(index);
}

function destroyInfestedPlot(index) {
    const state = plotsState[index];
    if (!state || state.pestStatus !== "infestada") return;

    if (state.timer) {
        clearTimeout(state.timer);
    }
    plotsState[index] = { status: "vazio", crop: null, timer: null, pestStatus: "normal", pestTimer: null, protectionTimer: null };
    updatePlotUI(index);
    updateUI();
    alert(`Pragas destruíram a plantação de ${state.crop.name}!`);
}

function updateInventoryUI() {
    const inventoryContainer = document.getElementById("inventory-items");
    inventoryContainer.innerHTML = "";

    for (const cropName in inventory) {
        const goodCount = inventory[cropName].good;
        const spoiledCount = inventory[cropName].spoiled;
        const crop = cropsConfig[cropName];
        const item = document.createElement("div");
        item.className = "inventory-item";
        item.innerHTML = `
            <strong>${crop.icon} ${cropName}</strong>
            <span>${goodCount + spoiledCount} unidade${goodCount + spoiledCount === 1 ? "" : "s"}</span>
            ${spoiledCount > 0 ? `<span>${spoiledCount} danificada${spoiledCount === 1 ? "" : "s"}</span>` : ""}
        `;
        inventoryContainer.appendChild(item);
    }
}

function getInventoryTotal(cropName) {
    return inventory[cropName].good + inventory[cropName].spoiled;
}

function removeInventory(cropName, quantity) {
    let remaining = quantity;
    const goods = inventory[cropName].good;
    const spoiled = inventory[cropName].spoiled;
    const useGood = Math.min(goods, remaining);
    remaining -= useGood;
    const useSpoiled = Math.min(spoiled, remaining);
    inventory[cropName].good -= useGood;
    inventory[cropName].spoiled -= useSpoiled;
    return { good: useGood, spoiled: useSpoiled };
}

function updateOrderUI() {
    const orderText = document.getElementById("order-text");
    if (!currentOrder) {
        orderText.innerText = "Carregando pedido...";
        return;
    }
    orderText.innerText = `Cliente pede ${currentOrder.quantity}x ${currentOrder.item}.`;
}

function renderCropOptions() {
    const optionsContainer = document.getElementById("crop-options");
    optionsContainer.innerHTML = "";

    for (const cropName in cropsConfig) {
        const crop = cropsConfig[cropName];
        const button = document.createElement("div");
        button.className = "crop-option";
        if (cropName === selectedCrop) button.classList.add("selected");
        button.innerHTML = `<strong>${crop.icon} ${cropName}</strong><div>Preço: ${crop.cost} moedas</div>`;
        button.onclick = () => selectCrop(cropName);
        optionsContainer.appendChild(button);
    }
}

function selectCrop(cropName) {
    selectedCrop = cropName;
    renderCropOptions();
}

function updatePlotUI(index) {
    const plot = document.getElementById(`plot-${index}`);
    const state = plotsState[index];
    plot.className = "plot";
    plot.innerHTML = "";

    if (state.pestStatus === "infestada") {
        plot.classList.add("infested");
    } else if (state.pestStatus === "protected") {
        plot.classList.add("protected");
    }

    if (state.status === "vazio") {
        plot.innerHTML = `<strong>Terra livre</strong><div class="plot-btn">Clique para plantar</div>`;
    } else if (state.status === "plantado") {
        plot.innerHTML = `<div>${state.crop.icon}</div><strong>${state.crop.name}</strong><div>Em crescimento...</div>`;
        if (state.pestStatus === "infestada") {
            plot.innerHTML += `<div class="plot-status infestada">Plantação infestada! As pragas estão por perto.</div><div class="plot-btn" onclick="applyVinegarProtection(${index}); event.stopPropagation();">Usar água com vinagre</div>`;
        } else if (state.pestStatus === "protected") {
            plot.innerHTML += `<div class="plot-status protegida">Protegida por 1 minuto e 30 segundos</div>`;
        }
    } else if (state.status === "pronto") {
        plot.classList.add("ready");
        plot.innerHTML = `<div>${state.crop.icon}</div><strong>${state.crop.name}</strong><div>Pronto para colher</div><div class="plot-btn">Clique para colher</div>`;
        if (state.pestStatus === "infestada") {
            plot.innerHTML += `<div class="plot-status infestada">Plantação infestada! As pragas estão por perto.</div><div class="plot-btn" onclick="applyVinegarProtection(${index}); event.stopPropagation();">Usar água com vinagre</div>`;
        } else if (state.pestStatus === "protected") {
            plot.innerHTML += `<div class="plot-status protegida">Protegida por 1 minuto e 30 segundos</div>`;
        }
    }
}

function interactPlot(index) {
    const state = plotsState[index];
    if (state.status === "vazio") {
        plantCrop(index);
    } else if (state.status === "pronto") {
        harvestCrop(index);
    }
}

function plantCrop(index) {
    const crop = cropsConfig[selectedCrop];

    if (money < crop.cost) {
        alert("Você não tem moedas suficientes para plantar.");
        return;
    }
    if (water < 10) {
        alert("Água insuficiente para plantar. Aguarde o reabastecimento.");
        return;
    }

    money -= crop.cost;
    water = Math.max(0, water - 10);
    plotsState[index] = { status: "plantado", crop: { ...crop, name: selectedCrop }, timer: null, pestStatus: "normal", pestTimer: null, protectionTimer: null };
    updatePlotUI(index);
    updateUI();

    plotsState[index].timer = setTimeout(() => completeCrop(index), crop.time);
}

function completeCrop(index) {
    const state = plotsState[index];
    if (!state || state.status !== "plantado") return;

    state.status = "pronto";
    updatePlotUI(index);
}

function harvestCrop(index) {
    const state = plotsState[index];
    if (!state || state.status !== "pronto") return;

    const cropName = state.crop.name;
    if (state.pestStatus === "infestada") {
        inventory[cropName].spoiled += 1;
    } else {
        inventory[cropName].good += 1;
    }

    if (state.timer) {
        clearTimeout(state.timer);
    }
    plotsState[index] = { status: "vazio", crop: null, timer: null, pestStatus: "normal", pestTimer: null, protectionTimer: null };
    updatePlotUI(index);
    updateUI();
    alert(`Você colheu ${state.crop.name}!${state.pestStatus === "infestada" ? " Essa colheita está danificada e terá metade do valor de venda." : ""}`);
}

function generateNewOrder() {
    const cropNames = Object.keys(cropsConfig);
    const item = cropNames[Math.floor(Math.random() * cropNames.length)];
    const quantity = Math.floor(Math.random() * 2) + 1;
    currentOrder = { item, quantity };
    updateOrderUI();
}

function deliverOrder() {
    if (!currentOrder) {
        alert("Aguardando pedido do cliente.");
        return;
    }

    const have = getInventoryTotal(currentOrder.item);
    if (have < currentOrder.quantity) {
        alert("Você ainda não tem o pedido completo. Continue colhendo.");
        return;
    }

    const removed = removeInventory(currentOrder.item, currentOrder.quantity);
    const cropPrice = cropsConfig[currentOrder.item].price;
    const multiplier = getSellMultiplier();
    const goodPrice = Math.round(cropPrice * multiplier);
    const spoiledPrice = Math.round((cropPrice / 2) * multiplier);
    const reward = goodPrice * removed.good + spoiledPrice * removed.spoiled;
    money += reward;
    ecoPoints += currentOrder.quantity * 2;
    let message = `Pedido entregue! Você ganhou ${reward} moedas e ${currentOrder.quantity * 2} eco-pontos.`;
    if (removed.spoiled > 0) {
        message += ` (${removed.spoiled} unidade${removed.spoiled === 1 ? "" : "s"} danificada${removed.spoiled === 1 ? "" : "s"} vendida com metade do valor.)`;
    }
    alert(message);
    generateNewOrder();
    updateUI();
}

window.onload = initGame;
