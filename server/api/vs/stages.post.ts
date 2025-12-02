import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

type NewStageBody = {
  stageNumber: number
  stageType?: string | null
}

export default eventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<NewStageBody>(event)

  if (typeof body.stageNumber !== 'number' || Number.isNaN(body.stageNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Stage number is required',
    })
  }

  const { data, error } = await client
    .from('vs_stages')
    .insert({
      stage_number: body.stageNumber,
      stage_type: body.stageType ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return { stage: data }
})


