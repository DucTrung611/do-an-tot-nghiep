import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import ClientJobDetailPage from './detail';

// Raise the per-test timeout above the 5s default: waits on real network mocks +
// antd re-renders, which can run slow under load.
vi.setConfig({ testTimeout: 15000 });

const job = {
    _id: 'j1',
    name: 'Frontend Developer',
    skills: ['REACT.JS', 'VUE.JS'],
    location: 'HANOI',
    salary: 20000000,
    quantity: 2,
    level: 'JUNIOR',
    description: '<p>Great job description</p>',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    isActive: true,
    updatedAt: new Date().toISOString(),
    company: { _id: 'c1', name: 'VNG', logo: 'vng.png' },
};

describe('ClientJobDetailPage', () => {
    it('fetches the job by id from the query string and renders its details', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs/j1`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: job }),
            ),
        );

        renderWithProviders(<ClientJobDetailPage />, { route: '/job/frontend-developer?id=j1' });

        expect(await screen.findByText('Frontend Developer')).toBeInTheDocument();
        expect(screen.getByText('REACT.JS')).toBeInTheDocument();
        expect(screen.getByText('VNG')).toBeInTheDocument();
        expect(screen.getByText('Great job description')).toBeInTheDocument();
        expect(screen.getByText('20,000,000 đ')).toBeInTheDocument();
    });

    it('renders nothing extra when the job cannot be found', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs/missing`, () =>
                HttpResponse.json({ statusCode: 400, message: 'Not found' }, { status: 400 }),
            ),
        );

        renderWithProviders(<ClientJobDetailPage />, { route: '/job/x?id=missing' });

        expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
    });

    it('opens the apply modal and prompts login when the user is not authenticated', async () => {
        const user = userEvent.setup();
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs/j1`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: job }),
            ),
        );

        renderWithProviders(<ClientJobDetailPage />, { route: '/job/frontend-developer?id=j1' });
        await screen.findByText('Frontend Developer');

        await user.click(screen.getByRole('button', { name: 'Apply Now' }));

        expect(
            await screen.findByText(/Bạn chưa đăng nhập hệ thống/),
        ).toBeInTheDocument();
    });
});
