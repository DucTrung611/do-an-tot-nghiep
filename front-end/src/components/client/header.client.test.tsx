import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import Header from './header.client';

// Raise the per-test timeout above the 5s default: antd Dropdown + userEvent
// interactions can run slow under a loaded full-suite run.
vi.setConfig({ testTimeout: 15000 });

function accountState(overrides: { isAuthenticated: boolean; roleName?: string; name?: string }) {
    return {
        account: {
            isAuthenticated: overrides.isAuthenticated,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'a@b.com',
                name: overrides.name ?? 'Alice',
                role: { _id: 'r1', name: overrides.roleName ?? 'NORMAL_USER' },
                permissions: [],
            },
        },
    } as any;
}

describe('Header', () => {
    it('shows a login link when the user is not authenticated', () => {
        renderWithProviders(<Header />, { preloadedState: accountState({ isAuthenticated: false }) });

        expect(screen.getByText('Đăng Nhập')).toBeInTheDocument();
    });

    it('shows a welcome message with the user name when authenticated', () => {
        renderWithProviders(<Header />, {
            preloadedState: accountState({ isAuthenticated: true, name: 'Alice' }),
        });

        expect(screen.getByText('Xin chào Alice')).toBeInTheDocument();
        expect(screen.queryByText('Đăng Nhập')).not.toBeInTheDocument();
    });

    it('logs the user out and navigates home when "Đăng xuất" is clicked', async () => {
        server.use(
            http.post(`${BASE_URL}/api/v1/auth/logout`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: 'ok' }),
            ),
        );

        const { store } = renderWithProviders(<Header />, {
            preloadedState: accountState({ isAuthenticated: true, name: 'Alice' }),
        });

        const user = userEvent.setup();
        await user.click(screen.getByText('Xin chào Alice'));
        const logoutItem = await screen.findByText('Đăng xuất');
        await user.click(logoutItem);

        await waitFor(() => {
            expect(store.getState().account.isAuthenticated).toBe(false);
        });
    });
});
