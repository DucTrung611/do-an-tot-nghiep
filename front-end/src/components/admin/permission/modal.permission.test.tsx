import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import ModalPermission from './modal.permission';
import { IPermission } from '@/types/backend';

async function fillCommonFields() {
    await userEvent.type(screen.getByLabelText('Tên Permission'), 'Get companies');
    await userEvent.type(screen.getByLabelText('API Path'), '/api/v1/companies');

    await userEvent.click(screen.getByLabelText('Method'));
    await userEvent.click(await screen.findByTitle('GET'));

    await userEvent.click(screen.getByLabelText('Thuộc Module'));
    await userEvent.click(await screen.findByTitle('COMPANIES'));
}

describe('ModalPermission', () => {
    it('renders the create title when there is no dataInit', () => {
        render(
            <ModalPermission
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={null}
                setDataInit={vi.fn()}
                reloadTable={vi.fn()}
            />,
        );

        expect(screen.getByText('Tạo mới Permission')).toBeInTheDocument();
    }, 15000);

    it('renders the update title and pre-fills fields when dataInit has an id', () => {
        const dataInit: IPermission = {
            _id: 'p1',
            name: 'Get companies',
            apiPath: '/api/v1/companies',
            method: 'GET',
            module: 'COMPANIES',
        };

        render(
            <ModalPermission
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={dataInit}
                setDataInit={vi.fn()}
                reloadTable={vi.fn()}
            />,
        );

        expect(screen.getByText('Cập nhật Permission')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Get companies')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/api/v1/companies')).toBeInTheDocument();
    }, 15000);

    it('submits the form and calls callCreatePermission with the entered values', async () => {
        let capturedBody: any = null;
        server.use(
            http.post(`${BASE_URL}/api/v1/permissions`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({ statusCode: 201, message: 'ok', data: capturedBody });
            }),
        );

        const setOpenModal = vi.fn();
        const setDataInit = vi.fn();
        const reloadTable = vi.fn();

        render(
            <ModalPermission
                openModal={true}
                setOpenModal={setOpenModal}
                dataInit={null}
                setDataInit={setDataInit}
                reloadTable={reloadTable}
            />,
        );

        await fillCommonFields();
        await userEvent.click(document.querySelector('.ant-btn-primary') as HTMLButtonElement);

        await vi.waitFor(() => {
            expect(reloadTable).toHaveBeenCalled();
        });
        expect(capturedBody).toEqual({
            name: 'Get companies',
            apiPath: '/api/v1/companies',
            method: 'GET',
            module: 'COMPANIES',
        });
        expect(setOpenModal).toHaveBeenCalledWith(false);
    }, 20000);

    it('submits an update and calls callUpdatePermission for an existing permission', async () => {
        let capturedBody: any = null;
        server.use(
            http.patch(`${BASE_URL}/api/v1/permissions/p1`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({ statusCode: 200, message: 'ok', data: capturedBody });
            }),
        );

        const dataInit: IPermission = {
            _id: 'p1',
            name: 'Get companies',
            apiPath: '/api/v1/companies',
            method: 'GET',
            module: 'COMPANIES',
        };
        const reloadTable = vi.fn();

        render(
            <ModalPermission
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={dataInit}
                setDataInit={vi.fn()}
                reloadTable={reloadTable}
            />,
        );

        await userEvent.click(document.querySelector('.ant-btn-primary') as HTMLButtonElement);

        await vi.waitFor(() => {
            expect(reloadTable).toHaveBeenCalled();
        });
        expect(capturedBody.name).toBe('Get companies');
    }, 15000);
});
