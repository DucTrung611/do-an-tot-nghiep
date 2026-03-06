import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app';
import { Provider } from 'react-redux'
import { store } from '@/redux/store';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
