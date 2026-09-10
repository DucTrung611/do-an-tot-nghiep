import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import CompanyCard from './company.card';

// Raise the per-test timeout above the 5s default: waits on real network mocks + antd
// re-renders, which can run slow under a loaded full-suite run.
vi.setConfig({ testTimeout: 15000 });

// Exercises the real callFetchCompany -> real axios instance, only the network
// response is faked via MSW. Never mock config/api.ts directly.
describe('CompanyCard', () => {
    it('fetches and renders companies from the API', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/companies`, ({ request }) => {
                const url = new URL(request.url);
                expect(url.searchParams.get('current')).toBe('1');
                expect(url.searchParams.get('pageSize')).toBe('4');
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 4, pages: 1, total: 1 },
                        result: [{ _id: 'c1', name: 'Acme Corp', logo: 'acme.png' }],
                    },
                });
            }),
        );

        renderWithProviders(<CompanyCard />);

        expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    });

    it('shows an empty state when no companies are returned', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/companies`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 4, pages: 0, total: 0 },
                        result: [],
                    },
                }),
            ),
        );

        renderWithProviders(<CompanyCard />);

        await waitFor(() => {
            expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
        });
    });

    it('shows the "Xem tất cả" link when pagination is hidden', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/companies`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 4, pages: 0, total: 0 }, result: [] },
                }),
            ),
        );

        renderWithProviders(<CompanyCard showPagination={false} />);

        expect(await screen.findByText('Xem tất cả')).toBeInTheDocument();
    });

    it('does not show the "Xem tất cả" link when pagination is shown', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/companies`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 4, pages: 0, total: 0 }, result: [] },
                }),
            ),
        );

        renderWithProviders(<CompanyCard showPagination />);

        await waitFor(() => {
            expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
        });
        expect(screen.queryByText('Xem tất cả')).not.toBeInTheDocument();
    });
});
