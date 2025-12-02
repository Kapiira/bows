import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

type NewStatsBody = {
  playerId: string
  weekId: string
  stageId: string
  score: number
}

export default eventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<NewStatsBody>(event)

  if (!body.playerId || !body.weekId || !body.stageId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'playerId, weekId and stageId are required',
    })
  }

  if (typeof body.score !== 'number' || Number.isNaN(body.score) || body.score < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Score must be a non-negative number',
    })
  }

  const { data: existing, error: existingError } = await client
    .from('vs_stage_stats')
    .select('*')
    .eq('player_id', body.playerId)
    .eq('week_id', body.weekId)
    .eq('stage_id', body.stageId)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw createError({
      statusCode: 500,
      statusMessage: existingError.message,
    })
  }

  let data
  let error

  if (existing) {
    ;({ data, error } = await client
      .from('vs_stage_stats')
      .update({
        score: body.score,
      })
      .eq('id', existing.id)
      .select(
        `
        id,
        score,
        player_id,
        players (
          id,
          name,
          rank,
          level
        )
      `,
      )
      .single())
  } else {
    ;({ data, error } = await client
      .from('vs_stage_stats')
      .insert({
        player_id: body.playerId,
        week_id: body.weekId,
        stage_id: body.stageId,
        score: body.score,
      })
      .select(
        `
        id,
        score,
        player_id,
        players (
          id,
          name,
          rank,
          level
        )
      `,
      )
      .single())
  }

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return { stat: data }
})


