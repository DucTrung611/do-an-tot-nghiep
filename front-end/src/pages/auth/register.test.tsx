import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import RegisterPage from './register';

// Raise the per-test timeout above the 5s default: filling this form drives an antd
// Select dropdown via real userEvent interactions, which can run slow under load.
vi.setConfig({ testTimeout: 15000 });

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Họ tên'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@test.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'secret123');
    await user.type(screen.getByLabelText('Tuổi'), '25');
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Nam'));
    await user.type(screen.getByLabelText('Địa chỉ'), 'Hà Nội');
}

describe('RegisterPage', () => {
    it('registers with valid info and shows a success message', async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE_URL}/api/v1/auth/register`, async ({ request }) => {
                const body = (await request.json()) as any;
                expect(body).toEqual({
                    name: 'Alice',
                    email: 'alice@test.com',
                    password: 'secret123',
                    age: 25,
                    gender: 'male',
                    address: 'Hà Nội',
                });
                return HttpResponse.json({
                    statusCode: 201,
                    message: 'ok',
                    data: { _id: 'u1', name: 'Alice', email: 'alice@test.com' },
                });
            }),
        );

        renderWithProviders(<RegisterPage />);
        await fillCommonFields(user);
        await user.click(screen.getByRole('button', { name: 'Đăng ký' }));

        expect(await screen.findByText('Đăng ký tài khoản thành công!')).toBeInTheDocument();
    });

    it('shows an error notification when the email is already taken', async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE_URL}/api/v1/auth/register`, () =>
                HttpResponse.json(
                    { statusCode: 400, message: 'Email đã tồn tại' },
                    { status: 400 },
                ),
            ),
        );

        renderWithProviders(<RegisterPage />);
        await fillCommonFields(user);
        await user.click(screen.getByRole('button', { name: 'Đăng ký' }));

        expect(await screen.findByText('Email đã tồn tại')).toBeInTheDocument();
    });

    it('shows validation errors when submitting an empty form', async () => {
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);

        await user.click(screen.getByRole('button', { name: 'Đăng ký' }));

        expect(await screen.findByText('Họ tên không được để trống!')).toBeInTheDocument();
        expect(screen.getByText('Email không được để trống!')).toBeInTheDocument();
        expect(screen.getByText('Mật khẩu không được để trống!')).toBeInTheDocument();
    });
});
