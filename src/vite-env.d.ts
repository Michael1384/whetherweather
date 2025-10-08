/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_GOATCOUNTER_TOKEN: string
  readonly VITE_NETLIFY_TOKEN: string
  readonly VITE_NETLIFY_SITE_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
