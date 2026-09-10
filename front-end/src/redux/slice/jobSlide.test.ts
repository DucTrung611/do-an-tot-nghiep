import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { makeTestStore } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import { fetchJob } from './jobSlide';

describe('jobSlide / fetchJob', () => {
    it('stores the page result on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/jobs`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 10, pages: 1, total: 1 },
                        result: [{ _id: 'j1', name: 'NestJS Dev' }],
                    },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchJob({ query: 'current=1&pageSize=10' }));

        const state = store.getState().job;
        expect(state.isFetching).toBe(false);
        expect(state.result).toEqual([{ _id: 'j1', name: 'NestJS Dev' }]);
        expect(state.meta.total).toBe(1);
    });

    it('sets isFetching back to false on a network error', async () => {
        // A genuine network error (no HTTP response) is what actually reaches the
        // `rejected` reducer: axios-customize.ts's response interceptor resolves
        // (rather than rejects) any error that does carry a response body.
        server.use(http.get(`${BASE_URL}/api/v1/jobs`, () => HttpResponse.error()));

        const store = makeTestStore();
        await store.dispatch(fetchJob({ query: '' }));

        expect(store.getState().job.isFetching).toBe(false);
    });
});
