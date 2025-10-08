/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_GOATCOUNTER_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
