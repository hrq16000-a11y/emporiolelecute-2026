import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NatalHomeSpotlight, NatalWelcomeInvite } from "./NatalHomeCampaign";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe("Natal 2026 — convite da home", () => {
  it("aponta o destaque editorial e as fotos para a campanha real", () => {
    render(<MemoryRouter><NatalHomeSpotlight /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /pequenos mimos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /visitar nosso natal encantado/i }).getAttribute("href")).toBe("/natal");
    expect(screen.getByRole("img", { name: /presépio/i })).toBeInTheDocument();
  });

  it("exibe o convite após oito segundos e não repete na mesma sessão", () => {
    vi.useFakeTimers();
    const first = render(<MemoryRouter><NatalWelcomeInvite /></MemoryRouter>);
    expect(screen.queryByRole("dialog", { name: /natal já floresceu/i })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByRole("dialog", { name: /natal já floresceu/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /conhecer a coleção/i }).getAttribute("href")).toBe("/natal");
    const close = screen.getByRole("button", { name: /fechar convite de natal/i });
    expect(close).toHaveClass("h-11", "w-11"); // área de toque mínima 44 × 44 px
    fireEvent.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    first.unmount();
    render(<MemoryRouter><NatalWelcomeInvite /></MemoryRouter>);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
