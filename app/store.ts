import { defineStore } from 'pinia'
import type { Player } from './types/database.types'

type Store = {
  players: Player[]
  isLoading: boolean
  errorMessage: string | null
}

type NewPlayerPayload = {
  name: string
  level: number
  rank: number
}

type UpdatePlayerPayload = {
  id: string
  name?: string
  level?: number | null
  rank?: number | null
}

export const useStore = defineStore('store', {
  state: (): Store => ({
    players: [],
    isLoading: false,
    errorMessage: null,
  }),
  actions: {
    async fetchPlayers() {
      try {
        this.isLoading = true
        this.errorMessage = null

        const { players } = await $fetch<{ players: Player[] }>('/api/players')
        this.players = players
      } catch (error: any) {
        this.errorMessage = error?.message ?? 'Failed to load players'
        this.players = []
      } finally {
        this.isLoading = false
      }
    },
    async addPlayer(payload: NewPlayerPayload) {
      try {
        this.isLoading = true
        this.errorMessage = null

        const { player } = await $fetch<{ player: Player }>('/api/players', {
          method: 'POST',
          body: payload,
        })

        this.players.push(player)
      } catch (error: any) {
        this.errorMessage = error?.message ?? 'Failed to add player'
      } finally {
        this.isLoading = false
      }
    },
    async updatePlayer(payload: UpdatePlayerPayload) {
      try {
        this.isLoading = true
        this.errorMessage = null

        const { player } = await $fetch<{ player: Player }>(`/api/players/${payload.id}`, {
          method: 'PATCH',
          body: {
            name: payload.name,
            level: payload.level,
            rank: payload.rank,
          },
        })

        const existingPlayerIndex = this.players.findIndex((existingPlayer) => existingPlayer.id === player.id)

        if (existingPlayerIndex === -1) {
          this.players.push(player)
          return
        }

        this.players.splice(existingPlayerIndex, 1, player)
      } catch (error: any) {
        this.errorMessage = error?.message ?? 'Failed to update player'
      } finally {
        this.isLoading = false
      }
    },
  },
})

