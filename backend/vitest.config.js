import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    fileParallelism: false,
    hookTimeout: 120000,
    testTimeout: 30000,
    env: {
      NODE_ENV: "test",
      PORT: "5001",
      MONGO_URI: "mongodb://127.0.0.1:27017/linguae-test",
      JWT_SECRET_KEY: "0123456789abcdef0123456789abcdef",
      STREAM_API_KEY: "test-stream-key",
      STREAM_API_SECRET: "test-stream-secret",
      CSP_ENFORCE: "false",
    },
  },
});
