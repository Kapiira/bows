import { useStore } from "~/store"
import type { Player } from "~/types/database.types"

type PlayersResponse = {
  players: Player[]
}

export const usePlayers = () => {
  const isLoading = ref(false)
  const fetchError = ref<Error | null>(null)
  const store = useStore();
  const handleFetchPlayers = async () => {
    try {
      isLoading.value = true
      fetchError.value = null

      const { players: fetchedPlayers } = await $fetch<PlayersResponse>('/api/players')
      store.players = fetchedPlayers;
    } catch (error: any) {
      fetchError.value = error
      store.players = []
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    fetchError,
    handleFetchPlayers,
  }
}