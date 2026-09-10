import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import LoginPage from './login';

// Note: the component redirects via `window.location.href = ...` on success. jsdom
// logs a benign "Not implemented: navigation" warning for this (it doesn't throw or
// fail the test), so we assert on the side effects we can observe instead (the token
// landing in localStorage) rather than replacing window.location, which would break
// MSW/axios's own use of window.location internally.
// Raise the per-test timeout above the 5s default: real userEvent typing/clicks through
// antd controls can run slow under load, and this shouldn't be flaky on a busy CI box.
vi.setConfig({ testTimeout: 15000 });

afterEach(() => {
    localStorage.clear();
});

describe('LoginPage', () => {
    it('logs in with valid credentials, stores the token, and redirects home', async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE_URL}/api/v1/auth/login`, async ({ request }) => {
                const body = (await request.json()) as any;
                expect(body).toEqual({ username: 'alice@test.com', password: 'secret123' });
                return HttpResponse.json({
                    statusCode: 201,
                    message: 'ok',
                    data: {
                        access_token: 'fake-jwt-token',
                        user: {
                            _id: 'u1',
                            email: 'alice@test.com',
                            name: 'Alice',
                            role: { _id: 'r1', name: 'NORMAL_USER' },
                            permissions: [],
                        },
                    },
                });
            }),
        );

        renderWithProviders(<LoginPage />);

        await user.type(screen.getByLabelText('Email'), 'alice@test.com');
        await user.type(screen.getByLabelText('Mật khẩu'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

        await waitFor(() => {
            expect(localStorage.getItem('access_token')).toBe('fake-jwt-token');
        });
    });

    it('shows an error notification on invalid credentials', async () => {
        const user = userEvent.setup();
        server.use(
            http.post(`${BASE_URL}/api/v1/auth/login`, () =>
                HttpResponse.json(
                    { statusCode: 401, message: 'Email/Password không hợp lệ' },
                    { status: 401 },
                ),
            ),
        );

        renderWithProviders(<LoginPage />);

        await user.type(screen.getByLabelText('Email'), 'alice@test.com');
        await user.type(screen.getByLabelText('Mật khẩu'), 'wrong-password');
        await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

        expect(await screen.findByText('Email/Password không hợp lệ')).toBeInTheDocument();
        expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('shows validation errors when submitting an empty form', async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

        expect(await screen.findByText('Email không được để trống!')).toBeInTheDocument();
        expect(screen.getByText('Mật khẩu không được để trống!')).toBeInTheDocument();
    });
});
