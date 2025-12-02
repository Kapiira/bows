import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default eventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)

  const weekIds = typeof query.weekIds === 'string' ? query.weekIds.split(',') : []
  const stageId = typeof query.stageId === 'string' ? query.stageId : null

  if (!weekIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'weekIds are required',
    })
  }

  let queryBuilder = client
    .from('vs_stage_stats')
    .select(
      `
        id,
        score,
        player_id,
        stage_id,
        week_id,
        players (
          id,
          name,
          rank,
          level
        )
      `,
    )
    .in('week_id', weekIds)

  if (stageId) {
    queryBuilder = queryBuilder.eq('stage_id', stageId)
  }

  const { data, error } = await queryBuilder

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return { stats: data }
})

