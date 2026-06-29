// Test del motor de nutrición (BMR / TDEE / objetivo / macros / MET).
// No requiere framework: compila el código real con esbuild y comprueba casos.
// Uso:  node scripts/test-nutrition.mjs   (o  npm test)
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT = resolve(__dirname, '..')
const require = createRequire(`${PROJECT}/package.json`)
const esbuild = require('esbuild')

const ENTRY = `
import {
  bmrMifflin, tdee, calorieGoal, macrosFromPercent, macrosFromGrams,
  defaultMacros, scaleNutrients, caloriesFromMet, ageFromBirth,
} from '@/lib/nutrition'
import { EMPTY_NUTRIENTS } from '@/db/types'

let fails = 0
function eq(name, got, exp) {
  const ok = JSON.stringify(got) === JSON.stringify(exp)
  if (!ok) { fails++; console.log('  x ' + name + ': got ' + JSON.stringify(got) + ' esperado ' + JSON.stringify(exp)) }
  else console.log('  ok ' + name + ' = ' + JSON.stringify(got))
}
function approx(name, got, exp, tol = 1) {
  const ok = Math.abs(got - exp) <= tol
  if (!ok) { fails++; console.log('  x ' + name + ': got ' + got + ' esperado ~' + exp) }
  else console.log('  ok ' + name + ' ~ ' + got)
}

console.log('CASO 1 - Hombre 75/175/31, ligera, perder 0,5 kg/sem (documentado)')
const bmr1 = bmrMifflin('male', 75, 175, 31); eq('BMR', bmr1, 1694)
const tdee1 = tdee(bmr1, 'light'); eq('TDEE', tdee1, 2329)
const goal1 = calorieGoal(tdee1, 'lose', 0.5, 'male'); eq('Objetivo', goal1, 1780)
const m1 = defaultMacros(goal1); eq('Carbs g', m1.carbsG, 223); eq('Prot g', m1.proteinG, 89); eq('Grasa g', m1.fatG, 59)

console.log('CASO 2 - Mujer 60/165/30, sedentaria, mantener')
const bmr2 = bmrMifflin('female', 60, 165, 30); eq('BMR', bmr2, 1320)
const tdee2 = tdee(bmr2, 'sedentary'); eq('TDEE', tdee2, 1584)
approx('Objetivo mantener', calorieGoal(tdee2, 'maintain', 0.5, 'female'), 1580, 5)

console.log('CASO 3 - Suelo de seguridad')
eq('Objetivo con suelo', calorieGoal(1700, 'lose', 1.0, 'male'), 1500)

console.log('CASO 4 - Coherencia de macros')
const m4 = macrosFromPercent(2000, 40, 30, 30)
approx('kcal de macros', m4.carbsG*4 + m4.proteinG*4 + m4.fatG*9, 2000, 12)
eq('Porcentajes 100', m4.carbsPct + m4.proteinPct + m4.fatPct, 100)

console.log('CASO 5 - macrosFromGrams')
const m5 = macrosFromGrams(200, 150, 60)
approx('carbsPct', m5.carbsPct, Math.round((800/1940)*100), 1)

console.log('CASO 6 - Escalado por gramos')
const scaled = scaleNutrients({ ...EMPTY_NUTRIENTS, calories: 165, protein: 31, fat: 3.6 }, 150)
approx('kcal 150g', scaled.calories, 247.5, 0.6); approx('prot 150g', scaled.protein, 46.5, 0.2)

console.log('CASO 7 - MET (BJJ 10.3, 75 kg, 60 min)')
approx('kcal BJJ', caloriesFromMet(10.3, 75, 60), 811, 2)

console.log('CASO 8 - Edad')
eq('Edad', ageFromBirth('1994-01-01', new Date('2026-06-29T00:00:00')), 32)

console.log('')
if (fails === 0) console.log('RESULTADO: TODO CORRECTO')
else { console.log('RESULTADO: ' + fails + ' fallo(s)'); process.exitCode = 1 }
`

const res = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: PROJECT, loader: 'ts', sourcefile: 'test-nutrition.ts' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  alias: { '@': `${PROJECT}/src` },
  logLevel: 'warning',
})

const code = res.outputFiles[0].text
const tmp = `${PROJECT}/node_modules/.cache-test-nutrition.mjs`
const { writeFileSync, rmSync } = require('node:fs')
writeFileSync(tmp, code)
try { await import(pathToFileURL(tmp).href) } finally { rmSync(tmp, { force: true }) }
