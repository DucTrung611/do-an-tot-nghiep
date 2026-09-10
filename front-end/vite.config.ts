/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';
import { visualizer } from "rollup-plugin-visualizer";
import dns from 'dns';

//running on localhost instead of IP 127.0.0.1
// https://vitejs.dev/config/server-options.html#server-host
dns.setDefaultResultOrder('verbatim')

// https://vitejs.dev/config/
// https://v2.vitejs.dev/config/#environment-variables
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(), 
      // visualizer() as PluginOption
    ],
    server: {
      port: parseInt(env.PORT)
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src/"),
        components: `${path.resolve(import.meta.dirname, "./src/components/")}`,
        styles: `${path.resolve(import.meta.dirname, "./src/styles/")}`,
        config: `${path.resolve(import.meta.dirname, "./src/config/")}`,
        pages: `${path.resolve(import.meta.dirname, "./src/pages/")}`,
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
