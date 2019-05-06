import * as path from 'path';
import * as Serverless from 'serverless';
import { DefinitionGenerator } from '../DefinitionGenerator';
import { merge } from '../utils';

class ServerlessInterface extends Serverless {
  public service: any = {};
  public config: any = {};
  public yamlParser: any = {};
  public pluginManager: any = {};
  public variables: any = {};
}

describe('OpenAPI Documentation Generator', () => {
  it('Generates OpenAPI document', async () => {
    const servicePath = path.join(__dirname, '../../test/project');
    const serverlessYamlPath = path.join(servicePath, './serverless.yml');
    const sls: ServerlessInterface = new Serverless();

    sls.config.update({
      servicePath,
    });

    const config = await sls.yamlParser.parse(serverlessYamlPath);
    sls.pluginManager.cliOptions = { stage: 'dev' };

    await sls.service.load(config);
    await sls.variables.populateService();

    if ('documentation' in sls.service.custom) {
      const docGen = new DefinitionGenerator(sls.service.custom.documentation);

      expect(docGen).not.toBeNull();
    } else {
      throw new Error('Cannot find 'documentation' in custom section of 'serverless.yml'');
    }
  });

  it('adds paths to OpenAPI output from function configuration', async () => {
    const servicePath = path.join(__dirname, '../../test/project');
    const serverlessYamlPath = path.join(servicePath, './serverless.yml');
    const sls: ServerlessInterface = new Serverless();

    sls.config.update({
      servicePath,
    });

    const config = await sls.yamlParser.parse(serverlessYamlPath);
    sls.pluginManager.cliOptions = { stage: 'dev' };

    await sls.service.load(config);
    await sls.variables.populateService();

    if ('documentation' in sls.service.custom) {
      const docGen = new DefinitionGenerator(sls.service.custom.documentation);

      // implementation copied from ServerlessOpenApiDocumentation.ts
      docGen.parse();

      const funcConfigs = sls.service.getAllFunctions().map((functionName) => {
        const func = sls.service.getFunction(functionName);
        return merge({ _functionName: functionName }, func);
      });

      docGen.readFunctions(funcConfigs);

      // get the parameters from the `/create POST' endpoint
      const actual = docGen.definition.paths['/create'].post.parameters;
      const expected = [
        {
          description: 'The username for a user to create',
          in: 'path',
          name: 'username',
          required: true,
          schema: {
            pattern: '^[-a-z0-9_]+$',
            type: 'string',
          }
        },
        {
          allowEmptyValue: false,
          description: `The user's Membership Type`,
          in: 'query',
          name: 'membershipType',
          required: false,
          schema: {
            enum: [
              'premium',
              'standard',
            ],
            type: 'string',
          },
        },
        {
          description: 'A Session ID variable',
          in: 'cookie',
          name: 'SessionId',
          required: false,
          schema: {
            type: 'string',
          },
        }
      ]

      expect(actual).toEqual(expected);
    } else {
      throw new Error(`Cannot find 'documentation' in custom section of 'serverless.yml'`);
    }
  })
});
