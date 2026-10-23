import { defineConfig, type Plugin } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { devtools } from '@tanstack/devtools-vite'
import { fileURLToPath, URL } from 'node:url'

// Identificador do build: o aviso "Nova versão disponível" compara o valor
// embutido no bundle com o /version.json publicado junto do deploy.
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || String(Date.now())

const versionJson = (): Plugin => ({
  name: 'arkhiveon-version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId }),
    })
  },
})

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const plugins = [
    versionJson(),
    ...(command === 'serve' && mode !== 'test'
      ? devtools({ eventBusConfig: { port: 42070 } })
      : []),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: mode !== 'test',
    }),
    viteReact(),
    tailwindcss(),
  ]

  return {
    plugins,
    define: {
      'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('@react-pdf')) return 'react-pdf';
            if (id.includes('@xyflow')) return 'xyflow';
            if (id.includes('react-easy-crop')) return 'react-easy-crop';
            if (id.includes('@paper-design/shaders')) return 'paper-shaders';
            if (id.includes('@dagrejs')) return 'dagre';
            if (id.includes('@dnd-kit')) return 'dnd-kit';
            if (id.includes('@aws-sdk')) return 'aws-sdk';
          },
        },
      },
    },
  }
})
