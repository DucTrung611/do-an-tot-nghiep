import type { PropsWithChildren, ReactElement } from 'react';
import { configureStore, type PreloadedState } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import accountReducer from '@/redux/slice/accountSlide';
import companyReducer from '@/redux/slice/companySlide';
import userReducer from '@/redux/slice/userSlide';
import jobReducer from '@/redux/slice/jobSlide';
import resumeReducer from '@/redux/slice/resumeSlide';
import permissionReducer from '@/redux/slice/permissionSlide';
import roleReducer from '@/redux/slice/roleSlide';
import type { RootState } from '@/redux/store';

const rootReducer = {
    account: accountReducer,
    company: companyReducer,
    user: userReducer,
    job: jobReducer,
    resume: resumeReducer,
    permission: permissionReducer,
    role: roleReducer,
};

export const makeTestStore = (preloadedState?: PreloadedState<RootState>) =>
    configureStore({ reducer: rootReducer, preloadedState });

type ExtraOptions = {
    preloadedState?: PreloadedState<RootState>;
    store?: ReturnType<typeof makeTestStore>;
    route?: string;
} & Omit<RenderOptions, 'wrapper'>;

// Use this instead of RTL's bare `render` for anything that reads Redux state
// or router context (most components/pages here do, via useAppSelector or Link/useNavigate).
export function renderWithProviders(
    ui: ReactElement,
    { preloadedState, store = makeTestStore(preloadedState), route = '/', ...renderOptions }: ExtraOptions = {},
) {
    function Wrapper({ children }: PropsWithChildren) {
        return (
            <Provider store={store}>
                <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </Provider>
        );
    }

    return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
