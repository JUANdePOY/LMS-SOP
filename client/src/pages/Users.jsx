import { useState, useCallback } from 'react';
import UsersPanel from '@/pages/management/UsersPanel';
import DepartmentsPanel from '@/pages/management/DepartmentsPanel';
import RolesPanel from '@/pages/management/RolesPanel';
import { Button } from '@/components/ui/button';
import { Users, Building2, Shield } from 'lucide-react';

const TABS = [
  { key: 'users', label: 'Users', icon: Users, description: 'Manage user accounts, roles, and assignments' },
  { key: 'departments', label: 'Departments', icon: Building2, description: 'Manage organizational structure and hierarchy' },
  { key: 'roles', label: 'Roles & Permissions', icon: Shield, description: 'Configure roles and their permissions' },
];

export default function ManagementHub() {
  const [activeTab, setActiveTab] = useState('users');

  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
  }, []);

  const ActiveIcon = TABS.find(t => t.key === activeTab)?.icon || Users;
  const activeConfig = TABS.find(t => t.key === activeTab);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Administration</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage users, departments, and roles in one place</p>
      </div>

      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-4 py-2 border border-neutral-200 dark:border-neutral-700">
        <ActiveIcon size={14} />
        <span>{activeConfig?.description}</span>
      </div>

      <div className="mt-6">
        {activeTab === 'users' && <UsersPanel activeTab={activeTab} />}
        {activeTab === 'departments' && <DepartmentsPanel activeTab={activeTab} />}
        {activeTab === 'roles' && <RolesPanel activeTab={activeTab} />}
      </div>
    </div>
  );
}
