import type { ExerciseDef, Food, Nutrients, ServingOption } from './types'
import { EMPTY_NUTRIENTS } from './types'
import { uid } from '@/lib/id'

/** Helper compacto: nutrientes por 100 g. Orden: kcal,carb,fat,prot,fiber,sugar,sat,sodium,potas */
function n(
  calories: number, carbs: number, fat: number, protein: number,
  fiber = 0, sugar = 0, sat = 0, sodium = 0, potassium = 0,
  extra: Partial<Nutrients> = {},
): Nutrients {
  return { ...EMPTY_NUTRIENTS, calories, carbs, fat, protein, fiber, sugar, saturatedFat: sat, sodium, potassium, ...extra }
}

function serv(label: string, grams: number, isDefault = false): ServingOption {
  return { id: uid('sv'), label, grams, isDefault }
}

/** Construye un Food "seed" con raciones estándar (100 g + raciones dadas). */
function food(
  name: string, per100: Nutrients, servings: ServingOption[],
  opts: { brand?: string; isLiquid?: boolean; barcode?: string; verified?: boolean } = {},
): Food {
  const base = opts.isLiquid ? serv('100 ml', 100) : serv('100 g', 100)
  const all = servings.length ? servings : [serv(opts.isLiquid ? '1 porción (250 ml)' : '1 porción (100 g)', opts.isLiquid ? 250 : 100, true)]
  if (!all.some((s) => s.isDefault)) all[0].isDefault = true
  return {
    id: uid('seed'),
    name,
    brand: opts.brand,
    barcode: opts.barcode,
    source: 'seed',
    verified: opts.verified ?? true,
    per100,
    servings: [...all, base],
    isLiquid: opts.isLiquid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/** Alimentos base (valores nutricionales por 100 g, aproximados y realistas). */
export const SEED_FOODS: Food[] = [
  // --- Cereales / panes / pasta ---
  food('Arroz blanco cocido', n(130, 28, 0.3, 2.7, 0.4, 0.1, 0.1, 1, 35), [serv('Taza (158 g)', 158, true), serv('Plato (200 g)', 200)]),
  food('Arroz integral cocido', n(123, 25.6, 1, 2.7, 1.6, 0.2, 0.2, 4, 86), [serv('Taza (195 g)', 195, true)]),
  food('Pasta cocida', n(157, 30.9, 0.9, 5.8, 1.8, 0.6, 0.2, 1, 44), [serv('Plato (180 g)', 180, true), serv('Taza (140 g)', 140)]),
  food('Pan blanco', n(265, 49, 3.2, 9, 2.7, 5, 0.7, 491, 115), [serv('Rebanada (28 g)', 28, true), serv('2 rebanadas (56 g)', 56)]),
  food('Pan integral', n(247, 41, 3.4, 13, 7, 6, 0.7, 450, 250), [serv('Rebanada (32 g)', 32, true)]),
  food('Avena en copos', n(389, 66, 6.9, 16.9, 10.6, 0.9, 1.2, 2, 429), [serv('Taza seca (80 g)', 80), serv('Ración (40 g)', 40, true)]),
  food('Tortilla de maíz', n(218, 45, 2.9, 5.7, 6.3, 0.8, 0.4, 45, 186), [serv('Tortilla (30 g)', 30, true)]),
  food('Quinoa cocida', n(120, 21.3, 1.9, 4.4, 2.8, 0.9, 0.2, 7, 172), [serv('Taza (185 g)', 185, true)]),

  // --- Proteínas ---
  food('Pechuga de pollo a la plancha', n(165, 0, 3.6, 31, 0, 0, 1, 74, 256), [serv('Filete (120 g)', 120, true), serv('Ración (150 g)', 150)]),
  food('Muslo de pollo', n(209, 0, 10.9, 26, 0, 0, 3, 88, 230), [serv('Muslo (110 g)', 110, true)]),
  food('Ternera magra', n(187, 0, 8, 28, 0, 0, 3.1, 56, 318), [serv('Filete (150 g)', 150, true)]),
  food('Cerdo lomo', n(143, 0, 3.5, 26, 0, 0, 1.2, 53, 423), [serv('Filete (120 g)', 120, true)]),
  food('Salmón', n(208, 0, 13, 20, 0, 0, 3.1, 59, 363), [serv('Filete (140 g)', 140, true)]),
  food('Atún al natural', n(116, 0, 0.8, 26, 0, 0, 0.3, 247, 237), [serv('Lata (80 g)', 80, true)]),
  food('Merluza', n(90, 0, 1.3, 18, 0, 0, 0.3, 89, 372), [serv('Filete (150 g)', 150, true)]),
  food('Huevo', n(155, 1.1, 11, 13, 0, 1.1, 3.3, 124, 126), [serv('Unidad M (50 g)', 50, true), serv('Unidad L (60 g)', 60)]),
  food('Clara de huevo', n(52, 0.7, 0.2, 11, 0, 0.7, 0, 166, 163), [serv('Clara (33 g)', 33, true)]),
  food('Tofu firme', n(144, 2.8, 8.7, 17, 2.3, 0.6, 1.3, 14, 121), [serv('Bloque (120 g)', 120, true)]),
  food('Lentejas cocidas', n(116, 20, 0.4, 9, 7.9, 1.8, 0.1, 2, 369), [serv('Plato (200 g)', 200, true), serv('Taza (198 g)', 198)]),
  food('Garbanzos cocidos', n(164, 27, 2.6, 8.9, 7.6, 4.8, 0.3, 7, 291), [serv('Plato (200 g)', 200, true)]),
  food('Alubias cocidas', n(127, 22.8, 0.5, 8.7, 6.4, 0.3, 0.1, 1, 405), [serv('Plato (200 g)', 200, true)]),
  food('Jamón serrano', n(241, 0.3, 12, 31, 0, 0.3, 4, 1110, 320), [serv('Loncha (15 g)', 15, true), serv('Ración (50 g)', 50)]),
  food('Pavo pechuga', n(104, 1.7, 1.7, 21, 0, 0.6, 0.5, 1015, 280), [serv('Loncha (20 g)', 20, true)]),

  // --- Lácteos ---
  food('Leche entera', n(61, 4.8, 3.3, 3.2, 0, 4.8, 1.9, 43, 132), [serv('Vaso (250 ml)', 250, true), serv('Taza (200 ml)', 200)], { isLiquid: true }),
  food('Leche desnatada', n(34, 5, 0.1, 3.4, 0, 5, 0.1, 42, 156), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Yogur natural', n(61, 4.7, 3.3, 3.5, 0, 4.7, 2.1, 46, 155), [serv('Unidad (125 g)', 125, true)]),
  food('Yogur griego natural', n(97, 3.9, 5, 9, 0, 4, 3.2, 35, 141), [serv('Unidad (150 g)', 150, true)]),
  food('Queso fresco', n(98, 3.4, 4.3, 11, 0, 3.4, 2.8, 364, 95), [serv('Ración (60 g)', 60, true)]),
  food('Queso curado', n(402, 1.3, 33, 25, 0, 0.5, 21, 621, 98), [serv('Loncha (20 g)', 20, true), serv('Taquito (30 g)', 30)]),
  food('Requesón / cottage', n(98, 3.4, 4.3, 11, 0, 2.7, 1.7, 364, 104), [serv('Ración (100 g)', 100, true)]),
  food('Mantequilla', n(717, 0.1, 81, 0.9, 0, 0.1, 51, 11, 24), [serv('Porción (10 g)', 10, true)]),

  // --- Frutas ---
  food('Plátano', n(89, 23, 0.3, 1.1, 2.6, 12, 0.1, 1, 358), [serv('Unidad (118 g)', 118, true)]),
  food('Manzana', n(52, 14, 0.2, 0.3, 2.4, 10, 0, 1, 107), [serv('Unidad (182 g)', 182, true)]),
  food('Naranja', n(47, 12, 0.1, 0.9, 2.4, 9, 0, 0, 181), [serv('Unidad (140 g)', 140, true)]),
  food('Fresas', n(32, 7.7, 0.3, 0.7, 2, 4.9, 0, 1, 153), [serv('Taza (152 g)', 152, true), serv('Puñado (80 g)', 80)]),
  food('Arándanos', n(57, 14, 0.3, 0.7, 2.4, 10, 0, 1, 77), [serv('Taza (148 g)', 148, true)]),
  food('Uvas', n(69, 18, 0.2, 0.7, 0.9, 16, 0.1, 2, 191), [serv('Taza (151 g)', 151, true)]),
  food('Aguacate', n(160, 8.5, 15, 2, 6.7, 0.7, 2.1, 7, 485), [serv('Medio (100 g)', 100, true), serv('Unidad (200 g)', 200)]),
  food('Sandía', n(30, 7.6, 0.2, 0.6, 0.4, 6.2, 0, 1, 112), [serv('Tajada (280 g)', 280, true)]),

  // --- Verduras ---
  food('Brócoli cocido', n(35, 7.2, 0.4, 2.4, 3.3, 1.4, 0, 41, 293), [serv('Taza (156 g)', 156, true)]),
  food('Espinacas', n(23, 3.6, 0.4, 2.9, 2.2, 0.4, 0.1, 79, 558), [serv('Taza (30 g)', 30, true), serv('Ración (150 g)', 150)]),
  food('Tomate', n(18, 3.9, 0.2, 0.9, 1.2, 2.6, 0, 5, 237), [serv('Unidad (123 g)', 123, true)]),
  food('Zanahoria', n(41, 9.6, 0.2, 0.9, 2.8, 4.7, 0, 69, 320), [serv('Unidad (61 g)', 61, true)]),
  food('Patata cocida', n(87, 20, 0.1, 1.9, 1.8, 0.9, 0, 4, 379), [serv('Unidad (150 g)', 150, true)]),
  food('Patata frita', n(312, 41, 15, 3.4, 3.8, 0.3, 2.3, 210, 579), [serv('Ración (130 g)', 130, true)]),
  food('Lechuga', n(15, 2.9, 0.2, 1.4, 1.3, 0.8, 0, 28, 194), [serv('Taza (47 g)', 47, true)]),
  food('Pepino', n(15, 3.6, 0.1, 0.7, 0.5, 1.7, 0, 2, 147), [serv('Medio (150 g)', 150, true)]),
  food('Pimiento', n(31, 6, 0.3, 1, 2.1, 4.2, 0, 4, 211), [serv('Unidad (120 g)', 120, true)]),
  food('Cebolla', n(40, 9.3, 0.1, 1.1, 1.7, 4.2, 0, 4, 146), [serv('Media (55 g)', 55, true)]),

  // --- Grasas / frutos secos ---
  food('Aceite de oliva', n(884, 0, 100, 0, 0, 0, 14, 2, 1), [serv('Cucharada (14 g)', 14, true), serv('Cucharadita (5 g)', 5)]),
  food('Almendras', n(579, 22, 50, 21, 12.5, 4.4, 3.8, 1, 733), [serv('Puñado (28 g)', 28, true)]),
  food('Nueces', n(654, 14, 65, 15, 6.7, 2.6, 6.1, 2, 441), [serv('Puñado (28 g)', 28, true)]),
  food('Cacahuetes', n(567, 16, 49, 26, 8.5, 4, 6.8, 18, 705), [serv('Puñado (28 g)', 28, true)]),
  food('Crema de cacahuete', n(588, 20, 50, 25, 6, 9, 10, 459, 649), [serv('Cucharada (16 g)', 16, true)]),

  // --- Snacks / dulces / bebidas ---
  food('Chocolate negro 70%', n(598, 46, 43, 7.8, 11, 24, 24, 20, 715), [serv('Onza (10 g)', 10, true), serv('Fila (25 g)', 25)]),
  food('Galletas tipo María', n(436, 75, 12, 7, 2.5, 22, 5, 300, 120), [serv('Galleta (8 g)', 8, true), serv('4 galletas (32 g)', 32)]),
  food('Patatas chips', n(536, 53, 35, 7, 4.4, 0.6, 3.5, 525, 1275), [serv('Bolsa (45 g)', 45, true)]),
  food('Refresco de cola', n(42, 10.6, 0, 0, 0, 10.6, 0, 4, 2), [serv('Lata (330 ml)', 330, true), serv('Vaso (250 ml)', 250)], { isLiquid: true }),
  food('Cerveza', n(43, 3.6, 0, 0.5, 0, 0, 0, 4, 27), [serv('Caña (200 ml)', 200, true), serv('Tercio (330 ml)', 330)], { isLiquid: true }),
  food('Zumo de naranja', n(45, 10.4, 0.2, 0.7, 0.2, 8.4, 0, 1, 200), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Café solo', n(2, 0, 0, 0.1, 0, 0, 0, 2, 49), [serv('Taza (60 ml)', 60, true)], { isLiquid: true }),
  food('Miel', n(304, 82, 0, 0.3, 0.2, 82, 0, 4, 52), [serv('Cucharada (21 g)', 21, true)]),
  food('Azúcar', n(387, 100, 0, 0, 0, 100, 0, 1, 2), [serv('Cucharadita (4 g)', 4, true), serv('Cucharada (12 g)', 12)]),
]

/** Catálogo de ejercicios con valor MET (para estimar calorías). */
export const SEED_EXERCISES: ExerciseDef[] = [
  // Cardio
  { id: uid('ex'), name: 'Caminar (5 km/h)', kind: 'cardio', met: 3.5 },
  { id: uid('ex'), name: 'Caminar rápido (6.5 km/h)', kind: 'cardio', met: 5 },
  { id: uid('ex'), name: 'Correr (8 km/h)', kind: 'cardio', met: 8.3 },
  { id: uid('ex'), name: 'Correr (10 km/h)', kind: 'cardio', met: 10 },
  { id: uid('ex'), name: 'Correr (12 km/h)', kind: 'cardio', met: 11.8 },
  { id: uid('ex'), name: 'Ciclismo moderado', kind: 'cardio', met: 7.5 },
  { id: uid('ex'), name: 'Ciclismo intenso', kind: 'cardio', met: 10 },
  { id: uid('ex'), name: 'Bicicleta estática', kind: 'cardio', met: 7 },
  { id: uid('ex'), name: 'Natación moderada', kind: 'cardio', met: 6 },
  { id: uid('ex'), name: 'Natación intensa', kind: 'cardio', met: 9.8 },
  { id: uid('ex'), name: 'Elíptica', kind: 'cardio', met: 5 },
  { id: uid('ex'), name: 'Remo (máquina)', kind: 'cardio', met: 7 },
  { id: uid('ex'), name: 'Saltar a la comba', kind: 'cardio', met: 11 },
  { id: uid('ex'), name: 'HIIT', kind: 'cardio', met: 8 },
  { id: uid('ex'), name: 'Senderismo', kind: 'cardio', met: 6 },
  { id: uid('ex'), name: 'Baile / Zumba', kind: 'cardio', met: 6.5 },
  { id: uid('ex'), name: 'Spinning', kind: 'cardio', met: 8.5 },
  { id: uid('ex'), name: 'Boxeo', kind: 'cardio', met: 9 },
  { id: uid('ex'), name: 'Fútbol', kind: 'cardio', met: 7 },
  { id: uid('ex'), name: 'Baloncesto', kind: 'cardio', met: 6.5 },
  { id: uid('ex'), name: 'Tenis', kind: 'cardio', met: 7.3 },
  { id: uid('ex'), name: 'Pádel', kind: 'cardio', met: 6 },
  { id: uid('ex'), name: 'Yoga', kind: 'cardio', met: 3 },
  { id: uid('ex'), name: 'Pilates', kind: 'cardio', met: 3.5 },
  { id: uid('ex'), name: 'Elíptica intensa', kind: 'cardio', met: 7 },
  { id: uid('ex'), name: 'Escaleras (subir)', kind: 'cardio', met: 8 },
  // Fuerza
  { id: uid('ex'), name: 'Entrenamiento de fuerza (general)', kind: 'strength', met: 5 },
  { id: uid('ex'), name: 'Pesas (vigoroso)', kind: 'strength', met: 6 },
  { id: uid('ex'), name: 'Press de banca', kind: 'strength', met: 5 },
  { id: uid('ex'), name: 'Sentadilla', kind: 'strength', met: 5.5 },
  { id: uid('ex'), name: 'Peso muerto', kind: 'strength', met: 6 },
  { id: uid('ex'), name: 'Dominadas', kind: 'strength', met: 5 },
  { id: uid('ex'), name: 'Flexiones', kind: 'strength', met: 4 },
  { id: uid('ex'), name: 'Press militar', kind: 'strength', met: 5 },
  { id: uid('ex'), name: 'Curl de bíceps', kind: 'strength', met: 3.5 },
  { id: uid('ex'), name: 'Abdominales', kind: 'strength', met: 3.8 },
  { id: uid('ex'), name: 'Plancha', kind: 'strength', met: 3.5 },
  { id: uid('ex'), name: 'Calistenia', kind: 'strength', met: 4.5 },
  { id: uid('ex'), name: 'CrossFit / WOD', kind: 'strength', met: 7 },
  { id: uid('ex'), name: 'Kettlebells', kind: 'strength', met: 6 },
]
