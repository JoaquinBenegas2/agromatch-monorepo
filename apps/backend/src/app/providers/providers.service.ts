import { Inject, Injectable } from '@nestjs/common';
import type { NeedCategory, PublicProvider } from '@org/shared-types';
import { PROVIDER_REPO, type ProviderRepo } from '../../repos/provider.port.js';

@Injectable()
export class ProvidersService {
  constructor(@Inject(PROVIDER_REPO) private readonly providers: ProviderRepo) {}

  async list(category?: NeedCategory): Promise<PublicProvider[]> {
    const providers = await this.providers.list(category ? { category } : undefined);
    return providers.map(({ contact: _contact, ...provider }) => provider);
  }
}
