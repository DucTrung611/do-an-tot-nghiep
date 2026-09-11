import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import AuthRoute from './index';

function accountState(overrides: {
    isAuthenticated: boolean;
    isLoading: boolean;
    roleName?: string;
}) {
    return {
        account: {
            isAuthenticated: overrides.isAuthenticated,
            isLoading: overrides.isLoading,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'a@b.com',
                name: 'Alice',
                role: { _id: 'r1', name: overrides.roleName ?? '' },
                permissions: [],
            },
        },
    } as any;
}

describe('AuthRoute', () => {
    it('shows a loading spinner while the account is still loading', () => {
        renderWithProviders(
            <AuthRoute>
                <div>secret page</div>
            </AuthRoute>,
            { preloadedState: accountState({ isAuthenticated: false, isLoading: true }) },
        );

        expect(screen.queryByText('secret page')).not.toBeInTheDocument();
    });

    it('redirects away from children when the user is not authenticated', () => {
        renderWithProviders(
            <AuthRoute>
                <div>secret page</div>
            </AuthRoute>,
            { preloadedState: accountState({ isAuthenticated: false, isLoading: false }) },
        );

        expect(screen.queryByText('secret page')).not.toBeInTheDocument();
    });

    // Regression guard: unlike ProtectedRoute (admin-only), AuthRoute must let a
    // NORMAL_USER (a candidate) through — this is the whole reason it exists.
    it('renders children for an authenticated NORMAL_USER', () => {
        renderWithProviders(
            <AuthRoute>
                <div>secret page</div>
            </AuthRoute>,
            { preloadedState: accountState({ isAuthenticated: true, isLoading: false, roleName: 'NORMAL_USER' }) },
        );

        expect(screen.getByText('secret page')).toBeInTheDocument();
    });

    it('renders children for any other authenticated role too', () => {
        renderWithProviders(
            <AuthRoute>
                <div>secret page</div>
            </AuthRoute>,
            { preloadedState: accountState({ isAuthenticated: true, isLoading: false, roleName: 'SUPER_ADMIN' }) },
        );

        expect(screen.getByText('secret page')).toBeInTheDocument();
    });
});
