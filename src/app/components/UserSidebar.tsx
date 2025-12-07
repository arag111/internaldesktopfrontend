'use client';

import { useState, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

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

// Virtual scrolling threshold - use virtual list for 50+ users
const VIRTUAL_SCROLL_THRESHOLD = 50;
const ROW_HEIGHT = 44; // Height of each user row in pixels

export default function UserSidebar({
  allUserStats,
  selectedUserId,
  setSelectedUserId,
  userStatuses,
}: UserSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() =>
    allUserStats.filter(({ user }) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [allUserStats, searchTerm]
  );

  // Get status color for a user
  const getStatusColor = useCallback((userId: string) => {
    const statusInfo = userStatuses[userId];
    const status = statusInfo?.status || 'offline';
    return status === 'online'
      ? 'bg-green-500'
      : status === 'on break'
      ? 'bg-yellow-500'
      : status === 'idle'
      ? 'bg-red-500'
      : 'bg-gray-400';
  }, [userStatuses]);

  // Render a single user row (for virtual scrolling)
  const UserRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const { user } = filteredUsers[index];
    const isSelected = user.id === selectedUserId;
    const statusColor = getStatusColor(user.id);

    return (
      <li
        style={style}
        onClick={() => setSelectedUserId(user.id)}
        className={`cursor-pointer px-3 py-2 rounded flex items-center justify-between ${
          isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
        }`}
      >
        <span className="text-gray-800 truncate">{user.name}</span>
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${statusColor}`}></span>
      </li>
    );
  }, [filteredUsers, selectedUserId, setSelectedUserId, getStatusColor]);

  // Calculate list height (max 400px or fit all users)
  const listHeight = Math.min(filteredUsers.length * ROW_HEIGHT, 400);

  // Use virtual scrolling for large lists, regular rendering for small lists
  const useVirtualScrolling = filteredUsers.length >= VIRTUAL_SCROLL_THRESHOLD;

  return (
    <aside className="w-64 fixed top-16 left-64 bottom-0 bg-white border-r border-gray-200 shadow-sm p-4 overflow-y-auto z-10">
      <h2 className="text-xl font-semibold mt-5 mb-4 text-[#075a96]">
        Users {filteredUsers.length > 0 && <span className="text-sm font-normal text-gray-500">({filteredUsers.length})</span>}
      </h2>
      <input
        type="text"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-gray-300 rounded"
      />

      {useVirtualScrolling ? (
        // Virtual scrolling for 50+ users
        <List
          height={listHeight}
          itemCount={filteredUsers.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          className="scrollbar-thin scrollbar-thumb-gray-300"
        >
          {UserRow}
        </List>
      ) : (
        // Regular rendering for small lists
        <ul className="space-y-2">
          {filteredUsers.map(({ user }) => {
            const isSelected = user.id === selectedUserId;
            const statusColor = getStatusColor(user.id);

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
      )}
    </aside>
  );
}
