import { expect, test } from "@playwright/test";
import { PDP_TEST_SLUG, usePdpCatalog } from "./fixtures/pdp-catalog";

test("personalização com busca preserva escolhas e apresenta campos identificados", async ({ page }) => {
  const labels = ["Âmbar", "Azul", "Branco", "Coral", "Dourado", "Lilás", "Rosa", "Verde", "Violeta"];
  await usePdpCatalog(page, undefined, {
    personalization_enabled: true,
    personalization_label: "Mensagem especial",
    min_quantity: 10,
    personalization_options: [
      { id: "tema", type: "select", label: "Tema", required: true,
        choices: labels.map((label, index) => ({ id: String(index), label })) },
      { id: "nome", type: "text", label: "Nome", required: true, help: "Como deve aparecer no produto." },
      { id: "acabamento", type: "select", label: "Acabamento",
        choices: [{ id: "f", label: "Fosco" }, { id: "b", label: "Brilhante" }] },
    ],
  });
  await page.goto(`/produto/${PDP_TEST_SLUG}`, { waitUntil: "domcontentloaded" });

  const group = page.getByRole("radiogroup", { name: "Tema", exact: true });
  const search = page.getByRole("searchbox", { name: "Buscar Tema", exact: true });
  await expect(group.getByRole("radio")).toHaveCount(9);
  await expect(page.getByRole("searchbox", { name: "Buscar Acabamento" })).toHaveCount(0);
  await search.fill("ambar");
  await expect(group.getByRole("radio")).toHaveCount(1);
  const selected = group.getByRole("radio", { name: "Âmbar", exact: true });
  await selected.click();
  await expect(selected).toHaveAttribute("aria-checked", "true");
  await search.fill("azul");
  await expect(group.getByRole("radio")).toHaveCount(2);
  await expect(selected).toHaveAttribute("aria-checked", "true");
  await search.fill("inexistente");
  await expect(page.getByText("Nenhuma opção encontrada. Sua escolha continua selecionada.")).toBeVisible();
  await expect(selected).toHaveAttribute("aria-checked", "true");
  await search.fill("");
  await expect(group.getByRole("radio")).toHaveCount(9);
  await expect(selected).toHaveAttribute("aria-checked", "true");

  const name = page.getByRole("textbox", { name: "Nome", exact: true });
  await expect(name).toHaveAccessibleDescription("Como deve aparecer no produto.");
  await expect(name).toHaveAttribute("aria-required", "true");
  await name.fill("Ana");
  await page.getByRole("textbox", { name: "Mensagem especial", exact: true }).fill("Obrigada!");
  const quantity = page.getByRole("spinbutton", { name: "Quantidade", exact: true });
  await expect(quantity).toHaveAccessibleDescription(/Mínimo 10 un\./);
  await expect(quantity).toHaveValue("10");
  await expect(page.getByRole("button", { name: "Diminuir quantidade" })).toBeDisabled();
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(quantity).toHaveValue("11");
  await expect(selected).toHaveAttribute("aria-checked", "true");
  await expect(name).toHaveValue("Ana");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
