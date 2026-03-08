import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
    writeFileSync: mocks.writeFileSync,
  },
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
  writeFileSync: mocks.writeFileSync,
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(false),
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
}));

vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    default: {
      ...(actual as any),
      join: (...args: any[]) => args.join('/'),
    },
    join: (...args: any[]) => args.join('/'),
  };
});

import { safeStorage } from 'electron';
// Now import store after mocks
import * as store from './store';

describe('Store', () => {
  const workspacePath = '/mock/userData/workspace.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkspace', () => {
    it('returns null if file does not exist', () => {
      mocks.existsSync.mockReturnValue(false);
      const result = store.getWorkspace();
      expect(result).toBeNull();
      expect(mocks.existsSync).toHaveBeenCalledWith(workspacePath);
    });

    it('returns parsed json if file exists', () => {
      const mockData = { sessions: [] };
      mocks.existsSync.mockReturnValue(true);
      mocks.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const result = store.getWorkspace();
      expect(result).toEqual(mockData);
    });

    it('returns null if parsing fails', () => {
      mocks.existsSync.mockReturnValue(true);
      mocks.readFileSync.mockReturnValue('invalid json');

      const result = store.getWorkspace();
      expect(result).toBeNull();
    });
  });

  describe('saveWorkspace', () => {
    it('saves serialized json to file', () => {
      const mockData = { sessions: [] };
      store.saveWorkspace(mockData);
      expect(mocks.writeFileSync).toHaveBeenCalledWith(
        workspacePath,
        JSON.stringify(mockData, null, 2)
      );
    });

    it('completely strips password when encryption is not available', () => {
      (safeStorage.isEncryptionAvailable as any).mockReturnValue(false);
      const mockData = {
        sessions: [
          {
            config: {
              id: 'conn-1',
              password: 'secret_password',
            },
          },
        ],
      };

      store.saveWorkspace(mockData);

      const expectedData = {
        sessions: [
          {
            config: {
              id: 'conn-1',
            },
          },
        ],
      };
      expect(mocks.writeFileSync).toHaveBeenCalledWith(
        workspacePath,
        JSON.stringify(expectedData, null, 2)
      );
    });

    it('encrypts password when encryption is available', () => {
      (safeStorage.isEncryptionAvailable as any).mockReturnValue(true);
      (safeStorage.encryptString as any).mockReturnValue(Buffer.from('encrypted_secret'));

      const mockData = {
        sessions: [
          {
            config: {
              password: 'secret_password',
            },
          },
        ],
      };

      store.saveWorkspace(mockData);

      const expectedData = {
        sessions: [
          {
            config: {
              encryptedPassword: Buffer.from('encrypted_secret').toString('base64'),
            },
          },
        ],
      };
      expect(mocks.writeFileSync).toHaveBeenCalledWith(
        workspacePath,
        JSON.stringify(expectedData, null, 2)
      );
      expect(safeStorage.encryptString).toHaveBeenCalledWith('secret_password');
    });
  });
});
