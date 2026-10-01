import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { WikiModule } from './modules/wiki/wiki.module';
import { NewsModule } from './modules/news/news.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { FirebaseConfig } from './config/firebase.config';

@Module({
  imports: [
    FirebaseConfig,
    AuthModule,
    UsersModule,
    RolesModule,
    WikiModule,
    NewsModule,
    ProjectsModule,
  ],
})
export class AppModule {}
