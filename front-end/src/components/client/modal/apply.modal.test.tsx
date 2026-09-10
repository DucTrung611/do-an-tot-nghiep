import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import ApplyModal from './apply.modal';
import type { IJob } from '@/types/backend';

// Raise the per-test timeout above the 5s default: antd Modal + userEvent interactions
// can run slow under a loaded full-suite run.
vi.setConfig({ testTimeout: 15000 });

function accountState(isAuthenticated: boolean) {
    return {
        account: {
            isAuthenticated,
            isLoading: false,
            isRefreshToken: false,
            errorRefreshToken: '',
            activeMenu: 'home',
            user: {
                _id: 'u1',
                email: 'a@b.com',
                name: 'Alice',
                role: { _id: 'r1', name: 'NORMAL_USER' },
                permissions: [],
            },
        },
    } as any;
}

const jobDetail: IJob = {
    _id: 'j1',
    name: 'Backend Developer',
    skills: ['NODEJS'],
    company: { _id: 'c1', name: 'Acme Corp', logo: 'acme.png' },
    location: 'HANOI',
    salary: 20000000,
} as any;

describe('ApplyModal', () => {
    it('shows a login prompt and closes+navigates when the user is not authenticated', async () => {
        const setIsModalOpen = vi.fn();
        renderWithProviders(
            <ApplyModal isModalOpen setIsModalOpen={setIsModalOpen} jobDetail={jobDetail} />,
            { preloadedState: accountState(false) },
        );

        expect(
            screen.getByText(/Bạn chưa đăng nhập hệ thống/),
        ).toBeInTheDocument();
        expect(screen.getByText('Đăng Nhập Nhanh')).toBeInTheDocument();

        const user = userEvent.setup();
        await user.click(screen.getByText('Đăng Nhập Nhanh'));

        expect(setIsModalOpen).toHaveBeenCalledWith(false);
    });

    it('shows the application form with job/company details when authenticated', () => {
        const setIsModalOpen = vi.fn();
        renderWithProviders(
            <ApplyModal isModalOpen setIsModalOpen={setIsModalOpen} jobDetail={jobDetail} />,
            { preloadedState: accountState(true) },
        );

        expect(screen.getByText('Backend Developer', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Acme Corp', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Rải CV Nào')).toBeInTheDocument();
        expect(screen.getByDisplayValue('a@b.com')).toBeInTheDocument();
    });

    it('shows a validation error when submitting without an uploaded CV', async () => {
        const setIsModalOpen = vi.fn();
        renderWithProviders(
            <ApplyModal isModalOpen setIsModalOpen={setIsModalOpen} jobDetail={jobDetail} />,
            { preloadedState: accountState(true) },
        );

        const user = userEvent.setup();
        await user.click(screen.getByText('Rải CV Nào'));

        expect(await screen.findByText('Vui lòng upload CV!')).toBeInTheDocument();
        expect(setIsModalOpen).not.toHaveBeenCalled();
    });
});
