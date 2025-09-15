'use client';

import { useState } from 'react';

interface User {
  id: string;
  name: string;
}

interface UserStats {
  user: User;
  stats: any[];
}

interface UserSidebarProps {
  allUserStats: UserStats[];
  selectedUserId: string | null;
  setSelectedUserId: (id: string) => void;
  userStatuses: Record<string, { status: string; timestamp: string }>;
}

export default function UserSidebar({
  allUserStats,
  selectedUserId,
  setSelectedUserId,
  userStatuses,
}: UserSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = allUserStats.filter(({ user }) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-64 fixed top-16 left-64 bottom-0 bg-white border-r border-gray-200 shadow-sm p-4 overflow-y-auto z-10">
      <h2 className="text-xl font-semibold mt-5 mb-4 text-[#075a96]">Users</h2>
      <input
        type="text"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-gray-300 rounded"
      />
      <ul className="space-y-2">
        {filteredUsers.map(({ user }) => {
          const isSelected = user.id === selectedUserId;
          const statusInfo = userStatuses[user.id];
          const status = statusInfo?.status || 'offline';
          const statusColor =
            status === 'online'
              ? 'bg-green-500'
              : status === 'on break'
              ? 'bg-yellow-500'
              : status === 'idle'
              ? 'bg-red-500'
              : 'bg-gray-400';

          return (
            <li
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`cursor-pointer px-3 py-2 rounded flex items-center justify-between ${
                isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
            >
              <span className="text-gray-800">{user.name}</span>
              <span className={`w-3 h-3 rounded-full ${statusColor}`}></span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
