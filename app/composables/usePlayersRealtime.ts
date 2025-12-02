export function usePlayersRealtime(callback: Function) {
    const supabase = useSupabaseClient()

    const channel = supabase
        .channel("players-changes")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "players"
            },
            (payload) => {
                callback(payload)
            }
        )
        .subscribe()

    onBeforeUnmount(() => {
        supabase.removeChannel(channel)
    })

    return channel
}