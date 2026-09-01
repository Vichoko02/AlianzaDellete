import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WikiModule } from './modules/wiki/wiki.module';
import { NewsModule } from './modules/news/news.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { FirebaseConfig } from './config/firebase.config';
import { StripeConfig } from './config/stripe.config';

@Module({
  imports: [
    FirebaseConfig,
    StripeConfig,
    AuthModule,
    UsersModule,
    RolesModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    WikiModule,
    NewsModule,
    ProjectsModule,
    LogisticsModule,
  ],
})
export class AppModule {}
