import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import ModalRole from './modal.role';

const permissionsPage = {
    meta: { current: 1, pageSize: 100, pages: 1, total: 2 },
    result: [
        { _id: 'p1', name: 'Get companies', apiPath: '/api/v1/companies', method: 'GET', module: 'COMPANIES' },
        { _id: 'p2', name: 'Get users', apiPath: '/api/v1/users', method: 'GET', module: 'USERS' },
    ],
};

function mockPermissionsFetch() {
    server.use(
        http.get(`${BASE_URL}/api/v1/permissions`, () =>
            HttpResponse.json({ statusCode: 200, message: 'ok', data: permissionsPage }),
        ),
    );
}

function roleState(singleRole: any) {
    return {
        role: {
            isFetching: false,
            meta: { current: 1, pageSize: 10, pages: 0, total: 0 },
            result: [],
            isFetchSingle: false,
            singleRole,
        },
    } as any;
}

const emptyRole = { _id: '', name: '', description: '', isActive: false, permissions: [] };

describe('ModalRole', () => {
    it('fetches the permission list on mount and renders it grouped by module', async () => {
        mockPermissionsFetch();

        renderWithProviders(<ModalRole openModal={true} setOpenModal={vi.fn()} reloadTable={vi.fn()} />, {
            preloadedState: roleState(emptyRole),
        });

        expect(await screen.findByText('COMPANIES')).toBeInTheDocument();
        expect(screen.getByText('USERS')).toBeInTheDocument();
    }, 15000);

    it('shows the create title when there is no single role selected', async () => {
        mockPermissionsFetch();

        renderWithProviders(<ModalRole openModal={true} setOpenModal={vi.fn()} reloadTable={vi.fn()} />, {
            preloadedState: roleState(emptyRole),
        });

        expect(screen.getByText('Tạo mới Role')).toBeInTheDocument();
    }, 15000);

    it('shows the update title and pre-fills fields for an existing role', async () => {
        mockPermissionsFetch();

        const singleRole = {
            _id: 'r1',
            name: 'Manager',
            description: 'Manager role',
            isActive: true,
            permissions: [{ _id: 'p1', name: 'Get companies', apiPath: '/api/v1/companies', method: 'GET', module: 'COMPANIES' }],
        };

        renderWithProviders(<ModalRole openModal={true} setOpenModal={vi.fn()} reloadTable={vi.fn()} />, {
            preloadedState: roleState(singleRole),
        });

        expect(screen.getByText('Cập nhật Role')).toBeInTheDocument();
        await vi.waitFor(() => {
            expect(screen.getByDisplayValue('Manager')).toBeInTheDocument();
        });
    }, 15000);

    it('submits the create form and calls callCreateRole, then resets the single role', async () => {
        mockPermissionsFetch();
        let capturedBody: any = null;
        server.use(
            http.post(`${BASE_URL}/api/v1/roles`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({ statusCode: 201, message: 'ok', data: capturedBody });
            }),
        );

        const reloadTable = vi.fn();
        const { store } = renderWithProviders(
            <ModalRole openModal={true} setOpenModal={vi.fn()} reloadTable={reloadTable} />,
            { preloadedState: roleState(emptyRole) },
        );

        await screen.findByText('COMPANIES');
        await userEvent.type(screen.getByLabelText('Tên Role'), 'Manager');
        await userEvent.type(screen.getByLabelText('Miêu tả'), 'Manager role');
        await userEvent.click(document.querySelector('.ant-btn-primary') as HTMLButtonElement);

        await vi.waitFor(() => {
            expect(reloadTable).toHaveBeenCalled();
        });
        expect(capturedBody.name).toBe('Manager');
        expect(capturedBody.description).toBe('Manager role');
        expect(capturedBody.permissions).toEqual([]);
        expect(store.getState().role.singleRole).toEqual(emptyRole);
    }, 20000);

    it('submits an update and calls callUpdateRole with the existing role id', async () => {
        mockPermissionsFetch();
        let capturedBody: any = null;
        server.use(
            http.patch(`${BASE_URL}/api/v1/roles/r1`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: capturedBody });
            }),
        );

        const singleRole = {
            _id: 'r1',
            name: 'Manager',
            description: 'Manager role',
            isActive: true,
            permissions: [],
        };
        const reloadTable = vi.fn();

        renderWithProviders(<ModalRole openModal={true} setOpenModal={vi.fn()} reloadTable={reloadTable} />, {
            preloadedState: roleState(singleRole),
        });

        await screen.findByText('COMPANIES');
        await vi.waitFor(() => {
            expect(screen.getByDisplayValue('Manager')).toBeInTheDocument();
        });
        await userEvent.click(document.querySelector('.ant-btn-primary') as HTMLButtonElement);

        await vi.waitFor(() => {
            expect(reloadTable).toHaveBeenCalled();
        });
        expect(capturedBody.name).toBe('Manager');
    }, 20000);
});
