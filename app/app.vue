<script setup lang="ts">
import { onMounted } from 'vue';
import { usePlayers } from '~/composables/usePlayers';
import { usePlayersRealtime } from '~/composables/usePlayersRealtime';
import { useStore } from '~/store';

const { handleFetchPlayers } = usePlayers();
const store = useStore();

onMounted(async () => {
  await handleFetchPlayers();
});

usePlayersRealtime(async () => {
  await handleFetchPlayers();
});
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NuxtLink
          to="/"
          class="text-2xl font-semibold tracking-tight text-white outline-none ring-offset-2 ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="BOWs home"
        >
          BOWs
        </NuxtLink>

        <nav aria-label="Main navigation">
          <ul class="flex items-center gap-2">
            <li>
              <NuxtLink
                to="/"
                class="rounded-full px-3 py-1.5 text-sm font-medium text-slate-200 outline-none ring-offset-2 ring-offset-slate-950 transition-colors hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-500"
                exact-active-class="bg-slate-800 text-white"
              >
                Players
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/vs-stats"
                class="rounded-full px-3 py-1.5 text-sm font-medium text-slate-200 outline-none ring-offset-2 ring-offset-slate-950 transition-colors hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-500"
                active-class="bg-slate-800 text-white"
              >
                VS stats
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-6 py-6">
      <NuxtPage />
    </main>
  </div>
</template>
