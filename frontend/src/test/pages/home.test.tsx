import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../renderWithProviders";
import Home from "../../pages/index";

// Lives here rather than beside the page: anything under src/pages is a route
// as far as next is concerned, and it tries to build a test file as one.
//
// Written against the previous implementation first, so the refactor that
// follows has to keep these true.
//
// The home page decides two things from config and session: where the get
// started button points, and whether someone already signed in belongs here
// at all.

const replace = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({ replace, pathname: "/" }),
}));

beforeEach(() => replace.mockClear());

const getStarted = () => screen.getByRole("link", { name: /get started/i });

describe("home page", () => {
  it("sends people to sign up when registration is open", async () => {
    renderWithProviders(<Home />, {
      config: { "security.allowRegistration": "true" },
    });

    await waitFor(() =>
      expect(getStarted()).toHaveAttribute("href", "/auth/signUp"),
    );
  });

  it("sends people to sign in when registration is closed", async () => {
    renderWithProviders(<Home />, {
      config: { "security.allowRegistration": "false" },
    });

    await waitFor(() =>
      expect(getStarted()).toHaveAttribute("href", "/auth/signIn"),
    );
  });

  it("leaves a signed out visitor on the page", async () => {
    renderWithProviders(<Home />);
    await waitFor(() => expect(getStarted()).toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
  });

  it("moves someone already signed in to the upload page", async () => {
    renderWithProviders(<Home />, {
      user: { id: "u1", username: "someone" } as any,
    });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/upload"));
  });
});
