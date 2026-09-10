import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import ViewUpsertJob from './upsert.job';

const jobData = {
    _id: 'j1',
    name: 'Backend Developer',
    skills: ['NODEJS'],
    company: { _id: 'c1', name: 'Acme Corp', logo: 'a.png' },
    location: 'HANOI',
    salary: 1000,
    quantity: 2,
    level: 'MIDDLE',
    description: 'desc',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-02-01T00:00:00.000Z',
    isActive: true,
};

describe('ViewUpsertJob', () => {
    it('renders the breadcrumb and the create submit label when there is no job id in the url', () => {
        renderWithProviders(<ViewUpsertJob />, { route: '/admin/job/upsert' });

        expect(screen.getByText('Quản Lý Job')).toBeInTheDocument();
        expect(screen.getByText('Thêm/Sửa Job')).toBeInTheDocument();
        expect(screen.getByText('Tạo mới Job')).toBeInTheDocument();
    }, 15000);

    it('fetches the job by id and pre-fills the form when a job id is present in the url', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs/j1`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: jobData }),
            ),
        );

        renderWithProviders(<ViewUpsertJob />, { route: '/admin/job/upsert?id=j1' });

        expect(await screen.findByDisplayValue('Backend Developer')).toBeInTheDocument();
        expect(screen.getByText('Cập nhật Job')).toBeInTheDocument();
    }, 15000);

    it('navigates back to the job list when the reset/cancel action is triggered', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/job/upsert']}>
                <Routes>
                    <Route path="/admin/job/upsert" element={<ViewUpsertJob />} />
                    <Route path="/admin/job" element={<div>Job List Page</div>} />
                </Routes>
            </MemoryRouter>,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));

        // onReset navigates back to the job list, confirming the cancel action is wired up.
        expect(await screen.findByText('Job List Page')).toBeInTheDocument();
    }, 15000);
});
