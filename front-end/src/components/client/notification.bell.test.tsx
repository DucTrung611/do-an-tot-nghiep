import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import NotificationBell from './notification.bell';

vi.setConfig({ testTimeout: 15000 });

function accountState(isAuthenticated: boolean) {
    return {
        account: {
            isAuthenticated,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'a@b.com',
                name: 'Alice',
                role: { _id: 'r1', name: 'NORMAL_USER' },
                permissions: [],
            },
        },
    } as any;
}

const notif = {
    _id: 'n1',
    userId: 'u1',
    type: 'RESUME_STATUS',
    title: 'Cập nhật hồ sơ',
    message: 'Hồ sơ của bạn đã được duyệt',
    link: '/applied-jobs',
    isRead: false,
    createdAt: new Date().toISOString(),
};

describe('NotificationBell', () => {
    it('renders nothing when the user is not authenticated', () => {
        const { container } = renderWithProviders(<NotificationBell />, {
            preloadedState: accountState(false),
        });

        expect(container).toBeEmptyDOMElement();
    });

    it('shows the unread count fetched on mount', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/notifications/unread-count`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: 3 }),
            ),
        );

        renderWithProviders(<NotificationBell />, { preloadedState: accountState(true) });

        expect(await screen.findByText('3')).toBeInTheDocument();
    });

    it('fetches and lists notifications only once the dropdown is opened', async () => {
        let listRequested = false;
        server.use(
            http.get(`${BASE_URL}/api/v1/notifications/unread-count`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: 1 }),
            ),
            http.get(`${BASE_URL}/api/v1/notifications`, () => {
                listRequested = true;
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 8, pages: 1, total: 1 }, result: [notif] },
                });
            }),
        );

        renderWithProviders(<NotificationBell />, { preloadedState: accountState(true) });
        expect(listRequested).toBe(false);

        const user = userEvent.setup();
        await user.click(screen.getByLabelText('bell'));

        expect(await screen.findByText('Cập nhật hồ sơ')).toBeInTheDocument();
        expect(listRequested).toBe(true);
    });

    it('marks a notification read and decrements the badge when clicked', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/notifications/unread-count`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: 1 }),
            ),
            http.get(`${BASE_URL}/api/v1/notifications`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 8, pages: 1, total: 1 }, result: [notif] },
                }),
            ),
            http.patch(`${BASE_URL}/api/v1/notifications/n1/read`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: {} }),
            ),
        );

        const { store } = renderWithProviders(<NotificationBell />, { preloadedState: accountState(true) });

        const user = userEvent.setup();
        await user.click(screen.getByLabelText('bell'));
        await user.click(await screen.findByText('Cập nhật hồ sơ'));

        await waitFor(() => {
            expect(store.getState().notification.unread).toBe(0);
        });
    });
});
