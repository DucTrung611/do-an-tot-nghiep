import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import ClientCompanyPage from './index';

// Raise the per-test timeout above the 5s default: these tests wait on real network
// mocks + antd re-renders, which can run slow under load.
vi.setConfig({ testTimeout: 15000 });

function companiesResponse(names: string[]) {
    return HttpResponse.json({
        statusCode: 200,
        message: 'ok',
        data: {
            meta: { current: 1, pageSize: 4, pages: 1, total: names.length },
            result: names.map((name, i) => ({ _id: `c${i}`, name, address: 'Hà Nội', logo: 'logo.png' })),
        },
    });
}

describe('ClientCompanyPage', () => {
    it('fetches and renders the company list', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/companies`, () => companiesResponse(['VNG', 'FPT Software'])),
        );

        renderWithProviders(<ClientCompanyPage />);

        expect(await screen.findByText('VNG')).toBeInTheDocument();
        expect(screen.getByText('FPT Software')).toBeInTheDocument();
    });

    it('re-fetches with a name filter when searching', async () => {
        const user = userEvent.setup();
        let lastQuery = '';
        server.use(
            http.get(`${BASE_URL}/api/v1/companies`, ({ request }) => {
                lastQuery = new URL(request.url).search;
                return companiesResponse(['VNG']);
            }),
        );

        renderWithProviders(<ClientCompanyPage />);
        await screen.findByText('VNG');

        const searchInput = screen.getByPlaceholderText('Tìm theo tên công ty');
        await user.type(searchInput, 'VNG');
        await user.click(screen.getByRole('button', { name: 'Tìm' }));

        await waitFor(() => {
            expect(lastQuery).toContain('name=');
        });
    });

    it('shows an empty state when there are no companies', async () => {
        server.use(http.get(`${BASE_URL}/api/v1/companies`, () => companiesResponse([])));

        renderWithProviders(<ClientCompanyPage />);

        expect(await screen.findByText('Không có dữ liệu')).toBeInTheDocument();
    });
});
