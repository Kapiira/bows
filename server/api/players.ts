import { serverSupabaseClient } from '#supabase/server'

export default eventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data } = await client.from("players").select('*').order('rank', { ascending: true }).order('name', { ascending: true });

  return { players: data }
})
