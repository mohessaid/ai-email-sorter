import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local for integration tests
config({ path: path.resolve(__dirname, "../.env.local") });

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock environment variables for unit tests (only if not already set from .env.local)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
}
// Keep real OPENROUTER_API_KEY from .env.local if present for integration tests
if (!process.env.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
}
if (!process.env.OPENROUTER_API_URL) {
  process.env.OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
}

// Mock Next.js modules
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Don't mock fetch for integration tests - let them make real API calls
// Only mock for unit tests that don't need external APIs

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
