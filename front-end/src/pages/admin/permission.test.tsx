import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import PermissionPage from './permission';

// Raise the per-test timeout above the 5s default: these wait on real network mocks +
// antd table/drawer re-renders, which can run slow under load.
vi.setConfig({ testTimeout: 15000 });

function accountState(permissions: { method: string; apiPath: string; module: string }[]) {
    return {
        account: {
            isAuthenticated: true,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'admin@b.com',
                name: 'Admin',
                role: { _id: 'r1', name: 'SUPER_ADMIN' },
                permissions: permissions.map((p, i) => ({ _id: `p${i}`, name: 'perm', ...p })),
            },
        },
    } as any;
}

const permission = {
    _id: 'p1',
    name: 'Get companies',
    apiPath: '/api/v1/companies',
    method: 'GET',
    module: 'COMPANIES',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

function mockPermissionList() {
    server.use(
        http.get(`${BASE_URL}/api/v1/permissions`, () =>
            HttpResponse.json({
                statusCode: 200,
                message: 'ok',
                data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [permission] },
            }),
        ),
    );
}

describe('PermissionPage', () => {
    it('fetches and renders the permission list', async () => {
        mockPermissionList();
        renderWithProviders(<PermissionPage />, { preloadedState: accountState([]) });

        expect(await screen.findByText('Get companies')).toBeInTheDocument();
        expect(screen.getByText('GET')).toBeInTheDocument();
    });

    it('shows a 403 result when GET_PAGINATE permission is missing', async () => {
        renderWithProviders(<PermissionPage />, {
            preloadedState: accountState([{ method: 'POST', apiPath: '/api/v1/jobs', module: 'JOBS' }]),
        });

        expect(await screen.findByText('Truy cập bị từ chối')).toBeInTheDocument();
    });

    it('opens the view-detail drawer when the permission id is clicked', async () => {
        mockPermissionList();
        const user = userEvent.setup();
        renderWithProviders(<PermissionPage />, { preloadedState: accountState([]) });

        const idLink = await screen.findByText('p1');
        await user.click(idLink);

        expect(await screen.findByText('Thông Tin Permission')).toBeInTheDocument();
        const drawer = screen.getByRole('dialog');
        expect(within(drawer).getByText('/api/v1/companies')).toBeInTheDocument();
    });

    it('deletes a permission via the row action and reloads the table', async () => {
        mockPermissionList();
        let deleteCalled = false;
        server.use(
            http.delete(`${BASE_URL}/api/v1/permissions/:id`, () => {
                deleteCalled = true;
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: permission });
            }),
        );

        const user = userEvent.setup();
        renderWithProviders(<PermissionPage />, { preloadedState: accountState([]) });

        await screen.findByText('Get companies');

        const deleteIcon = screen.getByRole('img', { name: 'delete' });
        await user.click(deleteIcon);
        const confirmBtn = await screen.findByText('Xác nhận');
        await user.click(confirmBtn);

        await waitFor(() => expect(deleteCalled).toBe(true));
    });
});
