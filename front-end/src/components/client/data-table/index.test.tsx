import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataTable from './index';

// Raise the per-test timeout above the 5s default: ProTable's initial render can run
// slow under a loaded full-suite run.
vi.setConfig({ testTimeout: 15000 });

describe('DataTable', () => {
    it('renders a ProTable with the given data without crashing', () => {
        render(
            <DataTable
                columns={[{ title: 'Name', dataIndex: 'name' }]}
                dataSource={[{ id: '1', name: 'Item 1' }]}
                rowKey="id"
                search={false}
                pagination={false}
            />,
        );

        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Name')).toBeInTheDocument();
    });
});
