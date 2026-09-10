import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import ClientCompanyDetailPage from './detail';

// Raise the per-test timeout above the 5s default: waits on real network mocks +
// antd re-renders, which can run slow under load.
vi.setConfig({ testTimeout: 15000 });

describe('ClientCompanyDetailPage', () => {
    it('fetches the company by id from the query string and renders its details', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/companies/c1`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        _id: 'c1',
                        name: 'VNG Corporation',
                        address: 'Hà Nội',
                        logo: 'vng.png',
                        description: '<p>Great place to work</p>',
                    },
                }),
            ),
            http.get(`${BASE_URL}/api/v1/jobs`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 6, pages: 0, total: 0 }, result: [] },
                }),
            ),
        );

        renderWithProviders(<ClientCompanyDetailPage />, { route: '/company/vng?id=c1' });

        // "VNG Corporation" appears twice (header + sidebar), so just confirm both render.
        expect(await screen.findAllByText('VNG Corporation')).toHaveLength(2);
        expect(screen.getByText('Hà Nội')).toBeInTheDocument();
        expect(screen.getByText('Great place to work')).toBeInTheDocument();
    });

    it('renders nothing extra when there is no id in the query string', () => {
        renderWithProviders(<ClientCompanyDetailPage />, { route: '/company/vng' });

        expect(screen.queryByText('VNG Corporation')).not.toBeInTheDocument();
    });
});
