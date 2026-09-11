import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { makeTestStore } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import reducer, {
    fetchNotification,
    fetchUnreadCount,
    markAllRead,
    markRead,
    pushNotification,
    resetNotification,
} from './notificationSlide';

const baseNotification = {
    _id: 'n1',
    userId: 'u1',
    type: 'RESUME_STATUS',
    title: 'Cập nhật hồ sơ',
    message: 'Hồ sơ của bạn đã được duyệt',
    link: '/applied-jobs',
    isRead: false,
    createdAt: new Date().toISOString(),
};

describe('notificationSlide reducers', () => {
    it('pushNotification prepends the new item and increments unread', () => {
        const initial = reducer(undefined, { type: '@@INIT' });
        const state = reducer(initial, pushNotification(baseNotification));

        expect(state.result[0]).toEqual(baseNotification);
        expect(state.unread).toBe(1);
    });

    it('markRead flips isRead and decrements unread, but only once', () => {
        const initial = reducer(undefined, { type: '@@INIT' });
        const withPush = reducer(initial, pushNotification(baseNotification));

        const afterFirstRead = reducer(withPush, markRead('n1'));
        expect(afterFirstRead.result[0].isRead).toBe(true);
        expect(afterFirstRead.unread).toBe(0);

        // marking an already-read notification again must not go negative
        const afterSecondRead = reducer(afterFirstRead, markRead('n1'));
        expect(afterSecondRead.unread).toBe(0);
    });

    it('markAllRead clears every item and resets unread to 0', () => {
        const initial = reducer(undefined, { type: '@@INIT' });
        const withTwo = reducer(
            reducer(initial, pushNotification(baseNotification)),
            pushNotification({ ...baseNotification, _id: 'n2' }),
        );

        const state = reducer(withTwo, markAllRead());

        expect(state.unread).toBe(0);
        expect(state.result.every(n => n.isRead)).toBe(true);
    });

    it('resetNotification clears everything (used on logout)', () => {
        const initial = reducer(undefined, { type: '@@INIT' });
        const dirty = reducer(initial, pushNotification(baseNotification));

        const state = reducer(dirty, resetNotification());

        expect(state.result).toEqual([]);
        expect(state.unread).toBe(0);
    });
});

describe('notificationSlide / fetchNotification', () => {
    it('stores the page result on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/notifications`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: { meta: { current: 1, pageSize: 10, pages: 1, total: 1 }, result: [baseNotification] },
                }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchNotification({ query: 'current=1&pageSize=10' }));

        const state = store.getState().notification;
        expect(state.isFetching).toBe(false);
        expect(state.result).toEqual([baseNotification]);
    });

    it('sets isFetching back to false on a network error', async () => {
        server.use(http.get(`${BASE_URL}/api/v1/notifications`, () => HttpResponse.error()));

        const store = makeTestStore();
        await store.dispatch(fetchNotification({ query: '' }));

        expect(store.getState().notification.isFetching).toBe(false);
    });
});

describe('notificationSlide / fetchUnreadCount', () => {
    it('stores the unread count on a successful response', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/notifications/unread-count`, () =>
                HttpResponse.json({ statusCode: 200, message: 'ok', data: 4 }),
            ),
        );

        const store = makeTestStore();
        await store.dispatch(fetchUnreadCount());

        expect(store.getState().notification.unread).toBe(4);
    });
});
