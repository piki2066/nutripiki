# 🥗 NutriPal — tu MyFitnessPal personal (100% local)

Diario de **calorías, macros, micronutrientes, peso, medidas, ejercicio, agua y ayuno intermitente**, con todas las funciones "premium" de MyFitnessPal incluidas y **sin pagar nada**. Es una **PWA** (app web instalable) que funciona **offline** y guarda **todos tus datos solo en tu dispositivo** (IndexedDB). Sin cuentas, sin nube, sin anuncios.

---

## ✨ Qué incluye (todo lo de MyFitnessPal, gratis)

- **Diario por comidas** (Desayuno/Almuerzo/Cena/Snacks) con totales, edición, mover entre comidas y registro rápido (Quick Add) de calorías o macros.
- **Quick Tools**: copiar una comida a otra fecha, copiar desde otra fecha y **“Recordar comida”** para reutilizarla.
- **Buscador de alimentos** con pestañas (Todos / Recientes / Frecuentes / Mis alimentos / Comidas / Recetas) y base de datos real de **OpenFoodFacts** (millones de productos) + alimentos básicos integrados.
- **Escáner de código de barras** con la cámara (busca el producto en OpenFoodFacts).
- **Crear alimentos** y **recetas** propias; **importador de recetas desde URL** (schema.org).
- **Objetivos calculados** con tu metabolismo: BMR **Mifflin-St Jeor**, TDEE por actividad y déficit/superávit por ritmo de peso.
- **Macros por % o por gramos**, **objetivos por día de la semana**, **micronutrientes** y **modo Net Carbs (keto)**.
- **Panel de nutrientes** (anillos de macros + todos los micros vs objetivo) y **desglose por comida**.
- **Ejercicio** cardio (cálculo por MET) y fuerza (series/reps/peso), **pasos**, y “cómete” las calorías de ejercicio (modo NEAT).
- **Agua** con objetivo, **peso** con tendencia, **medidas corporales**, **% grasa** y **fotos de progreso**.
- **Ayuno intermitente** (12:12, 14:10, 16:8, 18:6) con temporizador en vivo e historial.
- **Reportes**: tendencias de calorías/macros, alimentos top y **exportar a CSV**.
- **Racha de registro**, **“Completar día”** con proyección a 5 semanas, **tema oscuro/claro**, color de acento, **export/import** de todos tus datos.

---

## 🚀 Probarla ahora (en el Mac, 30 segundos)

```bash
cd ~/NutriPal
npm install        # solo la primera vez
npm run build
npm run preview
```

Abre **http://localhost:4173** en Safari o Chrome. En `localhost` funciona el modo PWA completo (instalable + offline). Para instalarla en el Mac: en Chrome, icono de instalar en la barra de direcciones; en Safari, *Archivo → Añadir al Dock*.

> Durante el desarrollo puedes usar `npm run dev` (recarga en caliente) y abrir http://localhost:5173.

---

## 📱 Usarla en tu iPhone

Tienes el iPhone y el Mac en la **misma red WiFi**. Hay dos caminos:

### A) Rápido — sobre tu WiFi (el Mac hace de servidor)

1. En el Mac: `npm run build && npm run preview`
2. El comando imprime una línea **Network:** algo como `http://192.168.1.67:4173/`. Esa es la dirección de tu Mac en la WiFi.
3. En el **iPhone**, abre esa dirección en **Safari**.
4. Pulsa el botón **Compartir** → **Añadir a pantalla de inicio**. Tendrás el icono de NutriPal y se abrirá a pantalla completa como una app.

   *Tus datos se guardan en el iPhone.* En este modo la app necesita que el Mac esté encendido y sirviendo (no es offline puro, porque iOS no activa el modo offline sobre HTTP en red local).

### B) Recomendado — app **offline de verdad**, sin depender del Mac

Para que funcione **siempre y sin conexión** en el iPhone, iOS exige **HTTPS**. Sube la carpeta `dist/` (que genera `npm run build`) a un hosting estático **gratuito con HTTPS** y abre esa URL en el iPhone:

- **Netlify Drop** (lo más fácil): entra en https://app.netlify.com/drop y **arrastra la carpeta `dist`**. Te da una URL `https://…netlify.app`.
- o **Vercel**: `npx vercel --prod` dentro de la carpeta del proyecto.
- o **Cloudflare Pages / GitHub Pages**.

Luego, en el iPhone: abre la URL `https://…` en Safari → **Compartir → Añadir a pantalla de inicio**. Ya tienes NutriPal instalada, **offline y autónoma**; tus datos siguen viviendo solo en tu iPhone.

> Solo se publica el “armazón” de la app (HTML/CSS/JS). **Ningún dato tuyo** se sube: el diario, el peso y las fotos se quedan en IndexedDB de tu teléfono.

---

## 🔒 Privacidad

- 100% local: no hay servidor de datos, ni analítica, ni cuentas.
- La única red que usa la app es **OpenFoodFacts** (buscar alimentos / códigos de barras). Esas respuestas se cachean para funcionar offline.
- Copia de seguridad: *Más → Ajustes → Exportar datos (JSON)*. Restauración: *Importar datos*.

## 🛠️ Estructura técnica

- **React + TypeScript + Vite** · PWA con `vite-plugin-pwa` (service worker + manifest).
- **Dexie (IndexedDB)** para todo el almacenamiento local.
- **ZXing** para el escáner de códigos de barras.
- Gráficas SVG propias (sin dependencias pesadas).
- Motor de nutrición en `src/lib/nutrition.ts` (Mifflin-St Jeor, TDEE, macros, MET).

```
src/
  components/   UI compartida (Icon, Ring, Sheet, Charts, TabBar…)
  db/           tipos, esquema Dexie, seed y repositorio (mutaciones)
  lib/          nutrición, selectores, OpenFoodFacts, fechas, export…
  features/     today · diary · foods · exercise · progress · fasting · reports · goals · settings · onboarding · more
```

Hecho con cariño para llevar tu progreso de verdad. 💪
