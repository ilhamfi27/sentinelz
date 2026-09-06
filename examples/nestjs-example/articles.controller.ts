import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { SentinelzGuard, CheckAbility } from '../../src/nestjs';

@Controller('articles')
@UseGuards(SentinelzGuard)
export class ArticlesController {
  @Patch(':id')
  @CheckAbility({ action: 'write', resource: 'articles' })
  async updateArticle(@Param('id') id: string) {
    return { success: true, id };
  }
}
