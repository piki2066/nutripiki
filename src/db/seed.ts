import type { ExerciseDef, Food, Nutrients, ServingOption } from './types'
import { EMPTY_NUTRIENTS } from './types'
import { uid } from '@/lib/id'
import { normalize } from '@/lib/search'

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

/** ID determinista y estable para un alimento base (permite top-up idempotente). */
function seedId(name: string): string {
  return 'seed_' + normalize(name).replace(/\s+/g, '_')
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
    id: seedId(name),
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

  // --- Aves / carnes (ampliación) ---
  food('Pechuga de pollo cruda', n(120, 0, 2.6, 23, 0, 0, 0.7, 60, 334), [serv('Filete (150 g)', 150, true)]),
  food('Pollo entero crudo', n(167, 0, 9.3, 20, 0, 0, 2.7, 70, 220), [serv('Ración (150 g)', 150, true)]),
  food('Pollo asado', n(220, 0, 12, 27, 0, 0, 3.5, 90, 250), [serv('Ración (150 g)', 150, true)]),
  food('Contramuslo de pollo', n(177, 0, 10.9, 24, 0, 0, 3, 86, 229), [serv('Contramuslo (90 g)', 90, true)]),
  food('Alitas de pollo', n(220, 0, 16, 18, 0, 0, 4.5, 82, 180), [serv('Ración (100 g)', 100, true)]),
  food('Pavo pechuga (filete fresco)', n(105, 0, 1, 24, 0, 0, 0.3, 63, 302), [serv('Filete (130 g)', 130, true)]),
  food('Pavo en lonchas', n(95, 1.5, 1.6, 19, 0, 0.8, 0.5, 980, 260), [serv('Loncha (20 g)', 20, true), serv('Ración (60 g)', 60)]),
  food('Ternera picada', n(217, 0, 15, 19, 0, 0, 6, 66, 270), [serv('Ración (125 g)', 125, true)]),
  food('Solomillo de ternera', n(158, 0, 6, 26, 0, 0, 2.3, 55, 360), [serv('Filete (150 g)', 150, true)]),
  food('Entrecot de ternera', n(271, 0, 19, 25, 0, 0, 8, 58, 320), [serv('Filete (200 g)', 200, true)]),
  food('Hamburguesa de ternera (cruda)', n(250, 0, 20, 17, 0, 0, 8, 75, 250), [serv('Hamburguesa (115 g)', 115, true)]),
  food('Chuleta de cerdo', n(231, 0, 14, 25, 0, 0, 5, 62, 360), [serv('Chuleta (150 g)', 150, true)]),
  food('Panceta de cerdo', n(518, 0, 53, 9, 0, 0, 19, 32, 180), [serv('Ración (60 g)', 60, true)]),
  food('Secreto ibérico', n(290, 0, 24, 18, 0, 0, 8, 60, 300), [serv('Ración (150 g)', 150, true)]),
  food('Costillas de cerdo', n(277, 0, 22, 18, 0, 0, 8, 80, 270), [serv('Ración (200 g)', 200, true)]),
  food('Conejo', n(173, 0, 8.3, 22, 0, 0, 2.3, 45, 343), [serv('Ración (150 g)', 150, true)]),
  food('Cordero (pierna)', n(230, 0, 16, 20, 0, 0, 7, 72, 310), [serv('Ración (150 g)', 150, true)]),
  food('Pato (pechuga)', n(201, 0, 11, 24, 0, 0, 3.5, 74, 270), [serv('Ración (130 g)', 130, true)]),
  food('Higadillos de pollo', n(119, 0.7, 4.8, 17, 0, 0, 1.6, 71, 230), [serv('Ración (100 g)', 100, true)]),

  // --- Fiambres / embutidos (ampliación) ---
  food('Jamón cocido (york)', n(108, 1.5, 3.5, 18, 0, 1, 1.2, 1100, 290), [serv('Loncha (20 g)', 20, true), serv('Ración (60 g)', 60)]),
  food('Chorizo', n(455, 1.9, 38, 24, 0, 1, 14, 1240, 420), [serv('Ración (30 g)', 30, true)]),
  food('Salchichón', n(420, 1.5, 34, 24, 0, 1, 13, 1500, 380), [serv('Ración (30 g)', 30, true)]),
  food('Mortadela', n(311, 3, 28, 12, 0, 1, 10, 1246, 200), [serv('Loncha (25 g)', 25, true)]),
  food('Bacon', n(541, 1.4, 42, 37, 0, 0, 14, 1717, 565), [serv('Loncha (12 g)', 12, true)]),
  food('Salchichas tipo Frankfurt', n(290, 2.5, 26, 11, 0, 1.5, 9.5, 980, 200), [serv('Salchicha (40 g)', 40, true)]),
  food('Fuet', n(446, 1.5, 38, 26, 0, 1, 14, 1600, 380), [serv('Ración (30 g)', 30, true)]),
  food('Lomo embuchado', n(250, 1, 12, 33, 0, 0.5, 4, 2000, 400), [serv('Loncha (20 g)', 20, true)]),
  food('Sobrasada', n(540, 2, 55, 9, 0, 1, 20, 900, 250), [serv('Ración (25 g)', 25, true)]),
  food('Salami', n(378, 1.2, 31, 22, 0, 0, 11, 1740, 340), [serv('Loncha (15 g)', 15, true)]),
  food('Morcilla', n(379, 12, 28, 15, 1, 0.5, 11, 680, 160), [serv('Ración (50 g)', 50, true)]),

  // --- Pescados / marisco (ampliación) ---
  food('Bacalao fresco', n(82, 0, 0.7, 18, 0, 0, 0.1, 54, 413), [serv('Filete (150 g)', 150, true)]),
  food('Bacalao salado (desalado)', n(130, 0, 1.4, 29, 0, 0, 0.3, 400, 200), [serv('Ración (120 g)', 120, true)]),
  food('Dorada', n(96, 0, 2.5, 18, 0, 0, 0.6, 80, 350), [serv('Pieza (200 g)', 200, true)]),
  food('Lubina', n(97, 0, 2.5, 18, 0, 0, 0.6, 68, 256), [serv('Pieza (200 g)', 200, true)]),
  food('Sardina', n(208, 0, 11, 25, 0, 0, 3, 90, 397), [serv('Ración (100 g)', 100, true)]),
  food('Caballa', n(205, 0, 14, 19, 0, 0, 3.3, 90, 314), [serv('Ración (120 g)', 120, true)]),
  food('Lenguado', n(86, 0, 1.2, 18, 0, 0, 0.3, 80, 300), [serv('Filete (120 g)', 120, true)]),
  food('Trucha', n(119, 0, 3.5, 21, 0, 0, 0.7, 52, 375), [serv('Pieza (150 g)', 150, true)]),
  food('Atún fresco', n(144, 0, 5, 23, 0, 0, 1.3, 39, 252), [serv('Filete (140 g)', 140, true)]),
  food('Pez espada', n(144, 0, 6.7, 20, 0, 0, 1.8, 81, 418), [serv('Filete (150 g)', 150, true)]),
  food('Gambas', n(99, 0.2, 1.7, 21, 0, 0, 0.3, 160, 182), [serv('Ración (100 g)', 100, true)]),
  food('Langostinos', n(106, 0.9, 1.7, 20, 0, 0, 0.4, 150, 185), [serv('Ración (100 g)', 100, true)]),
  food('Mejillones', n(86, 3.7, 2.2, 12, 0, 0, 0.4, 286, 320), [serv('Ración (100 g)', 100, true)]),
  food('Calamar', n(92, 3, 1.4, 16, 0, 0, 0.4, 44, 246), [serv('Ración (100 g)', 100, true)]),
  food('Pulpo', n(82, 2.2, 1, 15, 0, 0, 0.2, 230, 350), [serv('Ración (120 g)', 120, true)]),
  food('Palitos de cangrejo (surimi)', n(95, 15, 0.4, 7.6, 0, 5, 0.1, 529, 90), [serv('Palito (17 g)', 17, true), serv('Ración (85 g)', 85)]),
  food('Boquerones', n(131, 0, 4.8, 20, 0, 0, 1.3, 104, 383), [serv('Ración (100 g)', 100, true)]),

  // --- Lácteos / postres lácteos (ampliación) ---
  food('Leche semidesnatada', n(47, 4.8, 1.6, 3.3, 0, 4.8, 1, 44, 150), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Kéfir', n(60, 4.5, 3.3, 3.3, 0, 4.5, 2, 40, 150), [serv('Vaso (200 ml)', 200, true)], { isLiquid: true }),
  food('Queso de untar', n(253, 4, 23, 6, 0, 3, 15, 400, 130), [serv('Ración (30 g)', 30, true)]),
  food('Mozzarella', n(280, 3.1, 22, 18, 0, 1, 13, 627, 76), [serv('Ración (60 g)', 60, true)]),
  food('Parmesano', n(392, 3.2, 29, 36, 0, 0.8, 19, 1376, 92), [serv('Ración (20 g)', 20, true)]),
  food('Queso azul', n(353, 2.3, 29, 21, 0, 0.5, 19, 1395, 256), [serv('Ración (30 g)', 30, true)]),
  food('Queso en lonchas', n(300, 6, 23, 16, 0, 3, 15, 1300, 120), [serv('Loncha (20 g)', 20, true)]),
  food('Emmental', n(380, 1, 30, 28, 0, 0.5, 18, 180, 100), [serv('Loncha (25 g)', 25, true)]),
  food('Nata para cocinar', n(195, 3.4, 19, 2.5, 0, 3, 12, 40, 90), [serv('Chorro (30 ml)', 30, true)], { isLiquid: true }),
  food('Nata montada', n(257, 12, 22, 2, 0, 10, 14, 40, 90), [serv('Ración (30 g)', 30, true)]),
  food('Batido de chocolate', n(83, 12, 2.4, 3.3, 0.3, 11, 1.5, 60, 180), [serv('Vaso (200 ml)', 200, true)], { isLiquid: true }),
  food('Natillas', n(118, 18, 3.5, 3.4, 0, 16, 2, 70, 150), [serv('Unidad (125 g)', 125, true)]),
  food('Flan', n(145, 22, 3.5, 4, 0, 20, 2, 75, 150), [serv('Unidad (100 g)', 100, true)]),
  food('Cuajada', n(90, 4.5, 5, 5, 0, 4.5, 3, 50, 140), [serv('Unidad (125 g)', 125, true)]),
  food('Yogur de sabores', n(90, 14, 2.5, 3.5, 0, 13, 1.6, 50, 180), [serv('Unidad (125 g)', 125, true)]),
  food('Yogur desnatado', n(45, 6, 0.2, 4.3, 0, 6, 0.1, 55, 200), [serv('Unidad (125 g)', 125, true)]),
  food('Helado de vainilla', n(207, 24, 11, 3.5, 0.7, 21, 7, 80, 200), [serv('Bola (60 g)', 60, true)]),

  // --- Legumbres / cereales / pasta (ampliación) ---
  food('Judías blancas cocidas', n(139, 25, 0.5, 9.7, 6.3, 0.3, 0.1, 1, 460), [serv('Plato (200 g)', 200, true)]),
  food('Judías pintas cocidas', n(143, 26, 0.5, 9.5, 9, 0.3, 0.1, 1, 436), [serv('Plato (200 g)', 200, true)]),
  food('Soja cocida', n(173, 9.9, 9, 16.6, 6, 3, 1.3, 1, 515), [serv('Ración (150 g)', 150, true)]),
  food('Guisantes secos cocidos', n(118, 21, 0.4, 8.3, 8, 2.9, 0.1, 2, 362), [serv('Ración (150 g)', 150, true)]),
  food('Cuscús cocido', n(112, 23, 0.2, 3.8, 1.4, 0.1, 0, 5, 58), [serv('Plato (180 g)', 180, true)]),
  food('Bulgur cocido', n(83, 19, 0.2, 3.1, 4.5, 0.1, 0, 5, 68), [serv('Plato (180 g)', 180, true)]),
  food('Arroz basmati cocido', n(121, 25, 0.4, 3, 0.6, 0.1, 0.1, 1, 30), [serv('Plato (180 g)', 180, true)]),
  food('Pasta integral cocida', n(124, 27, 0.5, 5, 4, 0.6, 0.1, 3, 60), [serv('Plato (180 g)', 180, true)]),
  food('Fideos cocidos', n(138, 25, 2.1, 4.5, 1.2, 0.6, 0.4, 5, 40), [serv('Plato (180 g)', 180, true)]),
  food('Harina de trigo', n(364, 76, 1, 10, 2.7, 0.3, 0.2, 2, 107), [serv('Cucharada (15 g)', 15, true), serv('Taza (120 g)', 120)]),
  food('Pan de molde', n(265, 49, 4, 8, 4, 4, 0.8, 500, 120), [serv('Rebanada (28 g)', 28, true), serv('2 rebanadas (56 g)', 56)]),
  food('Pan de centeno', n(259, 48, 3.3, 8.5, 5.8, 3.9, 0.6, 603, 166), [serv('Rebanada (32 g)', 32, true)]),
  food('Cereales de desayuno (cornflakes)', n(357, 84, 0.9, 7, 3, 8, 0.2, 729, 170), [serv('Ración (30 g)', 30, true)]),
  food('Muesli', n(363, 66, 6, 10, 7, 16, 1.2, 80, 420), [serv('Ración (45 g)', 45, true)]),
  food('Galletas integrales', n(450, 68, 16, 7, 5, 20, 5, 400, 200), [serv('Galleta (12 g)', 12, true), serv('Ración (40 g)', 40)]),

  // --- Frutas (ampliación) ---
  food('Kiwi', n(61, 15, 0.5, 1.1, 3, 9, 0, 3, 312), [serv('Unidad (75 g)', 75, true)]),
  food('Piña', n(50, 13, 0.1, 0.5, 1.4, 10, 0, 1, 109), [serv('Rodaja (84 g)', 84, true)]),
  food('Mango', n(60, 15, 0.4, 0.8, 1.6, 14, 0.1, 1, 168), [serv('Medio (100 g)', 100, true)]),
  food('Pera', n(57, 15, 0.1, 0.4, 3.1, 10, 0, 1, 116), [serv('Unidad (178 g)', 178, true)]),
  food('Melocotón', n(39, 10, 0.3, 0.9, 1.5, 8.4, 0, 0, 190), [serv('Unidad (150 g)', 150, true)]),
  food('Ciruela', n(46, 11, 0.3, 0.7, 1.4, 10, 0, 0, 157), [serv('Unidad (66 g)', 66, true)]),
  food('Mandarina', n(53, 13, 0.3, 0.8, 1.8, 11, 0, 2, 166), [serv('Unidad (88 g)', 88, true)]),
  food('Melón', n(34, 8, 0.2, 0.8, 0.9, 8, 0, 16, 267), [serv('Tajada (160 g)', 160, true)]),
  food('Cerezas', n(63, 16, 0.2, 1.1, 2.1, 13, 0, 0, 222), [serv('Puñado (100 g)', 100, true)]),
  food('Frambuesas', n(52, 12, 0.7, 1.2, 6.5, 4.4, 0, 1, 151), [serv('Taza (123 g)', 123, true)]),
  food('Moras', n(43, 10, 0.5, 1.4, 5.3, 4.9, 0, 1, 162), [serv('Taza (144 g)', 144, true)]),
  food('Granada', n(83, 19, 1.2, 1.7, 4, 14, 0.1, 3, 236), [serv('Media (140 g)', 140, true)]),
  food('Higos', n(74, 19, 0.3, 0.8, 2.9, 16, 0.1, 1, 232), [serv('Unidad (50 g)', 50, true)]),
  food('Dátiles', n(282, 75, 0.4, 2.5, 8, 63, 0, 2, 656), [serv('Unidad (8 g)', 8, true), serv('Ración (40 g)', 40)]),
  food('Pasas', n(299, 79, 0.5, 3.1, 3.7, 59, 0.1, 11, 749), [serv('Puñado (30 g)', 30, true)]),
  food('Limón', n(29, 9.3, 0.3, 1.1, 2.8, 2.5, 0, 2, 138), [serv('Unidad (60 g)', 60, true)]),
  food('Pomelo', n(42, 11, 0.1, 0.8, 1.6, 7, 0, 0, 135), [serv('Medio (123 g)', 123, true)]),
  food('Coco fresco', n(354, 15, 33, 3.3, 9, 6.2, 30, 20, 356), [serv('Trozo (45 g)', 45, true)]),

  // --- Verduras (ampliación) ---
  food('Calabacín', n(17, 3.1, 0.3, 1.2, 1, 2.5, 0.1, 8, 261), [serv('Unidad (200 g)', 200, true)]),
  food('Berenjena', n(25, 6, 0.2, 1, 3, 3.5, 0, 2, 229), [serv('Media (150 g)', 150, true)]),
  food('Champiñones', n(22, 3.3, 0.3, 3.1, 1, 2, 0, 5, 318), [serv('Taza (70 g)', 70, true)]),
  food('Judía verde', n(31, 7, 0.2, 1.8, 2.7, 3.3, 0, 6, 211), [serv('Ración (100 g)', 100, true)]),
  food('Guisantes', n(81, 14, 0.4, 5.4, 5.7, 5.7, 0.1, 5, 244), [serv('Ración (100 g)', 100, true)]),
  food('Maíz dulce', n(86, 19, 1.2, 3.2, 2.7, 3.2, 0.2, 15, 270), [serv('Ración (100 g)', 100, true)]),
  food('Coliflor', n(25, 5, 0.3, 1.9, 2, 1.9, 0.1, 30, 299), [serv('Ración (150 g)', 150, true)]),
  food('Col', n(25, 6, 0.1, 1.3, 2.5, 3.2, 0, 18, 170), [serv('Ración (100 g)', 100, true)]),
  food('Espárragos', n(20, 3.9, 0.1, 2.2, 2.1, 1.9, 0, 2, 202), [serv('Ración (100 g)', 100, true)]),
  food('Remolacha', n(43, 10, 0.2, 1.6, 2.8, 7, 0, 78, 325), [serv('Unidad (82 g)', 82, true)]),
  food('Ajo', n(149, 33, 0.5, 6.4, 2.1, 1, 0.1, 17, 401), [serv('Diente (3 g)', 3, true)]),
  food('Apio', n(16, 3, 0.2, 0.7, 1.6, 1.3, 0, 80, 260), [serv('Rama (40 g)', 40, true)]),
  food('Puerro', n(61, 14, 0.3, 1.5, 1.8, 3.9, 0, 20, 180), [serv('Unidad (90 g)', 90, true)]),
  food('Alcachofa', n(47, 11, 0.2, 3.3, 5.4, 1, 0, 94, 370), [serv('Unidad (120 g)', 120, true)]),
  food('Calabaza', n(26, 6.5, 0.1, 1, 0.5, 2.8, 0, 1, 340), [serv('Ración (150 g)', 150, true)]),
  food('Acelga', n(19, 3.7, 0.2, 1.8, 1.6, 1.1, 0, 213, 379), [serv('Ración (150 g)', 150, true)]),
  food('Setas (shiitake)', n(34, 6.8, 0.5, 2.2, 2.5, 2.4, 0.1, 9, 304), [serv('Ración (80 g)', 80, true)]),
  food('Rúcula', n(25, 3.7, 0.7, 2.6, 1.6, 2, 0.1, 27, 369), [serv('Puñado (20 g)', 20, true)]),
  food('Tomate frito', n(82, 9, 4, 1.5, 1.5, 6, 0.6, 400, 300), [serv('Cucharada (30 g)', 30, true), serv('Ración (80 g)', 80)]),

  // --- Platos / preparados ---
  food('Tortilla de patata', n(176, 14, 9.8, 6.4, 1.3, 1.2, 2.2, 320, 280), [serv('Pincho (125 g)', 125, true), serv('Ración (200 g)', 200)]),
  food('Lentejas guisadas', n(115, 16, 2.5, 7, 5, 1.5, 0.5, 320, 350), [serv('Plato (250 g)', 250, true)]),
  food('Garbanzos con espinacas', n(130, 17, 4, 6.5, 5, 1.5, 0.6, 350, 330), [serv('Plato (250 g)', 250, true)]),
  food('Paella', n(160, 21, 4.5, 8, 1, 1.5, 1.2, 420, 180), [serv('Plato (300 g)', 300, true)]),
  food('Macarrones con tomate', n(150, 24, 3.5, 5, 1.8, 3, 0.8, 300, 160), [serv('Plato (250 g)', 250, true)]),
  food('Espaguetis a la boloñesa', n(158, 18, 5.5, 8, 1.8, 3, 2, 330, 220), [serv('Plato (300 g)', 300, true)]),
  food('Lasaña', n(165, 15, 8, 8, 1.2, 3, 4, 330, 220), [serv('Ración (300 g)', 300, true)]),
  food('Pizza margarita', n(266, 33, 10, 11, 2.3, 3.6, 4.5, 598, 184), [serv('Porción (100 g)', 100, true), serv('Pizza (300 g)', 300)]),
  food('Hamburguesa completa', n(254, 28, 12, 13, 1.5, 5, 4.5, 450, 220), [serv('Unidad (220 g)', 220, true)]),
  food('Croquetas', n(270, 25, 15, 7, 1.2, 2, 4, 500, 150), [serv('Croqueta (30 g)', 30, true), serv('Ración (150 g)', 150)]),
  food('Empanadilla', n(320, 32, 18, 7, 1.5, 2, 5, 420, 130), [serv('Unidad (60 g)', 60, true)]),
  food('Ensaladilla rusa', n(180, 12, 13, 3, 1.8, 3, 2, 350, 200), [serv('Ración (150 g)', 150, true)]),
  food('Sopa de fideos', n(40, 6, 1, 1.8, 0.4, 0.8, 0.3, 350, 60), [serv('Plato (300 ml)', 300, true)], { isLiquid: true }),
  food('Gazpacho', n(45, 4, 3, 0.9, 1, 3, 0.4, 360, 200), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Arroz a la cubana', n(175, 28, 5, 4, 1.2, 4, 1.2, 320, 180), [serv('Plato (300 g)', 300, true)]),
  food('Patatas bravas', n(165, 22, 7.5, 2.5, 2.5, 1.5, 1, 400, 400), [serv('Ración (200 g)', 200, true)]),
  food('Nuggets de pollo', n(290, 16, 18, 15, 1, 0.5, 3.5, 520, 250), [serv('Unidad (18 g)', 18, true), serv('Ración (100 g)', 100)]),
  food('Merluza rebozada', n(200, 12, 11, 14, 0.8, 0.6, 1.5, 300, 250), [serv('Filete (120 g)', 120, true)]),

  // --- Bollería / snacks / dulces (ampliación) ---
  food('Croissant', n(406, 46, 21, 8, 2.6, 11, 12, 450, 120), [serv('Unidad (60 g)', 60, true)]),
  food('Magdalena', n(410, 52, 19, 6, 1.2, 28, 4, 300, 90), [serv('Unidad (40 g)', 40, true)]),
  food('Donut', n(452, 51, 25, 5, 1.5, 23, 7, 330, 90), [serv('Unidad (60 g)', 60, true)]),
  food('Chocolate con leche', n(535, 59, 30, 7.6, 3.4, 52, 18, 79, 372), [serv('Onza (10 g)', 10, true), serv('Fila (25 g)', 25)]),
  food('Crema de cacao y avellanas', n(539, 57, 31, 6.3, 5, 57, 11, 41, 420), [serv('Cucharada (15 g)', 15, true)]),
  food('Gominolas', n(343, 82, 0.2, 6.9, 0, 58, 0, 40, 2), [serv('Puñado (30 g)', 30, true)]),
  food('Churros', n(356, 40, 20, 5, 1.5, 1, 3, 200, 90), [serv('Ración (100 g)', 100, true)]),
  food('Tarta de queso', n(321, 26, 22, 6, 0.6, 22, 12, 290, 100), [serv('Porción (100 g)', 100, true)]),
  food('Brownie', n(466, 50, 27, 5, 2.5, 38, 8, 280, 180), [serv('Porción (60 g)', 60, true)]),
  food('Barrita de cereales', n(400, 68, 10, 6, 5, 30, 3, 180, 200), [serv('Barrita (25 g)', 25, true)]),
  food('Galletas con chocolate', n(480, 64, 23, 6, 3, 35, 12, 350, 180), [serv('Galleta (12 g)', 12, true), serv('Ración (40 g)', 40)]),
  food('Tostada con aceite', n(240, 38, 8, 7, 2.5, 2, 1.2, 350, 100), [serv('Tostada (40 g)', 40, true)]),
  food('Bizcocho casero', n(380, 52, 16, 6, 1, 30, 3, 250, 100), [serv('Porción (60 g)', 60, true)]),

  // --- Frutos secos / grasas (ampliación) ---
  food('Pistachos', n(562, 28, 45, 20, 10, 8, 5.5, 1, 1025), [serv('Puñado (28 g)', 28, true)]),
  food('Anacardos', n(553, 30, 44, 18, 3.3, 6, 8, 12, 660), [serv('Puñado (28 g)', 28, true)]),
  food('Avellanas', n(628, 17, 61, 15, 10, 4.3, 4.5, 0, 680), [serv('Puñado (28 g)', 28, true)]),
  food('Semillas de girasol', n(584, 20, 51, 21, 8.6, 2.6, 4.5, 9, 645), [serv('Puñado (28 g)', 28, true)]),
  food('Semillas de chía', n(486, 42, 31, 17, 34, 0, 3.3, 16, 407), [serv('Cucharada (12 g)', 12, true)]),
  food('Semillas de calabaza', n(559, 11, 49, 30, 6, 1.4, 8.7, 7, 809), [serv('Puñado (28 g)', 28, true)]),
  food('Aceite de girasol', n(884, 0, 100, 0, 0, 0, 11, 0, 0), [serv('Cucharada (14 g)', 14, true), serv('Cucharadita (5 g)', 5)]),
  food('Margarina', n(717, 0.7, 81, 0.2, 0, 0, 16, 751, 18), [serv('Porción (10 g)', 10, true)]),
  food('Tahini', n(595, 21, 54, 17, 9, 0.5, 7.6, 115, 414), [serv('Cucharada (15 g)', 15, true)]),
  food('Aceitunas', n(145, 3.8, 15, 1, 3.3, 0.5, 2, 1556, 42), [serv('Ración (30 g)', 30, true)]),

  // --- Bebidas (ampliación) ---
  food('Agua', n(0, 0, 0, 0, 0, 0, 0, 1, 0), [serv('Vaso (250 ml)', 250, true), serv('Botella (500 ml)', 500)], { isLiquid: true }),
  food('Agua con gas', n(0, 0, 0, 0, 0, 0, 0, 2, 0), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Té', n(1, 0.2, 0, 0, 0, 0, 0, 3, 21), [serv('Taza (240 ml)', 240, true)], { isLiquid: true }),
  food('Infusión (manzanilla)', n(1, 0.2, 0, 0, 0, 0, 0, 1, 9), [serv('Taza (240 ml)', 240, true)], { isLiquid: true }),
  food('Café con leche', n(42, 3.4, 1.6, 2, 0, 3.4, 1, 30, 120), [serv('Taza (200 ml)', 200, true)], { isLiquid: true }),
  food('Bebida de avena', n(45, 7, 1.5, 0.8, 0.8, 4, 0.2, 40, 80), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Bebida de soja', n(33, 1.8, 1.8, 3.3, 0.6, 0.5, 0.3, 40, 120), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Bebida de almendras', n(24, 3, 1.1, 0.5, 0.4, 2, 0.1, 60, 40), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Vino tinto', n(85, 2.6, 0, 0.1, 0, 0.6, 0, 4, 127), [serv('Copa (150 ml)', 150, true)], { isLiquid: true }),
  food('Vino blanco', n(82, 2.6, 0, 0.1, 0, 1, 0, 5, 71), [serv('Copa (150 ml)', 150, true)], { isLiquid: true }),
  food('Bebida isotónica', n(26, 6, 0, 0, 0, 6, 0, 40, 12), [serv('Botella (500 ml)', 500, true)], { isLiquid: true }),
  food('Refresco light', n(0.3, 0, 0, 0, 0, 0, 0, 10, 2), [serv('Lata (330 ml)', 330, true)], { isLiquid: true }),
  food('Zumo de manzana', n(46, 11, 0.1, 0.1, 0.2, 9.6, 0, 4, 101), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Zumo de piña', n(53, 13, 0.1, 0.4, 0.2, 10, 0, 2, 130), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Tónica', n(34, 8.7, 0, 0, 0, 8.7, 0, 4, 1), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Horchata', n(100, 17, 3, 0.5, 0.5, 15, 0.4, 10, 90), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Batido de fresa', n(90, 14, 2.4, 3.2, 0.2, 13, 1.5, 60, 170), [serv('Vaso (200 ml)', 200, true)], { isLiquid: true }),
  food('Cacao en polvo soluble', n(375, 80, 3.5, 5, 5, 75, 2, 120, 800), [serv('Cucharada (15 g)', 15, true)]),

  // --- Salsas y condimentos ---
  food('Kétchup', n(112, 26, 0.1, 1.2, 0.3, 22, 0, 907, 281), [serv('Cucharada (15 g)', 15, true)]),
  food('Mayonesa', n(680, 1.3, 75, 1, 0, 1.3, 11, 635, 20), [serv('Cucharada (15 g)', 15, true)]),
  food('Mostaza', n(66, 5, 3.3, 4, 3.3, 1, 0.2, 1135, 138), [serv('Cucharadita (5 g)', 5, true)]),
  food('Salsa de soja', n(53, 4.9, 0.6, 8, 0.8, 0.4, 0.1, 5493, 217), [serv('Cucharada (15 ml)', 15, true)], { isLiquid: true }),
  food('Salsa barbacoa', n(172, 41, 0.6, 0.8, 0.7, 33, 0.1, 1027, 230), [serv('Cucharada (17 g)', 17, true)]),
  food('Vinagre', n(18, 0.9, 0, 0, 0, 0.4, 0, 2, 2), [serv('Cucharada (15 ml)', 15, true)], { isLiquid: true }),
  food('Vinagre balsámico', n(88, 17, 0, 0.5, 0, 15, 0, 23, 112), [serv('Cucharada (15 ml)', 15, true)], { isLiquid: true }),
  food('Tomate triturado', n(32, 7, 0.2, 1.6, 1.5, 4.5, 0, 9, 300), [serv('Ración (100 g)', 100, true)]),
  food('Sofrito', n(90, 7, 6, 1, 1.5, 4, 0.9, 350, 250), [serv('Cucharada (30 g)', 30, true)]),
  food('Pesto', n(450, 6, 46, 5, 1.5, 2, 8, 800, 120), [serv('Cucharada (16 g)', 16, true)]),
  food('Salsa boloñesa (bote)', n(90, 8, 5, 4, 1.5, 5, 2, 400, 300), [serv('Ración (125 g)', 125, true)]),
  food('Guacamole', n(150, 9, 13, 2, 5, 1, 2, 300, 400), [serv('Ración (50 g)', 50, true)]),
  food('Hummus', n(166, 14, 10, 8, 6, 0.3, 1.5, 379, 228), [serv('Ración (60 g)', 60, true)]),
  food('Alioli', n(700, 2, 77, 1, 0, 1, 11, 500, 30), [serv('Cucharada (15 g)', 15, true)]),
  food('Mermelada', n(278, 69, 0.1, 0.4, 1, 49, 0, 32, 77), [serv('Cucharada (20 g)', 20, true)]),
  food('Sirope', n(290, 75, 0, 0, 0, 70, 0, 30, 200), [serv('Cucharada (20 g)', 20, true)]),

  // --- Desayuno / untables / panadería ---
  food('Crema de almendras', n(614, 19, 56, 21, 10, 4, 4.4, 3, 748), [serv('Cucharada (16 g)', 16, true)]),
  food('Tortitas (pancakes)', n(227, 28, 9, 6, 1.2, 8, 2, 430, 130), [serv('Tortita (40 g)', 40, true), serv('Ración (120 g)', 120)]),
  food('Gofre', n(291, 33, 15, 6.5, 1, 8, 3, 510, 120), [serv('Unidad (75 g)', 75, true)]),
  food('Crackers (galletas saladas)', n(460, 68, 16, 9, 3, 5, 3, 800, 150), [serv('Ración (30 g)', 30, true)]),
  food('Bollo / pan de leche', n(320, 55, 8, 9, 2, 12, 3, 400, 120), [serv('Unidad (50 g)', 50, true)]),
  food('Biscotes', n(400, 75, 5, 13, 5, 5, 1, 700, 200), [serv('Biscote (10 g)', 10, true)]),
  food('Tortitas de arroz', n(387, 82, 3, 8, 4, 0.5, 0.6, 12, 120), [serv('Unidad (8 g)', 8, true)]),
  food('Galletas de avena', n(450, 68, 17, 7, 5, 25, 4, 300, 200), [serv('Galleta (15 g)', 15, true)]),
  food('Pan rallado', n(395, 72, 5.3, 13, 4.5, 6, 1.2, 732, 196), [serv('Cucharada (15 g)', 15, true)]),

  // --- Fast food / comida internacional ---
  food('Sushi (maki)', n(140, 30, 0.5, 4, 1, 5, 0.1, 300, 80), [serv('Pieza (15 g)', 15, true), serv('Ración (8 piezas, 120 g)', 120)]),
  food('Sushi (nigiri)', n(145, 22, 3, 6, 0.5, 3, 0.6, 250, 90), [serv('Pieza (30 g)', 30, true)]),
  food('Ramen', n(90, 12, 3, 4, 1, 1, 1.2, 600, 90), [serv('Bol (400 g)', 400, true)]),
  food('Tacos', n(220, 20, 11, 9, 3, 2, 4, 360, 200), [serv('Taco (90 g)', 90, true)]),
  food('Burrito', n(206, 24, 8, 8, 3, 2, 3, 500, 220), [serv('Unidad (250 g)', 250, true)]),
  food('Falafel', n(333, 32, 18, 13, 5, 3, 2.4, 294, 585), [serv('Bola (17 g)', 17, true), serv('Ración (100 g)', 100)]),
  food('Kebab (durum)', n(215, 18, 11, 12, 1.5, 2, 3.5, 500, 220), [serv('Unidad (300 g)', 300, true)]),
  food('Aros de cebolla', n(332, 38, 18, 4.5, 2.5, 5, 4, 420, 200), [serv('Ración (80 g)', 80, true)]),
  food('Perrito caliente (hot dog)', n(290, 18, 22, 11, 1, 3, 8, 800, 180), [serv('Unidad (100 g)', 100, true)]),
  food('Sándwich mixto', n(280, 28, 12, 14, 1.8, 3, 5, 650, 180), [serv('Unidad (120 g)', 120, true)]),
  food('Bocadillo de jamón', n(250, 35, 6, 13, 2, 2, 2, 800, 200), [serv('Unidad (150 g)', 150, true)]),
  food('Wrap de pollo', n(200, 22, 7, 12, 2, 2, 2.5, 450, 200), [serv('Unidad (200 g)', 200, true)]),
  food('Noodles salteados', n(150, 22, 5, 5, 2, 3, 1, 500, 150), [serv('Ración (250 g)', 250, true)]),
  food('Curry de pollo', n(130, 8, 7, 10, 1.5, 3, 2.5, 400, 250), [serv('Plato (300 g)', 300, true)]),
  food('Arroz frito', n(163, 24, 5, 4, 1, 1.5, 1, 450, 90), [serv('Plato (250 g)', 250, true)]),

  // --- Proteína / suplementos ---
  food('Proteína en polvo (whey)', n(380, 8, 6, 75, 1, 5, 2, 300, 400), [serv('Cazo (30 g)', 30, true)]),
  food('Barrita de proteínas', n(350, 40, 12, 30, 5, 8, 5, 250, 300), [serv('Barrita (60 g)', 60, true)]),
  food('Yogur proteico (skyr)', n(63, 4, 0.2, 11, 0, 4, 0.1, 50, 150), [serv('Unidad (150 g)', 150, true)]),
  food('Queso batido 0%', n(56, 4, 0.2, 9, 0, 4, 0.1, 40, 140), [serv('Ración (125 g)', 125, true)]),
  food('Tempeh', n(192, 8, 11, 20, 0, 0, 2.2, 9, 412), [serv('Ración (100 g)', 100, true)]),
  food('Seitán', n(121, 4, 2, 21, 0.5, 0, 0.3, 29, 80), [serv('Ración (100 g)', 100, true)]),
  food('Edamame', n(121, 9, 5, 12, 5, 2.2, 0.6, 6, 436), [serv('Ración (100 g)', 100, true)]),

  // --- Más frutas y verduras ---
  food('Boniato', n(86, 20, 0.1, 1.6, 3, 4.2, 0, 55, 337), [serv('Unidad (130 g)', 130, true)]),
  food('Yuca', n(160, 38, 0.3, 1.4, 1.8, 1.7, 0.1, 14, 271), [serv('Ración (100 g)', 100, true)]),
  food('Nabo', n(28, 6, 0.1, 0.9, 1.8, 3.8, 0, 67, 191), [serv('Unidad (120 g)', 120, true)]),
  food('Rábano', n(16, 3.4, 0.1, 0.7, 1.6, 1.9, 0, 39, 233), [serv('Ración (50 g)', 50, true)]),
  food('Hinojo', n(31, 7, 0.2, 1.2, 3.1, 4, 0, 52, 414), [serv('Ración (100 g)', 100, true)]),
  food('Canónigos', n(21, 3.6, 0.4, 2, 0, 0.7, 0, 4, 459), [serv('Puñado (30 g)', 30, true)]),
  food('Brotes de soja', n(31, 5.9, 0.2, 3, 1.8, 4.1, 0, 6, 149), [serv('Ración (80 g)', 80, true)]),
  food('Caqui', n(70, 18, 0.2, 0.6, 3.6, 12.5, 0, 1, 161), [serv('Unidad (168 g)', 168, true)]),
  food('Papaya', n(43, 11, 0.3, 0.5, 1.7, 8, 0.1, 8, 182), [serv('Ración (150 g)', 150, true)]),
  food('Nectarina', n(44, 11, 0.3, 1.1, 1.7, 7.9, 0, 0, 201), [serv('Unidad (140 g)', 140, true)]),
  food('Lima', n(30, 11, 0.2, 0.7, 2.8, 1.7, 0, 2, 102), [serv('Unidad (67 g)', 67, true)]),
  food('Membrillo', n(57, 15, 0.1, 0.4, 1.9, 12, 0, 4, 197), [serv('Unidad (90 g)', 90, true)]),

  // --- Más carnes y pescados ---
  food('Solomillo de cerdo', n(143, 0, 3.5, 26, 0, 0, 1.2, 53, 423), [serv('Filete (120 g)', 120, true)]),
  food('Albóndigas', n(200, 8, 13, 14, 0.5, 2, 5, 500, 220), [serv('Albóndiga (30 g)', 30, true), serv('Ración (150 g)', 150)]),
  food('Salchicha fresca', n(300, 1, 27, 12, 0, 0.5, 10, 700, 200), [serv('Salchicha (60 g)', 60, true)]),
  food('Paté', n(320, 4, 28, 12, 0, 1, 9, 700, 140), [serv('Ración (30 g)', 30, true)]),
  food('Sepia', n(79, 0.8, 0.7, 16, 0, 0, 0.1, 372, 354), [serv('Ración (120 g)', 120, true)]),
  food('Almejas', n(86, 3.6, 1, 12, 0, 0, 0.1, 56, 314), [serv('Ración (100 g)', 100, true)]),
  food('Anchoas en aceite', n(210, 0, 12, 29, 0, 0, 2.8, 3670, 540), [serv('Filete (5 g)', 5, true), serv('Ración (30 g)', 30)]),
  food('Salmón ahumado', n(117, 0, 4.3, 18, 0, 0, 0.9, 1880, 175), [serv('Loncha (15 g)', 15, true), serv('Ración (50 g)', 50)]),
  food('Sardinas en lata', n(208, 0, 11, 25, 0, 0, 3, 505, 397), [serv('Lata (85 g)', 85, true)]),
  food('Caballa en lata', n(305, 0, 25, 19, 0, 0, 5, 350, 250), [serv('Lata (85 g)', 85, true)]),

  // --- Más platos / preparados ---
  food('Cocido / puchero', n(130, 10, 6, 9, 2, 1.5, 2, 400, 300), [serv('Plato (350 g)', 350, true)]),
  food('Fabada', n(180, 14, 10, 10, 5, 1, 3.5, 500, 400), [serv('Plato (300 g)', 300, true)]),
  food('Crema de verduras', n(50, 7, 2, 1.5, 1.5, 3, 0.5, 300, 250), [serv('Plato (300 ml)', 300, true)], { isLiquid: true }),
  food('Puré de patata', n(88, 15, 2.5, 2, 1.3, 1.5, 1.2, 300, 300), [serv('Ración (200 g)', 200, true)]),
  food('Ensalada mixta', n(70, 6, 4, 1.5, 2, 3, 0.6, 200, 250), [serv('Plato (200 g)', 200, true)]),
  food('Pisto', n(70, 7, 4, 1.5, 2.5, 5, 0.6, 300, 300), [serv('Ración (200 g)', 200, true)]),
  food('Tortilla francesa', n(160, 1, 12, 12, 0, 0.8, 3, 300, 130), [serv('Unidad (100 g)', 100, true)]),
  food('Huevos revueltos', n(150, 1.5, 11, 11, 0, 1, 3, 330, 130), [serv('Ración (120 g)', 120, true)]),
  food('Calamares a la romana', n(175, 15, 9, 9, 0.8, 0.6, 1.5, 350, 200), [serv('Ración (120 g)', 120, true)]),
  food('Canelones', n(170, 16, 8, 8, 1.2, 3, 4, 330, 220), [serv('Ración (250 g)', 250, true)]),
  food('Risotto', n(160, 24, 5, 4, 0.8, 1, 2, 400, 80), [serv('Plato (300 g)', 300, true)]),
  food('Quiche', n(280, 18, 20, 8, 1, 3, 9, 420, 130), [serv('Porción (130 g)', 130, true)]),
  food('Albóndigas con tomate', n(150, 7, 9, 11, 1, 3, 3, 450, 280), [serv('Plato (250 g)', 250, true)]),

  // --- Más dulces / snacks ---
  food('Helado de chocolate', n(216, 28, 11, 3.8, 1.2, 25, 7, 80, 250), [serv('Bola (60 g)', 60, true)]),
  food('Polo de hielo', n(80, 20, 0, 0, 0, 18, 0, 10, 30), [serv('Unidad (65 g)', 65, true)]),
  food('Frutos secos (mezcla)', n(600, 18, 52, 18, 8, 5, 6, 150, 600), [serv('Puñado (30 g)', 30, true)]),
  food('Turrón', n(510, 45, 30, 13, 4, 40, 6, 30, 400), [serv('Porción (30 g)', 30, true)]),
  food('Chocolate blanco', n(539, 59, 32, 6, 0, 59, 19, 90, 280), [serv('Onza (10 g)', 10, true)]),
  food('Arroz con leche', n(130, 22, 3, 3, 0.3, 15, 1.8, 40, 120), [serv('Ración (150 g)', 150, true)]),
  food('Natillas de chocolate', n(130, 20, 4, 3.5, 0.5, 17, 2.5, 70, 180), [serv('Unidad (125 g)', 125, true)]),
  food('Torrijas', n(290, 40, 12, 5, 1.5, 18, 2.5, 200, 90), [serv('Unidad (70 g)', 70, true)]),

  // --- Más bebidas ---
  food('Cerveza sin alcohol', n(25, 5, 0, 0.4, 0, 1.5, 0, 5, 40), [serv('Tercio (330 ml)', 330, true)], { isLiquid: true }),
  food('Sidra', n(42, 2.5, 0, 0, 0, 2, 0, 4, 70), [serv('Vaso (200 ml)', 200, true)], { isLiquid: true }),
  food('Cava', n(76, 1.4, 0, 0.2, 0, 1, 0, 4, 80), [serv('Copa (100 ml)', 100, true)], { isLiquid: true }),
  food('Licores destilados', n(250, 0, 0, 0, 0, 0, 0, 1, 1), [serv('Chupito (40 ml)', 40, true)], { isLiquid: true }),
  food('Gin-tonic', n(70, 7, 0, 0, 0, 7, 0, 4, 5), [serv('Copa (200 ml)', 200, true)], { isLiquid: true }),
  food('Café con hielo', n(120, 18, 3, 2, 0, 16, 2, 50, 150), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Chocolate a la taza', n(90, 14, 2.5, 3, 1, 12, 1.5, 60, 200), [serv('Taza (200 ml)', 200, true)], { isLiquid: true }),
  food('Zumo de tomate', n(17, 3.5, 0.1, 0.8, 0.4, 2.6, 0, 200, 230), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Smoothie de frutas', n(60, 14, 0.3, 0.8, 1.5, 11, 0.1, 10, 150), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Limonada', n(40, 10, 0, 0.1, 0, 9, 0, 5, 15), [serv('Vaso (250 ml)', 250, true)], { isLiquid: true }),
  food('Bebida energética', n(45, 11, 0, 0, 0, 11, 0, 100, 2), [serv('Lata (250 ml)', 250, true)], { isLiquid: true }),
  food('Caldo de pollo', n(4, 0.4, 0.1, 0.5, 0, 0.2, 0, 300, 20), [serv('Taza (250 ml)', 250, true)], { isLiquid: true }),

  // --- Cocina / despensa ---
  food('Maicena', n(381, 91, 0.1, 0.3, 0.9, 0, 0, 9, 3), [serv('Cucharada (10 g)', 10, true)]),
  food('Levadura nutricional', n(350, 35, 5, 50, 20, 5, 0.8, 30, 2000), [serv('Cucharada (8 g)', 8, true)]),
  food('Polenta cocida', n(85, 18, 0.4, 2, 1, 0.2, 0.1, 5, 30), [serv('Ración (150 g)', 150, true)]),
]

// Aviso si dos alimentos base generan el mismo id (nombres repetidos): rompería el top-up.
{
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const f of SEED_FOODS) {
    if (seen.has(f.id)) dups.add(f.id)
    else seen.add(f.id)
  }
  if (dups.size) console.error('[seed] IDs de alimentos duplicados (nombres repetidos):', [...dups])
}

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
  // Artes marciales y grappling (MET del Compendium of Physical Activities)
  { id: uid('ex'), name: 'Jiu-jitsu brasileño (clase / drilling)', kind: 'cardio', met: 5.3 },
  { id: uid('ex'), name: 'Jiu-jitsu brasileño (entrenamiento)', kind: 'cardio', met: 10.3 },
  { id: uid('ex'), name: 'Jiu-jitsu brasileño (sparring / competición)', kind: 'cardio', met: 11.3 },
  { id: uid('ex'), name: 'Judo', kind: 'cardio', met: 11.3 },
  { id: uid('ex'), name: 'Lucha (wrestling)', kind: 'cardio', met: 6 },
  { id: uid('ex'), name: 'Karate', kind: 'cardio', met: 10.3 },
  { id: uid('ex'), name: 'Taekwondo', kind: 'cardio', met: 10.3 },
  { id: uid('ex'), name: 'Muay Thai', kind: 'cardio', met: 10.3 },
  { id: uid('ex'), name: 'Kickboxing', kind: 'cardio', met: 10.3 },
  { id: uid('ex'), name: 'MMA', kind: 'cardio', met: 11.3 },
  { id: uid('ex'), name: 'Krav Maga', kind: 'cardio', met: 10.3 },
  { id: uid('ex'), name: 'Capoeira', kind: 'cardio', met: 8 },
  { id: uid('ex'), name: 'Aikido', kind: 'cardio', met: 5.3 },
  { id: uid('ex'), name: 'Boxeo (saco)', kind: 'cardio', met: 8.5 },
  { id: uid('ex'), name: 'Boxeo (sparring)', kind: 'cardio', met: 7.8 },
  { id: uid('ex'), name: 'Esgrima', kind: 'cardio', met: 6 },
  { id: uid('ex'), name: 'Escalada / rocódromo', kind: 'cardio', met: 8 },
]
