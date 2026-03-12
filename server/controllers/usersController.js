import { onlineUsers } from "../sockets/socketHandlers.js";

export const getOnlineUsers = (req, res) => {
  const onlineIds = Array.from(onlineUsers.keys());
  res.json({ onlineUserIds: onlineIds });
};
