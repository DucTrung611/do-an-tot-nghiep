import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import LayoutAdmin from './layout.admin';

function accountState(permissions: { method: string; apiPath: string; module: string }[]) {
    return {
        account: {
            isAuthenticated: true,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'admin',
            user: {
                _id: 'u1',
                email: 'admin@example.com',
                name: 'Admin',
                role: { _id: 'r1', name: 'SUPER_ADMIN' },
                permissions: permissions.map((p, i) => ({ _id: `p${i}`, name: 'perm', ...p })),
            },
        },
    } as any;
}

describe('LayoutAdmin', () => {
    it('shows the Dashboard link but hides modules the user cannot view', () => {
        // The menu is only (re)built once `permissions` is non-empty, so include one
        // unrelated permission to trigger that effect without granting any module access.
        renderWithProviders(<LayoutAdmin />, {
            preloadedState: accountState([{ method: 'GET', apiPath: '/api/v1/unrelated', module: 'OTHER' }]),
            route: '/admin',
        });

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Company')).not.toBeInTheDocument();
        expect(screen.queryByText('User')).not.toBeInTheDocument();
        expect(screen.queryByText('Job')).not.toBeInTheDocument();
    });

    it('shows the Company menu item when the user holds the companies view permission', () => {
        renderWithProviders(
            <LayoutAdmin />,
            {
                preloadedState: accountState([{ method: 'GET', apiPath: '/api/v1/companies', module: 'COMPANIES' }]),
                route: '/admin',
            },
        );

        expect(screen.getByText('Company')).toBeInTheDocument();
        expect(screen.queryByText('User')).not.toBeInTheDocument();
    });

    it('shows the welcome message with the logged-in user name', () => {
        renderWithProviders(<LayoutAdmin />, { preloadedState: accountState([]), route: '/admin' });

        const header = document.querySelector('.admin-header') as HTMLElement;
        expect(header.textContent).toContain('Xin chào');
        expect(header.textContent).toContain('Admin');
    });

    it('logs out, clears the account state, and calls callLogout on click', async () => {
        let logoutCalled = false;
        server.use(
            http.post(`${BASE_URL}/api/v1/auth/logout`, () => {
                logoutCalled = true;
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: 'ok' });
            }),
        );

        const { store } = renderWithProviders(<LayoutAdmin />, {
            preloadedState: accountState([]),
            route: '/admin',
        });

        await userEvent.click(screen.getByText(/Xin chào/));
        await userEvent.click(await screen.findByText('Đăng xuất'));

        await vi.waitFor(() => {
            expect(logoutCalled).toBe(true);
        });
        await vi.waitFor(() => {
            expect(store.getState().account.isAuthenticated).toBe(false);
        });
    });
});
