import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { callFetchSavedJob, callFetchSavedJobIds } from '@/config/api';
import { ISavedJob } from '@/types/backend';

interface IState {
    isFetching: boolean;
    meta: {
        current: number;
        pageSize: number;
        pages: number;
        total: number;
    },
    result: ISavedJob[];
    // danh sách jobId đã lưu (dạng string) để job.card/detail tô tim nhanh
    // mà không cần chờ fetch phân trang
    savedIds: string[];
}

export const fetchSavedJob = createAsyncThunk(
    'savedJob/fetchSavedJob',
    async ({ query }: { query: string }) => {
        const response = await callFetchSavedJob(query);
        return response;
    }
)

export const fetchSavedJobIds = createAsyncThunk(
    'savedJob/fetchSavedJobIds',
    async () => {
        const response = await callFetchSavedJobIds();
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
    savedIds: []
};

export const savedJobSlide = createSlice({
    name: 'savedJob',
    initialState,
    reducers: {
        // optimistic update: gọi ngay khi user bấm tim, không chờ API trả lời
        addSavedId: (state, action: PayloadAction<string>) => {
            if (!state.savedIds.includes(action.payload)) {
                state.savedIds.push(action.payload);
            }
        },
        removeSavedId: (state, action: PayloadAction<string>) => {
            state.savedIds = state.savedIds.filter(id => id !== action.payload);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchSavedJob.pending, (state) => {
            state.isFetching = true;
        })

        builder.addCase(fetchSavedJob.rejected, (state) => {
            state.isFetching = false;
        })

        builder.addCase(fetchSavedJob.fulfilled, (state, action) => {
            if (action.payload && action.payload.data) {
                state.isFetching = false;
                state.meta = action.payload.data.meta;
                state.result = action.payload.data.result;
            } else {
                state.isFetching = false;
            }
        })

        builder.addCase(fetchSavedJobIds.fulfilled, (state, action) => {
            if (action.payload && action.payload.data) {
                state.savedIds = action.payload.data;
            }
        })
    },
});

export const {
    addSavedId,
    removeSavedId,
} = savedJobSlide.actions;

export default savedJobSlide.reducer;
