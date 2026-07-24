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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
            <Shield className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Administration</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">Manage users, departments, and roles in one place</p>
          </div>
        </div>

        <div className="flex items-center rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 p-1 border border-neutral-200/80 dark:border-neutral-700/80">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`relative flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-300 shadow-sm dark:shadow-neutral-900/50'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Icon size={14} className="sm:hidden" />
                <Icon size={16} className="hidden sm:block" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 sm:hidden">
        <ActiveIcon size={14} />
        <span>{activeConfig?.description}</span>
      </div>

      <div>
        {activeTab === 'users' && <UsersPanel activeTab={activeTab} />}
        {activeTab === 'departments' && <DepartmentsPanel activeTab={activeTab} />}
        {activeTab === 'roles' && <RolesPanel activeTab={activeTab} />}
      </div>
    </div>
  );
}
