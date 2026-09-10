import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import ManageAccount from './manage.account';

// Raise the per-test timeout above the 5s default: waits on real network mocks + antd
// tab/form re-renders, which can run slow under load.
vi.setConfig({ testTimeout: 15000 });

function accountState() {
    return {
        account: {
            isAuthenticated: true,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'alice@example.com',
                name: 'Alice',
                age: 25,
                address: 'Hanoi',
                role: { _id: 'r1', name: 'NORMAL_USER' },
                permissions: [],
            },
        },
    } as any;
}

describe('ManageAccount', () => {
    it('renders the modal and lists the user\'s submitted CVs on the default tab', async () => {
        server.use(
            http.post(`${BASE_URL}/api/v1/resumes/by-user`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: [
                        {
                            _id: 'r1',
                            companyId: { name: 'Acme Corp' },
                            jobId: { name: 'Backend Developer' },
                            status: 'PENDING',
                            url: 'cv.pdf',
                            createdAt: new Date().toISOString(),
                        },
                    ],
                }),
            ),
        );

        renderWithProviders(<ManageAccount open onClose={() => {}} />, {
            preloadedState: accountState(),
        });

        expect(screen.getByText('Quản lý tài khoản')).toBeInTheDocument();
        expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    });

    it('renders nothing when closed', () => {
        renderWithProviders(<ManageAccount open={false} onClose={() => {}} />, {
            preloadedState: accountState(),
        });

        expect(screen.queryByText('Quản lý tài khoản')).not.toBeInTheDocument();
    });

    it('updates the account info from the "Cập nhật thông tin" tab', async () => {
        let capturedBody: any = null;
        server.use(
            http.post(`${BASE_URL}/api/v1/resumes/by-user`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: [] }),
            ),
            http.patch(`${BASE_URL}/api/v1/auth/account`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { _id: 'u1', ...(capturedBody as object) },
                });
            }),
        );

        const { store } = renderWithProviders(<ManageAccount open onClose={() => {}} />, {
            preloadedState: accountState(),
        });

        const user = userEvent.setup();
        await user.click(screen.getByText('Cập nhật thông tin'));

        const nameInput = await screen.findByDisplayValue('Alice');
        await user.clear(nameInput);
        await user.type(nameInput, 'Alice Updated');

        const ageInput = screen.getByDisplayValue('25');
        await user.clear(ageInput);
        await user.type(ageInput, '30');

        const addressInput = screen.getByDisplayValue('Hanoi');
        await user.clear(addressInput);
        await user.type(addressInput, 'Da Nang');

        await user.click(screen.getByRole('button', { name: 'Cập nhật' }));

        await waitFor(() => {
            expect(store.getState().account.user.name).toBe('Alice Updated');
        });
        expect(capturedBody).toEqual({ name: 'Alice Updated', age: 30, address: 'Da Nang' });
    }, 15000);

    it('shows a mismatch error when confirm password does not match on the change-password tab', async () => {
        server.use(
            http.post(`${BASE_URL}/api/v1/resumes/by-user`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: [] }),
            ),
        );

        renderWithProviders(<ManageAccount open onClose={() => {}} />, {
            preloadedState: accountState(),
        });

        const user = userEvent.setup();
        await user.click(screen.getByText('Thay đổi mật khẩu'));

        const oldPasswordInput = await screen.findByLabelText('Mật khẩu cũ');
        const newPasswordInput = screen.getByLabelText('Mật khẩu mới');
        const confirmPasswordInput = screen.getByLabelText('Xác nhận mật khẩu');

        await user.type(oldPasswordInput, 'oldpass1');
        await user.type(newPasswordInput, 'newpass1');
        await user.type(confirmPasswordInput, 'different1');

        await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

        expect(await screen.findByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    });
});
