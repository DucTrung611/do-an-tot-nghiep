import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import ProtectedRoute from './index';

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

describe('ProtectedRoute', () => {
    it('shows a loading spinner while the account is still loading', () => {
        const { container } = renderWithProviders(
            <ProtectedRoute>
                <div>secret page</div>
            </ProtectedRoute>,
            { preloadedState: accountState({ isAuthenticated: false, isLoading: true }) },
        );

        expect(container.querySelector('span')).not.toBeNull();
        expect(screen.queryByText('secret page')).not.toBeInTheDocument();
    });

    it('redirects away from children when the user is not authenticated', () => {
        renderWithProviders(
            <ProtectedRoute>
                <div>secret page</div>
            </ProtectedRoute>,
            { preloadedState: accountState({ isAuthenticated: false, isLoading: false }) },
        );

        expect(screen.queryByText('secret page')).not.toBeInTheDocument();
    });

    it('blocks a NORMAL_USER with a 403 result', () => {
        renderWithProviders(
            <ProtectedRoute>
                <div>secret page</div>
            </ProtectedRoute>,
            { preloadedState: accountState({ isAuthenticated: true, isLoading: false, roleName: 'NORMAL_USER' }) },
        );

        expect(screen.queryByText('secret page')).not.toBeInTheDocument();
        expect(screen.getByText('403')).toBeInTheDocument();
    });

    it('renders children for an authenticated non-NORMAL_USER role', () => {
        renderWithProviders(
            <ProtectedRoute>
                <div>secret page</div>
            </ProtectedRoute>,
            { preloadedState: accountState({ isAuthenticated: true, isLoading: false, roleName: 'SUPER_ADMIN' }) },
        );

        expect(screen.getByText('secret page')).toBeInTheDocument();
    });
});
