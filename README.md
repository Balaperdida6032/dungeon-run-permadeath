https://balaperdida6032.github.io/dungeon-run-permadeath/

# 🗡️ Dungeon Run: Permadeath

**Dungeon Run: Permadeath** es un videojuego RPG web multijugador por turnos desarrollado con un estilo retro pixel-art. Ofrece un sistema de progresión persistente (nivel, experiencia y oro) combinado con una mecánica desafiante de **muerte permanente (permadeath)**: si tu héroe cae en combate dentro de la mazmorra, ¡se elimina para siempre!

---

## 🚀 Características Principales

* **🕹️ Estética Retro Pixel-Art:** Interfaz basada en estilos de 8/16 bits utilizando Google Fonts (`Press Start 2P`) y CSS personalizado.
* **🔑 Autenticación de Usuarios:** Inicio de sesión rápido mediante Google OAuth y correo electrónico/contraseña.
* **🧙‍♂️ Sistema de Héroes:** Selección de clases únicas (Guerrero, Mago, Pícaro) con persistencia de estadísticas.
* **⚔️ Combat Multijugador en Tiempo Real:** Creación y unión a salas mediante códigos únicos para explorar la mazmorra en party.
* **💀 Muerte Permanente (Permadeath):** Si la vida de tu personaje llega a 0 en la mazmorra, el perfil del héroe se elimina permanentemente de la base de datos.
* **🪙 Extracción y Progresión:** Huye a tiempo para asegurar tus ganancias de oro y experiencia, o arriésgalo todo para derrotar al jefe.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules).
* **Backend & Persistence:** Firebase v10
  * **Firebase Authentication:** Gestión de usuarios y acceso con Google/Email.
  * **Cloud Firestore:** Base de datos NoSQL en tiempo real para sincronizar salas de combate y perfiles de héroes.

---

## 📁 Estructura del Proyecto

```text
├── index.html     # Estructura principal de la aplicación y pantallas (Auth, Lobby, Dungeon)
├── styles.css     # Estilos retro pixel-art y maquetación responsive
└── script.js      # Lógica del juego, eventos e integración en tiempo real con Firebase SDK
