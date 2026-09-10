import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import Access from './access';

const permission = { method: 'GET', apiPath: '/api/v1/companies', module: 'COMPANIES' };

function withPermissions(permissions: typeof permission[]) {
    return {
        account: {
            isAuthenticated: true,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'a@b.com',
                name: 'Alice',
                role: { _id: 'r1', name: 'USER' },
                permissions: permissions.map((p, i) => ({ _id: `p${i}`, name: 'perm', ...p })),
            },
        },
    } as any;
}

describe('Access', () => {
    it('renders children by default while permissions have not loaded yet', () => {
        renderWithProviders(
            <Access permission={permission}>
                <div>secret content</div>
            </Access>,
            { preloadedState: withPermissions([]) },
        );

        expect(screen.getByText('secret content')).toBeInTheDocument();
    });

    it('renders children when the user holds the matching permission', () => {
        renderWithProviders(
            <Access permission={permission}>
                <div>secret content</div>
            </Access>,
            { preloadedState: withPermissions([permission]) },
        );

        expect(screen.getByText('secret content')).toBeInTheDocument();
    });

    it('shows a 403 result when the user lacks the permission', () => {
        renderWithProviders(
            <Access permission={permission}>
                <div>secret content</div>
            </Access>,
            { preloadedState: withPermissions([{ method: 'POST', apiPath: '/api/v1/jobs', module: 'JOBS' }]) },
        );

        expect(screen.queryByText('secret content')).not.toBeInTheDocument();
        expect(screen.getByText('Truy cập bị từ chối')).toBeInTheDocument();
    });

    it('renders nothing (no 403 result) when hideChildren is set and permission is missing', () => {
        renderWithProviders(
            <Access permission={permission} hideChildren>
                <div>secret content</div>
            </Access>,
            { preloadedState: withPermissions([{ method: 'POST', apiPath: '/api/v1/jobs', module: 'JOBS' }]) },
        );

        expect(screen.queryByText('secret content')).not.toBeInTheDocument();
        expect(screen.queryByText('Truy cập bị từ chối')).not.toBeInTheDocument();
    });
});
