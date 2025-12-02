<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import { useVsContext } from '~/composables/useVsContext'
import type { VSStage } from '~/types/database.types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

type JoinedStat = {
  id: string
  score: number | null
  player_id: string | null
  stage_id: string | null
  players?: {
    id: string
    name: string
    rank: number | null
    level: number | null
  } | null
}

type PlayerRow = {
  playerId: string
  playerName: string
  rank: number | null
  level: number | null
  stageScores: Record<string, number | null>
}

const {
  weeks,
  stages,
  isLoading: isContextLoading,
  errorMessage: contextErrorMessage,
  handleFetchWeeks,
  handleFetchStages,
} = useVsContext()

const selectedWeekId = ref<string | null>(null)
const stats = ref<JoinedStat[]>([])
const isLoadingStats = ref(false)
const statsError = ref<string | null>(null)
const sortByStageId = ref<string | null>(null)
const sortByTotal = ref(false)
const sortDirection = ref<'asc' | 'desc'>('desc')

const showTrendChart = ref(true)
const trendFilter = ref<'total' | string>('total')
const trendWeeksCount = ref(4)
const trendStats = ref<any[]>([])
const isLoadingTrends = ref(false)
const trendError = ref<string | null>(null)

const formatScore = (score: number | null): string => {
  if (score === null) {
    return '–'
  }

  return new Intl.NumberFormat('en-US').format(score)
}

const handleFetchStatsByWeek = async (weekId: string) => {
  try {
    isLoadingStats.value = true
    statsError.value = null

    const { stats: fetchedStats } = await $fetch<{ stats: JoinedStat[] }>('/api/vs/stats-by-week', {
      query: { weekId },
    })

    stats.value = fetchedStats
  } catch (error: any) {
    statsError.value = error?.message ?? 'Failed to load stats'
    stats.value = []
  } finally {
    isLoadingStats.value = false
  }
}

const handleSelectWeek = async (weekId: string) => {
  selectedWeekId.value = weekId
  await handleFetchStatsByWeek(weekId)
  await handleFetchTrends()
}

const handleFetchTrends = async () => {
  if (!weeks.value.length) {
    return
  }

  try {
    isLoadingTrends.value = true
    trendError.value = null

    const selectedWeeks = weeks.value.slice(0, trendWeeksCount.value)
    const weekIds = selectedWeeks.map((w) => w.id).join(',')

    const stageId = trendFilter.value === 'total' ? null : trendFilter.value

    const { stats: fetchedStats } = await $fetch<{ stats: any[] }>('/api/vs/stats-trends', {
      query: {
        weekIds,
        ...(stageId ? { stageId } : {}),
      },
    })

    trendStats.value = fetchedStats
  } catch (error: any) {
    trendError.value = error?.message ?? 'Failed to load trends'
    trendStats.value = []
  } finally {
    isLoadingTrends.value = false
  }
}

const trendChartData = computed(() => {
  if (!trendStats.value.length || !weeks.value.length) {
    return {
      labels: [],
      datasets: [],
    }
  }

  const selectedWeeks = weeks.value.slice(0, trendWeeksCount.value)
  const labels = selectedWeeks.map((w) => w.start_date ?? 'N/A')

  const playerMap = new Map<string, { name: string; scores: (number | null)[] }>()

  selectedWeeks.forEach((week) => {
    const weekStats = trendStats.value.filter((s) => s.week_id === week.id)

    weekStats.forEach((stat) => {
      if (!stat.player_id || !stat.players) {
        return
      }

      const playerId = stat.player_id
      const playerName = stat.players.name

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          name: playerName,
          scores: new Array(selectedWeeks.length).fill(null),
        })
      }

      const playerData = playerMap.get(playerId)!
      const weekIndex = selectedWeeks.findIndex((w) => w.id === week.id)

      if (trendFilter.value === 'total') {
        const existingTotal = playerData.scores[weekIndex] ?? 0
        playerData.scores[weekIndex] = existingTotal + (stat.score ?? 0)
      } else {
        playerData.scores[weekIndex] = stat.score
      }
    })
  })

  const baseColors = [
    'rgb(59, 130, 246)',
    'rgb(16, 185, 129)',
    'rgb(245, 158, 11)',
    'rgb(239, 68, 68)',
    'rgb(139, 92, 246)',
    'rgb(236, 72, 153)',
    'rgb(14, 165, 233)',
    'rgb(34, 197, 94)',
    'rgb(251, 146, 60)',
    'rgb(168, 85, 247)',
    'rgb(20, 184, 166)',
    'rgb(249, 115, 22)',
  ]

  const generateColor = (index: number): string => {
    const baseColor = baseColors[index % baseColors.length]
    const variation = Math.floor(index / baseColors.length)
    if (variation === 0) {
      return baseColor
    }
    const rgb = baseColor.match(/\d+/g)?.map(Number) || [0, 0, 0]
    const factor = 0.7 + (variation % 3) * 0.1
    return `rgb(${Math.round(rgb[0] * factor)}, ${Math.round(rgb[1] * factor)}, ${Math.round(rgb[2] * factor)})`
  }

  const datasets = Array.from(playerMap.entries())
    .sort((a, b) => {
      const aMax = Math.max(...a[1].scores.filter((s) => s !== null) as number[], 0)
      const bMax = Math.max(...b[1].scores.filter((s) => s !== null) as number[], 0)
      return bMax - aMax
    })
    .map(([playerId, data], index) => {
      const color = generateColor(index)
      return {
        label: data.name,
        data: data.scores,
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0.4,
        fill: false,
      }
    })

  return {
    labels,
    datasets,
  }
})

const trendChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: 'rgb(203, 213, 225)',
        font: {
          size: 11,
        },
        usePointStyle: true,
        padding: 8,
      },
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: 'rgb(203, 213, 225)',
      bodyColor: 'rgb(203, 213, 225)',
      borderColor: 'rgb(51, 65, 85)',
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: (context) => {
          const value = context.parsed.y
          return `${context.dataset.label}: ${value !== null ? new Intl.NumberFormat('en-US').format(value) : 'N/A'}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(51, 65, 85, 0.5)',
      },
      ticks: {
        color: 'rgb(148, 163, 184)',
        font: {
          size: 10,
        },
      },
    },
    y: {
      grid: {
        color: 'rgba(51, 65, 85, 0.5)',
      },
      ticks: {
        color: 'rgb(148, 163, 184)',
        font: {
          size: 10,
        },
        callback: (value) => {
          return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(Number(value))
        },
      },
    },
  },
}

const handleSortByStage = (stageId: string) => {
  if (sortByStageId.value === stageId) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortByStageId.value = stageId
    sortByTotal.value = false
    sortDirection.value = 'desc'
  }
}

const handleSortByTotal = () => {
  if (sortByTotal.value) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortByTotal.value = true
    sortByStageId.value = null
    sortDirection.value = 'desc'
  }
}

const getPlayerTotal = (row: PlayerRow): number => {
  return Object.values(row.stageScores).reduce((sum, score) => {
    return sum + (score ?? 0)
  }, 0)
}

const playerRows = computed<PlayerRow[]>(() => {
  const playerMap = new Map<string, PlayerRow>()

  stats.value.forEach((stat) => {
    if (!stat.player_id || !stat.players) {
      return
    }

    const playerId = stat.player_id

    if (!playerMap.has(playerId)) {
      playerMap.set(playerId, {
        playerId,
        playerName: stat.players.name,
        rank: stat.players.rank,
        level: stat.players.level,
        stageScores: {},
      })
    }

    const row = playerMap.get(playerId)!
    if (stat.stage_id) {
      row.stageScores[stat.stage_id] = stat.score
    }
  })

  let rows = Array.from(playerMap.values())

  if (sortByTotal.value) {
    rows = rows.sort((a, b) => {
      const totalA = getPlayerTotal(a)
      const totalB = getPlayerTotal(b)

      if (sortDirection.value === 'desc') {
        return totalB - totalA
      }

      return totalA - totalB
    })
  } else if (sortByStageId.value) {
    rows = rows.sort((a, b) => {
      const scoreA = a.stageScores[sortByStageId.value!] ?? -1
      const scoreB = b.stageScores[sortByStageId.value!] ?? -1

      if (sortDirection.value === 'desc') {
        return scoreB - scoreA
      }

      return scoreA - scoreB
    })
  } else {
    rows = rows.sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER

      if (rankA !== rankB) {
        return rankA - rankB
      }

      return a.playerName.localeCompare(b.playerName)
    })
  }

  return rows
})

watch([trendFilter, trendWeeksCount], () => {
  handleFetchTrends()
})

watch(() => weeks.value, () => {
  if (weeks.value.length > 0 && !selectedWeekId.value) {
    selectedWeekId.value = weeks.value[0].id
    handleFetchStatsByWeek(weeks.value[0].id)
    handleFetchTrends()
  }
})

onMounted(async () => {
  await Promise.all([handleFetchWeeks(), handleFetchStages()])

  if (weeks.value.length > 0) {
    selectedWeekId.value = weeks.value[0].id
    await handleFetchStatsByWeek(weeks.value[0].id)
    await handleFetchTrends()
  }
})
</script>

<template>
  <section class="space-y-8">
    <header class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
  <div>
        <h1 class="text-2xl font-semibold tracking-tight text-white">
          VS stats
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          Track and manage Last War VS performance stats.
        </p>
      </div>
      <NuxtLink
        to="/vs-stats/add-stats"
        class="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        Add stats
      </NuxtLink>
    </header>

    <div class="space-y-4">
      <div
        v-if="!selectedWeekId"
        class="rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-center"
      >
        <p class="text-slate-400">
          Select a week to view stats.
        </p>
      </div>

      <div
        v-else-if="!stages.length"
        class="rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-center"
      >
        <p class="text-slate-400">
          No stages configured. Define VS stages in the database to view stats.
        </p>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div
          v-if="showTrendChart && weeks.length > 1"
          class="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
        >
          <div class="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h3 class="text-sm font-medium uppercase tracking-wide text-slate-400">
              Performance trends
            </h3>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <label
                  for="trend-weeks"
                  class="text-xs font-medium text-slate-300"
                >
                  Weeks:
                </label>
                <select
                  id="trend-weeks"
                  v-model.number="trendWeeksCount"
                  class="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option
                    v-for="count in Math.min(weeks.length, 12)"
                    :key="count"
                    :value="count"
                  >
                    {{ count }}
                  </option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label
                  for="trend-filter"
                  class="text-xs font-medium text-slate-300"
                >
                  Filter:
                </label>
                <select
                  id="trend-filter"
                  v-model="trendFilter"
                  class="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="total">
                    Total
                  </option>
                  <option
                    v-for="stage in stages"
                    :key="stage.id"
                    :value="stage.id"
                  >
                    {{ stage.stage_type ?? `Stage ${stage.stage_number}` }}
                  </option>
                </select>
              </div>
              <button
                type="button"
                class="rounded-md border border-slate-700 px-2 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                @click="showTrendChart = false"
              >
                Hide
              </button>
            </div>
          </div>
          <div
            v-if="isLoadingTrends"
            class="flex h-64 items-center justify-center"
          >
            <span class="text-sm text-slate-400">Loading trends…</span>
          </div>
          <div
            v-else-if="trendError"
            class="flex h-64 items-center justify-center"
          >
            <span class="text-sm text-rose-400">{{ trendError }}</span>
          </div>
          <div
            v-else-if="trendChartData.labels.length === 0"
            class="flex h-64 items-center justify-center"
          >
            <span class="text-sm text-slate-400">No trend data available</span>
          </div>
          <ClientOnly
            v-else
          >
            <div class="h-64">
              <Line
                :data="trendChartData"
                :options="trendChartOptions"
              />
            </div>
            <template #fallback>
              <div class="flex h-64 items-center justify-center">
                <span class="text-sm text-slate-400">Loading chart…</span>
              </div>
            </template>
          </ClientOnly>
          <p class="mt-3 text-xs text-slate-500">
            Shows all players sorted by highest score. Hover over lines to see values.
          </p>
        </div>

        <div
          v-if="!showTrendChart && weeks.length > 1"
          class="flex justify-end"
        >
          <button
            type="button"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-sky-500 hover:bg-slate-800"
            @click="showTrendChart = true"
          >
            Show trend chart
          </button>
        </div>
        <div class="flex items-center gap-4 pt-5">
            <label
            for="week-selector"
            class="text-sm font-medium text-slate-300"
            >
            Week:
            </label>
            <select
            id="week-selector"
            :value="selectedWeekId ?? ''"
            class="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            @change="handleSelectWeek(($event.target as HTMLSelectElement).value)"
            >
            <option
                v-if="!weeks.length"
                value=""
            >
                No weeks available
            </option>
            <option
                v-for="week in weeks"
                :key="week.id"
                :value="week.id"
            >
                {{ week.start_date ?? 'N/A' }}
            </option>
            </select>
            <span
            v-if="isContextLoading || isLoadingStats"
            class="text-xs text-slate-400"
            >
            Loading…
            </span>
            <span
            v-if="contextErrorMessage || statsError"
            class="text-xs text-rose-400"
            >
            {{ contextErrorMessage ?? statsError }}
            </span>
        </div>
        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-800">
              <th class="sticky left-0 z-10 border-r border-slate-800 bg-slate-900/95 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                Player
              </th>
              <th
                v-for="stage in stages"
                :key="stage.id"
                class="cursor-pointer border-r border-slate-800 px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-400 transition-colors hover:bg-slate-800"
                :class="sortByStageId === stage.id ? 'bg-slate-800' : ''"
                @click="handleSortByStage(stage.id)"
              >
                <div class="flex items-center justify-center gap-1">
                  <span>{{ stage.stage_type ?? `Stage ${stage.stage_number}` }}</span>
                  <span
                    v-if="sortByStageId === stage.id"
                    class="text-[10px]"
                  >
                    {{ sortDirection === 'desc' ? '↓' : '↑' }}
                  </span>
                </div>
              </th>
              <th
                class="cursor-pointer border-r border-slate-800 bg-slate-800/30 px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-300 transition-colors hover:bg-slate-800"
                :class="sortByTotal ? 'bg-slate-800' : ''"
                @click="handleSortByTotal"
              >
                <div class="flex items-center justify-center gap-1">
                  <span>Total</span>
                  <span
                    v-if="sortByTotal"
                    class="text-[10px]"
                  >
                    {{ sortDirection === 'desc' ? '↓' : '↑' }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in playerRows"
              :key="row.playerId"
              class="border-b border-slate-900 transition-colors hover:bg-slate-900/60"
            >
              <td class="sticky left-0 z-10 border-r border-slate-800 bg-slate-900/95 px-4 py-2">
                <div class="flex flex-col">
                  <span class="font-medium text-slate-200">
                    {{ row.playerName }}
                  </span>
                  <span class="text-xs text-slate-500">
                    <span v-if="row.rank !== null">
                      R{{ row.rank }}
                    </span>
                    <span v-if="row.level !== null">
                      <span v-if="row.rank !== null"> • </span>Lv{{ row.level }}
                    </span>
                  </span>
                </div>
              </td>
              <td
                v-for="stage in stages"
                :key="stage.id"
                class="border-r border-slate-800 px-4 py-2 text-center text-slate-200"
                :class="sortByStageId === stage.id ? 'bg-slate-800/50' : ''"
              >
                {{ formatScore(row.stageScores[stage.id] ?? null) }}
              </td>
              <td
                class="border-r border-slate-800 bg-slate-800/30 px-4 py-2 text-center font-semibold text-slate-200"
                :class="sortByTotal ? 'bg-slate-800/50' : ''"
              >
                {{ formatScore(getPlayerTotal(row)) }}
              </td>
            </tr>
            <tr v-if="!playerRows.length">
              <td
                :colspan="stages.length + 2"
                class="px-4 py-8 text-center text-slate-400"
              >
                No stats recorded for this week.
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
  </div>
  </section>
</template>