import {
    DataModel,
    DataModelField,
    isDataModel,
    isEnum,
    isLiteralExpr,
} from '@zenstackhq/language/ast';
import {
    PolicyKind,
    PolicyOperationKind,
    RuntimeAttribute,
} from '@zenstackhq/runtime/server';
import path from 'path';
import {
    CodeBlockWriter,
    Project,
    SourceFile,
    VariableDeclarationKind,
} from 'ts-morph';
import ExpressionWriter from './expression-writer';
import { Model } from '@zenstackhq/language/ast';
import { GUARD_FIELD_NAME, PluginOptions } from '@zenstackhq/sdk';
import { resolved } from '@zenstackhq/sdk/utils';
import { RUNTIME_PACKAGE } from '../constants';
import { camelCase } from 'change-case';

const UNKNOWN_USER_ID = 'zenstack_unknown_user';

/**
 * Generates source file that contains Prisma query guard objects used for injecting database queries
 */
export default class PolicyGuardGenerator {
    async generate(model: Model, options: PluginOptions) {
        const project = new Project();
        const outDir =
            (options.output as string) ?? 'node_modules/.zenstack/src';
        const sf = project.createSourceFile(
            path.join(outDir, 'index.ts'),
            undefined,
            { overwrite: true }
        );

        sf.addImportDeclaration({
            namedImports: [{ name: 'QueryContext' }],
            moduleSpecifier: `${RUNTIME_PACKAGE}/server`,
            isTypeOnly: true,
        });

        // import enums
        for (const e of model.declarations.filter((d) => isEnum(d))) {
            sf.addImportDeclaration({
                namedImports: [{ name: e.name }],
                moduleSpecifier: '@prisma/client',
            });
        }

        const models = model.declarations.filter((d) =>
            isDataModel(d)
        ) as DataModel[];

        const policyMap: Record<string, Record<string, string>> = {};
        for (const model of models) {
            policyMap[model.name] = await this.generateQueryGuardForModel(
                model,
                sf
            );
        }

        sf.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: 'policy',
                    initializer: (writer) => {
                        writer.block(() => {
                            this.generateFieldMapping(models, writer);

                            writer.write('guard:'),
                                writer.block(() => {
                                    for (const [model, map] of Object.entries(
                                        policyMap
                                    )) {
                                        writer.write(`${camelCase(model)}:`);
                                        writer.block(() => {
                                            for (const [
                                                op,
                                                func,
                                            ] of Object.entries(map)) {
                                                writer.write(`${op}: ${func},`);
                                            }
                                        });
                                        writer.write(',');
                                    }
                                });
                        });
                    },
                },
            ],
        });

        sf.addStatements('export default policy');

        // this.generateFieldMapping(models, sf);

        // for (const model of models) {
        //     await this.generateQueryGuardForModel(model, sf);
        // }

        sf.formatText();
        await project.save();
    }

    private generateFieldMapping(models: DataModel[], writer: CodeBlockWriter) {
        writer.write('fieldMapping:');
        writer.block(() => {
            for (const model of models) {
                writer.write(`${camelCase(model.name)}:`);
                writer.block(() => {
                    for (const f of model.fields) {
                        writer.write(`${f.name}: {
                        name: "${f.name}",
                        type: "${
                            f.type.reference
                                ? f.type.reference.$refText
                                : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                  f.type.type!
                        }",
                        isDataModel: ${isDataModel(f.type.reference?.ref)},
                        isArray: ${f.type.array},
                        isOptional: ${f.type.optional},
                        attributes: ${JSON.stringify(
                            this.getFieldAttributes(f)
                        )},    
                    },`);
                    }
                });
                writer.write(',');
            }
        });
        writer.write(',');

        // sourceFile.addVariableStatement({
        //     isExported: true,
        //     declarationKind: VariableDeclarationKind.Const,
        //     declarations: [
        //         {
        //             name: '_fieldMapping',
        //             initializer: JSON.stringify(mapping),
        //         },
        //     ],
        // });
    }

    private getFieldAttributes(field: DataModelField): RuntimeAttribute[] {
        return field.attributes
            .map((attr) => {
                const args: Array<{ name?: string; value: unknown }> = [];
                for (const arg of attr.args) {
                    if (!isLiteralExpr(arg.value)) {
                        // attributes with non-literal args are skipped
                        return undefined;
                    }
                    args.push({ name: arg.name, value: arg.value.value });
                }
                return { name: resolved(attr.decl).name, args };
            })
            .filter((d): d is RuntimeAttribute => !!d);
    }

    private getPolicyExpressions(
        model: DataModel,
        kind: PolicyKind,
        operation: PolicyOperationKind
    ) {
        const attrs = model.attributes.filter(
            (attr) => attr.decl.ref?.name === `@@${kind}`
        );
        return attrs
            .filter((attr) => {
                if (
                    !isLiteralExpr(attr.args[0].value) ||
                    typeof attr.args[0].value.value !== 'string'
                ) {
                    return false;
                }
                const ops = attr.args[0].value.value
                    .split(',')
                    .map((s) => s.trim());
                return ops.includes(operation) || ops.includes('all');
            })
            .map((attr) => attr.args[1].value);
    }

    private async generateQueryGuardForModel(
        model: DataModel,
        sourceFile: SourceFile
    ) {
        const result: Record<string, string> = {};
        for (const kind of ['create', 'update', 'read', 'delete']) {
            const func = this.generateQueryGuardFunction(
                sourceFile,
                model,
                kind
            );
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            result[kind] = func.getName()!;
        }
        return result;
    }

    private generateQueryGuardFunction(
        sourceFile: SourceFile,
        model: DataModel,
        kind: string
    ) {
        const func = sourceFile
            .addFunction({
                name: model.name + '_' + kind,
                returnType: 'any',
                parameters: [
                    {
                        name: 'context',
                        type: 'QueryContext',
                    },
                ],
            })
            .addBody();

        func.addStatements(
            // make suer user id is always available
            `const user = context.user?.id ? context.user : { ...context.user, id: '${UNKNOWN_USER_ID}' };`
        );

        // r = <guard object>;
        func.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: 'r',
                    initializer: (writer) => {
                        const exprWriter = new ExpressionWriter(writer);
                        const denies = this.getPolicyExpressions(
                            model,
                            'deny',
                            kind as PolicyOperationKind
                        );
                        const allows = this.getPolicyExpressions(
                            model,
                            'allow',
                            kind as PolicyOperationKind
                        );

                        const writeDenies = () => {
                            writer.conditionalWrite(
                                denies.length > 1,
                                '{ AND: ['
                            );
                            denies.forEach((expr, i) => {
                                writer.block(() => {
                                    writer.write('NOT: ');
                                    exprWriter.write(expr);
                                });
                                writer.conditionalWrite(
                                    i !== denies.length - 1,
                                    ','
                                );
                            });
                            writer.conditionalWrite(denies.length > 1, ']}');
                        };

                        const writeAllows = () => {
                            writer.conditionalWrite(
                                allows.length > 1,
                                '{ OR: ['
                            );
                            allows.forEach((expr, i) => {
                                exprWriter.write(expr);
                                writer.conditionalWrite(
                                    i !== allows.length - 1,
                                    ','
                                );
                            });
                            writer.conditionalWrite(allows.length > 1, ']}');
                        };

                        if (allows.length > 0 && denies.length > 0) {
                            writer.writeLine('{ AND: [');
                            writeDenies();
                            writer.writeLine(',');
                            writeAllows();
                            writer.writeLine(']}');
                        } else if (denies.length > 0) {
                            writeDenies();
                        } else if (allows.length > 0) {
                            writeAllows();
                        } else {
                            // disallow any operation
                            writer.write(`{ ${GUARD_FIELD_NAME}: false }`);
                        }
                    },
                },
            ],
        });

        func.addStatements('return r;');
        return func;
    }
}
