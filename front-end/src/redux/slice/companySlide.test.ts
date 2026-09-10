import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { makeTestStore } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import { fetchCompany } from './companySlide';

describe('companySlide / fetchCompany', () => {
    it('stores the page result on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/companies`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 10, pages: 1, total: 1 },
                        result: [{ _id: 'c1', name: 'ACME' }],
                    },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchCompany({ query: 'current=1&pageSize=10' }));

        const state = store.getState().company;
        expect(state.isFetching).toBe(false);
        expect(state.result).toEqual([{ _id: 'c1', name: 'ACME' }]);
        expect(state.meta.total).toBe(1);
    });

    it('sets isFetching back to false on a network error', async () => {
        // A genuine network error (no HTTP response) is what actually reaches the
        // `rejected` reducer here: axios-customize.ts's response interceptor resolves
        // (rather than rejects) any error that does carry a response body, so an HTTP
        // 4xx/5xx would land in `fulfilled` with a payload that has no `.data` instead.
        server.use(http.get(`${BASE_URL}/api/v1/companies`, () => HttpResponse.error()));

        const store = makeTestStore();
        await store.dispatch(fetchCompany({ query: '' }));

        expect(store.getState().company.isFetching).toBe(false);
    });
});
