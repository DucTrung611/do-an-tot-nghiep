import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import RolePage from './role';

// Raise the per-test timeout above the 5s default: these wait on real network mocks +
// antd table/modal re-renders, which can run slow under load.
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

const role = {
    _id: 'ro1',
    name: 'Admin Role',
    description: 'full access',
    isActive: true,
    permissions: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

function mockRoleList() {
    server.use(
        http.get(`${BASE_URL}/api/v1/roles`, () =>
            HttpResponse.json({
                statusCode: 200,
                message: 'ok',
                data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [role] },
            }),
        ),
    );
}

// RolePage always renders ModalRole (regardless of whether the modal is open), and
// ModalRole fetches the full permission list on mount to build its permission tree --
// so every render of RolePage needs this endpoint mocked too, or MSW's
// onUnhandledRequest: 'error' setup will fail the test.
function mockPermissionListForModal() {
    server.use(
        http.get(`${BASE_URL}/api/v1/permissions`, () =>
            HttpResponse.json({ statusCode: 200, message: 'ok', data: { result: [] } }),
        ),
    );
}

describe('RolePage', () => {
    it('fetches and renders the role list with an active/inactive tag', async () => {
        mockRoleList();
        mockPermissionListForModal();
        renderWithProviders(<RolePage />, { preloadedState: accountState([]) });

        expect(await screen.findByText('Admin Role')).toBeInTheDocument();
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    it('shows a 403 result when GET_PAGINATE permission is missing', async () => {
        mockPermissionListForModal();
        renderWithProviders(<RolePage />, {
            preloadedState: accountState([{ method: 'POST', apiPath: '/api/v1/jobs', module: 'JOBS' }]),
        });

        expect(await screen.findByText('Truy cập bị từ chối')).toBeInTheDocument();
    });

    it('loads the role by id and opens the update modal when the edit icon is clicked', async () => {
        mockRoleList();
        mockPermissionListForModal();
        let roleByIdCalled = false;
        server.use(
            http.get(`${BASE_URL}/api/v1/roles/:id`, () => {
                roleByIdCalled = true;
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: role });
            }),
        );

        const user = userEvent.setup();
        renderWithProviders(<RolePage />, { preloadedState: accountState([]) });

        await screen.findByText('Admin Role');

        const editIcon = screen.getByRole('img', { name: 'edit' });
        await user.click(editIcon);

        await waitFor(() => expect(roleByIdCalled).toBe(true));
        expect(await screen.findByText('Cập nhật Role')).toBeInTheDocument();
    });

    it('deletes a role via the row action and reloads the table', async () => {
        mockRoleList();
        mockPermissionListForModal();
        let deleteCalled = false;
        server.use(
            http.delete(`${BASE_URL}/api/v1/roles/:id`, () => {
                deleteCalled = true;
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: role });
            }),
        );

        const user = userEvent.setup();
        renderWithProviders(<RolePage />, { preloadedState: accountState([]) });

        await screen.findByText('Admin Role');

        const deleteIcon = screen.getByRole('img', { name: 'delete' });
        await user.click(deleteIcon);
        const confirmBtn = await screen.findByText('Xác nhận');
        await user.click(confirmBtn);

        await waitFor(() => expect(deleteCalled).toBe(true));
    });
});
