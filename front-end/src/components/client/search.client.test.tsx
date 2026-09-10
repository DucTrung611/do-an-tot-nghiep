import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import SearchClient from './search.client';

// Raise the per-test timeout above the 5s default: antd Select popups + userEvent
// typing can run slow under a loaded full-suite run.
vi.setConfig({ testTimeout: 15000 });

describe('SearchClient', () => {
    it('calls onSearch with an empty query when nothing is selected', async () => {
        const onSearch = vi.fn();
        render(<SearchClient onSearch={onSearch} />);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Search' }));

        expect(onSearch).toHaveBeenCalledWith('');
    });

    it('builds a case-insensitive regex query from the selected skill', async () => {
        const onSearch = vi.fn();
        const { container } = render(<SearchClient onSearch={onSearch} />);

        const user = userEvent.setup();
        const skillsInput = container.querySelector('input#skills') as Element;
        await user.click(skillsInput);
        const option = await screen.findByTitle('React.JS');
        await user.click(option);
        await user.keyboard('{Escape}');

        await user.click(screen.getByRole('button', { name: 'Search' }));

        expect(onSearch).toHaveBeenCalledWith('skills=/REACT\\.JS/i');
    });

    it('filters out the "ALL" location option from the query', async () => {
        const onSearch = vi.fn();
        const { container } = render(<SearchClient onSearch={onSearch} />);

        const user = userEvent.setup();
        const locationInput = container.querySelector('input#location') as Element;
        await user.click(locationInput);
        const option = await screen.findByTitle('Tất cả thành phố');
        await user.click(option);
        await user.keyboard('{Escape}');

        await user.click(screen.getByRole('button', { name: 'Search' }));

        expect(onSearch).toHaveBeenCalledWith('');
    });
});
