/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIFI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const content: string;
  export default content;
}
