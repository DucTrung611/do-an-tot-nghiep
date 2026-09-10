import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import JobCard from './job.card';

// Raise the per-test timeout above the 5s default: waits on real network mocks + antd
// re-renders, which can run slow under a loaded full-suite run.
vi.setConfig({ testTimeout: 15000 });

// Exercises the real callFetchJob -> real axios instance, only the network
// response is faked via MSW. Never mock config/api.ts directly.
describe('JobCard', () => {
    it('fetches and renders jobs from the API, including the resolved location name', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs`, ({ request }) => {
                const url = new URL(request.url);
                expect(url.searchParams.get('current')).toBe('1');
                expect(url.searchParams.get('pageSize')).toBe('6');
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 6, pages: 1, total: 1 },
                        result: [
                            {
                                _id: 'j1',
                                name: 'Backend Developer',
                                skills: ['NODEJS'],
                                company: { _id: 'c1', name: 'Acme Corp', logo: 'acme.png' },
                                location: 'HANOI',
                                salary: 20000000,
                                updatedAt: new Date().toISOString(),
                            },
                        ],
                    },
                });
            }),
        );

        renderWithProviders(<JobCard />);

        expect(await screen.findByText('Backend Developer')).toBeInTheDocument();
        expect(screen.getByText('Hà Nội')).toBeInTheDocument();
        expect(screen.getByText(/20,000,000/)).toBeInTheDocument();
    });

    it('shows an empty state when no jobs are returned', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 6, pages: 0, total: 0 }, result: [] },
                }),
            ),
        );

        renderWithProviders(<JobCard />);

        await waitFor(() => {
            expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
        });
    });

    it('appends the filterQuery to the request when provided', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs`, ({ request }) => {
                const url = new URL(request.url);
                expect(url.searchParams.get('skills')).toBe('/REACT/i');
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 6, pages: 0, total: 0 }, result: [] },
                });
            }),
        );

        renderWithProviders(<JobCard filterQuery="skills=/REACT/i" />);

        await waitFor(() => {
            expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
        });
    });
});
