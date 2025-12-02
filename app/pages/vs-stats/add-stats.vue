<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useStore } from '~/store'
import { useVsContext } from '~/composables/useVsContext'
import { useVsStats } from '~/composables/useVsStats'
import type { Player } from '~/types/database.types'

const store = useStore()
const {
  weeks,
  stages,
  selectedWeekId,
  selectedStageId,
  selectedWeekName,
  selectedStageName,
  isLoading: isContextLoading,
  errorMessage: contextErrorMessage,
  handleFetchWeeks,
  handleCreateWeek,
  handleFetchStages,
  handleSelectWeek,
  handleSelectStage,
} = useVsContext()

const {
  stats,
  isLoading: isStatsLoading,
  isSaving: isSavingStat,
  errorMessage: statsErrorMessage,
  handleFetchStats,
  handleSaveStat,
} = useVsStats()

const playerSearchQuery = ref('')
const selectedPlayerId = ref<string | null>(null)
const scoreInput = ref<number | null>(null)
const scoreInputText = ref('')
const isInitialLoading = ref(true)
const playerSearchInputRef = ref<HTMLInputElement | null>(null)

const now = new Date()
const dayOfWeek = now.getDay()
const daysSinceMonday = (dayOfWeek + 6) % 7
const monday = new Date(now)
monday.setDate(now.getDate() - daysSinceMonday)
const defaultMondayIso = monday.toISOString().slice(0, 10)

const newWeekStartDate = ref<string>(defaultMondayIso)

const filteredPlayers = computed<Player[]>(() => {
  const query = playerSearchQuery.value.trim().toLowerCase()

  if (!query) {
    return store.players
  }

  return store.players.filter((player) => player.name.toLowerCase().includes(query))
})

const selectedPlayer = computed<Player | null>(() => {
  if (!selectedPlayerId.value) {
    return null
  }

  return store.players.find((player) => player.id === selectedPlayerId.value) ?? null
})

const canSubmitStat = computed<boolean>(() => {
  if (!selectedWeekId.value || !selectedStageId.value || !selectedPlayerId.value) {
    return false
  }

  if (scoreInput.value === null || Number.isNaN(scoreInput.value) || scoreInput.value < 0) {
    return false
  }

  return true
})

const formatScore = (score: number | null): string => {
  if (score === null) {
    return '0'
  }

  return new Intl.NumberFormat('en-US').format(score)
}

const handleSelectPlayer = (playerId: string) => {
  selectedPlayerId.value = playerId
}

const handleSubmitStat = async () => {
  if (!canSubmitStat.value || !selectedWeekId.value || !selectedStageId.value || !selectedPlayerId.value) {
    return
  }

  if (scoreInput.value === null || Number.isNaN(scoreInput.value) || scoreInput.value < 0) {
    return
  }

  const existingStat = stats.value.find((stat) => stat.player_id === selectedPlayerId.value)

  if (existingStat) {
    const playerName = existingStat.players?.name ?? selectedPlayer?.name ?? 'This player'
    const existingScore = existingStat.score ?? 0
    const formattedExistingScore = formatScore(existingScore)
    const formattedNewScore = formatScore(scoreInput.value)

    const confirmed = confirm(
      `${playerName} already has a score of ${formattedExistingScore} for this week and stage.\n\nDo you want to update it to ${formattedNewScore}?`,
    )

    if (!confirmed) {
      return
    }
  }

  await handleSaveStat({
    playerId: selectedPlayerId.value,
    weekId: selectedWeekId.value,
    stageId: selectedStageId.value,
    score: scoreInput.value,
  })

  if (statsErrorMessage.value) {
    return
  }

  selectedPlayerId.value = null
  playerSearchQuery.value = ''
  scoreInput.value = null
  scoreInputText.value = ''

  await nextTick()
  playerSearchInputRef.value?.focus()
}

const handleScoreInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const rawValue = target.value

  // Always keep what user typed; only use a cleaned version for parsing
  scoreInputText.value = rawValue

  const cleaned = rawValue.replace(/,/g, '').trim()

  if (!cleaned) {
    scoreInput.value = null
    return
  }

  const parsed = Number(cleaned)

  if (Number.isNaN(parsed) || parsed < 0) {
    // Keep last valid numeric value; don't update scoreInput
    return
  }

  scoreInput.value = parsed
}

const handleScoreInputKeyUp = () => {
  if (scoreInput.value === null || Number.isNaN(scoreInput.value) || scoreInput.value < 0) {
    scoreInputText.value = ''
    return
  }

  scoreInputText.value = formatScore(scoreInput.value)
}

const handleCreateWeekWithDate = async () => {
  const trimmedDate = newWeekStartDate.value.trim()

  await handleCreateWeek({
    startDate: trimmedDate || null,
  })
}

const handleSelectWeekAndLoad = async (weekId: string) => {
  handleSelectWeek(weekId)

  if (!selectedStageId.value) {
    return
  }

  await handleFetchStats({
    weekId,
    stageId: selectedStageId.value,
  })
}

const handleSelectStageAndLoad = async (stageId: string) => {
  handleSelectStage(stageId)

  if (!selectedWeekId.value) {
    return
  }

  await handleFetchStats({
    weekId: selectedWeekId.value,
    stageId,
  })
}

onMounted(async () => {
  try {
    await Promise.all([
      handleFetchWeeks(),
      handleFetchStages(),
    ])

    if (selectedWeekId.value && selectedStageId.value) {
      await handleFetchStats({
        weekId: selectedWeekId.value,
        stageId: selectedStageId.value,
      })
    }
  } finally {
    isInitialLoading.value = false
  }
})
</script>

<template>
  <section class="space-y-8">
    <div
      v-if="isInitialLoading"
      class="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading VS data"
    >
      <div class="flex flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-6 py-5 shadow-lg">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p class="text-sm font-medium text-slate-100">
          Loading VS data…
        </p>
      </div>
    </div>
    <header class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-white">
          VS stats
        </h1>
        <p class="mt-1 text-sm text-slate-400">
          Track weekly Last War VS performance. Pick a week and stage, then quickly enter scores for each player.
        </p>
      </div>
      <div class="flex items-center gap-3 text-xs text-slate-400">
        <span v-if="isContextLoading || isStatsLoading" class="text-slate-400">Loading…</span>
        <span v-if="contextErrorMessage || statsErrorMessage" class="text-rose-400">
          {{ contextErrorMessage ?? statsErrorMessage }}
        </span>
      </div>
    </header>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1.6fr)]">
      <section class="space-y-6 rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium uppercase tracking-wide text-slate-400">
              Weeks
            </h2>
          </div>

          <div class="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="space-y-1">
                <p class="font-medium text-slate-200">
                  Create week
                </p>
                <p class="text-[11px] text-slate-400">
                  Defaults to today. Adjust if you need to backfill an older week.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <label
                  for="new-week-start"
                  class="text-[11px] text-slate-400"
                >
                  Start date
                </label>
                <input
                  id="new-week-start"
                  v-model="newWeekStartDate"
                  type="date"
                  class="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                <button
                  type="button"
                  class="rounded-md border border-slate-700 px-2 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-sky-500 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  @click="handleCreateWeekWithDate"
                >
                  + New week
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="!weeks.length"
            class="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-3 py-4 text-xs text-slate-400"
          >
            No weeks yet. Create your first week to start tracking VS stats.
          </div>
          <div
            v-else
            class="flex flex-wrap gap-2"
          >
            <button
              v-for="week in weeks"
              :key="week.id"
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="week.id === selectedWeekId
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'"
              @click="handleSelectWeekAndLoad(week.id)"
            >
              Week
              {{ week.start_date ?? 'N/A' }}
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium uppercase tracking-wide text-slate-400">
              Stages
            </h2>
          </div>

          <div
            v-if="!stages.length"
            class="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-3 py-4 text-xs text-slate-400"
          >
            No stages configured. Define VS stages in the database to begin tracking stats.
          </div>
          <div
            v-else
            class="flex flex-wrap gap-2"
          >
            <button
              v-for="stage in stages"
              :key="stage.id"
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="stage.id === selectedStageId
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'"
              @click="handleSelectStageAndLoad(stage.id)"
            >
              {{ stage.stage_type ?? stage.stage_number }}
            </button>
          </div>
        </div>

        <div class="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
          <p class="font-medium text-slate-200">
            Current context
          </p>
          <p class="mt-1">
            Week:
            <span class="font-mono text-[11px] text-slate-400">
              {{ selectedWeekName ?? 'None selected' }}
            </span>
          </p>
          <p class="mt-1">
            Stage:
            <span class="font-mono text-[11px] text-slate-400">
              {{ selectedStageName ?? 'None selected' }}
            </span>
          </p>
        </div>
      </section>

      <section class="space-y-6">
        <div class="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <h2 class="text-sm font-medium uppercase tracking-wide text-slate-400">
            Fast entry
          </h2>

          <div class="space-y-3 text-xs text-slate-400">
            <p>
              1. Make sure a
              <span class="font-semibold text-slate-200">week</span>
              and
              <span class="font-semibold text-slate-200">stage</span>
              are selected on the left.
            </p>
            <p>
              2. Type part of a player name, pick them from the list, enter score, and save.
              The context stays the same so you can repeat quickly.
            </p>
          </div>

          <div class="space-y-4">
            <div class="space-y-1.5">
              <label
                for="player-search"
                class="block text-xs font-medium text-slate-300"
              >
                Player
              </label>
              <input
                id="player-search"
                ref="playerSearchInputRef"
                v-model="playerSearchQuery"
                type="text"
                class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Start typing a player name…"
                autocomplete="off"
              >
              <div
                v-if="filteredPlayers.length"
                class="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/90 p-1"
              >
                <button
                  v-for="player in filteredPlayers"
                  :key="player.id"
                  type="button"
                  class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-800"
                  :class="player.id === selectedPlayerId ? 'bg-sky-500/20' : ''"
                  @click="handleSelectPlayer(player.id)"
                >
                  <span class="truncate">
                    {{ player.name }}
                  </span>
                  <span class="flex items-center gap-2 text-[11px] text-slate-400">
                    <span v-if="player.rank !== null">
                      R{{ player.rank }}
                    </span>
                    <span v-if="player.level !== null">
                      Lv{{ player.level }}
                    </span>
                  </span>
                </button>
              </div>
              <p
                v-if="selectedPlayer"
                class="mt-1 text-[11px] text-slate-400"
              >
                Selected:
                <span class="font-medium text-slate-200">
                  {{ selectedPlayer.name }}
                </span>
                <span v-if="selectedPlayer.rank !== null">
                  • Rank
                  {{ selectedPlayer.rank }}
                </span>
                <span v-if="selectedPlayer.level !== null">
                  • Level
                  {{ selectedPlayer.level }}
                </span>
              </p>
            </div>

            <div class="space-y-1.5">
              <label
                for="score-input"
                class="block text-xs font-medium text-slate-300"
              >
                Score
              </label>
              <input
                id="score-input"
                :value="scoreInputText"
                type="text"
                class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Enter score"
                @input="handleScoreInputChange"
                @keyup="handleScoreInputKeyUp"
              >
            </div>

            <div>
              <button
                type="button"
                class="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 shadow-sm transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canSubmitStat || isSavingStat"
                @click="handleSubmitStat"
              >
                {{ isSavingStat ? 'Saving…' : 'Save score' }}
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <h2 class="text-sm font-medium uppercase tracking-wide text-slate-400">
            Current scores
          </h2>

          <div
            v-if="!stats.length"
            class="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-3 py-4 text-xs text-slate-400"
          >
            No scores recorded yet for this week and stage.
          </div>
          <div
            v-else
            class="space-y-1 text-xs text-slate-200"
          >
            <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 text-[11px] uppercase tracking-wide text-slate-400">
              <span>Player</span>
              <span class="text-right">Score</span>
            </div>
            <div
              v-for="entry in stats"
              :key="entry.id"
              class="flex items-center justify-between gap-2 border-b border-slate-900 py-1.5 last:border-0"
            >
              <div class="flex min-w-0 items-baseline gap-2">
                <span class="max-w-[180px] truncate">
                  {{ entry.players?.name ?? 'Unknown player' }}
                </span>
                <span class="text-[11px] text-slate-500">
                  <span v-if="entry.players?.rank !== null">
                    R{{ entry.players?.rank }}
                  </span>
                  <span v-if="entry.players?.level !== null">
                    • Lv{{ entry.players?.level }}
                  </span>
                </span>
              </div>
              <div class="text-right text-sm font-semibold">
                {{ formatScore(entry.score ?? 0) }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>