import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import HomePage from './index';

// Raise the per-test timeout above the 5s default: waits on two real network mocks +
// antd re-renders, which can run slow under load.
vi.setConfig({ testTimeout: 15000 });

describe('HomePage', () => {
    it('fetches and renders both job and company listings', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 6, pages: 1, total: 1 },
                        result: [
                            {
                                _id: 'j1',
                                name: 'Frontend Developer',
                                skills: ['REACT.JS'],
                                location: 'HANOI',
                                salary: 20000000,
                                company: { _id: 'c1', name: 'VNG', logo: 'vng.png' },
                                updatedAt: new Date().toISOString(),
                            },
                        ],
                    },
                }),
            ),
            http.get(`${BASE_URL}/api/v1/companies`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 4, pages: 1, total: 1 },
                        result: [{ _id: 'c1', name: 'VNG', address: 'Hà Nội', logo: 'vng.png' }],
                    },
                }),
            ),
        );

        renderWithProviders(<HomePage />);

        expect(await screen.findByText('Frontend Developer')).toBeInTheDocument();
        expect(screen.getByText('VNG')).toBeInTheDocument();
        expect(screen.getByText('Tìm Kiếm Việc Làm')).toBeInTheDocument();
    });
});
