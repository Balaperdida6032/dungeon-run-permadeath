// ui-controller.js - Control de Vistas, Modales e Interfaz de Usuario

export function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active-screen');
}

export function showCustomModal(message, title = "DUNGEON RUN", callback = null) {
    const modal = document.getElementById('custom-modal');
    if (!modal) return alert(message);

    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    modal.style.display = 'flex';

    const closeBtn = document.getElementById('btn-modal-close');
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    newCloseBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (callback) callback();
    });
}