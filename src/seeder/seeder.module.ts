
import { Module } from '@nestjs/common';
import { SeederController } from './seeder.controller';
import { SeederService } from './seeder.service';


@Module({
  controllers: [SeederController],
  providers: [SeederService],
  exports: [SeederService], 
})
export class SeederModule {}