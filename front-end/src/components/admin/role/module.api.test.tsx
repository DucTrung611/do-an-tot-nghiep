import { describe, expect, it } from 'vitest';
import { Form } from 'antd';
import { ProForm } from '@ant-design/pro-components';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModuleApi from './module.api';
import { IPermission } from '@/types/backend';

const listPermissions: { module: string; permissions: IPermission[] }[] = [
    {
        module: 'COMPANIES',
        permissions: [
            { _id: 'p1', name: 'Get companies', apiPath: '/api/v1/companies', method: 'GET', module: 'COMPANIES' },
            { _id: 'p2', name: 'Create company', apiPath: '/api/v1/companies', method: 'POST', module: 'COMPANIES' },
        ],
    },
    {
        module: 'USERS',
        permissions: [
            { _id: 'p3', name: 'Get users', apiPath: '/api/v1/users', method: 'GET', module: 'USERS' },
        ],
    },
];

function Harness({ list = listPermissions }: { list?: typeof listPermissions }) {
    const [form] = Form.useForm();
    return (
        <ProForm form={form} submitter={false}>
            <ModuleApi form={form} listPermissions={list} />
        </ProForm>
    );
}

describe('ModuleApi', () => {
    it('renders a collapse panel for each permission module', () => {
        render(<Harness />);

        expect(screen.getByText('COMPANIES')).toBeInTheDocument();
        expect(screen.getByText('USERS')).toBeInTheDocument();
    }, 15000);

    it('expands a panel to reveal its individual permissions', async () => {
        render(<Harness />);

        // Panels use `forceRender`, so their permission rows exist in the DOM even while
        // collapsed; expanding toggles the panel's active/inactive content wrapper.
        const companiesItem = screen.getByText('COMPANIES').closest('.ant-collapse-item') as HTMLElement;
        expect(companiesItem.className).not.toContain('ant-collapse-item-active');

        await userEvent.click(screen.getByText('COMPANIES'));

        expect(companiesItem.className).toContain('ant-collapse-item-active');
        expect(screen.getByText('Get companies')).toBeInTheDocument();
        expect(screen.getByText('Create company')).toBeInTheDocument();
    }, 15000);

    it('checking the module-level switch checks every permission switch underneath it', async () => {
        render(<Harness />);

        const companiesPanel = screen.getByText('COMPANIES').closest('.ant-collapse-header') as HTMLElement;
        const moduleSwitch = within(companiesPanel).getByRole('switch');

        await userEvent.click(screen.getByText('COMPANIES'));
        await userEvent.click(moduleSwitch);

        const switches = screen.getAllByRole('switch');
        // module switch + 2 permission switches for COMPANIES should now be checked
        const checked = switches.filter((el) => el.getAttribute('aria-checked') === 'true');
        expect(checked.length).toBe(3);
    }, 15000);

    it('renders nothing when listPermissions is null', () => {
        const { container } = render(<Harness list={null as any} />);
        expect(container.querySelector('.ant-collapse-item')).toBeNull();
    }, 15000);
});
