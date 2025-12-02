// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/tailwind.css'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/supabase', '@pinia/nuxt'],
  supabase: {
    redirect: false,
  },
})