import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const adminState = vi.hoisted(() => ({
  isAdmin: false,
  canPost: false,
}));

vi.mock('../hooks/useUserName', () => ({
  useUserName: () => ({
    userName: 'Tester',
    saveUserName: vi.fn(),
    hasName: true,
  }),
}));

vi.mock('../hooks/useAdmin', () => ({
  useAdmin: () => ({
    isAdmin: adminState.isAdmin,
    canPost: adminState.canPost,
    authorizationError: null,
    loading: false,
    loginWithGoogle: vi.fn(),
  }),
}));

vi.mock('../hooks/useDays', () => ({
  useDays: () => ({
    days: [],
    loading: false,
    createDay: vi.fn(),
    updateDay: vi.fn(),
    deleteDay: vi.fn(),
    ensureDay: vi.fn(),
  }),
}));

vi.mock('../hooks/useJournalTimelineData', () => ({
  useJournalTimelineData: () => ({
    dayEntries: [],
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useMaintenance', () => ({
  useMaintenance: () => ({
    orphanedMedia: [],
    isScanning: false,
    isCleaning: false,
    lastCleanCount: null,
    lastFailCount: null,
    scanError: null,
    scanOrphanedMedia: vi.fn(),
    cleanupOrphanedMedia: vi.fn(),
  }),
}));

vi.mock('../components/Header', () => ({
  default: ({ onToggleAdminPanel }: { onToggleAdminPanel?: () => void }) => (
    <button type="button" data-testid="toggle-admin-panel" onClick={onToggleAdminPanel}>
      Toggle admin panel
    </button>
  ),
}));

vi.mock('../components/UploadPanel', () => ({
  default: () => <div data-testid="mock-upload-panel">Upload panel</div>,
}));

vi.mock('../components/AdminLogin', () => ({
  default: () => null,
}));

vi.mock('../components/DayEditor', () => ({
  default: () => null,
}));

vi.mock('../components/DaySection', () => ({
  default: () => null,
}));

vi.mock('../components/SakuraBackground', () => ({
  default: () => null,
}));

vi.mock('../components/BottomNav', () => ({
  default: () => null,
}));

vi.mock('../components/MapTab', () => ({
  default: () => null,
}));

vi.mock('../components/Lightbox', () => ({
  default: () => null,
}));

vi.mock('../components/NamePrompt', () => ({
  default: () => null,
}));

vi.mock('../components/StampBook', () => ({
  default: () => null,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useScroll: () => ({ scrollYProgress: 0, scrollY: 0 }),
  useSpring: () => 0,
  useTransform: () => 0,
}));

import App from '../App';

beforeEach(() => {
  adminState.isAdmin = false;
  adminState.canPost = false;
});

afterEach(() => {
  cleanup();
});

describe('App admin upload access', () => {
  it('does not reveal upload tools for non-admin users', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('toggle-admin-panel'));

    expect(screen.queryByTestId('mock-upload-panel')).toBeNull();
  });

  it('reveals upload tools for admins', async () => {
    adminState.isAdmin = true;
    adminState.canPost = true;

    render(<App />);

    fireEvent.click(screen.getByTestId('toggle-admin-panel'));

    expect((await screen.findByTestId('mock-upload-panel')).textContent).toContain('Upload panel');
  });
});
