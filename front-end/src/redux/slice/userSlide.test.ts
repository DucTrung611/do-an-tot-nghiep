import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { makeTestStore } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import { fetchUser } from './userSlide';

describe('userSlide / fetchUser', () => {
    it('stores the page result on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/users`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 10, pages: 1, total: 1 },
                        result: [{ _id: 'u1', email: 'a@b.com' }],
                    },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchUser({ query: 'current=1&pageSize=10' }));

        const state = store.getState().user;
        expect(state.isFetching).toBe(false);
        expect(state.result).toEqual([{ _id: 'u1', email: 'a@b.com' }]);
        expect(state.meta.total).toBe(1);
    });

    it('sets isFetching back to false on a network error', async () => {
        // A genuine network error (no HTTP response) is what actually reaches the
        // `rejected` reducer: axios-customize.ts's response interceptor resolves
        // (rather than rejects) any error that does carry a response body.
        server.use(http.get(`${BASE_URL}/api/v1/users`, () => HttpResponse.error()));

        const store = makeTestStore();
        await store.dispatch(fetchUser({ query: '' }));

        expect(store.getState().user.isFetching).toBe(false);
    });
});
