import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { callFetchNotification, callFetchUnreadCount } from '@/config/api';
import { INotification } from '@/types/backend';

interface IState {
    isFetching: boolean;
    meta: {
        current: number;
        pageSize: number;
        pages: number;
        total: number;
    },
    result: INotification[];
    unread: number;
}

export const fetchNotification = createAsyncThunk(
    'notification/fetchNotification',
    async ({ query }: { query: string }) => {
        const response = await callFetchNotification(query);
        return response;
    }
)

export const fetchUnreadCount = createAsyncThunk(
    'notification/fetchUnreadCount',
    async () => {
        const response = await callFetchUnreadCount();
        return response;
    }
)

const initialState: IState = {
    isFetching: true,
    meta: {
        current: 1,
        pageSize: 10,
        pages: 0,
        total: 0
    },
    result: [],
    unread: 0
};

export const notificationSlide = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        // socket đẩy 1 notification mới về theo thời gian thực
        pushNotification: (state, action: PayloadAction<INotification>) => {
            state.result.unshift(action.payload);
            state.unread += 1;
        },
        markRead: (state, action: PayloadAction<string>) => {
            const item = state.result.find(n => n._id === action.payload);
            if (item && !item.isRead) {
                item.isRead = true;
                state.unread = Math.max(0, state.unread - 1);
            }
        },
        markAllRead: (state) => {
            state.result.forEach(n => { n.isRead = true; });
            state.unread = 0;
        },
        // dispatch khi logout để không rò dữ liệu của user trước sang phiên sau
        resetNotification: () => initialState,
    },
    extraReducers: (builder) => {
        builder.addCase(fetchNotification.pending, (state) => {
            state.isFetching = true;
        })

        builder.addCase(fetchNotification.rejected, (state) => {
            state.isFetching = false;
        })

        builder.addCase(fetchNotification.fulfilled, (state, action) => {
            if (action.payload && action.payload.data) {
                state.isFetching = false;
                state.meta = action.payload.data.meta;
                state.result = action.payload.data.result;
            } else {
                state.isFetching = false;
            }
        })

        builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
            if (action.payload && action.payload.data !== undefined) {
                state.unread = action.payload.data;
            }
        })
    },
});

export const {
    pushNotification,
    markRead,
    markAllRead,
    resetNotification,
} = notificationSlide.actions;

export default notificationSlide.reducer;
