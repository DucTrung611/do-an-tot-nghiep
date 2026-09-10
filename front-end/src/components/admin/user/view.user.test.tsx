import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewDetailUser from './view.user';
import { IUser } from '@/types/backend';

const dataInit: IUser = {
    _id: 'u1',
    name: 'Alice',
    email: 'alice@example.com',
    age: 25,
    gender: 'FEMALE',
    address: 'Hanoi',
    role: 'NORMAL_USER' as any,
    company: { _id: 'c1', name: 'Acme Corp' } as any,
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-02T12:00:00.000Z',
};

describe('ViewDetailUser', () => {
    it('renders the user fields when data is provided', () => {
        render(
            <ViewDetailUser
                open={true}
                dataInit={dataInit}
                onClose={vi.fn()}
                setDataInit={vi.fn()}
            />,
        );

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
        expect(screen.getByText('FEMALE')).toBeInTheDocument();
        expect(screen.getByText('NORMAL_USER')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText('Hanoi')).toBeInTheDocument();
        expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
        expect(screen.getByText(/c1/)).toBeInTheDocument();
    });

    it('falls back to "-" for company fields when the user has no company', () => {
        render(
            <ViewDetailUser
                open={true}
                dataInit={{ ...dataInit, company: undefined }}
                onClose={vi.fn()}
                setDataInit={vi.fn()}
            />,
        );

        expect(screen.getByText('Thông tin công ty').closest('table')?.textContent).toContain('Id: -');
        expect(screen.getByText('Thông tin công ty').closest('table')?.textContent).toContain('Tên: -');
    });

    it('calls onClose and setDataInit when the drawer is closed', async () => {
        const onClose = vi.fn();
        const setDataInit = vi.fn();
        render(
            <ViewDetailUser
                open={true}
                dataInit={dataInit}
                onClose={onClose}
                setDataInit={setDataInit}
            />,
        );

        await userEvent.click(screen.getByLabelText('Close'));

        expect(onClose).toHaveBeenCalledWith(false);
        expect(setDataInit).toHaveBeenCalledWith(null);
    });
});
