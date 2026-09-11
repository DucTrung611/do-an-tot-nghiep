import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';

function makeSocket(auth: Record<string, any> = {}, headers: Record<string, any> = {}) {
    return {
        handshake: { auth, headers },
        data: {} as Record<string, any>,
        join: jest.fn(),
        disconnect: jest.fn(),
    } as any;
}

describe('NotificationsGateway', () => {
    let gateway: NotificationsGateway;
    let jwtService: { verify: jest.Mock };
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        jwtService = { verify: jest.fn() };
        configService = { get: jest.fn().mockReturnValue('secret') };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsGateway,
                { provide: JwtService, useValue: jwtService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        gateway = module.get<NotificationsGateway>(NotificationsGateway);
    });

    describe('handleConnection', () => {
        it('joins the per-user room when the handshake carries a valid JWT', async () => {
            jwtService.verify.mockReturnValue({ _id: 'user1' });
            const client = makeSocket({ token: 'valid-token' });

            await gateway.handleConnection(client);

            expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'secret' });
            expect(client.join).toHaveBeenCalledWith('user:user1');
            expect(client.disconnect).not.toHaveBeenCalled();
        });

        it('falls back to the Authorization header when auth.token is absent', async () => {
            jwtService.verify.mockReturnValue({ _id: 'user1' });
            const client = makeSocket({}, { authorization: 'Bearer header-token' });

            await gateway.handleConnection(client);

            expect(jwtService.verify).toHaveBeenCalledWith('header-token', { secret: 'secret' });
            expect(client.join).toHaveBeenCalledWith('user:user1');
        });

        it('disconnects a client with no token at all, without joining any room', async () => {
            const client = makeSocket();

            await gateway.handleConnection(client);

            expect(client.join).not.toHaveBeenCalled();
            expect(client.disconnect).toHaveBeenCalledWith(true);
        });

        it('disconnects a client whose token fails verification, without joining any room', async () => {
            jwtService.verify.mockImplementation(() => { throw new Error('invalid signature'); });
            const client = makeSocket({ token: 'garbage' });

            await gateway.handleConnection(client);

            expect(client.join).not.toHaveBeenCalled();
            expect(client.disconnect).toHaveBeenCalledWith(true);
        });
    });

    describe('emitToUser', () => {
        it('emits the raw payload to the user-scoped room, unwrapped (no {statusCode,message,data} envelope)', () => {
            const server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
            (gateway as any).server = server;

            gateway.emitToUser('user1', 'notification:new', { title: 'Hi' });

            expect(server.to).toHaveBeenCalledWith('user:user1');
            expect(server.emit).toHaveBeenCalledWith('notification:new', { title: 'Hi' });
        });

        it('does not throw when the server is not attached yet', () => {
            (gateway as any).server = undefined;

            expect(() => gateway.emitToUser('user1', 'notification:new', {})).not.toThrow();
        });
    });
});
