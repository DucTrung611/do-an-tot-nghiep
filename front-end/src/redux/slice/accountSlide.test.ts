import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { makeTestStore } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import { fetchAccount } from './accountSlide';

// Exercises the real thunk -> real axios instance (config/axios-customize.ts) -> real
// API call (config/api.ts) with only the network response faked via MSW. Never mock
// callFetchAccount/axios directly, or the envelope-unwrap in the response interceptor
// never actually gets tested.
describe('accountSlide / fetchAccount', () => {
    it('marks the user authenticated on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/auth/account`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        user: {
                            _id: 'u1',
                            email: 'a@b.com',
                            name: 'Alice',
                            role: { _id: 'r1', name: 'USER' },
                            permissions: [],
                        },
                    },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchAccount());

        const state = store.getState().account;
        expect(state.isAuthenticated).toBe(true);
        expect(state.isLoading).toBe(false);
        expect(state.user.email).toBe('a@b.com');
    });

    it('leaves the user unauthenticated when the request fails', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/auth/account`, () =>
                HttpResponse.json({ statusCode: 401, message: 'Unauthorized' }, { status: 401 }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchAccount());

        expect(store.getState().account.isAuthenticated).toBe(false);
    });
});
