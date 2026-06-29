import type { ActivityLevel, GoalType, Sex, UserProfile } from '@/db/types'
import {
  ageFromBirth, bmrMifflin, tdee, calorieGoal, defaultMacros, defaultMicros,
} from './nutrition'

export interface ProfileInput {
  name: string
  sex: Sex
  birthDate: string
  heightCm: number
  weightStartKg: number
  weightGoalKg: number
  goalType: GoalType
  paceKgPerWeek: number
  activityLevel: ActivityLevel
  units: 'metric' | 'imperial'
}

/** Calcula BMR/TDEE/calorías/macros y construye el perfil completo. */
export function buildProfile(input: ProfileInput, existing?: UserProfile): UserProfile {
  const age = ageFromBirth(input.birthDate)
  const bmr = bmrMifflin(input.sex, input.weightStartKg, input.heightCm, age)
  const tdeeVal = tdee(bmr, input.activityLevel)
  const goal = input.goalType === 'maintain'
    ? tdeeVal
    : calorieGoal(tdeeVal, input.goalType, input.paceKgPerWeek, input.sex)
  const macros = defaultMacros(goal)
  const micros = defaultMicros(goal)
  return {
    id: 'me',
    name: input.name,
    sex: input.sex,
    birthDate: input.birthDate,
    heightCm: input.heightCm,
    activityLevel: input.activityLevel,
    units: input.units,
    weightStartKg: input.weightStartKg,
    weightGoalKg: input.weightGoalKg,
    goalType: input.goalType,
    paceKgPerWeek: input.goalType === 'maintain' ? 0 : input.paceKgPerWeek,
    calorieGoal: goal,
    tdee: tdeeVal,
    bmr,
    manualCalories: existing?.manualCalories ?? false,
    macros: existing?.macros ?? macros,
    micros: existing?.micros ?? micros,
    perMeal: existing?.perMeal,
    caloriesByDay: existing?.caloriesByDay,
    addExerciseCalories: existing?.addExerciseCalories ?? true,
    waterGoalMl: existing?.waterGoalMl ?? 2000,
    stepGoal: existing?.stepGoal ?? 10000,
    weeklyStartsMonday: existing?.weeklyStartsMonday ?? true,
    onboarded: true,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  }
}

/** Recalcula calorías/TDEE manteniendo objetivos manuales si procede. */
export function recomputeGoals(p: UserProfile, currentWeightKg: number): UserProfile {
  const age = ageFromBirth(p.birthDate)
  const bmr = bmrMifflin(p.sex, currentWeightKg, p.heightCm, age)
  const tdeeVal = tdee(bmr, p.activityLevel)
  const goal = p.manualCalories
    ? p.calorieGoal
    : p.goalType === 'maintain'
      ? tdeeVal
      : calorieGoal(tdeeVal, p.goalType, p.paceKgPerWeek, p.sex)
  return { ...p, bmr, tdee: tdeeVal, calorieGoal: goal, updatedAt: Date.now() }
}
