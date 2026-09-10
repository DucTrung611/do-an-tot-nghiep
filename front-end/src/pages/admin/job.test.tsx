import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import JobPage from './job';

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

const job = {
    _id: 'j1',
    name: 'Backend Developer',
    skills: ['Node.js'],
    location: 'Hanoi',
    salary: 15000000,
    quantity: 2,
    level: 'JUNIOR',
    description: 'desc',
    startDate: '2024-01-01',
    endDate: '2024-02-01',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

function mockJobList() {
    server.use(
        http.get(`${BASE_URL}/api/v1/jobs`, () =>
            HttpResponse.json({
                statusCode: 200,
                message: 'ok',
                data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [job] },
            }),
        ),
    );
}

describe('JobPage', () => {
    it('fetches and renders the job list with formatted salary and active tag', async () => {
        mockJobList();
        renderWithProviders(<JobPage />, { preloadedState: accountState([]) });

        expect(await screen.findByText('Backend Developer')).toBeInTheDocument();
        // salary is grouped with thousands separators and a currency suffix
        expect(screen.getByText('15,000,000 đ')).toBeInTheDocument();
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    it('shows a 403 result when GET_PAGINATE permission is missing', async () => {
        renderWithProviders(<JobPage />, {
            preloadedState: accountState([{ method: 'POST', apiPath: '/api/v1/companies', module: 'COMPANIES' }]),
        });

        expect(await screen.findByText('Truy cập bị từ chối')).toBeInTheDocument();
        expect(screen.queryByText('Danh sách Jobs')).not.toBeInTheDocument();
    });

    it('deletes a job via the row action and reloads the table', async () => {
        mockJobList();
        let deleteCalled = false;
        server.use(
            http.delete(`${BASE_URL}/api/v1/jobs/:id`, () => {
                deleteCalled = true;
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: job });
            }),
        );

        const user = userEvent.setup();
        renderWithProviders(<JobPage />, { preloadedState: accountState([]) });

        await screen.findByText('Backend Developer');

        const deleteIcon = screen.getByRole('img', { name: 'delete' });
        await user.click(deleteIcon);
        const confirmBtn = await screen.findByText('Xác nhận');
        await user.click(confirmBtn);

        await waitFor(() => expect(deleteCalled).toBe(true));
    });
});
