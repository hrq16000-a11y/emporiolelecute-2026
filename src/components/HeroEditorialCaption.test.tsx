import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import HeroEditorialCaption from "./HeroEditorialCaption";

afterEach(cleanup);

describe("Home editorial do ateliê", () => {
  it("expõe a proposição da loja como H1 e mantém os destinos reais", () => {
    render(<MemoryRouter><HeroEditorialCaption /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: /lembrancinhas que guardam/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /explorar produtos/i })).toHaveAttribute("href", "/produtos");
    expect(screen.getByRole("link", { name: /pedir orçamento/i })).toHaveAttribute("href", "/orcamento");
  });
});
