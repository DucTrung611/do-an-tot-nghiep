import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { makeTestStore } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import { fetchPermission } from './permissionSlide';

describe('permissionSlide / fetchPermission', () => {
    it('stores the page result on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/permissions`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 10, pages: 1, total: 1 },
                        result: [{ _id: 'p1', name: 'Get companies', apiPath: '/api/v1/companies', method: 'GET', module: 'COMPANIES' }],
                    },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchPermission({ query: 'current=1&pageSize=10' }));

        const state = store.getState().permission;
        expect(state.isFetching).toBe(false);
        expect(state.result).toHaveLength(1);
        expect(state.meta.total).toBe(1);
    });

    it('sets isFetching back to false on a network error', async () => {
        // A genuine network error (no HTTP response) is what actually reaches the
        // `rejected` reducer: axios-customize.ts's response interceptor resolves
        // (rather than rejects) any error that does carry a response body.
        server.use(http.get(`${BASE_URL}/api/v1/permissions`, () => HttpResponse.error()));

        const store = makeTestStore();
        await store.dispatch(fetchPermission({ query: '' }));

        expect(store.getState().permission.isFetching).toBe(false);
    });
});
