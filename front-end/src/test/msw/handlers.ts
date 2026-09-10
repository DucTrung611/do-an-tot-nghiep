import { http, HttpResponse } from 'msw';

export const BASE_URL = 'http://localhost:8000';

// Only put a handler here if genuinely every test needs it. Prefer
// `server.use(...)` inside a specific test to override/add one-off responses.
//
// The backend reports an invalid/expired refresh token as 400, not 401 (see the
// `+error.response.status === 400 && error.config.url === '/api/v1/auth/refresh'`
// check in axios-customize.ts). Keep this a 400: a 401 here would make the response
// interceptor try to refresh the refresh call itself and deadlock the test.
export const handlers = [
    http.get(`${BASE_URL}/api/v1/auth/refresh`, () =>
        HttpResponse.json({ statusCode: 400, message: 'Refresh token invalid' }, { status: 400 }),
    ),
];
