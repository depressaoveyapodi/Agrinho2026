// Variáveis do Jogo
let money = 10000;
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
    Pimenta: { good: 0, spoiled: 0 },
    Lavanda: { good: 0, spoiled: 0 },
    Rosa: { good: 0, spoiled: 0 },
    Girassol: { good: 0, spoiled: 0 }
};
// Tipos de sementes disponíveis
const cropsConfig = {
    Alface: { time: 3000, icon: "🥬", cost: 2, price: 10, sellable: true },
    Tomate: { time: 6000, icon: "🍅", cost: 4, price: 20, sellable: true },
    Cenoura: { time: 9000, icon: "🥕", cost: 6, price: 45, sellable: true },
    Morango: { time: 4000, icon: "🍓", cost: 5, price: 20, sellable: true },
    Abacaxi: { time: 12000, icon: "🍍", cost: 10, price: 50, sellable: true },
    Batata: { time: 5000, icon: "🥔", cost: 3, price: 15, sellable: true },
    Brocolis: { time: 7000, icon: "🥦", cost: 5, price: 30, sellable: true },
    Pimenta: { time: 4500, icon: "🌶️", cost: 4, price: 25, sellable: true },
    Lavanda: { time: 180000, icon: "🪻", cost: 15, price: 0, sellable: false, specialOnly: true },
    Rosa: { time: 300000, icon: "🌹", cost: 20, price: 0, sellable: false, specialOnly: true },
    Girassol: { time: 480000, icon: "🌻", cost: 35, price: 0, sellable: false, specialOnly: true }
};

let currentOrder = null;
let selectedCrop = "Alface";
let selectedSpecialCrop = "Lavanda";
let vinegarWater = 0;
let autoPlantEnabled = false;
let autoDeliveryEnabled = false;
let autoPestDefenseEnabled = false;
let specialOrderCompleted = false;
let wormBoxStored = 0;
let wormBoxTimer = null;
let wormBoxReadyAt = null;
let organicCompostCount = 0;

// Inicializar canteiros
const totalPlots = 6;
let plotsState = Array(totalPlots).fill(null).map(() => ({ status: "vazio", crop: null, timer: null, pestStatus: "normal", pestTimer: null, protectionTimer: null, compostBoostUntil: null, compostTimer: null }));
let specialPlotState = { status: "vazio", crop: null, timer: null };

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
    renderSpecialCropOptions();
    updateSpecialPlotUI();
    generateNewOrder();
    updateUI();
    updateOrderUI();
    updateInventoryUI();
    startPestChecks();
    startAutomationLoops();
    startRainSystem();

    setInterval(() => {
        updateUI();
    }, 1000);

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
    document.getElementById("worm-box-count").innerText = wormBoxStored;
    document.getElementById("organic-compost-count").innerText = organicCompostCount;
    updateAutomationStatus();
    updateInventoryUI();
    updateWormBoxStatus();
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

function updateWormBoxStatus() {
    const statusElement = document.getElementById("worm-box-status");
    if (!statusElement) return;

    if (wormBoxStored === 0) {
        statusElement.innerText = "Aguardando depósito de plantas infestadas.";
        return;
    }

    if (wormBoxTimer && wormBoxReadyAt) {
        const secondsLeft = Math.max(0, Math.ceil((wormBoxReadyAt - Date.now()) / 1000));
        statusElement.innerText = `Pronto em ${secondsLeft}s para produzir adubo orgânico.`;
        return;
    }

    statusElement.innerText = "Pronto para produzir adubo orgânico.";
}

function buyVinegarWater() {
    if (money < 50) {
        alert("Você não tem moedas suficientes para comprar spray de alho e pimenta.");
        return;
    }

    money -= 50;
    vinegarWater += 1;
    updateUI();
    alert("Você comprou spray de alho e pimenta e está pronto para combater pragas!");
}

function depositInfestedPlants() {
    const deposited = Object.values(inventory).reduce((total, cropInventory) => total + cropInventory.spoiled, 0);
    if (deposited === 0) {
        alert("Não há plantas infestadas para depositar na caixa de minhocas.");
        return;
    }

    Object.keys(inventory).forEach(cropName => {
        inventory[cropName].spoiled = 0;
    });

    wormBoxStored += deposited;
    if (!wormBoxTimer) {
        wormBoxReadyAt = Date.now() + 45000;
        wormBoxTimer = setTimeout(() => {
            produceOrganicCompost();
        }, 45000);
    }

    updateUI();
    alert(`Você depositou ${deposited} plantas infestadas. As minhocas vão produzir adubo em 45 segundos.`);
}

function produceOrganicCompost() {
    if (wormBoxStored === 0) {
        wormBoxTimer = null;
        wormBoxReadyAt = null;
        updateUI();
        return;
    }

    organicCompostCount += 6;
    ecoPoints += 2;
    wormBoxStored = 0;
    wormBoxTimer = null;
    wormBoxReadyAt = null;
    applyCompostToPlots();
    updateUI();
}

function applyCompostToPlots() {
    plotsState.forEach((state, index) => {
        if (state.compostTimer) {
            clearTimeout(state.compostTimer);
        }
        state.compostBoostUntil = Date.now() + 90000;
        state.compostTimer = setTimeout(() => removeCompost(index), 90000);
        updatePlotUI(index);
    });
}

function removeCompost(index) {
    const state = plotsState[index];
    if (!state) return;
    state.compostBoostUntil = null;
    if (state.compostTimer) {
        clearTimeout(state.compostTimer);
        state.compostTimer = null;
    }
    updatePlotUI(index);
    updateUI();
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
    alert("Proteção automática contra pragas ativada! O sistema protegerá canteiros infestados automaticamente sem consumir spray.");
}

function startPestChecks() {
    setInterval(() => {
        const hasLadybugs = Boolean(specialPlotState.crop);
        const pestChance = hasLadybugs ? 0.05 : 0.15;

        if (hasLadybugs) {
            plotsState.forEach((state, index) => {
                if (state.pestStatus === "infestada") {
                    applyVinegarProtection(index, false, true);
                }
            });
        }

        plotsState.forEach((state, index) => {
            if (state.status === "plantado" || state.status === "pronto") {
                if (Math.random() < pestChance) {
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
        autoHarvest();
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
        if (!isRaining && Math.random() < 0.2) {
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
    if (!currentOrder) return;

    const cropName = currentOrder.item;
    const crop = cropsConfig[cropName];
    if (!crop) return;

    const currentCount = plotsState
        .filter(state => state.crop?.name === cropName && state.status !== "vazio")
        .length + getInventoryTotal(cropName);

    if (currentCount >= currentOrder.quantity) return;

    const emptyIndex = plotsState.findIndex(state => state.status === "vazio");
    if (emptyIndex === -1) return;
    if (money < crop.cost || water < 10) return;
    plantCrop(emptyIndex, cropName);
}

function autoHarvest() {
    plotsState.forEach((state, index) => {
        if (state.status === "pronto") {
            harvestCrop(index, true);
        }
    });
}

function autoDeliver() {
    if (!currentOrder) return;
    const have = getInventoryTotal(currentOrder.item);
    if (have >= currentOrder.quantity) {
        deliverOrder();
    }
}

function autoPestDefense() {
    plotsState.forEach((state, index) => {
        if (state.pestStatus === "infestada") {
            applyVinegarProtection(index, false, true);
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
    alert(`Plantação infestada! As pragas estão por perto em ${state.crop.name}. Use spray de alho e pimenta para proteger a cultura.`);
}

function applyVinegarProtection(index, consumeSpray = true, silent = false) {
    const state = plotsState[index];
    if (!state || state.pestStatus !== "infestada") {
        if (!silent) {
            alert("Não há pragas ativos neste canteiro no momento.");
        }
        return;
    }
    if (consumeSpray && vinegarWater <= 0) {
        if (!silent) {
            alert("Você não tem spray de alho e pimenta para proteger essa plantação.");
        }
        return;
    }

    if (consumeSpray) {
        vinegarWater -= 1;
    }
    ecoPoints += 10;
    state.pestStatus = "protected";
    if (state.pestTimer) {
        clearTimeout(state.pestTimer);
        state.pestTimer = null;
    }
    if (state.protectionTimer) {
        clearTimeout(state.protectionTimer);
    }
    state.protectionTimer = setTimeout(() => removeProtection(index), 120000);
    updateUI();
    updatePlotUI(index);
    if (!silent) {
        alert(`Plantação protegida por 2 minutos! Parabéns pelo uso livre de agrotóxicos, você ganhou 10 eco-pontos.`);
    }
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

    const cropName = state.crop?.name || "a cultura";
    if (state.timer) {
        clearTimeout(state.timer);
    }
    if (state.protectionTimer) {
        clearTimeout(state.protectionTimer);
        state.protectionTimer = null;
    }
    state.status = "vazio";
    state.crop = null;
    state.timer = null;
    state.pestTimer = null;
    state.pestStatus = "normal";
    updatePlotUI(index);
    updateUI();
    alert(`Pragas destruíram a plantação de ${cropName}!`);
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

    const specialLabel = currentOrder.special ? "Pedido especial" : "Pedido";
    orderText.innerText = `${specialLabel}: ${currentOrder.quantity}x ${currentOrder.item}.`;
}

function renderCropOptions() {
    const optionsContainer = document.getElementById("crop-options");
    optionsContainer.innerHTML = "";

    for (const cropName in cropsConfig) {
        const crop = cropsConfig[cropName];
        if (crop.sellable === false) continue;

        const button = document.createElement("div");
        button.className = "crop-option";
        if (cropName === selectedCrop) button.classList.add("selected");
        button.innerHTML = `<strong>${crop.icon} ${cropName}</strong><div>Preço: ${crop.cost} moedas</div>`;
        button.onclick = () => selectCrop(cropName);
        optionsContainer.appendChild(button);
    }
}

function renderSpecialCropOptions() {
    const optionsContainer = document.getElementById("special-plot-options");
    optionsContainer.innerHTML = "";

    for (const cropName in cropsConfig) {
        const crop = cropsConfig[cropName];
        if (crop.sellable !== false) continue;

        const button = document.createElement("div");
        button.className = "special-crop-option";
        if (cropName === selectedSpecialCrop) button.classList.add("selected");
        button.innerHTML = `<strong>${crop.icon} ${cropName}</strong><div>Custo: ${crop.cost} moedas</div>`;
        button.onclick = () => selectSpecialCrop(cropName);
        optionsContainer.appendChild(button);
    }
}

function selectCrop(cropName) {
    selectedCrop = cropName;
    renderCropOptions();
}

function selectSpecialCrop(cropName) {
    selectedSpecialCrop = cropName;
    renderSpecialCropOptions();
    updateSpecialPlotUI();
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
            plot.innerHTML += `<div class="plot-status infestada">Plantação infestada! As pragas estão por perto.</div><div class="plot-btn" onclick="applyVinegarProtection(${index}); event.stopPropagation();">Usar spray de alho e pimenta</div>`;
        } else if (state.pestStatus === "protected") {
            plot.innerHTML += `<div class="plot-status protegida">Protegida por 2 minutos</div>`;
        }
        if (state.compostBoostUntil && state.compostBoostUntil > Date.now()) {
            plot.innerHTML += `<div class="plot-status protegida">Adubo orgânico ativo (+25% qualidade)</div>`;
        }
    } else if (state.status === "pronto") {
        plot.classList.add("ready");
        plot.innerHTML = `<div>${state.crop.icon}</div><strong>${state.crop.name}</strong><div>Pronto para colher</div><div class="plot-btn">Clique para colher</div>`;
        if (state.pestStatus === "infestada") {
            plot.innerHTML += `<div class="plot-status infestada">Plantação infestada! As pragas estão por perto.</div><div class="plot-btn" onclick="applyVinegarProtection(${index}); event.stopPropagation();">Usar spray de alho e pimenta</div>`;
        } else if (state.pestStatus === "protected") {
            plot.innerHTML += `<div class="plot-status protegida">Protegida por 2 minutos</div>`;
        }
        if (state.compostBoostUntil && state.compostBoostUntil > Date.now()) {
            plot.innerHTML += `<div class="plot-status protegida">Adubo orgânico ativo (+25% qualidade)</div>`;
        }
    }
}

function updateSpecialPlotUI() {
    const plot = document.getElementById("special-plot");
    plot.className = "special-plot";
    plot.innerHTML = "";

    if (specialPlotState.status === "vazio") {
        plot.innerHTML = `<div class="special-plot-title">🌿 ${selectedSpecialCrop}</div><div>Terra livre para flores.</div><div class="plot-btn" onclick="interactSpecialPlot(); event.stopPropagation();">Plantar ${selectedSpecialCrop}</div>`;
        return;
    }

    plot.classList.add("protected");
    const preserveBonus = ecoPoints >= 150;
    const statusText = preserveBonus ? "Flores preservadas por eco-pontos. Troque a variedade plantando novamente." : "Atraindo joaninhas até o fim do ciclo";
    plot.innerHTML = `<div>${specialPlotState.crop.icon}</div><strong>${specialPlotState.crop.name}</strong><div>Joaninhas🐞 protegendo</div><div class="plot-status protegida">${statusText}</div><div class="plot-btn" onclick="interactSpecialPlot(); event.stopPropagation();">Trocar flor</div>`;
}

function interactSpecialPlot() {
    if (specialPlotState.status === "vazio") {
        plantSpecialCrop();
        return;
    }

    if (ecoPoints >= 150) {
        if (specialPlotState.timer) {
            clearTimeout(specialPlotState.timer);
            specialPlotState.timer = null;
        }
        specialPlotState.status = "vazio";
        specialPlotState.crop = null;
        updateSpecialPlotUI();
        plantSpecialCrop();
    }
}

function plantSpecialCrop() {
    const crop = cropsConfig[selectedSpecialCrop];
    if (crop.sellable !== false) {
        alert("Apenas culturas ornamentais podem ser plantadas no canteiro especial.");
        return;
    }
    if (money < crop.cost) {
        alert("Você não tem moedas suficientes para plantar nessa área.");
        return;
    }
    if (water < 10) {
        alert("Água insuficiente para plantar. Aguarde o reabastecimento.");
        return;
    }

    if (specialPlotState.timer) {
        clearTimeout(specialPlotState.timer);
        specialPlotState.timer = null;
    }

    money -= crop.cost;
    water = Math.max(0, water - 10);
    specialPlotState.status = "plantado";
    specialPlotState.crop = { ...crop, name: selectedSpecialCrop };
    specialPlotState.timer = setTimeout(() => completeSpecialCrop(), crop.time);
    updateSpecialPlotUI();
    updateUI();
}

function completeSpecialCrop() {
    if (!specialPlotState.crop) return;

    if (ecoPoints >= 150) {
        specialPlotState.status = "plantado";
        specialPlotState.timer = null;
        updateSpecialPlotUI();
        updateUI();
        return;
    }

    specialPlotState.status = "vazio";
    specialPlotState.crop = null;
    specialPlotState.timer = null;
    updateSpecialPlotUI();
    updateUI();
}

function interactPlot(index) {
    const state = plotsState[index];
    if (state.status === "vazio") {
        plantCrop(index);
    } else if (state.status === "pronto") {
        harvestCrop(index);
    }
}

function plantCrop(index, cropName = selectedCrop) {
    const crop = cropsConfig[cropName];

    if (money < crop.cost) {
        alert("Você não tem moedas suficientes para plantar.");
        return;
    }
    if (water < 10) {
        alert("Água insuficiente para plantar. Aguarde o reabastecimento.");
        return;
    }

    const state = plotsState[index];
    if (state.timer) {
        clearTimeout(state.timer);
    }

    money -= crop.cost;
    water = Math.max(0, water - 10);
    state.status = "plantado";
    state.crop = { ...crop, name: cropName };
    state.timer = setTimeout(() => completeCrop(index), crop.time);
    state.pestTimer = null;
    state.pestStatus = state.pestStatus === "protected" ? "protected" : "normal";
    updatePlotUI(index);
    updateUI();
}

function completeCrop(index) {
    const state = plotsState[index];
    if (!state || state.status !== "plantado") return;

    state.status = "pronto";
    updatePlotUI(index);
}

function harvestCrop(index, silent = false) {
    const state = plotsState[index];
    if (!state || state.status !== "pronto") return;

    const cropName = state.crop.name;
    const wasInfested = state.pestStatus === "infestada";
    const compostBoostActive = Boolean(state.compostBoostUntil && state.compostBoostUntil > Date.now());

    if (wasInfested && compostBoostActive) {
        inventory[cropName].good += 1;
    } else if (wasInfested) {
        inventory[cropName].spoiled += 1;
    } else {
        inventory[cropName].good += 1;
    }

    if (state.timer) {
        clearTimeout(state.timer);
    }
    if (state.protectionTimer) {
        clearTimeout(state.protectionTimer);
        state.protectionTimer = null;
    }
    if (state.compostTimer) {
        clearTimeout(state.compostTimer);
        state.compostTimer = null;
    }
    state.status = "vazio";
    state.crop = null;
    state.timer = null;
    state.pestTimer = null;
    state.pestStatus = "normal";
    state.compostBoostUntil = null;
    updatePlotUI(index);
    updateUI();
    if (!silent) {
        alert(`Você colheu ${cropName}!${wasInfested && !compostBoostActive ? " Essa colheita está danificada e terá metade do valor de venda." : ""}`);
    }
}

function generateNewOrder() {
    const sellableCrops = Object.keys(cropsConfig).filter(cropName => cropsConfig[cropName].sellable !== false);
    const item = sellableCrops[Math.floor(Math.random() * sellableCrops.length)];

    let quantity = Math.floor(Math.random() * 2) + 1;
    let isSpecial = false;

    if (!specialOrderCompleted && Math.random() < 0.2) {
        isSpecial = true;
        specialOrderCompleted = true;
        quantity = 4 + Math.floor(Math.random() * 3);
    }

    currentOrder = { item, quantity, special: isSpecial };
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
