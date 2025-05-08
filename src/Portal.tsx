import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from './config';
import './index.css';

interface Group {
  group_id: string;
  group_name: string;
  member_count?: number; // For all groups list
}

interface UserGroup extends Group {}

const Portal: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>(localStorage.getItem('username') || '');
  
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<UserGroup[]>([]);
  
  const [loadingAllGroups, setLoadingAllGroups] = useState<boolean>(false);
  const [loadingMyGroups, setLoadingMyGroups] = useState<boolean>(false);
  const [loadingCreateGroup, setLoadingCreateGroup] = useState<boolean>(false);
  const [loadingJoinGroup, setLoadingJoinGroup] = useState<string | null>(null); 

  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState<'viewJoin' | 'create'>('viewJoin'); // Default tab

  useEffect(() => {
    if (!username) {
      navigate('/login');
    }
  }, [username, navigate]);

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const fetchAllGroups = useCallback(async () => {
    if (!username) return;
    setLoadingAllGroups(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch all groups');
      }
      const data = await response.json();
      setAllGroups(data.groups || []);
    } catch (err) {
      console.error('Error fetching all groups:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred fetching all groups');
    } finally {
      setLoadingAllGroups(false);
    }
  }, [username]);

  const fetchMyGroups = useCallback(async () => {
    if (!username) return;
    setLoadingMyGroups(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${username}/groups`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch user groups');
      }
      const data = await response.json();
      setMyGroups(data.groups || []);
    } catch (err) {
      console.error('Error fetching user groups:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred fetching your groups');
    } finally {
      setLoadingMyGroups(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      clearMessages(); // Clear messages when username changes (e.g. on initial load)
      fetchAllGroups();
      fetchMyGroups();
    }
  }, [username, fetchAllGroups, fetchMyGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !username) {
      setError('Group name is required.');
      return;
    }
    setLoadingCreateGroup(true);
    clearMessages();
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: newGroupName, creator_username: username }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group');
      }
      setSuccessMessage(data.message || 'Group created successfully!');
      setNewGroupName('');
      fetchMyGroups(); // Refresh user's groups
      fetchAllGroups(); // Refresh all groups
      setActiveTab('viewJoin'); // Switch back to view/join tab after creation
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during group creation');
    } finally {
      setLoadingCreateGroup(false);
    }
  };

  const handleJoinGroup = async (groupIdToJoin: string, groupName: string) => {
    if (!username) return;
    setLoadingJoinGroup(groupIdToJoin);
    clearMessages();
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupIdToJoin, username: username }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to join group ${groupName}`);
      }
      setSuccessMessage(data.message || `Successfully joined group ${groupName}!`);
      fetchMyGroups();
      fetchAllGroups(); 
    } catch (err) {
      console.error('Error joining group:', err);
      setError(err instanceof Error ? err.message : `An unknown error occurred while joining ${groupName}`);
    } finally {
      setLoadingJoinGroup(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('privateKey'); 
    navigate('/login');
  };

  const navigateToGroupChat = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };
  
  const navigateToDirectMessage = () => {
    navigate('/direct-message');
  };
  
  const switchTab = (tab: 'viewJoin' | 'create') => {
    clearMessages();
    setActiveTab(tab);
  }

  const availableGroupsToJoin = allGroups.filter(ag => !myGroups.some(mg => mg.group_id === ag.group_id));

  return (
    <div className="app portal-tabbed">
      <header className="portal-header">
        <h1>Portal</h1>
        <div className="portal-user-info">
            <span>Logged in as: <strong>{username}</strong></span>
            <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </header>

      {/* Global Messages Area */} 
      {error && <p className="error-message global-portal-error" onClick={clearMessages}>{error} (click to dismiss)</p>}
      {successMessage && <p className="success-message global-portal-success" onClick={clearMessages}>{successMessage} (click to dismiss)</p>}
      
      <nav className="portal-tabs">
        <button 
            onClick={() => switchTab('viewJoin')} 
            className={`tab-button ${activeTab === 'viewJoin' ? 'active' : ''}`}
        >
            My Groups & Join
        </button>
        <button 
            onClick={() => switchTab('create')} 
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
        >
            Create Group
        </button>
        <button 
            onClick={navigateToDirectMessage} 
            className="tab-button nav-button-dm"
        >
            Direct Messages
        </button>
      </nav>

      <main className="portal-tab-content">
        {activeTab === 'viewJoin' && (
          <div className="tab-pane view-join-pane">
            <section className="portal-section my-groups-section">
              <h2>My Groups</h2>
              {loadingMyGroups ? <p>Loading your groups...</p> : (
                myGroups.length > 0 ? (
                  <ul className="groups-list my-groups-list">
                    {myGroups.map(group => (
                      <li key={group.group_id} className="group-item my-group-item">
                        <div className="group-info-portal" onClick={() => navigateToGroupChat(group.group_id)}>
                            <span className="group-name">{group.group_name}</span>
                        </div>
                        <div className="group-actions-portal">
                            <button 
                                onClick={() => navigateToGroupChat(group.group_id)} 
                                className="action-button-portal chat-button"
                            >
                                Chat
                            </button>
                            <button 
                                onClick={() => navigate(`/group/${group.group_id}/calendar`)} 
                                className="action-button-portal calendar-button"
                            >
                                Calendar
                            </button>
                            <button 
                                onClick={() => navigate(`/group/${group.group_id}/files`)} 
                                className="action-button-portal files-button"
                            >
                                Files
                            </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="empty-list-message">You haven't joined any groups yet.</p>
              )}
            </section>

            <section className="portal-section available-groups-section">
              <h2>Available Groups to Join</h2>
              {loadingAllGroups ? <p>Loading available groups...</p> : (
                availableGroupsToJoin.length > 0 ? (
                  <ul className="groups-list available-groups-list">
                    {availableGroupsToJoin.map(group => (
                      <li key={group.group_id} className="group-item available-group-item">
                        <div className="group-info">
                            <span className="group-name">{group.group_name}</span>
                            <span className="member-count">(Members: {group.member_count !== undefined ? group.member_count : 'N/A'})</span>
                        </div>
                        <button 
                            onClick={() => handleJoinGroup(group.group_id, group.group_name)} 
                            disabled={loadingJoinGroup === group.group_id}
                            className="join-button"
                        >
                          {loadingJoinGroup === group.group_id ? 'Joining...' : 'Join'}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="empty-list-message">No new groups available to join, or you're already in all of them!</p>
              )}
            </section>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="tab-pane create-group-pane">
            <section className="portal-section create-group-section">
              <h2>Create New Group</h2>
              <form onSubmit={handleCreateGroup} className="group-form">
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)} 
                  placeholder="Enter new group name"
                  disabled={loadingCreateGroup}
                  autoFocus
                />
                <button type="submit" disabled={loadingCreateGroup || !newGroupName.trim()} className="button-primary">
                  {loadingCreateGroup ? 'Creating...' : 'Create Group'}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Portal; 