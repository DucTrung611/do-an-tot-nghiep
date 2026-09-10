import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { makeTestStore } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import { fetchRole, fetchRoleById, resetSingleRole } from './roleSlide';

describe('roleSlide / fetchRole', () => {
    it('stores the page result on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/roles`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: {
                        meta: { current: 1, pageSize: 10, pages: 1, total: 1 },
                        result: [{ _id: 'role1', name: 'HR' }],
                    },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchRole({ query: 'current=1&pageSize=10' }));

        const state = store.getState().role;
        expect(state.isFetching).toBe(false);
        expect(state.result).toEqual([{ _id: 'role1', name: 'HR' }]);
        expect(state.meta.total).toBe(1);
    });

    it('sets isFetching back to false on a network error', async () => {
        // A genuine network error (no HTTP response) is what actually reaches the
        // `rejected` reducer: axios-customize.ts's response interceptor resolves
        // (rather than rejects) any error that does carry a response body.
        server.use(http.get(`${BASE_URL}/api/v1/roles`, () => HttpResponse.error()));

        const store = makeTestStore();
        await store.dispatch(fetchRole({ query: '' }));

        expect(store.getState().role.isFetching).toBe(false);
    });
});

describe('roleSlide / fetchRoleById', () => {
    it('stores the single role on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/roles/role1`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { _id: 'role1', name: 'HR', description: 'HR role', isActive: true, permissions: [] },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchRoleById('role1'));

        const state = store.getState().role;
        expect(state.isFetchSingle).toBe(false);
        expect(state.singleRole).toEqual({ _id: 'role1', name: 'HR', description: 'HR role', isActive: true, permissions: [] });
    });

    it('resets the single role back to empty on a network error', async () => {
        // A genuine network error (no HTTP response) is what actually reaches the
        // `rejected` reducer: axios-customize.ts's response interceptor resolves
        // (rather than rejects) any error that does carry a response body.
        server.use(http.get(`${BASE_URL}/api/v1/roles/role1`, () => HttpResponse.error()));

        const store = makeTestStore();
        await store.dispatch(fetchRoleById('role1'));

        const state = store.getState().role;
        expect(state.isFetchSingle).toBe(false);
        expect(state.singleRole._id).toBe('');
    });
});

describe('roleSlide / resetSingleRole', () => {
    it('clears the single role back to its empty shape', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/roles/role1`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { _id: 'role1', name: 'HR', description: 'HR role', isActive: true, permissions: [] },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchRoleById('role1'));
        expect(store.getState().role.singleRole._id).toBe('role1');

        store.dispatch(resetSingleRole(undefined));

        expect(store.getState().role.singleRole).toEqual({
            _id: '',
            name: '',
            description: '',
            isActive: false,
            permissions: [],
        });
    });
});
