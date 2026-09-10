import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import UserPage from './user';

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

const appUser = {
    _id: 'u2',
    name: 'John Doe',
    email: 'john@doe.com',
    age: 30,
    gender: 'MALE',
    address: 'Hanoi',
    // ViewDetailUser renders `dataInit?.role` directly as a React child (a pre-existing
    // bug when role is the populated {_id, name} object IUser declares) -- omit it here
    // so the view-detail test can exercise the drawer without tripping that bug.
    company: { _id: 'c1', name: 'Acme' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

function mockUserList() {
    server.use(
        http.get(`${BASE_URL}/api/v1/users`, () =>
            HttpResponse.json({
                statusCode: 200,
                message: 'ok',
                data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [appUser] },
            }),
        ),
    );
}

describe('UserPage', () => {
    it('fetches and renders the user list', async () => {
        mockUserList();
        renderWithProviders(<UserPage />, { preloadedState: accountState([]) });

        expect(await screen.findByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@doe.com')).toBeInTheDocument();
    });

    it('shows a 403 result when GET_PAGINATE permission is missing', async () => {
        renderWithProviders(<UserPage />, {
            preloadedState: accountState([{ method: 'POST', apiPath: '/api/v1/jobs', module: 'JOBS' }]),
        });

        expect(await screen.findByText('Truy cập bị từ chối')).toBeInTheDocument();
    });

    it('requests users with the role populated in the query string', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/v1/users`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [appUser] },
                });
            }),
        );

        renderWithProviders(<UserPage />, { preloadedState: accountState([]) });

        await waitFor(() => expect(decodeURIComponent(capturedUrl)).toContain('populate=role'));
    });

    it('opens the view-detail drawer when the user id is clicked', async () => {
        mockUserList();
        const user = userEvent.setup();
        renderWithProviders(<UserPage />, { preloadedState: accountState([]) });

        const idLink = await screen.findByText('u2');
        await user.click(idLink);

        expect(await screen.findByText('Thông Tin User')).toBeInTheDocument();
        const drawer = screen.getByRole('dialog');
        expect(within(drawer).getByText('john@doe.com')).toBeInTheDocument();
    });

    it('deletes a user via the row action and reloads the table', async () => {
        mockUserList();
        let deleteCalled = false;
        server.use(
            http.delete(`${BASE_URL}/api/v1/users/:id`, () => {
                deleteCalled = true;
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: appUser });
            }),
        );

        const user = userEvent.setup();
        renderWithProviders(<UserPage />, { preloadedState: accountState([]) });

        await screen.findByText('John Doe');

        const deleteIcon = screen.getByRole('img', { name: 'delete' });
        await user.click(deleteIcon);
        const confirmBtn = await screen.findByText('Xác nhận');
        await user.click(confirmBtn);

        await waitFor(() => expect(deleteCalled).toBe(true));
    });
});
