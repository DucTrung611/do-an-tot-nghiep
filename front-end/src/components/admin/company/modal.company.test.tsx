import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/msw/server';
import { BASE_URL } from '@/test/msw/handlers';
import ModalCompany from './modal.company';
import { ICompany } from '@/types/backend';

function uploadLogo() {
    const file = new File(['hello'], 'logo.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    return userEvent.upload(input, file);
}

describe('ModalCompany', () => {
    it('renders nothing when openModal is false', () => {
        const { container } = render(
            <ModalCompany
                openModal={false}
                setOpenModal={vi.fn()}
                dataInit={null}
                setDataInit={vi.fn()}
                reloadTable={vi.fn()}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('renders the create title and required fields when openModal is true', () => {
        render(
            <ModalCompany
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={null}
                setDataInit={vi.fn()}
                reloadTable={vi.fn()}
            />,
        );

        expect(screen.getByText('Tạo mới Company')).toBeInTheDocument();
        expect(screen.getByLabelText('Tên công ty')).toBeInTheDocument();
        expect(screen.getByLabelText('Địa chỉ')).toBeInTheDocument();
    }, 15000);

    it('renders the update title when dataInit has an id', () => {
        const dataInit: ICompany = {
            _id: 'c1',
            name: 'Acme',
            address: 'Hanoi',
            logo: 'acme.png',
            description: 'desc',
        };

        render(
            <ModalCompany
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={dataInit}
                setDataInit={vi.fn()}
                reloadTable={vi.fn()}
            />,
        );

        expect(screen.getByText('Cập nhật Company')).toBeInTheDocument();
    });

    it('blocks submission via required-field validation when no logo has been uploaded', async () => {
        const reloadTable = vi.fn();

        render(
            <ModalCompany
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={null}
                setDataInit={vi.fn()}
                reloadTable={reloadTable}
            />,
        );

        await userEvent.type(screen.getByLabelText('Tên công ty'), 'Acme');
        await userEvent.type(screen.getByLabelText('Địa chỉ'), 'Hanoi');
        await userEvent.click(document.querySelector('.ant-btn-primary') as HTMLButtonElement);

        await vi.waitFor(() => {
            expect(screen.getAllByText('Vui lòng không bỏ trống').length).toBeGreaterThan(0);
        });
        expect(reloadTable).not.toHaveBeenCalled();
    }, 15000);

    it('uploads the logo then submits and calls callCreateCompany', async () => {
        let capturedBody: any = null;
        let uploadCalled = false;
        server.use(
            http.post(`${BASE_URL}/api/v1/files/upload`, () => {
                uploadCalled = true;
                return HttpResponse.json({ statusCode: 201, message: 'ok', data: { fileName: 'logo.png' } });
            }),
            http.post(`${BASE_URL}/api/v1/companies`, async ({ request }) => {
                capturedBody = await request.json();
                return HttpResponse.json({ statusCode: 201, message: 'ok', data: capturedBody });
            }),
        );

        const reloadTable = vi.fn();
        render(
            <ModalCompany
                openModal={true}
                setOpenModal={vi.fn()}
                dataInit={null}
                setDataInit={vi.fn()}
                reloadTable={reloadTable}
            />,
        );

        await userEvent.type(screen.getByLabelText('Tên công ty'), 'Acme');
        await userEvent.type(screen.getByLabelText('Địa chỉ'), 'Hanoi');
        await uploadLogo();

        await vi.waitFor(() => {
            expect(uploadCalled).toBe(true);
        });
        await vi.waitFor(() => {
            expect(screen.getByText('logo.png')).toBeInTheDocument();
        });

        await userEvent.click(document.querySelector('.ant-btn-primary') as HTMLButtonElement);

        await vi.waitFor(() => {
            expect(reloadTable).toHaveBeenCalled();
        });
        expect(capturedBody.name).toBe('Acme');
        expect(capturedBody.address).toBe('Hanoi');
        expect(capturedBody.logo).toBe('logo.png');
    }, 20000);
});
