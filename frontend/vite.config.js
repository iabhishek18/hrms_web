import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Path aliases for cleaner imports
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@layouts': path.resolve(__dirname, './src/layouts'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@store': path.resolve(__dirname, './src/store'),
            '@api': path.resolve(__dirname, './src/api'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@types': path.resolve(__dirname, './src/types'),
            '@assets': path.resolve(__dirname, './src/assets'),
        },
    },
    // Development server configuration
    server: {
        port: 5173,
        host: true, // Listen on all network interfaces (needed for Docker)
        strictPort: true, // Fail if port is already in use
        open: false, // Don't auto-open browser
        // Proxy API requests to the backend during development
        // This avoids CORS issues and simulates production nginx proxy behavior
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
                // Log proxy requests in development for debugging
                configure: (proxy) => {
                    proxy.on('error', (err) => {
                        console.error('Proxy error:', err.message);
                    });
                },
            },
        },
        // Hot Module Replacement configuration
        hmr: {
            overlay: true, // Show error overlay in the browser
        },
    },
    // Preview server configuration (for `npm run preview` after build)
    preview: {
        port: 4173,
        host: true,
        strictPort: true,
    },
    // Build configuration
    build: {
        outDir: 'dist',
        sourcemap: true, // Generate source maps for debugging
        target: 'es2020', // Target modern browsers
        // Rollup options for code splitting and chunk optimization
        rollupOptions: {
            output: {
                // Manual chunk splitting for better caching
                manualChunks: {
                    // Vendor chunks — split large dependencies into separate files
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
                    'vendor-charts': ['recharts'],
                    'vendor-utils': ['axios', 'date-fns', 'clsx'],
                },
                // Asset file naming with content hash for cache busting
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name || '';
                    if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(info)) {
                        return 'assets/images/[name]-[hash][extname]';
                    }
                    if (/\.(woff2?|eot|ttf|otf)$/i.test(info)) {
                        return 'assets/fonts/[name]-[hash][extname]';
                    }
                    if (/\.css$/i.test(info)) {
                        return 'assets/css/[name]-[hash][extname]';
                    }
                    return 'assets/[name]-[hash][extname]';
                },
            },
        },
        // Chunk size warnings
        chunkSizeWarningLimit: 1000, // Warn if a chunk exceeds 1MB
        // Minification settings
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.log in production
                drop_debugger: true, // Remove debugger statements
            },
        },
    },
    // CSS configuration
    css: {
        devSourcemap: true, // Enable CSS source maps in development
        postcss: './postcss.config.js', // PostCSS config path (for Tailwind CSS)
    },
    // Environment variable prefix
    // Only variables prefixed with VITE_ are exposed to the client
    envPrefix: 'VITE_',
    // Optimization for dependency pre-bundling
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            '@reduxjs/toolkit',
            'react-redux',
            'axios',
            'recharts',
            'clsx',
            'date-fns',
        ],
    },
});
