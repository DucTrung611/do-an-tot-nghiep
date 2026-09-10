import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import ClientJobPage from './index';

// Raise the per-test timeout above the 5s default: these drive an antd Select dropdown
// via real userEvent interactions and wait on real network mocks, which can run slow
// under load.
vi.setConfig({ testTimeout: 15000 });

function jobsResponse(names: string[]) {
    return HttpResponse.json({
        statusCode: 200,
        message: 'ok',
        data: {
            meta: { current: 1, pageSize: 6, pages: 1, total: names.length },
            result: names.map((name, i) => ({
                _id: `j${i}`,
                name,
                skills: ['REACT.JS'],
                location: 'HANOI',
                salary: 15000000,
                company: { _id: 'c1', name: 'VNG', logo: 'vng.png' },
                updatedAt: new Date().toISOString(),
            })),
        },
    });
}

describe('ClientJobPage', () => {
    it('fetches and renders the job list', async () => {
        server.use(http.get(`${BASE_URL}/api/v1/jobs`, () => jobsResponse(['Frontend Developer', 'Backend Developer'])));

        renderWithProviders(<ClientJobPage />);

        expect(await screen.findByText('Frontend Developer')).toBeInTheDocument();
        expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    });

    it('re-fetches with a skills filter when searching', async () => {
        const user = userEvent.setup();
        let lastQuery = '';
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs`, ({ request }) => {
                lastQuery = new URL(request.url).search;
                return jobsResponse(['Frontend Developer']);
            }),
        );

        renderWithProviders(<ClientJobPage />);
        await screen.findByText('Frontend Developer');

        await user.click(screen.getAllByRole('combobox')[0]);
        await user.click(await screen.findByText('React.JS'));
        await user.click(screen.getByRole('button', { name: 'Search' }));

        await waitFor(() => {
            expect(lastQuery).toContain('skills=');
        });
    });

    it('shows an empty state when there are no jobs', async () => {
        server.use(http.get(`${BASE_URL}/api/v1/jobs`, () => jobsResponse([])));

        renderWithProviders(<ClientJobPage />);

        expect(await screen.findByText('Không có dữ liệu')).toBeInTheDocument();
    });
});
