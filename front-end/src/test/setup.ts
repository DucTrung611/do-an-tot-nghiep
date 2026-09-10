import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// antd components (e.g. Grid, notification) probe matchMedia; jsdom has no implementation.
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// antd's Select/Dropdown (via @rc-component/resize-observer) probe ResizeObserver
// to reposition their popups; jsdom has no implementation.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
    window.ResizeObserver = class {
        observe() { }
        unobserve() { }
        disconnect() { }
    } as unknown as typeof ResizeObserver;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
