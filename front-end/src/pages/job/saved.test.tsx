import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import SavedJobPage from './saved';

vi.setConfig({ testTimeout: 15000 });

describe('SavedJobPage', () => {
    it('renders the saved jobs list from the API', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/saved-jobs`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 10, pages: 1, total: 1 },
                        result: [
                            {
                                _id: 'sj1',
                                userId: 'u1',
                                jobId: {
                                    _id: 'j1',
                                    name: 'Backend Developer',
                                    company: { _id: 'c1', name: 'ACME', logo: 'acme.png' },
                                    location: 'HANOI',
                                    salary: 20000000,
                                },
                                createdAt: new Date().toISOString(),
                            },
                        ],
                    },
                }),
            ),
        );

        renderWithProviders(<SavedJobPage />);

        expect(await screen.findByText('Backend Developer')).toBeInTheDocument();
        expect(screen.getByText('Hà Nội')).toBeInTheDocument();
        expect(screen.getByText(/20,000,000/)).toBeInTheDocument();
    });

    it('shows a placeholder for a job that has been removed', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/saved-jobs`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 10, pages: 1, total: 1 },
                        result: [{ _id: 'sj1', userId: 'u1', jobId: null, createdAt: new Date().toISOString() }],
                    },
                }),
            ),
        );

        renderWithProviders(<SavedJobPage />);

        expect(await screen.findByText('Tin đã gỡ')).toBeInTheDocument();
    });

    it('shows an empty state when nothing has been saved', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/saved-jobs`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 10, pages: 0, total: 0 }, result: [] },
                }),
            ),
        );

        renderWithProviders(<SavedJobPage />);

        await waitFor(() => {
            expect(screen.getByText('Bạn chưa lưu việc làm nào')).toBeInTheDocument();
        });
    });
});
