import _ = require("lodash");
import * as path from "path";
import * as Serverless from "serverless";
import { DefinitionGenerator } from "../DefinitionGenerator";

class ServerlessInterface extends Serverless {
  public service: any = {};
  public config: any = {};
  public yamlParser: any = {};
  public pluginManager: any = {};
  public variables: any = {};
}

describe("OpenAPI Documentation Generator", () => {
  let sls: ServerlessInterface;

  const servicePath = path.join(__dirname, "../../test/project-swagger-2.0");

  beforeEach(async () => {
    const serverlessYamlPath = path.join(servicePath, "./serverless.yml");
    sls = new Serverless();

    sls.config.update({
      servicePath
    });

    const config = await sls.yamlParser.parse(serverlessYamlPath);
    sls.pluginManager.cliOptions = { stage: "dev" };

    await sls.service.load(config);
    await sls.variables.populateService();

    if (!("documentation" in sls.service.custom)) {
      throw new Error(
        'Cannot find "documentation" in custom section of "serverless.yml"'
      );
    }
  });

  it('should allow path to be preceded with a slash without duplicating the slash', async () => {
    const docGen = new DefinitionGenerator(
      sls.service.custom.documentation,
      servicePath
    );

    // implementation copied from ServerlessOpenApiDocumentation.ts
    await docGen.parse();

    const funcConfigs = sls.service.getAllFunctions().map(functionName => {
      const func = sls.service.getFunction(functionName);
      return _.merge({ _functionName: functionName }, func);
    });

    docGen.readFunctions(funcConfigs);

    let expected = [ "/api/company-service/companies", "/api/company-service/companies/"];
    expect(Object.keys(docGen.definition.paths)).toEqual(expected)
  });


  it("parses the requestModels", async () => {
    const docGen = new DefinitionGenerator(
      sls.service.custom.documentation,
      servicePath
    );

    // implementation copied from ServerlessOpenApiDocumentation.ts
    await docGen.parse();

    const funcConfigs = sls.service.getAllFunctions().map(functionName => {
      const func = sls.service.getFunction(functionName);
      return _.merge({ _functionName: functionName }, func);
    });

    docGen.readFunctions(funcConfigs);


    let expected = {
      get: {
        operationId: "company-getall",
        parameters: [
          {
            description: "Authentication tokens",
            in: "header",
            name: "X-AccessToken",
            required: false,
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          200: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CompaniesDTO"
                }
              }
            },
            description: "Status 200 Response"
          }
        },
        summary: "Get all companies",
        tags: [
          "CompanyAPI"
        ]
      }
    };
    expect(docGen.definition.paths['/api/company-service/companies']).toEqual(expected)
  });
});
