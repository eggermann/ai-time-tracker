import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiApiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    const openAiApiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
    const aiProvider = env.AI_PROVIDER || env.VITE_AI_PROVIDER;
    const geminiModel = env.GEMINI_MODEL || env.VITE_GEMINI_MODEL;
    const openAiModel = env.OPENAI_MODEL || env.VITE_OPENAI_MODEL;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'process.env.OPENAI_API_KEY': JSON.stringify(openAiApiKey),
        'process.env.AI_PROVIDER': JSON.stringify(aiProvider),
        'process.env.GEMINI_MODEL': JSON.stringify(geminiModel),
        'process.env.OPENAI_MODEL': JSON.stringify(openAiModel)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
