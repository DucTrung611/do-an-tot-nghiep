import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/render';
import DashboardPage from './dashboard';

// @ant-design/plots renders onto a <canvas> via @antv/g2, which jsdom cannot
// provide a real 2D context for. Stub every chart component with a plain div
// so the dashboard can be tested without a real canvas.
vi.mock('@ant-design/plots', () => ({
    Column: (props: any) => <div data-testid="chart-column">{JSON.stringify(props.data)}</div>,
    Line: (props: any) => <div data-testid="chart-line">{JSON.stringify(props.data)}</div>,
    Pie: (props: any) => <div data-testid="chart-pie">{JSON.stringify(props.data)}</div>,
    Bar: (props: any) => <div data-testid="chart-bar">{JSON.stringify(props.data)}</div>,
}));

vi.setConfig({ testTimeout: 15000 });

function statsResponse(overrides: Partial<Record<string, any>> = {}) {
    return HttpResponse.json({
        statusCode: 200,
        message: 'ok',
        data: {
            totals: { users: 10, jobs: 5, companies: 3, resumes: 7, activeJobs: 4, pendingResumes: 2 },
            jobsByMonth: [{ month: '2026-01', count: 5 }],
            applicationsByMonth: [{ month: '2026-01', count: 7 }],
            resumesByStatus: [{ status: 'PENDING', count: 2 }, { status: 'APPROVED', count: 5 }],
            topSkills: [{ skill: 'REACT.JS', count: 3 }],
            jobsByLocation: [{ location: 'HANOI', count: 4 }],
            topJobsByApplications: [{ jobId: 'j1', jobName: 'Backend Dev', companyName: 'ACME', count: 6 }],
            salaryDistribution: [{ _id: 0, count: 1 }, { _id: '100tr+', count: 1 }],
            ...overrides,
        },
    });
}

describe('DashboardPage', () => {
    it('shows loading skeletons while stats are being fetched, then renders the metric titles once loaded', async () => {
        server.use(http.get(`${BASE_URL}/api/v1/stats/overview`, () => statsResponse()));

        renderWithProviders(<DashboardPage />);

        expect(document.querySelectorAll('.ant-skeleton-active').length).toBeGreaterThan(0);

        await waitFor(() => expect(document.querySelectorAll('.ant-skeleton-active').length).toBe(0));

        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Total Jobs')).toBeInTheDocument();
        expect(screen.getByText('Total Companies')).toBeInTheDocument();
        expect(screen.getByText('Total Resumes')).toBeInTheDocument();
        expect(screen.getByText('Active Jobs')).toBeInTheDocument();
        expect(screen.getByText('Pending Resumes')).toBeInTheDocument();
    });

    it('requests the overview stats with a 12-month window', async () => {
        let capturedUrl = '';
        server.use(
            http.get(`${BASE_URL}/api/v1/stats/overview`, ({ request }) => {
                capturedUrl = request.url;
                return statsResponse();
            }),
        );

        renderWithProviders(<DashboardPage />);

        await waitFor(() => expect(capturedUrl).toContain('months=12'));
    });

    it('renders every chart section and the top-jobs table once data arrives', async () => {
        server.use(http.get(`${BASE_URL}/api/v1/stats/overview`, () => statsResponse()));

        renderWithProviders(<DashboardPage />);

        expect((await screen.findAllByTestId('chart-column')).length).toBeGreaterThan(0);
        expect(screen.getByTestId('chart-line')).toBeInTheDocument();
        expect(screen.getByTestId('chart-pie')).toBeInTheDocument();
        expect(screen.getByTestId('chart-bar')).toBeInTheDocument();
        expect(await screen.findByText('Backend Dev')).toBeInTheDocument();
        expect(screen.getByText('ACME')).toBeInTheDocument();
    });
});
