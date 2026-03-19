import ApplicatorLayout from "@/components/layouts/ApplicatorLayout";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --------------------
// Auth Context Mock
// --------------------
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      name: "John Applicator",
      role: "applicator",
      permissions: [
        "view_dashboard",
        "view_job_details",
        "view_notifications",
        "view_profile",
        "view_settings",
      ],
    },
    loading: false,
    logout: vi.fn(),
  }),
}));

// --------------------
// Branch Context Mock
// --------------------
vi.mock("@/contexts/BranchContext", () => {
  const mockBranchValue = {
    branches: [{ id: 1, name: "Test Branch", code: "TB001" }],
    selectedBranch: { id: 1, name: "Test Branch", code: "TB001" },
    setSelectedBranch: vi.fn(),
    isSuperAdmin: false,
    isBranchAdmin: false,
    getCurrentBranchId: vi.fn(() => 1),
    getCurrentBranchName: vi.fn(() => "Test Branch"),
    showBranchFilter: vi.fn(() => true),
    getBranchFilterParams: vi.fn(() => ({})),
    fetchBranches: vi.fn(() => Promise.resolve()),
    loading: false,
    initialized: true,
  };

  const useBranch = () => mockBranchValue;

  const BranchProvider = ({ children }) => (
    <div data-testid="mock-branch-provider">{children}</div>
  );

  return {
    useBranch,
    BranchProvider,
    BranchContext: {},
  };
});

// --------------------
// Notification Context Mock
// --------------------
vi.mock("@/contexts/NotificationContext", () => ({
  useNotifications: () => ({
    unreadCount: 1,
    fetchUnreadCount: vi.fn(),
  }),
}));

// --------------------
// Icon Mock
// --------------------
vi.mock("lucide-react", () => ({
  FileText: () => <div>FileText Icon</div>,
  List: () => <div>List Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  Menu: () => <div>Menu Icon</div>,
  Bell: () => <div>Bell Icon</div>,
}));

// --------------------
// Router Mock
// --------------------
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useLocation: () => ({ pathname: "/applicator" }),
    Link: ({ to, children, className }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  };
});

// --------------------
// TEST SUITE
// --------------------
describe("ApplicatorLayout", () => {
  test("renders layout with user info", () => {
    render(
      <MemoryRouter>
        <ApplicatorLayout />
      </MemoryRouter>
    );

    expect(screen.getByText("Applicator Panel")).toBeInTheDocument();

    // Username appears more than once (desktop + mobile)
    expect(screen.getAllByText("John Applicator").length).toBeGreaterThan(0);

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  test("displays notification count", () => {
    render(
      <MemoryRouter>
        <ApplicatorLayout />
      </MemoryRouter>
    );

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("renders navigation links", () => {
    render(
      <MemoryRouter>
        <ApplicatorLayout />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toBeInTheDocument();
  });
});
