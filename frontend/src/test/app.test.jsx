import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import ProtectedRoute from "../components/ProtectedRoute";
import SwipeDeck from "../components/SwipeDeck";
import { AuthProvider } from "../context/AuthContext";

vi.mock("../api/client", async (orig) => {
  const mod = await orig();
  const api = { get: vi.fn(() => Promise.resolve({ data: { champions: [] } })), post: vi.fn(), interceptors: mod.default.interceptors };
  return { ...mod, default: api };
});

beforeEach(() => localStorage.clear());

describe("App", () => {
  it("renders and sends anonymous users to the login page", async () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Accedi" })).toBeInTheDocument();
  });
});

describe("ProtectedRoute", () => {
  it("redirects to /login without a token", async () => {
    render(
      <MemoryRouter initialEntries={["/secret"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>login page</p>} />
            <Route path="/secret" element={<ProtectedRoute><p>secret</p></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
});

describe("SwipeDeck", () => {
  const card = (id, nickname) => ({
    id, nickname, role: "SUPPORT", rank: "DIAMOND_2", region: "EUW", champion_pool: ["Thresh"],
    looking_for_team: true, bio: "", radar: [], fit_score: 90,
  });
  const renderDeck = (onSwipe) => render(
    <QueryClientProvider client={new QueryClient()}>
      <SwipeDeck cards={[card("1", "Volt"), card("2", "Rook")]} onSwipe={onSwipe} />
    </QueryClientProvider>,
  );

  it("likes with the button and passes with the left arrow", () => {
    const onSwipe = vi.fn();
    renderDeck(onSwipe);
    expect(screen.getByText("Volt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mi piace" }));
    expect(onSwipe).toHaveBeenLastCalledWith(expect.objectContaining({ nickname: "Volt" }), "LIKE");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onSwipe).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), "PASS");
  });

  it("swipes when the card is dragged past the threshold", () => {
    const onSwipe = vi.fn();
    renderDeck(onSwipe);
    const el = screen.getByTestId("swipe-card");
    fireEvent.pointerDown(el, { clientX: 100 });
    fireEvent.pointerMove(el, { clientX: 300 });
    fireEvent.pointerUp(el, { clientX: 300 });
    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }), "LIKE");
  });
});
