const BASE_URL = "/api/v1";

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    credentials: "include", // send cookies
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // If response is Markdown or download
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/markdown") || contentType.includes("application/octet-stream")) {
    if (!response.ok) throw new Error("Failed to export report");
    return response.text();
  }

  const json = await response.json();
  if (!response.ok || !json.success) {
    const error = new Error(json.error?.message || "An unexpected error occurred");
    error.code = json.error?.code || "API_ERROR";
    error.status = response.status;
    throw error;
  }

  return json.data;
}

export const api = {
  health: {
    check: () => request("/health"),
  },
  auth: {
    login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
    register: (userData) => request("/auth/register", { method: "POST", body: JSON.stringify(userData) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
  },
  github: {
    getInstallations: () => request("/github/installations"),
    getRepositories: (installationId) =>
      request(`/github/repositories?installationId=${encodeURIComponent(installationId)}`),
    connectRepository: (repository) =>
      request("/repositories", {
        method: "POST",
        body: JSON.stringify(repository),
      }),
  },
  repositories: {
    list: () => request("/repositories"),
    get: (id) => request(`/repositories/${id}`),
    remove: (id) => request(`/repositories/${encodeURIComponent(id)}`, {method: "DELETE",}),
    create: (data) => request("/repositories", { method: "POST", body: JSON.stringify(data) }),
    seedDemo: () => request("/repositories/seed-demo", { method: "POST" }),
    getScans: (id) => request(`/repositories/${id}/scans`),
    queueScan: (id, payload) => request(`/repositories/${id}/scans`, { method: "POST", body: JSON.stringify(payload) }),
    
  },
  scans: {
    list: () => request("/scans"),
    get: (id) => request(`/scans/${id}`),
    getFindings: (id, query = {}) => {
      const sp = new URLSearchParams();
      if (query.severity) sp.set("severity", query.severity);
      if (query.category) sp.set("category", query.category);
      if (query.scanner) sp.set("scanner", query.scanner);
      if (query.search) sp.set("search", query.search);
      const queryStr = sp.toString() ? `?${sp.toString()}` : "";
      return request(`/scans/${id}/findings${queryStr}`);
    },
    exportReport: (id, format = "json") => request(`/scans/${id}/report?format=${format}`),
    compare: (id, compareScanId) => request(`/scans/${id}/diff/${compareScanId}`),
  },
  findings: {
    get: (id) => request(`/findings/${id}`),
    requestReview: (id) => request(`/findings/${id}/review`, { method: "POST" }),
  },
};
