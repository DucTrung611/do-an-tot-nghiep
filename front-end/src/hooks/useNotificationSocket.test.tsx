import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { useNotificationSocket } from './useNotificationSocket';

// MSW v2 does not intercept Socket.IO — any test that renders a tree containing
// useNotificationSocket must mock this module, or a real connection attempt
// leaks out of the test.
vi.mock('@/config/socket', () => ({
    createNotificationSocket: vi.fn(),
}));

import { createNotificationSocket } from '@/config/socket';

function makeFakeSocket() {
    const handlers: Record<string, (payload: any) => void> = {};
    return {
        on: vi.fn((event: string, cb: (payload: any) => void) => { handlers[event] = cb; }),
        off: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        trigger: (event: string, payload: any) => handlers[event]?.(payload),
    };
}

function accountState(isAuthenticated: boolean) {
    return {
        account: {
            isAuthenticated,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: isAuthenticated
                ? { _id: 'u1', email: 'a@b.com', name: 'Alice', role: { _id: 'r1', name: 'NORMAL_USER' }, permissions: [] }
                : { _id: '', email: '', name: '', role: { _id: '', name: '' }, permissions: [] },
        },
    } as any;
}

function TestComponent() {
    useNotificationSocket();
    return null;
}

describe('useNotificationSocket', () => {
    beforeEach(() => {
        vi.mocked(createNotificationSocket).mockReset();
    });

    it('does not connect when the user is not authenticated', () => {
        const fakeSocket = makeFakeSocket();
        vi.mocked(createNotificationSocket).mockReturnValue(fakeSocket as any);

        renderWithProviders(<TestComponent />, { preloadedState: accountState(false) });

        expect(createNotificationSocket).not.toHaveBeenCalled();
    });

    it('connects and registers the notification:new listener once authenticated', () => {
        const fakeSocket = makeFakeSocket();
        vi.mocked(createNotificationSocket).mockReturnValue(fakeSocket as any);

        renderWithProviders(<TestComponent />, { preloadedState: accountState(true) });

        expect(createNotificationSocket).toHaveBeenCalledTimes(1);
        expect(fakeSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
        expect(fakeSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('pushes an incoming notification into the redux store', () => {
        const fakeSocket = makeFakeSocket();
        vi.mocked(createNotificationSocket).mockReturnValue(fakeSocket as any);

        const { store } = renderWithProviders(<TestComponent />, { preloadedState: accountState(true) });

        fakeSocket.trigger('notification:new', {
            _id: 'n1',
            userId: 'u1',
            type: 'NEW_JOB_MATCH',
            title: 'Việc mới',
            message: 'Có job hợp với bạn',
            isRead: false,
            createdAt: new Date().toISOString(),
        });

        expect(store.getState().notification.result[0]).toMatchObject({ _id: 'n1', title: 'Việc mới' });
        expect(store.getState().notification.unread).toBe(1);
    });

    it('disconnects the socket on unmount', () => {
        const fakeSocket = makeFakeSocket();
        vi.mocked(createNotificationSocket).mockReturnValue(fakeSocket as any);

        const { unmount } = renderWithProviders(<TestComponent />, { preloadedState: accountState(true) });

        unmount();

        expect(fakeSocket.off).toHaveBeenCalledWith('notification:new');
        expect(fakeSocket.disconnect).toHaveBeenCalledTimes(1);
    });
});
