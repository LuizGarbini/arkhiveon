import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { devtools } from '@tanstack/devtools-vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const plugins = [
    ...(command === 'serve' && mode !== 'test'
      ? devtools({ eventBusConfig: { port: 42070 } })
      : []),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
    tailwindcss(),
  ]

  return {
    plugins,
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
            if (id.includes('@firecms/neat')) return 'neat-gradient';
            if (id.includes('@dagrejs')) return 'dagre';
            if (id.includes('@dnd-kit')) return 'dnd-kit';
            if (id.includes('@aws-sdk')) return 'aws-sdk';
          },
        },
      },
    },
  }
})
