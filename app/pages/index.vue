<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStore } from '~/store'
import type { Player } from '~/types/database.types'

const store = useStore()

const newPlayerName = ref('')
const newPlayerRank = ref<number | null>(null)
const newPlayerLevel = ref<number | null>(null)
const formErrorMessage = ref<string | null>(null)
const isSubmittingNewPlayer = ref(false)
const visibleEditSections = ref<Set<string>>(new Set())

const sortedPlayers = computed<Player[]>(() => {
  if (!store.players.length) {
    return []
  }

  return [...store.players].sort((firstPlayer, secondPlayer) => {
    const firstRank = firstPlayer.rank ?? Number.MAX_SAFE_INTEGER
    const secondRank = secondPlayer.rank ?? Number.MAX_SAFE_INTEGER

    if (firstRank !== secondRank) {
      return firstRank - secondRank
    }

    return firstPlayer.name.localeCompare(secondPlayer.name)
  })
})

const handleSelectNewPlayerRank = (rank: number) => {
  newPlayerRank.value = rank
}

const handleSelectNewPlayerLevel = (level: number) => {
  if (level < 1) {
    newPlayerLevel.value = 1
    return
  }

  if (level > 30) {
    newPlayerLevel.value = 30
    return
  }

  newPlayerLevel.value = level
}

const handleSubmitNewPlayer = async () => {
  const trimmedName = newPlayerName.value.trim()

  if (!trimmedName) {
    formErrorMessage.value = 'Name is required'
    return
  }

  if (newPlayerRank.value === null) {
    formErrorMessage.value = 'Rank is required'
    return
  }

  if (newPlayerLevel.value === null) {
    formErrorMessage.value = 'Level is required'
    return
  }

  formErrorMessage.value = null
  isSubmittingNewPlayer.value = true

  const payload = {
    name: trimmedName,
    rank: newPlayerRank.value,
    level: newPlayerLevel.value,
  }

  try {
    await store.addPlayer(payload)

    if (store.errorMessage) {
      formErrorMessage.value = store.errorMessage
      return
    }

    newPlayerName.value = ''
    newPlayerRank.value = null
    newPlayerLevel.value = null
  } finally {
    isSubmittingNewPlayer.value = false
  }
}

const handleUpdatePlayerRank = async (player: Player, rank: number) => {
  if (rank < 1 || rank > 5) {
    return
  }

  if (player.rank === rank) {
    return
  }

  await store.updatePlayer({
    id: player.id,
    rank,
  })
}

const handleUpdatePlayerLevel = async (player: Player, level: number | null) => {
  let nextLevel: number | null = level

  if (nextLevel !== null) {
    if (nextLevel < 1) {
      nextLevel = 1
    }

    if (nextLevel > 30) {
      nextLevel = 30
    }
  }

  if (player.level === nextLevel) {
    return
  }

  await store.updatePlayer({
    id: player.id,
    level: nextLevel,
  })
}

const handleToggleEditSection = (playerId: string) => {
  if (visibleEditSections.value.has(playerId)) {
    visibleEditSections.value.delete(playerId)
  } else {
    visibleEditSections.value.add(playerId)
  }
}
</script>

<template>
  <section class="space-y-8">
    <header class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-white">Players</h1>
        <p class="mt-1 text-sm text-slate-400">
          Manage your BOWs players, their ranks, and levels. Quickly add new players or adjust existing ones.
        </p>
      </div>
      <div class="flex items-center gap-3 text-xs text-slate-400">
        <span class="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
          <span class="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Realtime sync</span>
        </span>
        <span v-if="store.isLoading" class="text-slate-400">Loading…</span>
      </div>
    </header>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.1fr)]">
      <section class="space-y-4">
        <h2 class="text-sm font-medium uppercase tracking-wide text-slate-400">
          Current players
        </h2>

        <div
          v-if="!sortedPlayers.length && !store.isLoading"
          class="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-400"
        >
          No players yet. Add your first player on the right to get started.
        </div>

        <div
          v-else
          class="grid gap-3 md:grid-cols-2"
        >
          <article
            v-for="player in sortedPlayers"
            :key="player.id"
            class="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-white">
                  {{ player.name }}
                </h3>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex flex-col items-end gap-1 text-xs text-slate-400">
                  <span v-if="player.rank !== null">
                    Rank:
                    <span class="font-medium text-slate-200">
                      {{ player.rank }}
                    </span>
                  </span>
                  <span v-if="player.level !== null">
                    Level:
                    <span class="font-medium text-slate-200">
                      {{ player.level }}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  class="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  :aria-label="`${visibleEditSections.has(player.id) ? 'Hide' : 'Show'} edit level and rank for ${player.name}`"
                  :aria-expanded="visibleEditSections.has(player.id)"
                  tabindex="0"
                  @click="handleToggleEditSection(player.id)"
                  @keydown.enter="handleToggleEditSection(player.id)"
                  @keydown.space.prevent="handleToggleEditSection(player.id)"
                >
                  {{ visibleEditSections.has(player.id) ? 'Hide' : 'Edit' }}
                </button>
              </div>
            </div>

            <div
              v-if="visibleEditSections.has(player.id)"
              class="space-y-3"
            >
              <div class="space-y-1">
                <p class="text-xs font-medium text-slate-300">
                  Rank
                  <span class="ml-1 text-[11px] font-normal text-slate-500">
                    (1 – 5)
                  </span>
                </p>
                <div class="inline-flex rounded-full bg-slate-900 p-0.5">
                  <button
                    v-for="rank in [1, 2, 3, 4, 5]"
                    :key="rank"
                    type="button"
                    class="min-w-8 rounded-full px-2 py-1 text-center text-xs font-medium transition-colors"
                    :class="player.rank === rank
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800'"
                    :aria-pressed="player.rank === rank"
                    :aria-label="`Set rank ${rank} for ${player.name}`"
                    @click="handleUpdatePlayerRank(player, rank)"
                  >
                    {{ rank }}
                  </button>
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <p class="font-medium text-slate-300">
                    Level
                    <span class="ml-1 text-[11px] font-normal text-slate-500">
                      (1 – 30)
                    </span>
                  </p>
                  <button
                    type="button"
                    class="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
                    :aria-label="`Clear level for ${player.name}`"
                    @click="handleUpdatePlayerLevel(player, null)"
                  >
                    Clear
                  </button>
                </div>

                <div class="flex items-center gap-3">
                  <input
                    :value="player.level ?? 1"
                    type="range"
                    min="1"
                    max="30"
                    class="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-500"
                    :aria-label="`Set level for ${player.name}`"
                    @change="handleUpdatePlayerLevel(player, Number(($event.target as HTMLInputElement).value))"
                  >
                  <span class="w-10 text-right text-xs font-medium text-slate-200">
                    {{ player.level ?? '–' }}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <aside class="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
        <h2 class="text-sm font-medium uppercase tracking-wide text-slate-400">
          Add player
        </h2>

        <form
          class="space-y-4"
          @submit.prevent="handleSubmitNewPlayer"
        >
          <div class="space-y-1.5">
            <label
              for="player-name"
              class="block text-xs font-medium text-slate-300"
            >
              Name
            </label>
            <input
              id="player-name"
              v-model="newPlayerName"
              type="text"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Enter player name"
              autocomplete="off"
            >
          </div>

          <div class="space-y-1.5">
            <p class="text-xs font-medium text-slate-300">
              Rank
              <span class="ml-1 text-[11px] font-normal text-slate-500">
                (1 – 5, optional)
              </span>
            </p>
            <div class="inline-flex rounded-full bg-slate-900 p-0.5">
              <button
                v-for="rank in [1, 2, 3, 4, 5]"
                :key="rank"
                type="button"
                class="min-w-8 rounded-full px-2 py-1 text-center text-xs font-medium transition-colors"
                :class="newPlayerRank === rank
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'"
                :aria-pressed="newPlayerRank === rank"
                :aria-label="`Set rank ${rank}`"
                @click="handleSelectNewPlayerRank(rank)"
              >
                {{ rank }}
              </button>
            </div>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <p class="font-medium text-slate-300">
                Level
                <span class="ml-1 text-[11px] font-normal text-slate-500">
                  (1 – 30, required)
                </span>
              </p>
            </div>

            <div class="space-y-1">
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="level in 30"
                  :key="level"
                  type="button"
                  class="min-w-8 rounded-full px-2 py-1 text-center text-[11px] font-medium transition-colors"
                  :class="newPlayerLevel === level
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800'"
                  :aria-pressed="newPlayerLevel === level"
                  :aria-label="`Set level ${level}`"
                  @click="handleSelectNewPlayerLevel(level)"
                >
                  {{ level }}
                </button>
              </div>
              <p class="text-[11px] text-slate-500">
                Selected level:
                <span class="font-semibold text-slate-200">
                  {{ newPlayerLevel ?? '–' }}
                </span>
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <button
              type="submit"
              class="inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 shadow-sm transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isSubmittingNewPlayer || !newPlayerName.trim() || newPlayerRank === null || newPlayerLevel === null"
            >
              {{ isSubmittingNewPlayer ? 'Adding player…' : 'Add player' }}
            </button>

            <p
              v-if="formErrorMessage"
              class="text-xs text-rose-400"
            >
              {{ formErrorMessage }}
            </p>
          </div>
        </form>
      </aside>
    </div>
  </section>
</template>
