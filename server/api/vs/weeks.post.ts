import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

type NewWeekBody = {
  startDate?: string | null
  endDate?: string | null
}

export default eventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<NewWeekBody>(event)

  const now = new Date()
  const dayOfWeek = now.getDay() // 0 (Sun) - 6 (Sat)
  const daysSinceMonday = (dayOfWeek + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysSinceMonday)
  const mondayIso = monday.toISOString().slice(0, 10)

  const effectiveStartDate = body.startDate ?? mondayIso

  const { data: existingWeeks, error: existingLookupError } = await client
    .from('vs_weeks')
    .select('*')
    .eq('start_date', effectiveStartDate)
    .limit(1)

  if (existingLookupError) {
    throw createError({
      statusCode: 500,
      statusMessage: existingLookupError.message,
    })
  }

  if (existingWeeks && existingWeeks.length > 0) {
    return { week: existingWeeks[0] }
  }

  const { data, error } = await client
    .from('vs_weeks')
    .insert({
      start_date: effectiveStartDate,
      end_date: body.endDate ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return { week: data }
})


