import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebounceSelect } from './debouce.select';

describe('DebounceSelect', () => {
    it('fetches initial options when the select gains focus', async () => {
        const fetchOptions = vi.fn().mockResolvedValue([{ label: 'Acme', value: 'c1' }]);

        render(
            <DebounceSelect
                fetchOptions={fetchOptions}
                placeholder="Chọn công ty"
                value={[]}
            />,
        );

        await userEvent.click(screen.getByRole('combobox'));

        await waitFor(() => {
            expect(fetchOptions).toHaveBeenCalledWith('');
        });
    });

    it('debounces the search text before calling fetchOptions', async () => {
        const fetchOptions = vi.fn().mockResolvedValue([{ label: 'Acme', value: 'c1' }]);

        render(
            <DebounceSelect
                fetchOptions={fetchOptions}
                debounceTimeout={10}
                placeholder="Chọn công ty"
                value={[]}
            />,
        );

        const input = screen.getByRole('combobox') as HTMLInputElement;
        await userEvent.click(input);
        fireEvent.change(input, { target: { value: 'acme' } });

        await waitFor(() => {
            expect(fetchOptions).toHaveBeenCalledWith('acme');
        }, { timeout: 2000 });
    });

    it('shows fetched options in the dropdown', async () => {
        const fetchOptions = vi.fn().mockResolvedValue([{ label: 'Acme Corp', value: 'c1' }]);

        render(
            <DebounceSelect
                fetchOptions={fetchOptions}
                placeholder="Chọn công ty"
                value={[]}
            />,
        );

        await userEvent.click(screen.getByRole('combobox'));

        await waitFor(() => {
            expect(screen.getByTitle('Acme Corp')).toBeInTheDocument();
        });
    });
});
