const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export const api = {
  // Auth
  register: (name, email, password) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request("/auth/me"),

  // Friends
  getFriends: () => request("/friends"),

  getFriendRequests: () => request("/friends/requests"),

  sendFriendRequest: (email) =>
    request("/friends/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  acceptFriendRequest: (requestId) =>
    request(`/friends/accept/${requestId}`, { method: "POST" }),

  rejectFriendRequest: (requestId) =>
    request(`/friends/reject/${requestId}`, { method: "POST" }),

  removeFriend: (friendId) =>
    request(`/friends/${friendId}`, { method: "DELETE" }),

  // Online status
  getOnlineUsers: () => request("/users/online"),
};
