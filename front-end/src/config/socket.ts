import { io, Socket } from 'socket.io-client';

// Dùng cùng env var với axios-customize.ts để nhất quán origin BE.
// transports: ['websocket'] để bỏ qua bước handshake HTTP polling mặc định
// của socket.io — vừa nhanh hơn, vừa tránh MSW (dùng trong test) bắt nhầm
// request polling này là một API call chưa có handler.
export const createNotificationSocket = (): Socket =>
    io(`${import.meta.env.VITE_BACKEND_URL}/notifications`, {
        auth: { token: localStorage.getItem('access_token') },
        transports: ['websocket'],
        autoConnect: false,
    });
