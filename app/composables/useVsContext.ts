import { ref } from 'vue'
import type { VSStage, VSWeek } from '~/types/database.types'

type UseVsContextResult = {
  weeks: Ref<VSWeek[]>
  stages: Ref<VSStage[]>
  selectedWeekId: Ref<string | null>
  selectedWeekName: Ref<string | undefined>
  selectedStageId: Ref<string | null>
  selectedStageName: Ref<string | undefined>
  isLoading: Ref<boolean>
  errorMessage: Ref<string | null>
  handleFetchWeeks: () => Promise<void>
  handleCreateWeek: (payload?: { startDate?: string | null; endDate?: string | null }) => Promise<void>
  handleFetchStages: () => Promise<void>
  handleSelectWeek: (weekId: string) => void
  handleSelectStage: (stageId: string) => void
}

export const useVsContext = (): UseVsContextResult => {
  const weeks = ref<VSWeek[]>([])
  const stages = ref<VSStage[]>([])
  const selectedWeekId = ref<string | null>(null)
  const selectedWeekName = ref<string | undefined>(undefined)
  const selectedStageId = ref<string | null>(null)
  const selectedStageName = ref<string | undefined>(undefined)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const handleFetchWeeks = async () => {
    try {
      isLoading.value = true
      errorMessage.value = null

      const { weeks: fetchedWeeks } = await $fetch<{ weeks: VSWeek[] }>('/api/vs/weeks')
      weeks.value = fetchedWeeks
    } catch (error: any) {
      errorMessage.value = error?.message ?? 'Failed to load weeks'
      weeks.value = []
    } finally {
      isLoading.value = false
    }
  }

  const handleCreateWeek = async (payload?: { startDate?: string | null; endDate?: string | null }) => {
    try {
      isLoading.value = true
      errorMessage.value = null

      const { week } = await $fetch<{ week: VSWeek }>('/api/vs/weeks', {
        method: 'POST',
        body: payload ?? {},
      })

      const existingIndex = weeks.value.findIndex((existingWeek) => existingWeek.id === week.id)

      if (existingIndex === -1) {
        weeks.value = [week, ...weeks.value]
      }

      selectedWeekId.value = week.id
    } catch (error: any) {
      errorMessage.value = error?.message ?? 'Failed to create week'
    } finally {
      isLoading.value = false
    }
  }

  const handleFetchStages = async () => {
    try {
      isLoading.value = true
      errorMessage.value = null

      const { stages: fetchedStages } = await $fetch<{ stages: VSStage[] }>('/api/vs/stages')
      stages.value = fetchedStages
    } catch (error: any) {
      errorMessage.value = error?.message ?? 'Failed to load stages'
      stages.value = []
    } finally {
      isLoading.value = false
    }
  }

  const handleSelectWeek = (weekId: string) => {
    selectedWeekId.value = weekId
    selectedWeekName.value = weeks.value.find((week) => week.id === weekId)?.start_date ?? undefined
  }

  const handleSelectStage = (stageId: string) => {
    selectedStageId.value = stageId
    selectedStageName.value = stages.value.find((stage) => stage.id === stageId)?.stage_type ?? undefined
  }

  return {
    weeks,
    stages,
    selectedWeekId,
    selectedWeekName,
    selectedStageId,
    selectedStageName,
    isLoading,
    errorMessage,
    handleFetchWeeks,
    handleCreateWeek,
    handleFetchStages,
    handleSelectWeek,
    handleSelectStage,
  }
}


