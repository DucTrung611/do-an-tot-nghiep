import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import CompanyPage from './company';

// Raise the per-test timeout above the 5s default: these wait on real network mocks +
// antd table/modal re-renders, which can run slow under load.
vi.setConfig({ testTimeout: 15000 });

// Exercises the real fetchCompany thunk -> real axios instance -> real callFetchCompany
// with only the network response faked via MSW (see accountSlide.test.ts for the pattern).
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

const company = {
    _id: 'c1',
    name: 'Acme Corp',
    address: 'Hanoi',
    logo: 'logo.png',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

function mockCompanyList() {
    server.use(
        http.get(`${BASE_URL}/api/v1/companies`, () =>
            HttpResponse.json({
                statusCode: 200,
                message: 'ok',
                data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [company] },
            }),
        ),
    );
}

describe('CompanyPage', () => {
    it('fetches and renders the company list', async () => {
        mockCompanyList();
        renderWithProviders(<CompanyPage />, { preloadedState: accountState([]) });

        expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('Hanoi')).toBeInTheDocument();
    });

    it('shows a 403 result and hides the table when GET_PAGINATE permission is missing', async () => {
        renderWithProviders(<CompanyPage />, {
            preloadedState: accountState([{ method: 'POST', apiPath: '/api/v1/jobs', module: 'JOBS' }]),
        });

        expect(await screen.findByText('Truy cập bị từ chối')).toBeInTheDocument();
        expect(screen.queryByText('Danh sách Công Ty')).not.toBeInTheDocument();
    });

    it('deletes a company via the row action and reloads the table', async () => {
        mockCompanyList();
        let deleteCalled = false;
        server.use(
            http.delete(`${BASE_URL}/api/v1/companies/:id`, () => {
                deleteCalled = true;
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: company });
            }),
        );

        const user = userEvent.setup();
        renderWithProviders(<CompanyPage />, { preloadedState: accountState([]) });

        await screen.findByText('Acme Corp');

        const deleteIcon = screen.getByRole('img', { name: 'delete' });
        await user.click(deleteIcon);
        const confirmBtn = await screen.findByText('Xác nhận');
        await user.click(confirmBtn);

        await waitFor(() => expect(deleteCalled).toBe(true));
    });
});
