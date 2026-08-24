import { fireEvent, screen, waitFor } from "@testing-library/react";
import ConfigPage from "../../pages/admin/config/[category]";
import { AdminConfig } from "../../types/config.type";
import { renderWithProviders } from "../renderWithProviders";

// Lives here rather than beside the page: anything under src/pages is a route
// as far as next is concerned, and it tries to build a test file as one.
//
// Written against the previous implementation first. The second and third
// cases fail there, which is the bug: editing the same setting twice wrote
// straight into the pending-changes array without telling react, so anything
// that follows from a pending change stopped following it.

const getByCategory = jest.fn();

jest.mock("../../services/config.service", () => ({
  __esModule: true,
  default: {
    getByCategory: (...args: unknown[]) => getByCategory(...args),
    updateMany: jest.fn(),
    get: jest.requireActual("../../services/config.service").default.get,
  },
}));

jest.mock("next/router", () => ({
  useRouter: () => ({ query: { category: "security" }, pathname: "/admin" }),
}));

const variable = (
  key: string,
  type: string,
  value: string,
): AdminConfig =>
  ({
    key,
    name: key.split(".")[1],
    type,
    value,
    defaultValue: value,
    allowEdit: true,
    secret: false,
    description: "",
  }) as unknown as AdminConfig;

const securityConfig = () => [
  variable("security.customPasswordPolicy", "boolean", "false"),
  variable("security.minLength", "number", "8"),
];

// the switch for the policy is the only checkbox on the page
const policySwitch = () => screen.getAllByRole("checkbox")[0];
const minLengthShown = () => screen.queryAllByRole("textbox").length > 0;

beforeEach(() => {
  getByCategory.mockReset();
  getByCategory.mockResolvedValue(securityConfig());
});

describe("admin config page", () => {
  it("hides the password rules while the custom policy is off", async () => {
    renderWithProviders(<ConfigPage />);

    await waitFor(() => expect(policySwitch()).toBeInTheDocument());
    expect(minLengthShown()).toBe(false);
  });

  it("shows them once the policy is switched on", async () => {
    renderWithProviders(<ConfigPage />);
    await waitFor(() => expect(policySwitch()).toBeInTheDocument());

    fireEvent.click(policySwitch());

    await waitFor(() => expect(minLengthShown()).toBe(true));
  });

  // the bug: the second edit of the same setting mutated the array in place
  // and never called setState, so the page stopped keeping up
  it("hides them again when the policy is switched back off", async () => {
    renderWithProviders(<ConfigPage />);
    await waitFor(() => expect(policySwitch()).toBeInTheDocument());

    fireEvent.click(policySwitch());
    await waitFor(() => expect(minLengthShown()).toBe(true));

    fireEvent.click(policySwitch());
    await waitFor(() => expect(minLengthShown()).toBe(false));
  });

  it("keeps up over repeated changes", async () => {
    renderWithProviders(<ConfigPage />);
    await waitFor(() => expect(policySwitch()).toBeInTheDocument());

    for (const expected of [true, false, true, false]) {
      fireEvent.click(policySwitch());
      await waitFor(() => expect(minLengthShown()).toBe(expected));
    }
  });
});
