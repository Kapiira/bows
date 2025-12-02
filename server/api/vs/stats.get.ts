import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default eventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)

  const weekId = typeof query.weekId === 'string' ? query.weekId : null
  const stageId = typeof query.stageId === 'string' ? query.stageId : null

  if (!weekId || !stageId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'weekId and stageId are required',
    })
  }

  const { data, error } = await client
    .from('vs_stage_stats')
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
    .eq('week_id', weekId)
    .eq('stage_id', stageId)
    .order('score', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return { stats: data }
})


