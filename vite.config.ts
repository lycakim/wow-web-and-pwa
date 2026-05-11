import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
        VitePWA({
            outDir: 'public',
            registerType: 'autoUpdate',
            injectRegister: null,
            strategies: 'generateSW',
            manifest: {
                name: 'Barkada Tour Planner',
                short_name: 'Barkada',
                description: 'Group expense calculator for barkada tours',
                theme_color: '#6366f1',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/barkada',
                scope: '/',
                icons: [
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,png,svg,ico,woff,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/barkada'),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'barkada-pages',
                            networkTimeoutSeconds: 3,
                        },
                    },
                ],
            },
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});
