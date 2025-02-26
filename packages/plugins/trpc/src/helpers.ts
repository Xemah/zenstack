import { DMMF } from '@prisma/generator-helper';
import { CodeBlockWriter, SourceFile } from 'ts-morph';
import { uncapitalizeFirstLetter } from './utils/uncapitalizeFirstLetter';

export function generateProcedure(
    writer: CodeBlockWriter,
    opType: string,
    typeName: string,
    modelName: string,
    baseOpType: string
) {
    const procType = getProcedureTypeByOpName(baseOpType);
    const prismaMethod = opType.replace('One', '');

    if (procType === 'query') {
        writer.write(`
        ${opType}: procedure.input(${typeName}).query(({ctx, input}) => checkRead(db(ctx).${uncapitalizeFirstLetter(
            modelName
        )}.${prismaMethod}(input))),
    `);
    } else if (procType === 'mutation') {
        writer.write(`
        ${opType}: procedure.input(${typeName}).mutation(async ({ctx, input}) => checkMutate(db(ctx).${uncapitalizeFirstLetter(
            modelName
        )}.${prismaMethod}(input))),
    `);
    }
}

export function generateRouterSchemaImports(sourceFile: SourceFile, name: string) {
    sourceFile.addStatements(`import { ${name}Schema } from '../schemas/${name}.schema';`);
}

export function generateHelperImport(sourceFile: SourceFile) {
    sourceFile.addStatements(`import { checkRead, checkMutate } from '../helper';`);
}

export const getInputTypeByOpName = (opName: string, modelName: string) => {
    let inputType;
    switch (opName) {
        case 'findUnique':
            inputType = `${modelName}Schema.findUnique`;
            break;
        case 'findFirst':
            inputType = `${modelName}Schema.findFirst`;
            break;
        case 'findMany':
            inputType = `${modelName}Schema.findMany`;
            break;
        case 'findRaw':
            inputType = `${modelName}Schema.findRawObject`;
            break;
        case 'createOne':
            inputType = `${modelName}Schema.create`;
            break;
        case 'createMany':
            inputType = `${modelName}Schema.createMany`;
            break;
        case 'deleteOne':
            inputType = `${modelName}Schema.delete`;
            break;
        case 'updateOne':
            inputType = `${modelName}Schema.update`;
            break;
        case 'deleteMany':
            inputType = `${modelName}Schema.deleteMany`;
            break;
        case 'updateMany':
            inputType = `${modelName}Schema.updateMany`;
            break;
        case 'upsertOne':
            inputType = `${modelName}Schema.upsert`;
            break;
        case 'aggregate':
            inputType = `${modelName}Schema.aggregate`;
            break;
        case 'aggregateRaw':
            inputType = `${modelName}Schema.aggregateRawObject`;
            break;
        case 'groupBy':
            inputType = `${modelName}Schema.groupBy`;
            break;
        default:
            console.log('getInputTypeByOpName: ', { opName, modelName });
    }
    return inputType;
};

export const getProcedureTypeByOpName = (opName: string) => {
    let procType;
    switch (opName) {
        case 'findUnique':
        case 'findFirst':
        case 'findMany':
        case 'findRaw':
        case 'aggregate':
        case 'aggregateRaw':
        case 'groupBy':
            procType = 'query';
            break;
        case 'createOne':
        case 'createMany':
        case 'deleteOne':
        case 'updateOne':
        case 'deleteMany':
        case 'updateMany':
        case 'upsertOne':
            procType = 'mutation';
            break;
        default:
            console.log('getProcedureTypeByOpName: ', { opName });
    }
    return procType;
};

export function resolveModelsComments(models: DMMF.Model[], hiddenModels: string[]) {
    const modelAttributeRegex = /(@@Gen\.)+([A-z])+(\()+(.+)+(\))+/;
    const attributeNameRegex = /(?:\.)+([A-Za-z])+(?:\()+/;
    const attributeArgsRegex = /(?:\()+([A-Za-z])+:+(.+)+(?:\))+/;

    for (const model of models) {
        if (model.documentation) {
            const attribute = model.documentation?.match(modelAttributeRegex)?.[0];
            const attributeName = attribute?.match(attributeNameRegex)?.[0]?.slice(1, -1);
            if (attributeName !== 'model') continue;
            const rawAttributeArgs = attribute?.match(attributeArgsRegex)?.[0]?.slice(1, -1);

            const parsedAttributeArgs: Record<string, unknown> = {};
            if (rawAttributeArgs) {
                const rawAttributeArgsParts = rawAttributeArgs
                    .split(':')
                    .map((it) => it.trim())
                    .map((part) => (part.startsWith('[') ? part : part.split(',')))
                    .flat()
                    .map((it) => it.trim());

                for (let i = 0; i < rawAttributeArgsParts.length; i += 2) {
                    const key = rawAttributeArgsParts[i];
                    const value = rawAttributeArgsParts[i + 1];
                    parsedAttributeArgs[key] = JSON.parse(value);
                }
            }
            if (parsedAttributeArgs.hide) {
                hiddenModels.push(model.name);
            }
        }
    }
}
