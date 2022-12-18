import { Model } from '@zenstackhq/language/ast';
import { PluginOptions } from '@zenstackhq/sdk';
import PolicyGuardGenerator from './policy-guard-generator';

export const name = 'Access Policy';

export default async function run(model: Model, options: PluginOptions) {
    return new PolicyGuardGenerator().generate(model, options);
}
