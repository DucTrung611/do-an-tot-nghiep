import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import AppliedJobPage from './applied';

vi.setConfig({ testTimeout: 15000 });

describe('AppliedJobPage', () => {
    it('renders the applied jobs with their current status', async () => {
        server.use(
            http.post(`${BASE_URL}/api/v1/resumes/by-user`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: [
                        {
                            _id: 'r1',
                            email: 'a@b.com',
                            userId: 'u1',
                            url: 'cv.pdf',
                            status: 'APPROVED',
                            companyId: { _id: 'c1', name: 'ACME' },
                            jobId: { _id: 'j1', name: 'Backend Developer' },
                            createdAt: new Date().toISOString(),
                            history: [
                                { status: 'PENDING', updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: { _id: 'u2', email: 'hr@b.com' } },
                                { status: 'APPROVED', updatedAt: '2026-01-02T00:00:00.000Z', updatedBy: { _id: 'u2', email: 'hr@b.com' } },
                            ],
                        },
                    ],
                }),
            ),
        );

        renderWithProviders(<AppliedJobPage />);

        expect(await screen.findByText('Backend Developer')).toBeInTheDocument();
        expect(screen.getByText('ACME')).toBeInTheDocument();
        expect(screen.getByText('Đã chấp nhận')).toBeInTheDocument();
    });

    it('expands a row to show the status history in chronological order', async () => {
        server.use(
            http.post(`${BASE_URL}/api/v1/resumes/by-user`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: [
                        {
                            _id: 'r1',
                            email: 'a@b.com',
                            userId: 'u1',
                            url: 'cv.pdf',
                            status: 'REVIEWING',
                            companyId: { _id: 'c1', name: 'ACME' },
                            jobId: { _id: 'j1', name: 'Backend Developer' },
                            createdAt: new Date().toISOString(),
                            history: [
                                { status: 'REVIEWING', updatedAt: '2026-01-02T00:00:00.000Z', updatedBy: { _id: 'u2', email: 'hr@b.com' } },
                                { status: 'PENDING', updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: { _id: 'u2', email: 'hr@b.com' } },
                            ],
                        },
                    ],
                }),
            ),
        );

        const { container } = renderWithProviders(<AppliedJobPage />);
        await screen.findByText('Backend Developer');

        const user = userEvent.setup();
        await user.click(container.querySelector('.ant-table-row-expand-icon')!);

        // scope to the timeline only: the main row's status Tag also renders
        // "Đang xem xét" and would otherwise be matched too.
        await waitFor(() => expect(container.querySelector('.ant-timeline')).toBeTruthy());
        const timeline = container.querySelector('.ant-timeline') as HTMLElement;
        const items = within(timeline).getAllByText(/Chờ duyệt|Đang xem xét/);
        // history is sorted oldest-first regardless of the array's input order
        expect(items[0]).toHaveTextContent('Chờ duyệt');
        expect(items[1]).toHaveTextContent('Đang xem xét');
    });

    it('shows an empty state when there are no applications', async () => {
        server.use(
            http.post(`${BASE_URL}/api/v1/resumes/by-user`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: [] }),
            ),
        );

        renderWithProviders(<AppliedJobPage />);

        await waitFor(() => {
            expect(screen.getByText('Bạn chưa ứng tuyển việc làm nào')).toBeInTheDocument();
        });
    });
});
