import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import ViewDetailResume from './view.resume';
import { IResume } from '@/types/backend';

const dataInit: IResume = {
    _id: 'r1',
    email: 'alice@example.com',
    userId: 'u1',
    url: 'cv.pdf',
    status: 'PENDING',
    companyId: { _id: 'c1', name: 'Acme Corp', logo: 'logo.png' },
    jobId: { _id: 'j1', name: 'Backend Dev' },
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-02T12:00:00.000Z',
} as any;

describe('ViewDetailResume', () => {
    it('renders the resume fields', () => {
        render(
            <ViewDetailResume
                open={true}
                dataInit={dataInit}
                onClose={vi.fn()}
                setDataInit={vi.fn()}
                reloadTable={vi.fn()}
            />,
        );

        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
        expect(screen.getByText('Backend Dev')).toBeInTheDocument();
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    it('calls callUpdateResumeStatus with the selected status and reloads on success', async () => {
        let capturedBody: any = null;
        server.use(
            http.patch(`${BASE_URL}/api/v1/resumes/r1`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { ...dataInit, status: capturedBody.status },
                });
            }),
        );

        const onClose = vi.fn();
        const setDataInit = vi.fn();
        const reloadTable = vi.fn();

        render(
            <ViewDetailResume
                open={true}
                dataInit={dataInit}
                onClose={onClose}
                setDataInit={setDataInit}
                reloadTable={reloadTable}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Change Status' }));

        await vi.waitFor(() => {
            expect(reloadTable).toHaveBeenCalled();
        });
        expect(capturedBody.status).toBe('PENDING');
        expect(onClose).toHaveBeenCalledWith(false);
        expect(setDataInit).toHaveBeenCalledWith(null);
    });

    it('shows an error notification when the update fails', async () => {
        server.use(
            http.patch(`${BASE_URL}/api/v1/resumes/r1`, () =>
                HttpResponse.json({ statusCode: 400, message: 'Update failed', error: 'Bad Request' }, { status: 400 }),
            ),
        );

        const reloadTable = vi.fn();
        render(
            <ViewDetailResume
                open={true}
                dataInit={dataInit}
                onClose={vi.fn()}
                setDataInit={vi.fn()}
                reloadTable={reloadTable}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Change Status' }));

        await vi.waitFor(() => {
            expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument();
        });
        expect(reloadTable).not.toHaveBeenCalled();
    });
});
