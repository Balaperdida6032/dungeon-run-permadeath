// auction-system.js - Sistema de Subastas Estilo WoW en Firebase Firestore
import { db, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot } from './firebase-config.js';
import { showCustomModal } from './ui-controller.js';

export function initAuctionSystem(getCurrentHero, getCurrentHeroId, currentUser, refreshHeroUI) {
    
    // Escuchar publicaciones en tiempo real de la subasta global
    const auctionsRef = collection(db, "auctions");
    onSnapshot(auctionsRef, (snapshot) => {
        const marketList = document.getElementById('auction-market-list');
        const sellSelect = document.getElementById('auction-sell-select');
        if (!marketList) return;

        marketList.innerHTML = "";
        if (sellSelect) sellSelect.innerHTML = `<option value="">Selecciona un ítem para subastar...</option>`;

        const hero = getCurrentHero();
        if (hero && hero.inventory && sellSelect) {
            hero.inventory.forEach((item, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.innerText = `${item.name} (+${item.bonus} ${item.stat.toUpperCase()})`;
                sellSelect.appendChild(opt);
            });
        }

        if (snapshot.empty) {
            marketList.innerHTML = `<p style="font-size: 8px; color: #6c7086;">No hay objetos en subasta actualmente.</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const lot = docSnap.data();
            const lotId = docSnap.id;
            const isMyLot = lot.sellerUid === currentUser.uid;

            const itemDiv = document.createElement('div');
            itemDiv.className = "pixel-box";
            itemDiv.style.padding = "8px";
            itemDiv.style.marginBottom = "6px";
            itemDiv.style.display = "flex";
            itemDiv.style.justifyContent = "space-between";
            itemDiv.style.alignItems = "center";
            itemDiv.innerHTML = `
                <div>
                    <strong style="color: #a6e3a1;">${lot.item.name}</strong><br>
                    <small>Bono: +${lot.item.bonus} ${lot.item.stat.toUpperCase()} | Vendedor: ${lot.sellerName}</small><br>
                    <span style="color: #f9e2af;">Precio: 🪙 ${lot.price} Oro</span>
                </div>
                <div>
                    ${isMyLot ? 
                        `<button class="btn-cancel-auction" data-id="\${lotId}" style="background-color: #f38ba8; color:#111; margin:0; padding:6px;">Retirar</button>` :
                        `<button class="btn-buy-auction" data-id="\${lotId}" style="background-color: #a6e3a1; color:#111; margin:0; padding:6px;">Comprar</button>`
                    }
                </div>
            `;
            marketList.appendChild(itemDiv);
        });

        // Eventos de compra
        document.querySelectorAll('.btn-buy-auction').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const lotId = e.target.getAttribute('data-id');
                await buyAuctionItem(lotId, getCurrentHero(), getCurrentHeroId(), currentUser, refreshHeroUI);
            });
        });

        // Eventos de cancelación/retirar lote
        document.querySelectorAll('.btn-cancel-auction').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const lotId = e.target.getAttribute('data-id');
                await cancelAuctionItem(lotId, getCurrentHero(), getCurrentHeroId(), currentUser, refreshHeroUI);
            });
        });
    });

    // Publicar ítem en subasta
    const publishBtn = document.getElementById('btn-publish-auction');
    if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
            const hero = getCurrentHero();
            const heroId = getCurrentHeroId();
            if (!hero || !heroId) return showCustomModal("Selecciona un personaje primero.");

            const sellSelect = document.getElementById('auction-sell-select');
            const priceInput = document.getElementById('auction-sell-price');
            const itemIndex = sellSelect ? parseInt(sellSelect.value) : -1;
            const price = priceInput ? parseInt(priceInput.value) : 0;

            if (isNaN(itemIndex) || itemIndex < 0 || !hero.inventory[itemIndex]) {
                return showCustomModal("Selecciona un ítem válido de tu inventario.");
            }
            if (isNaN(price) || price <= 0) {
                return showCustomModal("Introduce un precio de oro válido.");
            }

            const itemToSell = hero.inventory[itemIndex];

            // Remover de inventario del héroe
            hero.inventory.splice(itemIndex, 1);
            await setDoc(doc(db, "users", currentUser.uid, "characters", heroId), hero);

            // Crear lote en Firestore
            await addDoc(collection(db, "auctions"), {
                sellerUid: currentUser.uid,
                sellerName: hero.name,
                item: itemToSell,
                price: price
            });

            priceInput.value = "";
            showCustomModal("¡Objeto publicado en la Casa de Subastas con éxito!", "⚖️ SUBASTA CREADA");
            if (refreshHeroUI) refreshHeroUI();
        });
    }
}

async function buyAuctionItem(lotId, hero, heroId, currentUser, refreshHeroUI) {
    if (!hero || !heroId) return showCustomModal("Selecciona un personaje activo.");
    const lotRef = doc(db, "auctions", lotId);
    const lotSnap = await getDoc(lotRef);
    if (!lotSnap.exists()) return showCustomModal("Este lote ya no está disponible.");

    const lot = lotSnap.data();
    if (hero.gold < lot.price) return showCustomModal("No tienes suficiente oro para comprar este objeto.");

    // Descontar oro al comprador y añadir ítem al inventario
    hero.gold -= lot.price;
    if (!hero.inventory) hero.inventory = [];
    hero.inventory.push(lot.item);
    await setDoc(doc(db, "users", currentUser.uid, "characters", heroId), hero);

    // Enviar el oro al vendedor (si sigue existiendo el personaje del vendedor)
    try {
        const sellerCharsRef = collection(db, "users", lot.sellerUid, "characters");
        const sellerSnap = await getDocs(sellerCharsRef);
        if (!sellerSnap.empty) {
            const sellerDocSnap = sellerSnap.docs[0];
            const sellerHero = sellerDocSnap.data();
            sellerHero.gold = (sellerHero.gold || 0) + lot.price;
            await setDoc(doc(db, "users", lot.sellerUid, "characters", sellerDocSnap.id), sellerHero);
        }
    } catch (err) {
        console.log("No se pudo entregar el oro al vendedor offline, pero la transacción procedió.");
    }

    // Eliminar lote de la subasta
    await deleteDoc(lotRef);
    showCustomModal(`¡Has comprado ${lot.item.name} por 🪙 ${lot.price} de oro!`, "🎉 COMPRA EXITOSA");
    if (refreshHeroUI) refreshHeroUI();
}

async function cancelAuctionItem(lotId, hero, heroId, currentUser, refreshHeroUI) {
    if (!hero || !heroId) return;
    const lotRef = doc(db, "auctions", lotId);
    const lotSnap = await getDoc(lotRef);
    if (!lotSnap.exists()) return;

    const lot = lotSnap.data();
    if (!hero.inventory) hero.inventory = [];
    hero.inventory.push(lot.item);

    await setDoc(doc(db, "users", currentUser.uid, "characters", heroId), hero);
    await deleteDoc(lotRef);

    showCustomModal("Has retirado el objeto de la subasta.", "📦 LOTE RETIRADO");
    if (refreshHeroUI) refreshHeroUI();
}