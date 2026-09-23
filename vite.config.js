import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        }
    },
    server: {
        port: 3011,
        host: true,
        open: true,
        proxy: {
            '/hermes': {
                target: env.HERMES_API_TARGET || 'http://127.0.0.1:9119',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/hermes/, '')
            }
        }
    }
    };
});
