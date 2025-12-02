import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

type NewPlayerBody = {
  name: string
  level: number
  rank: number
}

export default eventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<NewPlayerBody>(event)

  if (!body || !body.name?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name is required',
    })
  }

  if (typeof body.rank !== 'number' || Number.isNaN(body.rank) || body.rank < 1 || body.rank > 4) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rank must be between 1 and 4',
    })
  }

  if (typeof body.level !== 'number' || Number.isNaN(body.level) || body.level < 1 || body.level > 30) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Level must be between 1 and 30',
    })
  }

  const { data, error } = await client
    .from('players')
    .insert({
      name: body.name.trim(),
      level: body.level,
      rank: body.rank,
    })
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


