import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import LayoutApp from './layout.app';

function accountState(overrides: { isRefreshToken: boolean; errorRefreshToken?: string }) {
    return {
        account: {
            isAuthenticated: true,
            isLoading: false,
            isRefreshToken: overrides.isRefreshToken,
            errorRefreshToken: overrides.errorRefreshToken ?? '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'a@b.com',
                name: 'Alice',
                role: { _id: 'r1', name: 'SUPER_ADMIN' },
                permissions: [],
            },
        },
    } as any;
}

describe('LayoutApp', () => {
    it('renders its children when there is no refresh-token error', () => {
        renderWithProviders(
            <LayoutApp>
                <div>app content</div>
            </LayoutApp>,
            { preloadedState: accountState({ isRefreshToken: false }) },
        );

        expect(screen.getByText('app content')).toBeInTheDocument();
    });

    it('clears the access token and resets the refresh-token flag when a refresh error occurs', async () => {
        localStorage.setItem('access_token', 'stale-token');

        const { store } = renderWithProviders(
            <LayoutApp>
                <div>app content</div>
            </LayoutApp>,
            { preloadedState: accountState({ isRefreshToken: true, errorRefreshToken: 'Session expired' }) },
        );

        await vi.waitFor(() => {
            expect(store.getState().account.isRefreshToken).toBe(false);
        });
        expect(localStorage.getItem('access_token')).toBeNull();
    });
});
