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


  it("resolves the DTOs recursively using the swagger 2.0 spec : $ref: {{model: OtherDTO}}", async () => {
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
      "CompaniesDTO": {
        "properties": {
          "companies": {
            "items": {
              "$ref": "#/components/schemas/CompanyDTO"
            },
            "type": "array"
          }
        },
        "type": "object"
      },
      "CompanyDTO": {
        "properties": {
          "client": {
            "$ref": "#/components/schemas/UserDTO"
          },
          "name": {
            "type": "string"
          },
          "notes": {
            "type": "string"
          }
        },
        "type": "object"
      },
      "UserDTO": {
        "properties": {
          "companyName": {
            "type": "string"
          },
          "email": {
            "type": "string"
          },
          "firstName": {
            "type": "string"
          },
          "surname": {
            "type": "string"
          }
        },
        "type": "object"
      }
    };
    expect(docGen.definition.components.schemas).toEqual(expected)
  });
});
