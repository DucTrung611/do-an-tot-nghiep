import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    namespace: '/notifications',
    cors: { origin: true, credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(NotificationsGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    // JwtAuthGuard (global) chỉ chạy cho HTTP — nó đọc request.route.path, không
    // bao giờ được gọi cho WS handshake. Vì vậy gateway phải tự verify JWT.
    async handleConnection(client: Socket) {
        try {
            const raw =
                client.handshake.auth?.token ??
                (client.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer /, '');

            if (!raw) {
                throw new Error('missing token');
            }

            const payload = this.jwtService.verify(raw, {
                secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
            });

            client.data.userId = payload._id;
            client.join(`user:${payload._id}`);
        } catch (err) {
            this.logger.warn(`WS connection rejected: ${(err as Error).message}`);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        // no-op: socket.io tự dọn room khi client rời
    }

    // TransformInterceptor chỉ áp cho HTTP => payload gửi qua đây là document
    // thô, KHÔNG có bọc {statusCode, message, data} như response REST.
    emitToUser(userId: string, event: string, payload: any) {
        this.server?.to(`user:${String(userId)}`).emit(event, payload);
    }
}
