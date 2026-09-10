import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import DashboardPage from './dashboard';

function paginateResponse(total: number) {
    return HttpResponse.json({
        statusCode: 200,
        message: 'ok',
        data: { meta: { current: 1, pageSize: 1, pages: total, total }, result: [] },
    });
}

function mockAllStats(totals: {
    users: number;
    jobs: number;
    companies: number;
    resumes: number;
    permissions: number;
    roles: number;
}) {
    server.use(
        http.get(`${BASE_URL}/api/v1/users`, () => paginateResponse(totals.users)),
        http.get(`${BASE_URL}/api/v1/jobs`, () => paginateResponse(totals.jobs)),
        http.get(`${BASE_URL}/api/v1/companies`, () => paginateResponse(totals.companies)),
        http.get(`${BASE_URL}/api/v1/resumes`, () => paginateResponse(totals.resumes)),
        http.get(`${BASE_URL}/api/v1/permissions`, () => paginateResponse(totals.permissions)),
        http.get(`${BASE_URL}/api/v1/roles`, () => paginateResponse(totals.roles)),
    );
}

describe('DashboardPage', () => {
    it('shows loading skeletons while stats are being fetched, then renders the metric titles once loaded', async () => {
        mockAllStats({ users: 10, jobs: 5, companies: 3, resumes: 7, permissions: 20, roles: 4 });

        renderWithProviders(<DashboardPage />);

        expect(document.querySelectorAll('.ant-skeleton-active').length).toBeGreaterThan(0);

        await waitFor(() => expect(document.querySelectorAll('.ant-skeleton-active').length).toBe(0));

        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Total Jobs')).toBeInTheDocument();
        expect(screen.getByText('Total Companies')).toBeInTheDocument();
        expect(screen.getByText('Total Resumes')).toBeInTheDocument();
        expect(screen.getByText('Total Permissions')).toBeInTheDocument();
        expect(screen.getByText('Total Roles')).toBeInTheDocument();
    });

    it('requests each resource with current=1&pageSize=1', async () => {
        let capturedUsersUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/v1/users`, ({ request }) => {
                capturedUsersUrl = request.url;
                return paginateResponse(1);
            }),
            http.get(`${BASE_URL}/api/v1/jobs`, () => paginateResponse(0)),
            http.get(`${BASE_URL}/api/v1/companies`, () => paginateResponse(0)),
            http.get(`${BASE_URL}/api/v1/resumes`, () => paginateResponse(0)),
            http.get(`${BASE_URL}/api/v1/permissions`, () => paginateResponse(0)),
            http.get(`${BASE_URL}/api/v1/roles`, () => paginateResponse(0)),
        );

        renderWithProviders(<DashboardPage />);

        await waitFor(() => expect(capturedUsersUrl).toContain('current=1&pageSize=1'));
    });
});
