import { useData } from '../contexts/DataContext';

export function useGroups() {
  const {
    groups,
    allGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    addGroupFeedItem,
    toggleFeedPostLike,
    addFeedPostComment,
    sendMessage,
    getGroupMessages,
    syncWithCloud
  } = useData();

  return {
    groups,
    allGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    addGroupFeedItem,
    toggleFeedPostLike,
    addFeedPostComment,
    sendMessage,
    getGroupMessages,
    syncWithCloud
  };
}

export default useGroups;
