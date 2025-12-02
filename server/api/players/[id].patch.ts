import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

type UpdatePlayerBody = {
  name?: string
  level?: number | null
  rank?: number | null
}

export default eventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<UpdatePlayerBody>(event)
  const playerId = getRouterParam(event, 'id')

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player id is required',
    })
  }

  const trimmedName = body.name?.trim()

  const updatedFields: UpdatePlayerBody = {}

  if (typeof trimmedName === 'string' && trimmedName.length > 0) {
    updatedFields.name = trimmedName
  }

  if (typeof body.rank !== 'undefined') {
    if (body.rank === null) {
      updatedFields.rank = null
    } else {
      if (body.rank < 1 || body.rank > 5) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Rank must be between 1 and 5',
        })
      }

      updatedFields.rank = body.rank
    }
  }

  if (typeof body.level !== 'undefined') {
    if (body.level === null) {
      updatedFields.level = null
    } else {
      if (body.level < 1 || body.level > 30) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Level must be between 1 and 30',
        })
      }

      updatedFields.level = body.level
    }
  }

  if (Object.keys(updatedFields).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No valid fields provided for update',
    })
  }

  const { data, error } = await client
    .from('players')
    .update(updatedFields)
    .eq('id', playerId)
    .select('*')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return { player: data }
})


