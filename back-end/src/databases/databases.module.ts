import { Module } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Permission, PermissionSchema } from 'src/permissions/schemas/permission.schema';
import { Role, RoleSchema } from 'src/roles/schemas/role.schema';
import { Company, CompanySchema } from 'src/companies/schemas/company.schema';
import { Job, JobSchema } from 'src/jobs/schemas/job.schema';
import { Subscriber, SubscriberSchema } from 'src/subscribers/schemas/subscriber.schema';
import { Resume, ResumeSchema } from 'src/resumes/schemas/resume.schema';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [DatabasesController],
  providers: [DatabasesService, UsersService],
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Job.name, schema: JobSchema },
      { name: Subscriber.name, schema: SubscriberSchema },
      { name: Resume.name, schema: ResumeSchema },
    ])
  ],

})
export class DatabasesModule { }
