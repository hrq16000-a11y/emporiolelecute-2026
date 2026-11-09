import { describe, expect, it } from "vitest";
import { getEntryScriptPath } from "./deploymentVersion";

describe("checagem leve de versão do frontend", () => {
  it("identifica o bundle Vite publicado, independentemente da ordem dos atributos", () => {
    expect(getEntryScriptPath('<script type="module" crossorigin src="/assets/index-AbC123.js"></script>'))
      .toBe("/assets/index-AbC123.js");
    expect(getEntryScriptPath('<script src="/assets/index-new.js" type="module"></script>'))
      .toBe("/assets/index-new.js");
  });
  it("não infere uma versão sem script de entrada", () => {
    expect(getEntryScriptPath('<script src="/assets/chunk-x.js"></script>')).toBeNull();
  });
});
