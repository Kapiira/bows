import { ref } from 'vue'
import type { VSStats } from '~/types/database.types'

type JoinedVSStat = VSStats & {
  players?: {
    id: string
    name: string
    rank: number | null
    level: number | null
  } | null
}

type UseVsStatsResult = {
  stats: Ref<JoinedVSStat[]>
  isLoading: Ref<boolean>
  isSaving: Ref<boolean>
  errorMessage: Ref<string | null>
  handleFetchStats: (payload: { weekId: string; stageId: string }) => Promise<void>
  handleSaveStat: (payload: { playerId: string; weekId: string; stageId: string; score: number }) => Promise<void>
}

export const useVsStats = (): UseVsStatsResult => {
  const stats = ref<JoinedVSStat[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const errorMessage = ref<string | null>(null)

  const handleFetchStats = async (payload: { weekId: string; stageId: string }) => {
    try {
      isLoading.value = true
      errorMessage.value = null

      const { stats: fetchedStats } = await $fetch<{ stats: JoinedVSStat[] }>('/api/vs/stats', {
        query: {
          weekId: payload.weekId,
          stageId: payload.stageId,
        },
      })

      stats.value = fetchedStats
    } catch (error: any) {
      errorMessage.value = error?.message ?? 'Failed to load stats'
      stats.value = []
    } finally {
      isLoading.value = false
    }
  }

  const handleSaveStat = async (payload: { playerId: string; weekId: string; stageId: string; score: number }) => {
    try {
      isSaving.value = true
      errorMessage.value = null

      const { stat } = await $fetch<{ stat: JoinedVSStat }>('/api/vs/stats', {
        method: 'POST',
        body: {
          playerId: payload.playerId,
          weekId: payload.weekId,
          stageId: payload.stageId,
          score: payload.score,
        },
      })

      const existingIndex = stats.value.findIndex((existingStat) => existingStat.id === stat.id)

      if (existingIndex === -1) {
        stats.value = [stat, ...stats.value]
        return
      }

      stats.value.splice(existingIndex, 1, stat)
    } catch (error: any) {
      errorMessage.value = error?.message ?? 'Failed to save stat'
    } finally {
      isSaving.value = false
    }
  }

  return {
    stats,
    isLoading,
    isSaving,
    errorMessage,
    handleFetchStats,
    handleSaveStat,
  }
}


