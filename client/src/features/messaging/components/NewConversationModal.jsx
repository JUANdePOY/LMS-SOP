import { useState, useEffect, useMemo } from "react";
import { MessageCircle, BookOpen, ChevronDown, Users } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { cn } from "@/lib/utils";
import GroupRecipientInput from "../components/GroupRecipientInput";
import {
  searchUsers,
  getCoursesForMessaging,
  getCourseEnrollments,
  getCourseDiscussions,
  extractRows,
} from "../api/message.api";
import { getDedupedDisplayNames, findExistingDirectConversation } from "../utils/conversationDisplay";

const MODE = {
  DIRECT: "direct",
  GROUP_FORUM: "group_forum",
};

export default function NewConversationModal({ open, onClose, currentUserId, onCreateSuccess, canCreateGroup = false, conversations = [], onOpenExisting, presetUser = null }) {
  const [mode, setMode] = useState(MODE.DIRECT);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseDiscussions, setCourseDiscussions] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedDiscussionId, setSelectedDiscussionId] = useState("");
  const [discussionSelected, setDiscussionSelected] = useState(false);

  const [creating, setCreating] = useState(false);

  const participantIds = useMemo(
    () => selectedUsers.map((u) => u.id).filter((id) => id !== currentUserId),
    [selectedUsers, currentUserId]
  );

  const dedupeLabels = useMemo(
    () => getDedupedDisplayNames(selectedUsers),
    [selectedUsers]
  );

  const existingThread = useMemo(() => {
    if (mode !== MODE.DIRECT || selectedUsers.length !== 1) return null;
    return findExistingDirectConversation(conversations, selectedUsers[0].id);
  }, [mode, selectedUsers, conversations]);

  // Deep-link from the employee directory: pre-select the recipient.
  useEffect(() => {
    if (open && presetUser && !selectedUsers.some((u) => u.id === presetUser.id)) {
      setSelectedUsers([presetUser]);
    }
  }, [open, presetUser, selectedUsers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const res = await searchUsers(searchQuery, { page: 1, limit: 20 });
        const rows = extractRows(res?.data);
        const users = rows.map((u) => ({
          id: u.id,
          full_name: u.full_name || u.display_name,
          email: u.email,
          role: u.role,
        }));
        setSearchResults(users);
      } catch (err) {
        setSearchError(err.message || "Failed to search users");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (open) {
      if (!canCreateGroup) setMode(MODE.DIRECT);
      loadCourses();
    }
  }, [open, canCreateGroup]);

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await getCoursesForMessaging({ page: 1, limit: 100 });
      const rows = extractRows(res?.data);
      setCourses(rows.map((c) => ({ id: c.id, title: c.title, description: c.description })));
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleCourseChange = async (e) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    setSelectedDiscussionId("");
    setCourseDiscussions([]);
    setDiscussionSelected(false);

    if (courseId) {
      try {
        const res = await getCourseDiscussions(courseId);
        setCourseDiscussions(extractRows(res?.data) || []);
      } catch {
        setCourseDiscussions([]);
      }
    }
  };

  const handleDiscussionSelect = async (e) => {
    const discussionId = e.target.value;
    setSelectedDiscussionId(discussionId);
    const discussion = courseDiscussions.find((d) => String(d.id) === String(discussionId));
    if (!discussion || !selectedCourseId) return;

    setSubject(`Forum: ${discussion.title || "Discussion"}`);
    setDiscussionSelected(true);

    try {
      const res = await getCourseEnrollments(selectedCourseId);
      const enrollments = extractRows(res?.data);
      const users = enrollments
        .filter((enr) => enr.user_id !== currentUserId)
        .map((enr) => ({
          id: enr.user_id,
          full_name: enr.user_name,
          email: enr.user_email,
          role: enr.role,
        }));
      setSelectedUsers(users);
    } catch {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id) ? prev : [...prev, user]
    );
  };

  const handleRemoveUser = (user) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id));
  };

  const handleModeChange = (newMode) => {
    if (newMode === MODE.GROUP_FORUM && !canCreateGroup) return;
    setMode(newMode);
    setSubject("");
    setBody("");
    setSelectedUsers([]);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedCourseId("");
    setSelectedDiscussionId("");
    setCourseDiscussions([]);
    setDiscussionSelected(false);
  };

  const handleCreate = async () => {
    if (!body.trim() || participantIds.length === 0) return;
    setCreating(true);
    try {
      await onCreateSuccess({
        subject: subject.trim() || null,
        body: body.trim(),
        participantIds,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setMode(MODE.DIRECT);
    setSubject("");
    setBody("");
    setSelectedUsers([]);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedCourseId("");
    setSelectedDiscussionId("");
    setCourseDiscussions([]);
    setDiscussionSelected(false);
    onClose();
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={handleClose}
        disabled={creating}
        className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        Cancel
      </button>
      <button
        onClick={handleCreate}
          disabled={creating || !body.trim() || participantIds.length === 0 || !!existingThread}
        className="rounded-lg px-3 py-1.5 text-xs btn-primary hover-brand disabled:opacity-50"
      >
        {creating ? "Creating..." : "Create"}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={handleClose} title="New Conversation" footer={footer}>
      <div className="space-y-3">
        {canCreateGroup && (
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Type
            </label>
            <div className={cn(
              "flex gap-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 p-1"
            )}>
              <button
                type="button"
                onClick={() => handleModeChange(MODE.DIRECT)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === MODE.DIRECT
                    ? "btn-primary"
                    : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                <MessageCircle size={12} className="mr-1 inline" />
                Direct Message
              </button>
              <button
                type="button"
                onClick={() => handleModeChange(MODE.GROUP_FORUM)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === MODE.GROUP_FORUM
                    ? "btn-primary"
                    : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                <BookOpen size={12} className="mr-1 inline" />
                Group Forum
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Recipients
          </label>
          <GroupRecipientInput
            selectedUsers={selectedUsers}
            onRemoveUser={handleRemoveUser}
            searchResults={searchResults}
            onSearchChange={setSearchQuery}
            onSelectUser={handleSelectUser}
            isSearching={isSearching}
            labelsById={dedupeLabels}
            placeholder={mode === MODE.DIRECT ? "Search recipients..." : "Add recipients..."}
          />
          {searchError && (
            <p className="text-[10px] text-red-500 mt-1">{searchError}</p>
          )}
          {participantIds.length > 0 && (
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
              {participantIds.length} recipient(s) selected
            </p>
          )}
          {existingThread && (
            <div className="flex items-center justify-between gap-2 mt-1 rounded-md bg-warning-soft px-2.5 py-2">
              <p className="text-[10px] text-neutral-600 dark:text-neutral-300">
                You already have a conversation with this person.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenExisting && onOpenExisting(existingThread);
                }}
                className="text-[10px] font-semibold fb-link hover-fb-link"
              >
                Open existing
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            placeholder="Type your message..."
          />
        </div>

        {mode === MODE.GROUP_FORUM && (
          <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Group Forum Settings
            </h4>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Course / Subject
              </label>
              <div className="relative">
                <select
                  value={selectedCourseId}
                  onChange={handleCourseChange}
                  disabled={coursesLoading}
                  className="w-full appearance-none rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm pr-8"
                >
                  <option value="">Select a course...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
              </div>
              {coursesLoading && (
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Loading courses...
                </p>
              )}
            </div>

            {selectedCourseId && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Forum Discussion
                </label>
                <div className="relative">
                  <select
                    value={selectedDiscussionId}
                    onChange={handleDiscussionSelect}
                    className="w-full appearance-none rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm pr-8"
                  >
                    <option value="">Select a discussion...</option>
                    {courseDiscussions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  />
                </div>
                {selectedCourseId && courseDiscussions.length === 0 && (
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                    No forum discussions found in this course
                  </p>
                )}
              </div>
            )}

            {discussionSelected && selectedUsers.length > 0 && (
              <div className="p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-[10px] text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Users size={12} />
                  {selectedUsers.length} enrolled user(s) auto-added from course enrollment.
                  Remove any you don't want to include.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
