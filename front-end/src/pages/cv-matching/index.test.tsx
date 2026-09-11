import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { BASE_URL } from '@/test/msw/handlers';
import CvMatchingPage from './index';

// Drives a real file upload through antd Upload.Dragger plus mocked network,
// which runs slower than the 5s default.
vi.setConfig({ testTimeout: 15000 });

const loggedIn = {
    account: {
        isAuthenticated: true,
        isLoading: false,
        isRefreshToken: false,
        errorRefreshToken: '',
        user: {
            _id: 'u1',
            email: 'a@b.com',
            name: 'Trung',
            role: { _id: 'r1', name: 'NORMAL_USER' },
            permissions: [],
        },
        activeMenu: 'cv-matching',
    },
} as any;

const loggedOut = {
    account: { ...loggedIn.account, isAuthenticated: false, user: { ...loggedIn.account.user } },
} as any;

const analysis = (overrides: any = {}) => ({
    _id: 'a1',
    email: 'a@b.com',
    userId: 'u1',
    fileName: 'cv.pdf',
    fileType: 'pdf',
    model: 'gemini-3.8-flash',
    candidateJobCount: 3,
    createdAt: new Date().toISOString(),
    profile: {
        fullName: 'Thân Đức Trung',
        email: 'a@b.com',
        phone: '',
        currentTitle: 'Frontend Developer',
        summary: 'Lập trình viên frontend 1 năm kinh nghiệm.',
        yearsOfExperience: 1,
        level: 'JUNIOR',
        skills: ['REACT.JS', 'TYPESCRIPT'],
        rawSkills: ['React', 'TypeScript', 'Tailwind'],
        locations: ['HANOI'],
        education: [],
        experiences: [],
        languages: [],
    },
    matches: [
        {
            jobId: 'j1',
            jobName: 'ReactJS Developer',
            companyName: 'VNG',
            score: 88,
            reason: 'Bạn khớp React và TypeScript nhưng chưa có kinh nghiệm Next.js.',
            matchedSkills: ['REACT.JS'],
            missingSkills: ['NEST.JS'],
        },
    ],
    ...overrides,
});

const emptyHistory = () =>
    http.get(`${BASE_URL}/api/v1/cv-matching/history`, () =>
        HttpResponse.json({ statusCode: 200, message: 'ok', data: [] }),
    );

const pickFile = async (name = 'cv.pdf') => {
    const file = new File(['%PDF-1.4 fake'], name, { type: 'application/pdf' });
    // antd Upload renders a hidden <input type="file">; target it directly.
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);
    return file;
};

describe('CvMatchingPage', () => {
    it('asks the visitor to log in instead of showing the upload form', () => {
        renderWithProviders(<CvMatchingPage />, { preloadedState: loggedOut });

        expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
        expect(document.querySelector('input[type="file"]')).toBeNull();
    });

    it('renders the extracted profile and scored matches after analysing', async () => {
        server.use(
            emptyHistory(),
            http.post(`${BASE_URL}/api/v1/cv-matching/analyze`, () =>
                HttpResponse.json({ statusCode: 201, message: 'ok', data: analysis() }),
            ),
        );

        renderWithProviders(<CvMatchingPage />, { preloadedState: loggedIn });

        await pickFile();
        await userEvent.click(
            screen.getByRole('button', { name: /Phân tích CV và tìm việc phù hợp/ }),
        );

        // Profile block
        expect(await screen.findByText('Thân Đức Trung')).toBeInTheDocument();
        expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
        expect(screen.getByText('1 năm')).toBeInTheDocument();

        // Match block: score, reason, matched/missing skills
        expect(screen.getByText('ReactJS Developer')).toBeInTheDocument();
        expect(screen.getByText('VNG')).toBeInTheDocument();
        expect(screen.getByText('88')).toBeInTheDocument();
        expect(screen.getByText(/chưa có kinh nghiệm Next\.js/)).toBeInTheDocument();
        expect(screen.getByText('NEST.JS')).toBeInTheDocument();
    });

    it('separates unmapped CV skills from the ones matching the system taxonomy', async () => {
        server.use(
            emptyHistory(),
            http.post(`${BASE_URL}/api/v1/cv-matching/analyze`, () =>
                HttpResponse.json({ statusCode: 201, message: 'ok', data: analysis() }),
            ),
        );

        renderWithProviders(<CvMatchingPage />, { preloadedState: loggedIn });

        await pickFile();
        await userEvent.click(
            screen.getByRole('button', { name: /Phân tích CV và tìm việc phù hợp/ }),
        );

        expect(await screen.findByText('Kỹ năng khác trong CV:')).toBeInTheDocument();
        // 'Tailwind' is in rawSkills but not in SKILLS_LIST, so it must still be shown.
        expect(screen.getByText('Tailwind')).toBeInTheDocument();
    });

    it('still shows the profile when no job matched', async () => {
        server.use(
            emptyHistory(),
            http.post(`${BASE_URL}/api/v1/cv-matching/analyze`, () =>
                HttpResponse.json({
                    statusCode: 201,
                    message: 'ok',
                    data: analysis({ matches: [] }),
                }),
            ),
        );

        renderWithProviders(<CvMatchingPage />, { preloadedState: loggedIn });

        await pickFile();
        await userEvent.click(
            screen.getByRole('button', { name: /Phân tích CV và tìm việc phù hợp/ }),
        );

        expect(await screen.findByText(/Chưa tìm thấy việc làm phù hợp/)).toBeInTheDocument();
        expect(screen.getByText('Thân Đức Trung')).toBeInTheDocument();
    });

    it('surfaces the backend message when analysis fails', async () => {
        server.use(
            emptyHistory(),
            http.post(`${BASE_URL}/api/v1/cv-matching/analyze`, () =>
                HttpResponse.json(
                    {
                        statusCode: 400,
                        message: 'Không đọc được nội dung CV. File có thể là ảnh scan',
                    },
                    { status: 400 },
                ),
            ),
        );

        renderWithProviders(<CvMatchingPage />, { preloadedState: loggedIn });

        await pickFile('scan.pdf');
        await userEvent.click(
            screen.getByRole('button', { name: /Phân tích CV và tìm việc phù hợp/ }),
        );

        // The axios interceptor resolves errors instead of throwing, so the page
        // must branch on the missing `data` and show res.message.
        expect(await screen.findByText(/ảnh scan/)).toBeInTheDocument();
        expect(screen.queryByText('Thân Đức Trung')).not.toBeInTheDocument();
    });

    it('lists previous analyses in the history tab', async () => {
        server.use(
            http.get(`${BASE_URL}/api/v1/cv-matching/history`, () =>
                HttpResponse.json({
                    statusCode: 200,
                    message: 'ok',
                    data: [analysis({ fileName: 'cv-cu.pdf' })],
                }),
            ),
        );

        renderWithProviders(<CvMatchingPage />, { preloadedState: loggedIn });

        await userEvent.click(screen.getByRole('tab', { name: 'Lịch sử' }));

        await waitFor(() =>
            expect(screen.getByText('cv-cu.pdf')).toBeInTheDocument(),
        );
        expect(screen.getByText(/1 việc làm phù hợp/)).toBeInTheDocument();
    });
});
