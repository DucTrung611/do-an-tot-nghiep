import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import ModalUser from './modal.user';
import { IUser } from '@/types/backend';

function mockCompanyAndRoleFetch() {
    server.use(
        http.get(`${BASE_URL}/api/v1/companies`, () =>
            HttpResponse.json({
                statusCode: 200,
                message: 'ok',
                data: {
                    meta: { current: 1, pageSize: 100, pages: 1, total: 1 },
                    result: [{ _id: 'c1', name: 'Acme Corp', address: 'Hanoi', logo: 'a.png' }],
                },
            }),
        ),
        http.get(`${BASE_URL}/api/v1/roles`, () =>
            HttpResponse.json({
                statusCode: 200,
                message: 'ok',
                data: {
                    meta: { current: 1, pageSize: 100, pages: 1, total: 1 },
                    result: [{ _id: 'r1', name: 'ADMIN', description: '', isActive: true, permissions: [] }],
                },
            }),
        ),
    );
}

describe('ModalUser', () => {
    it('renders the create title and required fields', () => {
        render(
            <ModalUser
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={null}
                setDataInit={vi.fn()}
                reloadTable={vi.fn()}
            />,
        );

        expect(screen.getByText('Tạo mới User')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Tên hiển thị')).toBeInTheDocument();
    }, 15000);

    it('renders the update title, disables the password field, and pre-fills company/role', () => {
        const dataInit: IUser = {
            _id: 'u1',
            name: 'Alice',
            email: 'alice@example.com',
            age: 25,
            gender: 'FEMALE',
            address: 'Hanoi',
            role: { _id: 'r1', name: 'ADMIN' },
            company: { _id: 'c1', name: 'Acme Corp' },
        };

        render(
            <ModalUser
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={dataInit}
                setDataInit={vi.fn()}
                reloadTable={vi.fn()}
            />,
        );

        expect(screen.getByText('Cập nhật User')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeDisabled();
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('ADMIN')).toBeInTheDocument();
    }, 15000);

    it('submits the create form and calls callCreateUser with the entered values', async () => {
        mockCompanyAndRoleFetch();
        let capturedBody: any = null;
        server.use(
            http.post(`${BASE_URL}/api/v1/users`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({ statusCode: 201, message: 'ok', data: capturedBody });
            }),
        );

        const setOpenModal = vi.fn();
        const reloadTable = vi.fn();

        render(
            <ModalUser
                openModal={true}
                setOpenModal={setOpenModal}
                dataInit={null}
                setDataInit={vi.fn()}
                reloadTable={reloadTable}
            />,
        );

        await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByLabelText('Password'), 'Password1');
        await userEvent.type(screen.getByLabelText('Tên hiển thị'), 'Alice');
        await userEvent.type(screen.getByLabelText('Tuổi'), '25');
        await userEvent.type(screen.getByLabelText('Địa chỉ'), 'Hanoi');

        await userEvent.click(screen.getByLabelText('Giới Tính'));
        await userEvent.click(await screen.findByTitle('Nữ'));

        await userEvent.click(screen.getByLabelText('Vai trò'));
        await userEvent.click(await screen.findByTitle('ADMIN'));

        await userEvent.click(screen.getByLabelText('Thuộc Công Ty'));
        await userEvent.click(await screen.findByTitle('Acme Corp'));

        await userEvent.click(document.querySelector('.ant-btn-primary') as HTMLButtonElement);

        await vi.waitFor(() => {
            expect(reloadTable).toHaveBeenCalled();
        });
        expect(capturedBody.email).toBe('alice@example.com');
        expect(capturedBody.name).toBe('Alice');
        expect(capturedBody.age).toBe(25);
        expect(capturedBody.gender).toBe('FEMALE');
        expect(capturedBody.address).toBe('Hanoi');
        expect(capturedBody.role).toBe('r1');
        expect(capturedBody.company).toEqual({ _id: 'c1', name: 'Acme Corp' });
        expect(setOpenModal).toHaveBeenCalledWith(false);
    }, 30000);
});
