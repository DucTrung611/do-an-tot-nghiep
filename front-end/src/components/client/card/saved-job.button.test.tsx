import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import SavedJobButton from './saved-job.button';

vi.setConfig({ testTimeout: 15000 });

function accountState(isAuthenticated: boolean) {
    return {
        account: {
            isAuthenticated,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'a@b.com',
                name: 'Alice',
                role: { _id: 'r1', name: 'NORMAL_USER' },
                permissions: [],
            },
        },
    } as any;
}

describe('SavedJobButton', () => {
    it('does not fire any request when the user is not authenticated', async () => {
        renderWithProviders(<SavedJobButton jobId="j1" />, {
            preloadedState: accountState(false),
        });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Lưu việc làm' }));

        // no server.use handler registered for save/unsave => if a request had
        // fired, MSW's onUnhandledRequest:'error' would fail this test.
        expect(screen.getByRole('button', { name: 'Lưu việc làm' })).toBeInTheDocument();
    });

    it('saves a job and toggles to the filled heart icon', async () => {
        server.use(
            http.post(`${BASE_URL}/api/v1/saved-jobs`, () =>
                HttpResponse.json({ statusCode: 201, message: 'ok', data: { _id: 'sj1', jobId: 'j1' } }),
            ),
        );

        renderWithProviders(<SavedJobButton jobId="j1" />, {
            preloadedState: { ...accountState(true), savedJob: { isFetching: false, meta: { current: 1, pageSize: 10, pages: 0, total: 0 }, result: [], savedIds: [] } },
        });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Lưu việc làm' }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Bỏ lưu việc làm' })).toBeInTheDocument();
        });
    });

    it('unsaves an already-saved job', async () => {
        server.use(
            http.delete(`${BASE_URL}/api/v1/saved-jobs/j1`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: { deleted: 1 } }),
            ),
        );

        const { store } = renderWithProviders(<SavedJobButton jobId="j1" />, {
            preloadedState: {
                ...accountState(true),
                savedJob: { isFetching: false, meta: { current: 1, pageSize: 10, pages: 0, total: 0 }, result: [], savedIds: ['j1'] },
            },
        });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Bỏ lưu việc làm' }));

        await waitFor(() => {
            expect(store.getState().savedJob.savedIds).not.toContain('j1');
        });
    });
});
