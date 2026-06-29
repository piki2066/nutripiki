import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { seedIfEmpty } from './db/init'
import { useProfile, useSettings } from './hooks/useData'
import { TabBar } from './components/TabBar'
import { Toaster } from './components/Toaster'
import { QuickActionSheet } from './features/diary/QuickActionSheet'

import TodayScreen from './features/today/TodayScreen'
import DiaryScreen from './features/diary/DiaryScreen'
import ProgressScreen from './features/progress/ProgressScreen'
import MoreScreen from './features/more/MoreScreen'
import AddFoodScreen from './features/foods/AddFoodScreen'
import CreateFoodScreen from './features/foods/CreateFoodScreen'
import CreateRecipeScreen from './features/foods/CreateRecipeScreen'
import RecipeImporterScreen from './features/foods/RecipeImporterScreen'
import ExerciseScreen from './features/exercise/ExerciseScreen'
import WeightScreen from './features/progress/WeightScreen'
import MeasurementsScreen from './features/progress/MeasurementsScreen'
import PhotosScreen from './features/progress/PhotosScreen'
import FastingScreen from './features/fasting/FastingScreen'
import NutritionScreen from './features/reports/NutritionScreen'
import ReportsScreen from './features/reports/ReportsScreen'
import GoalsScreen from './features/goals/GoalsScreen'
import ProfileScreen from './features/goals/ProfileScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import OnboardingScreen from './features/onboarding/OnboardingScreen'

export default function App() {
  const profile = useProfile()
  const settings = useSettings()
  const location = useLocation()
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    // Nunca bloquear el arranque: si el seeding falla (p.ej. IndexedDB no
    // disponible en modo privado), la app sigue funcionando igualmente.
    seedIfEmpty()
      .catch((e) => console.error('seedIfEmpty', e))
      .finally(() => setSeeded(true))
  }, [])

  // Aplicar tema + acento
  useEffect(() => {
    const theme = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : settings.theme
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.setProperty('--brand', settings.accent)
  }, [settings.theme, settings.accent])

  if (!seeded || profile === undefined) {
    return <div className="center-all" style={{ minHeight: '100vh' }}><div className="skeleton" style={{ width: 80, height: 80, borderRadius: 20 }} /></div>
  }

  // Sin perfil -> onboarding
  if (profile === null) {
    return (
      <div className="app">
        <OnboardingScreen />
        <Toaster />
      </div>
    )
  }

  const showTabs = !['/onboarding'].includes(location.pathname)

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/diary" element={<DiaryScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/more" element={<MoreScreen />} />
        <Route path="/add" element={<AddFoodScreen />} />
        <Route path="/food/new" element={<CreateFoodScreen />} />
        <Route path="/recipe/new" element={<CreateRecipeScreen />} />
        <Route path="/recipe/import" element={<RecipeImporterScreen />} />
        <Route path="/exercise" element={<ExerciseScreen />} />
        <Route path="/weight" element={<WeightScreen />} />
        <Route path="/measurements" element={<MeasurementsScreen />} />
        <Route path="/photos" element={<PhotosScreen />} />
        <Route path="/fasting" element={<FastingScreen />} />
        <Route path="/nutrition" element={<NutritionScreen />} />
        <Route path="/reports" element={<ReportsScreen />} />
        <Route path="/goals" element={<GoalsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabs && <TabBar />}
      <QuickActionSheet />
      <Toaster />
    </div>
  )
}
