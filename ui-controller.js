// ui-controller.js - Control de Vistas, Modales y Notificaciones Toast

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

// NOTIFICACIÓN POPUP RETRO DE LOGRO DESBLOQUEADO
export function showAchievementToast(achievementName, icon = "🏆") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-body">
            <span class="toast-title">¡LOGRO DESBLOQUEADO!</span>
            <span class="toast-name">${achievementName}</span>
        </div>
    `;

    container.appendChild(toast);

    // Remover automáticamente después de 4 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}