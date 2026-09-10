import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import { Subscriber } from 'src/subscribers/schemas/subscriber.schema';
import { Job } from 'src/jobs/schemas/job.schema';

describe('MailService', () => {
    let service: MailService;
    let mailerService: { sendMail: jest.Mock };
    let subscriberModel: { find: jest.Mock };
    let jobModel: { find: jest.Mock };

    beforeEach(async () => {
        mailerService = { sendMail: jest.fn().mockResolvedValue(undefined) };
        subscriberModel = { find: jest.fn() };
        jobModel = { find: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MailService,
                { provide: MailerService, useValue: mailerService },
                { provide: getModelToken(Subscriber.name), useValue: subscriberModel },
                { provide: getModelToken(Job.name), useValue: jobModel },
            ],
        }).compile();

        service = module.get<MailService>(MailService);
    });

    describe('sendJobsToSubscriber', () => {
        it('does nothing when the subscriber has no email', async () => {
            await service.sendJobsToSubscriber({ skills: ['nestjs'] } as any);

            expect(jobModel.find).not.toHaveBeenCalled();
        });

        it('does nothing when the subscriber has no skills', async () => {
            await service.sendJobsToSubscriber({ email: 'a@b.com', skills: [] } as any);

            expect(jobModel.find).not.toHaveBeenCalled();
        });

        it('does nothing when no jobs match the subscriber\'s skills', async () => {
            jobModel.find.mockResolvedValue([]);

            await service.sendJobsToSubscriber({ email: 'a@b.com', skills: ['nestjs'] } as any);

            expect(mailerService.sendMail).not.toHaveBeenCalled();
        });

        it('emails the subscriber with slugified, formatted job listings', async () => {
            jobModel.find.mockResolvedValue([
                {
                    _id: 'job1',
                    name: 'Senior NestJS Dev',
                    company: { name: 'ACME' },
                    salary: 20000000,
                    skills: ['nestjs'],
                },
            ]);

            await service.sendJobsToSubscriber({ email: 'a@b.com', name: 'A', skills: ['nestjs'] } as any);

            expect(jobModel.find).toHaveBeenCalledWith({ skills: { $in: ['nestjs'] } });
            expect(mailerService.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'a@b.com',
                    template: 'new-job',
                    context: expect.objectContaining({
                        receiver: 'A',
                        jobs: [
                            expect.objectContaining({
                                name: 'Senior NestJS Dev',
                                company: 'ACME',
                                salary: '20,000,000 đ',
                                url: expect.stringContaining('senior-nestjs-dev?id=job1'),
                            }),
                        ],
                    }),
                }),
            );
        });
    });

    describe('sendJobsToAllSubscribers', () => {
        it('sends to every subscriber and keeps going if one fails', async () => {
            subscriberModel.find.mockResolvedValue([
                { email: 'a@b.com', skills: ['nestjs'] },
                { email: 'b@b.com', skills: ['react'] },
            ]);
            jobModel.find.mockResolvedValue([]);

            await service.sendJobsToAllSubscribers();

            expect(jobModel.find).toHaveBeenCalledTimes(2);
        });
    });
});
