import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import ResumePage from './resume';

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

const resume = {
    _id: 'r1',
    email: 'john@example.com',
    userId: 'u1',
    url: 'cv.pdf',
    status: 'PENDING',
    companyId: { _id: 'c1', name: 'Company A', logo: 'logo.png' },
    jobId: { _id: 'j1', name: 'Job A' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

function mockResumeList() {
    server.use(
        http.get(`${BASE_URL}/api/v1/resumes`, () =>
            HttpResponse.json({
                statusCode: 200,
                message: 'ok',
                data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [resume] },
            }),
        ),
    );
}

describe('ResumePage', () => {
    it('fetches and renders the resume list with populated job/company names', async () => {
        mockResumeList();
        renderWithProviders(<ResumePage />, { preloadedState: accountState([]) });

        expect(await screen.findByText('Job A')).toBeInTheDocument();
        expect(screen.getByText('Company A')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('shows a 403 result when GET_PAGINATE permission is missing', async () => {
        renderWithProviders(<ResumePage />, {
            preloadedState: accountState([{ method: 'POST', apiPath: '/api/v1/jobs', module: 'JOBS' }]),
        });

        expect(await screen.findByText('Truy cập bị từ chối')).toBeInTheDocument();
    });

    it('requests resumes with populated job/company fields in the query string', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/v1/resumes`, ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [resume] },
                });
            }),
        );

        renderWithProviders(<ResumePage />, { preloadedState: accountState([]) });

        await waitFor(() => expect(decodeURIComponent(capturedUrl)).toContain('populate=companyId,jobId'));
    });

    it('opens the view-detail drawer and changes the resume status', async () => {
        mockResumeList();
        let patchBody: any = null;
        server.use(
            http.patch(`${BASE_URL}/api/v1/resumes/:id`, async ({ request }) => {
                patchBody = await request.json();
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { ...resume, status: 'APPROVED' },
                });
            }),
        );

        const user = userEvent.setup();
        renderWithProviders(<ResumePage />, { preloadedState: accountState([]) });

        const idLink = await screen.findByText('r1');
        await user.click(idLink);

        const changeStatusBtn = await screen.findByRole('button', { name: 'Change Status' });
        await user.click(changeStatusBtn);

        await waitFor(() => expect(patchBody).toEqual({ status: 'PENDING' }));
    });
});
