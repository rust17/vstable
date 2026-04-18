import { test as base } from '@playwright/test';

/**
 * E2E Test Fixture
 *
 * Since the frontend now communicates with the Go Engine directly via gRPC-Web
 * (nice-grpc-web → HTTP to localhost:39082), this fixture only needs to mock
 * Tauri-native APIs that don't exist in a headless browser:
 *
 * 1. window.__TAURI_INTERNALS__.invoke — for window_toggle_maximize and plugin:store|*
 * 2. transformCallback / unregisterCallback — required by @tauri-apps/api/core internals
 */
export const test = base.extend<{ mockTauri: undefined }>({
  mockTauri: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        // In-memory store to simulate tauri-plugin-store
        const memoryStore: Record<string, any> = {};
        let ridCounter = 1;

        (window as any).__TAURI_INTERNALS__ = {
          invoke: async (cmd: string, args: any) => {
            // Native window commands
            if (cmd === 'window_toggle_maximize') return null;

            // tauri-plugin-store commands
            if (cmd === 'plugin:store|load') {
              return ridCounter++;
            }
            if (cmd === 'plugin:store|get') {
              const key = args?.key;
              const value = memoryStore[key];
              // Return [value, exists] tuple as the real plugin does
              return value !== undefined ? [value, true] : [null, false];
            }
            if (cmd === 'plugin:store|set') {
              memoryStore[args?.key] = args?.value;
              return null;
            }
            if (cmd === 'plugin:store|save') return null;
            if (cmd === 'plugin:store|has') return args?.key in memoryStore;
            if (cmd === 'plugin:store|delete') {
              delete memoryStore[args?.key];
              return true;
            }
            if (cmd === 'plugin:store|clear') {
              for (const k in memoryStore) delete memoryStore[k];
              return null;
            }
            if (cmd === 'plugin:store|keys') return Object.keys(memoryStore);
            if (cmd === 'plugin:store|values') return Object.values(memoryStore);
            if (cmd === 'plugin:store|entries') return Object.entries(memoryStore);
            if (cmd === 'plugin:store|length') return Object.keys(memoryStore).length;
            if (cmd === 'plugin:store|reload') return null;
            if (cmd === 'plugin:store|reset') {
              for (const k in memoryStore) delete memoryStore[k];
              return null;
            }
            if (cmd === 'plugin:store|get_store') return null;

            // Ignore unknown commands gracefully in test environment
            console.warn(`[E2E Mock] Unhandled Tauri invoke: ${cmd}`);
            return null;
          },

          // Required by @tauri-apps/api/core for event callbacks
          transformCallback: (callback: Function, once: boolean) => {
            const id = Math.random();
            (window as any).__TAURI_CB_MAP__ = (window as any).__TAURI_CB_MAP__ || {};
            (window as any).__TAURI_CB_MAP__[id] = callback;
            return id;
          },
          unregisterCallback: (id: number) => {
            if ((window as any).__TAURI_CB_MAP__) {
              delete (window as any).__TAURI_CB_MAP__[id];
            }
          },

          // Metadata stub for @tauri-apps/api/window
          metadata: {
            currentWindow: { label: 'main' },
            currentWebview: { label: 'main' },
          },
        };

        // Legacy alias
        (window as any).__TAURI__ = {
          invoke: (window as any).__TAURI_INTERNALS__.invoke,
        };
      });

      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
