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
let autoPlantPurchased = false;
let autoPlantEnabled = false;
let autoDeliveryPurchased = false;
let autoDeliveryEnabled = false;
let autoPestDefensePurchased = false;
let autoPestDefenseEnabled = false;
let flowerBedUnlocked = false;
let wormBoxUnlocked = false;
let extraPlotsUnlocked = false;
let specialOrderCompleted = false;
let wormBoxStored = 0;
let wormBoxTimer = null;
let wormBoxReadyAt = null;
let organicCompostCount = 0;

// Inicializar canteiros
const totalPlots = 9;
let plotsState = Array.from({ length: totalPlots }, (_, index) => ({
    status: index < 6 ? "vazio" : "locked",
    crop: null,
    timer: null,
    dueAt: null,
    pestStatus: "normal",
    pestTimer: null,
    protectionTimer: null,
    compostBoostUntil: null,
    compostTimer: null
}));
let specialPlotState = { status: "vazio", crop: null, timer: null, dueAt: null };
let suppressSaveOnUnload = false;
let totalPlayTimeMs = 0;
let lastPlayUpdate = Date.now();
const specialOrderThresholdMs = 25 * 60 * 1000;

function beforeUnloadSave() {
    const now = Date.now();
    totalPlayTimeMs += now - lastPlayUpdate;
    lastPlayUpdate = now;
    if (!suppressSaveOnUnload) {
        saveProgress(true);
    }
}

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
    const loaded = loadProgress(true);
    if (!loaded) {
        if (!localStorage.getItem("ecoFazendaIntroSeen")) {
            showIntroMessage();
        }
        generateNewOrder();
    }
    lastPlayUpdate = Date.now();
    updateUI();
    updateOrderUI();
    updateInventoryUI();
    startPestChecks();
    startAutomationLoops();
    startRainSystem();

    setInterval(() => {
        const now = Date.now();
        totalPlayTimeMs += now - lastPlayUpdate;
        lastPlayUpdate = now;
        updateUI();
    }, 1000);

    setInterval(() => {
        if (water < 100) {
            water = Math.min(100, water + 5);
            updateUI();
        }
    }, 4000);

    window.addEventListener("beforeunload", beforeUnloadSave);
}

function updateUI() {
    document.getElementById("money").innerText = money;
    document.getElementById("water-level").innerText = water;
    document.getElementById("eco-points").innerText = ecoPoints;
    document.getElementById("vinegar-count").innerText = vinegarWater;
    document.getElementById("rain-status").innerText = isRaining ? "Chovendo" : "Nenhuma";
    document.getElementById("play-time").innerText = formatTime(totalPlayTimeMs);
    document.getElementById("worm-box-count").innerText = wormBoxStored;
    document.getElementById("organic-compost-count").innerText = organicCompostCount;
    updateAutomationStatus();
    updateAutomationButtons();
    unlockExtraPlots();
    updateInventoryUI();
    updateSpecialPlotUI();
    updateWormBoxStatus();

    const saveStatusEl = document.getElementById("save-status");
    if (saveStatusEl) {
        saveStatusEl.innerText = localStorage.getItem("ecoFazendaSave") ? "Progresso salvo disponível." : "Nenhum progresso salvo.";
    }

    const flowerStatusEl = document.getElementById("flower-bed-status");
    if (flowerStatusEl) {
        flowerStatusEl.innerText = flowerBedUnlocked ? "Desbloqueado" : "Bloqueado (50 eco-pontos e 200 moedas)";
    }
    const wormStatusEl = document.getElementById("worm-box-unlock-status");
    if (wormStatusEl) {
        wormStatusEl.innerText = wormBoxUnlocked ? "Desbloqueada" : "Bloqueada (100 eco-pontos e 300 moedas)";
    }
    const flowerBtn = document.getElementById("unlock-flower-bed-btn");
    if (flowerBtn) {
        flowerBtn.disabled = flowerBedUnlocked;
        if (flowerBedUnlocked) flowerBtn.innerText = "Canteiro de flores desbloqueado";
    }
    const wormBtn = document.getElementById("unlock-worm-box-btn");
    if (wormBtn) {
        wormBtn.disabled = wormBoxUnlocked;
        if (wormBoxUnlocked) wormBtn.innerText = "Caixa de minhocas desbloqueada";
    }
    const depositBtn = document.querySelector('.worm-btn');
    if (depositBtn) {
        depositBtn.disabled = !wormBoxUnlocked;
    }

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
    if (autoPlantEnabled) autoPlantPurchased = true;
    if (autoDeliveryEnabled) autoDeliveryPurchased = true;
    if (autoPestDefenseEnabled) autoPestDefensePurchased = true;

    document.getElementById("auto-plant-status").innerText = autoPlantEnabled ? "Ativado" : autoPlantPurchased ? "Desativado" : "Não comprado";
    document.getElementById("auto-delivery-status").innerText = autoDeliveryEnabled ? "Ativado" : autoDeliveryPurchased ? "Desativado" : "Não comprado";
    document.getElementById("auto-pest-status").innerText = autoPestDefenseEnabled ? "Ativado" : autoPestDefensePurchased ? "Desativado" : "Não comprado";
}

function updateAutomationButtons() {
    const plantBtn = document.getElementById("buy-auto-plant-btn");
    const deliveryBtn = document.getElementById("buy-auto-delivery-btn");
    const pestBtn = document.getElementById("buy-auto-pest-btn");

    if (autoPlantPurchased) {
        plantBtn.innerText = autoPlantEnabled ? "Desativar Plantio Automático" : "Ativar Plantio Automático";
    } else {
        plantBtn.innerText = "Comprar Plantio Automático - 500 moedas";
    }

    if (autoDeliveryPurchased) {
        deliveryBtn.innerText = autoDeliveryEnabled ? "Desativar Entrega Automática" : "Ativar Entrega Automática";
    } else {
        deliveryBtn.innerText = "Comprar Entrega Automática - 750 moedas";
    }

    if (autoPestDefensePurchased) {
        pestBtn.innerText = autoPestDefenseEnabled ? "Desativar Defesa contra Pragas" : "Ativar Defesa contra Pragas";
    } else {
        pestBtn.innerText = "Comprar Defesa contra Pragas - 1000 moedas";
    }
}

function unlockExtraPlots() {
    if (extraPlotsUnlocked || ecoPoints < 150) return;
    let unlockedAny = false;
    plotsState.forEach((state, index) => {
        if (state.status === "locked") {
            state.status = "vazio";
            updatePlotUI(index);
            unlockedAny = true;
        }
    });
    if (unlockedAny) {
        extraPlotsUnlocked = true;
        alert("Parabéns! Três canteiros adicionais foram desbloqueados por atingir 150 eco-pontos.");
    }
}

function updateWormBoxStatus() {
    const statusElement = document.getElementById("worm-box-status");
    if (!statusElement) return;

    if (!wormBoxUnlocked) {
        statusElement.innerText = "Caixa de minhocas bloqueada. Desbloqueie-a na lojinha para começar a usar.";
        return;
    }

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
    if (!wormBoxUnlocked) {
        alert("Você precisa desbloquear a caixa de minhocas antes de depositar plantas infestadas.");
        return;
    }

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

function buyAutoPlant() {
    if (!autoPlantPurchased) {
        if (money < 500) {
            alert("Você não tem moedas suficientes para automatizar o plantio.");
            return;
        }
        money -= 500;
        autoPlantPurchased = true;
        autoPlantEnabled = true;
        updateUI();
        alert("Plantio automatizado comprado e ativado! O sistema irá plantar sempre que houver canteiros livres e condições.");
        return;
    }
    autoPlantEnabled = !autoPlantEnabled;
    updateUI();
    alert(`Plantio automático ${autoPlantEnabled ? "ativado" : "desativado"}.`);
}

function buyAutoDelivery() {
    if (!autoDeliveryPurchased) {
        if (money < 750) {
            alert("Você não tem moedas suficientes para automatizar as entregas.");
            return;
        }
        money -= 750;
        autoDeliveryPurchased = true;
        autoDeliveryEnabled = true;
        updateUI();
        alert("Entrega automatizada comprada e ativada! O pedido será enviado automaticamente quando estiver pronto.");
        return;
    }
    autoDeliveryEnabled = !autoDeliveryEnabled;
    updateUI();
    alert(`Entrega automática ${autoDeliveryEnabled ? "ativada" : "desativada"}.`);
}

function buyAutoPestDefense() {
    if (!autoPestDefensePurchased) {
        if (money < 1000) {
            alert("Você não tem moedas suficientes para automatizar o combate de pragas.");
            return;
        }
        money -= 1000;
        autoPestDefensePurchased = true;
        autoPestDefenseEnabled = true;
        updateUI();
        alert("Proteção automática contra pragas comprada e ativada! O sistema protegerá canteiros infestados automaticamente sem consumir spray.");
        return;
    }
    autoPestDefenseEnabled = !autoPestDefenseEnabled;
    updateUI();
    alert(`Defesa automática contra pragas ${autoPestDefenseEnabled ? "ativada" : "desativada"}.`);
}

function saveProgress(silent = false) {
    const saveData = {
        money,
        ecoPoints,
        water,
        isRaining,
        vinegarWater,
        autoPlantPurchased,
        autoPlantEnabled,
        autoDeliveryPurchased,
        autoDeliveryEnabled,
        autoPestDefensePurchased,
        autoPestDefenseEnabled,
        flowerBedUnlocked,
        wormBoxUnlocked,
        extraPlotsUnlocked,
        specialOrderCompleted,
        wormBoxStored,
        wormBoxReadyAt,
        organicCompostCount,
        currentOrder,
        selectedCrop,
        selectedSpecialCrop,
        inventory,
        totalPlayTimeMs,
        plotsState: plotsState.map(state => ({
            status: state.status,
            cropName: state.crop?.name || null,
            pestStatus: state.pestStatus,
            compostBoostUntil: state.compostBoostUntil,
            dueAt: state.dueAt
        })),
        specialPlotState: {
            status: specialPlotState.status,
            cropName: specialPlotState.crop?.name || null,
            dueAt: specialPlotState.dueAt
        }
    };

    localStorage.setItem("ecoFazendaSave", JSON.stringify(saveData));
    if (!silent) {
        alert("Progresso salvo com sucesso!");
    }
}

function clearProgress() {
    if (!confirm("Tem certeza que deseja limpar todo o progresso salvo? Esta ação não pode ser desfeita.")) {
        return;
    }
    localStorage.removeItem("ecoFazendaSave");
    localStorage.removeItem("ecoFazendaIntroSeen");
    suppressSaveOnUnload = true;
    alert("Progresso salvo limpo. O jogo será reiniciado para zerar todas as compras e progressos.");
    location.reload();
}

function restoreTimers() {
    const now = Date.now();
    plotsState.forEach((state, index) => {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }

        if (state.status === "plantado") {
            const remaining = state.dueAt ? Math.max(0, state.dueAt - now) : 0;
            if (remaining <= 0) {
                completeCrop(index);
            } else {
                state.timer = setTimeout(() => completeCrop(index), remaining);
            }
        } else {
            state.dueAt = null;
        }
    });

    if (specialPlotState.timer) {
        clearTimeout(specialPlotState.timer);
        specialPlotState.timer = null;
    }
    if (specialPlotState.status === "plantado") {
        const remaining = specialPlotState.dueAt ? Math.max(0, specialPlotState.dueAt - now) : 0;
        if (remaining <= 0) {
            completeSpecialCrop();
        } else {
            specialPlotState.timer = setTimeout(() => completeSpecialCrop(), remaining);
        }
    } else {
        specialPlotState.dueAt = null;
    }

    if (wormBoxTimer) {
        clearTimeout(wormBoxTimer);
        wormBoxTimer = null;
    }
    if (wormBoxUnlocked && wormBoxStored > 0 && wormBoxReadyAt) {
        const remaining = Math.max(0, wormBoxReadyAt - now);
        if (remaining <= 0) {
            produceOrganicCompost();
        } else {
            wormBoxTimer = setTimeout(() => produceOrganicCompost(), remaining);
        }
    } else {
        wormBoxReadyAt = null;
    }
}

function loadProgress(silent = false) {
    const saveString = localStorage.getItem("ecoFazendaSave");
    if (!saveString) {
        if (!silent) {
            alert("Nenhum progresso salvo encontrado.");
            if (!localStorage.getItem("ecoFazendaIntroSeen")) {
                showIntroMessage();
            }
        }
        return false;
    }

    try {
        const saveData = JSON.parse(saveString);
        money = saveData.money ?? money;
        ecoPoints = saveData.ecoPoints ?? ecoPoints;
        water = saveData.water ?? water;
        isRaining = saveData.isRaining ?? isRaining;
        vinegarWater = saveData.vinegarWater ?? vinegarWater;
        autoPlantPurchased = saveData.autoPlantPurchased ?? autoPlantPurchased;
        autoPlantEnabled = saveData.autoPlantEnabled ?? autoPlantEnabled;
        autoDeliveryPurchased = saveData.autoDeliveryPurchased ?? autoDeliveryPurchased;
        autoDeliveryEnabled = saveData.autoDeliveryEnabled ?? autoDeliveryEnabled;
        autoPestDefensePurchased = saveData.autoPestDefensePurchased ?? autoPestDefensePurchased;
        autoPestDefenseEnabled = saveData.autoPestDefenseEnabled ?? autoPestDefenseEnabled;

        if (autoPlantEnabled) autoPlantPurchased = true;
        if (autoDeliveryEnabled) autoDeliveryPurchased = true;
        if (autoPestDefenseEnabled) autoPestDefensePurchased = true;
        flowerBedUnlocked = saveData.flowerBedUnlocked ?? flowerBedUnlocked;
        wormBoxUnlocked = saveData.wormBoxUnlocked ?? wormBoxUnlocked;
        extraPlotsUnlocked = saveData.extraPlotsUnlocked ?? extraPlotsUnlocked;
        specialOrderCompleted = saveData.specialOrderCompleted ?? specialOrderCompleted;
        wormBoxStored = saveData.wormBoxStored ?? wormBoxStored;
        wormBoxReadyAt = saveData.wormBoxReadyAt ?? null;
        organicCompostCount = saveData.organicCompostCount ?? organicCompostCount;
        totalPlayTimeMs = saveData.totalPlayTimeMs ?? totalPlayTimeMs;
        currentOrder = normalizeOrder(saveData.currentOrder) || currentOrder;
        selectedCrop = saveData.selectedCrop ?? selectedCrop;
        selectedSpecialCrop = saveData.selectedSpecialCrop ?? selectedSpecialCrop;
        inventory = saveData.inventory ?? inventory;

        plotsState = (saveData.plotsState || plotsState).map((savedState, index) => ({
            status: savedState.status || "vazio",
            crop: savedState.cropName ? { ...cropsConfig[savedState.cropName], name: savedState.cropName } : null,
            timer: null,
            dueAt: savedState.dueAt || null,
            pestStatus: savedState.pestStatus || "normal",
            pestTimer: null,
            protectionTimer: null,
            compostBoostUntil: savedState.compostBoostUntil || null,
            compostTimer: null
        }));

        const specialSaved = saveData.specialPlotState || {};
        specialPlotState = {
            status: specialSaved.status || "vazio",
            crop: specialSaved.cropName ? { ...cropsConfig[specialSaved.cropName], name: specialSaved.cropName } : null,
            timer: null,
            dueAt: specialSaved.dueAt || null
        };

        restoreTimers();
        updateUI();
        updateOrderUI();
        updateInventoryUI();
        updateSpecialPlotUI();
        plotsState.forEach((_, index) => updatePlotUI(index));

        lastPlayUpdate = Date.now();
        if (!silent) alert("Progresso carregado com sucesso!");
        return true;
    } catch (error) {
        console.error(error);
        if (!silent) alert("Falha ao carregar o progresso salvo.");
        return false;
    }
}

function unlockFlowerBed() {
    if (flowerBedUnlocked) {
        alert("O canteiro de flores já está desbloqueado.");
        return;
    }
    if (ecoPoints < 50) {
        alert("Você precisa de pelo menos 50 eco-pontos para desbloquear o canteiro de flores.");
        return;
    }
    if (money < 200) {
        alert("Você não tem moedas suficientes para desbloquear o canteiro de flores.");
        return;
    }
    money -= 200;
    flowerBedUnlocked = true;
    updateUI();
    alert("Canteiro de flores desbloqueado! Agora você pode plantar lavanda, rosa e girassol.");
}

function unlockWormBox() {
    if (wormBoxUnlocked) {
        alert("A caixa de minhocas já está desbloqueada.");
        return;
    }
    if (ecoPoints < 100) {
        alert("Você precisa de pelo menos 100 eco-pontos para desbloquear a caixa de minhocas.");
        return;
    }
    if (money < 300) {
        alert("Você não tem moedas suficientes para desbloquear a caixa de minhocas.");
        return;
    }
    money -= 300;
    wormBoxUnlocked = true;
    updateUI();
    alert("Caixa de minhocas desbloqueada! Deposite plantas infestadas para produzir adubo orgânico.");
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
        if (state.status === "vazio" || state.status === "locked") return;
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

function startPestChecks() {
    setInterval(() => {
        const hasLadybugs = specialPlotState.status === "plantado" && specialPlotState.crop;
        const pestChance = hasLadybugs ? 0.04 : 0.15;

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
                    if (hasLadybugs && Math.random() < 0.75) {
                        return;
                    }
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
        if (!isRaining && Math.random() < 0.1) {
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

    const neededItems = currentOrder.items
        .map(orderItem => ({
            ...orderItem,
            current: getOrderCurrentCount(orderItem.item),
            remaining: Math.max(0, orderItem.quantity - getOrderCurrentCount(orderItem.item))
        }))
        .filter(orderItem => orderItem.remaining > 0);

    if (neededItems.length === 0) return;

    const emptyPlotIndexes = plotsState
        .map((state, index) => (state.status === "vazio" ? index : null))
        .filter(index => index !== null);

    if (emptyPlotIndexes.length === 0) return;

    for (const emptyIndex of emptyPlotIndexes) {
        const nextOrder = neededItems.find(orderItem => orderItem.remaining > 0);
        if (!nextOrder) break;

        const crop = cropsConfig[nextOrder.item];
        if (!crop) break;
        if (money < crop.cost || water < 10) break;

        plantCrop(emptyIndex, nextOrder.item);
        nextOrder.remaining -= 1;
    }
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

    plotsState.forEach((state, index) => {
        if (state.status === "pronto" && currentOrder.items.some(orderItem => orderItem.item === state.crop?.name)) {
            harvestCrop(index, true);
        }
    });

    const isComplete = currentOrder.items.every(orderItem => getInventoryTotal(orderItem.item) >= orderItem.quantity);
    if (isComplete) {
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

function formatTime(ms) {
    if (ms <= 0) return "0:00";
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getInventoryTotal(cropName) {
    return inventory[cropName].good + inventory[cropName].spoiled;
}

function getPlantedCount(cropName) {
    return plotsState.filter(state => state.crop?.name === cropName && state.status !== "vazio").length;
}

function getOrderCurrentCount(cropName) {
    return getInventoryTotal(cropName) + getPlantedCount(cropName);
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

function normalizeOrder(order) {
    if (!order) return null;
    if (Array.isArray(order.items)) return order;
    if (order.item && order.quantity) {
        return {
            items: [{ item: order.item, quantity: order.quantity }],
            special: order.special || false
        };
    }
    return null;
}

function showIntroMessage() {
    const intro = document.getElementById("intro-message");
    if (!intro) return;
    intro.classList.remove("hidden");
}

function dismissIntroMessage() {
    const intro = document.getElementById("intro-message");
    if (!intro) return;
    intro.classList.add("hidden");
    localStorage.setItem("ecoFazendaIntroSeen", "true");
}

function updateOrderUI() {
    const orderText = document.getElementById("order-text");
    if (!currentOrder) {
        orderText.innerText = "Carregando pedido...";
        return;
    }

    const specialLabel = currentOrder.special ? "Pedido especial" : "Pedido";
    const lines = currentOrder.items.map(orderItem => `${orderItem.quantity}x ${orderItem.item}`);
    orderText.innerHTML = `${specialLabel}:<br>${lines.join("<br>")}`;
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

    if (state.status === "locked") {
        plot.classList.add("locked");
        plot.innerHTML = `<strong>Canteiro bloqueado</strong><div class="plot-status infestada">Desbloqueie ao atingir 150 eco-pontos.</div>`;
        return;
    }

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

    if (!flowerBedUnlocked) {
        plot.innerHTML = `<div class="special-plot-title">🌿 Canteiro de Flores Bloqueado</div><div>Desbloqueie por 200 moedas após atingir 50 eco-pontos.</div><div class="plot-btn unlock-btn" id="unlock-flower-bed-btn" onclick="unlockFlowerBed(); event.stopPropagation();">Desbloquear Canteiro de Flores - 200 moedas</div>`;
        return;
    }

    if (specialPlotState.status === "vazio") {
        plot.innerHTML = `<div class="special-plot-title">🌿 ${selectedSpecialCrop}</div><div>Terra livre para flores.</div><div class="plot-btn" onclick="interactSpecialPlot(); event.stopPropagation();">Plantar ${selectedSpecialCrop}</div>`;
        return;
    }

    plot.classList.add("protected");
    const timeText = specialPlotState.dueAt ? `Tempo restante: ${formatTime(specialPlotState.dueAt - Date.now())}` : (ecoPoints >= 150 ? "Flores preservadas por eco-pontos." : "Flores prontas. Troque a variedade plantando novamente.");
    const statusText = ecoPoints >= 150 ? "Flores preservadas por eco-pontos. Troque a variedade plantando novamente." : "Atraindo joaninhas até o fim do ciclo";
    plot.innerHTML = `<div>${specialPlotState.crop.icon}</div><strong>${specialPlotState.crop.name}</strong><div>Joaninhas🐞 protegendo</div><div class="plot-status protegida">${statusText}</div><div class="plot-status protegida">${timeText}</div><div class="plot-btn" onclick="interactSpecialPlot(); event.stopPropagation();">Trocar flor</div>`;
}

function interactSpecialPlot() {
    if (!flowerBedUnlocked) {
        alert("Você precisa desbloquear o canteiro de flores antes de plantar aqui.");
        return;
    }

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
    if (!flowerBedUnlocked) {
        alert("Você precisa desbloquear o canteiro de flores antes de plantar aqui.");
        return;
    }

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
    specialPlotState.dueAt = Date.now() + crop.time;
    specialPlotState.timer = setTimeout(() => completeSpecialCrop(), crop.time);
    updateSpecialPlotUI();
    updateUI();
}

function completeSpecialCrop() {
    if (!specialPlotState.crop) return;

    if (ecoPoints >= 150) {
        specialPlotState.status = "plantado";
        specialPlotState.dueAt = null;
        specialPlotState.timer = null;
        updateSpecialPlotUI();
        updateUI();
        return;
    }

    if (wormBoxUnlocked) {
        organicCompostCount += 2;
        applyCompostToPlots();
        alert("As flores do canteiro especial viraram adubo orgânico graças ao minhocário e foram aplicadas automaticamente!");
    }

    specialPlotState.status = "vazio";
    specialPlotState.crop = null;
    specialPlotState.timer = null;
    specialPlotState.dueAt = null;
    updateSpecialPlotUI();
    updateUI();
}

function interactPlot(index) {
    const state = plotsState[index];
    if (state.status === "locked") {
        alert("Este canteiro ainda está bloqueado. Alcance 150 eco-pontos para desbloquear mais canteiros.");
        return;
    }
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
    state.dueAt = Date.now() + crop.time;
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
    state.dueAt = null;
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
    let items = [];
    let isSpecial = false;
    const specialOrderAllowed = totalPlayTimeMs >= specialOrderThresholdMs;

    if (specialOrderAllowed && Math.random() < 0.25) {
        isSpecial = true;
        if (Math.random() < 0.6) {
            const item = sellableCrops[Math.floor(Math.random() * sellableCrops.length)];
            const quantity = 10 + Math.floor(Math.random() * 6);
            items.push({ item, quantity });
        } else {
            const orderCount = 2 + Math.floor(Math.random() * 2);
            const selected = [...sellableCrops].sort(() => Math.random() - 0.5).slice(0, orderCount);
            items = selected.map(cropName => ({ item: cropName, quantity: 5 + Math.floor(Math.random() * 4) }));
        }
    } else if (Math.random() < 0.4) {
        const orderCount = 2 + Math.floor(Math.random() * 2);
        const selected = [...sellableCrops].sort(() => Math.random() - 0.5).slice(0, orderCount);
        items = selected.map(cropName => ({ item: cropName, quantity: 1 + Math.floor(Math.random() * 3) }));
    } else {
        const item = sellableCrops[Math.floor(Math.random() * sellableCrops.length)];
        const quantity = 1 + Math.floor(Math.random() * 4);
        items.push({ item, quantity });
    }

    currentOrder = { items, special: isSpecial };
    updateOrderUI();
}

function deliverOrder() {
    if (!currentOrder) {
        alert("Aguardando pedido do cliente.");
        return;
    }

    const missing = currentOrder.items.filter(orderItem => getInventoryTotal(orderItem.item) < orderItem.quantity);
    if (missing.length > 0) {
        alert("Você ainda não tem o pedido completo. Continue colhendo.");
        return;
    }

    const multiplier = getSellMultiplier();
    let reward = 0;
    let ecoGain = 0;
    let damagedMessages = [];

    currentOrder.items.forEach(orderItem => {
        const removed = removeInventory(orderItem.item, orderItem.quantity);
        const cropPrice = cropsConfig[orderItem.item].price;
        const goodPrice = Math.round(cropPrice * multiplier);
        const spoiledPrice = Math.round((cropPrice / 2) * multiplier);

        reward += goodPrice * removed.good + spoiledPrice * removed.spoiled;
        ecoGain += orderItem.quantity * 2;

        if (removed.spoiled > 0) {
            damagedMessages.push(`${removed.spoiled}x ${orderItem.item}`);
        }
    });

    money += reward;
    ecoPoints += ecoGain;

    let message = `Pedido entregue! Você ganhou ${reward} moedas e ${ecoGain} eco-pontos.`;
    if (damagedMessages.length > 0) {
        message += ` (${damagedMessages.join(', ')} vendida${damagedMessages.length === 1 ? '' : 's'} com metade do valor.)`;
    }
    alert(message);
    generateNewOrder();
    updateUI();
}

window.onload = initGame;
