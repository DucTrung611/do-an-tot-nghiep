import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewDetailPermission from './view.permission';
import { IPermission } from '@/types/backend';

const dataInit: IPermission = {
    _id: 'p1',
    name: 'Get companies',
    apiPath: '/api/v1/companies',
    method: 'GET',
    module: 'COMPANIES',
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-02T12:00:00.000Z',
};

describe('ViewDetailPermission', () => {
    it('renders the permission fields when data is provided', () => {
        render(
            <ViewDetailPermission
                open={true}
                dataInit={dataInit}
                onClose={vi.fn()}
                setDataInit={vi.fn()}
            />,
        );

        expect(screen.getByText('Get companies')).toBeInTheDocument();
        expect(screen.getByText('/api/v1/companies')).toBeInTheDocument();
        expect(screen.getByText('GET')).toBeInTheDocument();
        expect(screen.getByText('COMPANIES')).toBeInTheDocument();
        expect(screen.getByText(/01-01-2024/)).toBeInTheDocument();
    });

    it('calls onClose and setDataInit when the drawer is closed', async () => {
        const onClose = vi.fn();
        const setDataInit = vi.fn();
        render(
            <ViewDetailPermission
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
