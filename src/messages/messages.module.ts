import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { GroupsModule } from '../groups/groups.module';

/**
 * MessagesModule encapsulates all message-related functionality.
 * 
 * Why this structure:
 * - Feature module pattern: keeps related code together
 * - Clear separation of concerns: controller -> service -> database
 * - Easy to test: each layer can be tested independently
 * - Scalable: new features can be added without affecting other modules
 * 
 * Note: PrismaService is available globally via @Global() in PrismaModule,
 * so we don't need to import PrismaModule here.
 */
@Module({
  imports: [GroupsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
