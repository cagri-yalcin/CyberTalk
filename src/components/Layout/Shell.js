import React, {
  useEffect,
  useState,
} from 'react';

import {
  db,
} from '../../services/firebase';

import UsersList from '../Users/UsersList';
import ConversationsList from '../Chat/ConversationsList';
import Conversation from '../Chat/Conversation';
import ProfilePanel from '../Profile/ProfilePanel';

export default function Shell({
  user,
  search,
  setSearch,
  selectedUser,
  setSelectedUser,
}) {
  const [
    profileTarget,
    setProfileTarget,
  ] = useState(null);

  const [
    currentProfile,
    setCurrentProfile,
  ] = useState(null);

  const [
    showArchived,
    setShowArchived,
  ] = useState(false);

  useEffect(() => {
    const unsubscribe =
      db
        .collection('users')
        .doc(user.uid)
        .onSnapshot(
          (snapshot) => {
            setCurrentProfile(
              snapshot.data() || {}
            );
          },
          (error) => {
            console.error(
              'Profil dinlenemedi:',
              error
            );
          }
        );

    return unsubscribe;
  }, [user.uid]);

  const ownUser = {
    ...user,
    ...(currentProfile || {}),
  };

  const selectUser =
    (nextUser) => {
      setSelectedUser(
        nextUser
      );

      setSearch('');
      setShowArchived(false);
    };

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-row compact">
            <div className="brand-mark small">
              CT
            </div>

            <div>
              <div className="brand-name">
                CyberTalk
              </div>

              <div className="brand-subtitle">
                Güvenli iletişim
              </div>
            </div>
          </div>

          <button
            type="button"
            className="current-user current-user-button"
            onClick={() =>
              setProfileTarget(
                ownUser
              )
            }
          >
            {ownUser.photoURL ? (
              <img
                src={ownUser.photoURL}
                alt=""
                className="avatar"
              />
            ) : (
              <div className="avatar avatar-fallback">
                {(ownUser.displayName ||
                  'CT')
                  .split(' ')
                  .slice(0, 2)
                  .map(
                    (part) =>
                      part[0]
                  )
                  .join('')
                  .toUpperCase()}
              </div>
            )}

            <div className="current-user-text">
              <strong>
                {ownUser.displayName ||
                  'Kullanıcı'}
              </strong>

              <span>
                {ownUser.username
                  ? `@${ownUser.username}`
                  : 'Çevrimiçi'}
              </span>
            </div>

            <span className="profile-chevron">
              ›
            </span>
          </button>
        </div>

        <div className="search-wrap">
          <span>⌕</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="@kullanıcıadı ara..."
          />
        </div>

        {search.trim() ? (
          <UsersList
            currentUser={user}
            search={search}
            selectedUser={
              selectedUser
            }
            onSelect={
              selectUser
            }
          />
        ) : (
          <>
            <div className="sidebar-list-header">
              <div className="section-label">
                {showArchived
                  ? 'ARŞİVLENMİŞ'
                  : 'SOHBETLER'}
              </div>

              <button
                type="button"
                className={`archive-toggle ${showArchived
                  ? 'active'
                  : ''
                  }`}
                onClick={() =>
                  setShowArchived(
                    (value) =>
                      !value
                  )
                }
              >
                {showArchived
                  ? 'Sohbetler'
                  : 'Arşiv'}
              </button>
            </div>

            <ConversationsList
              currentUser={user}
              selectedUser={
                selectedUser
              }
              archived={
                showArchived
              }
              onSelect={
                selectUser
              }
            />
          </>
        )}
      </aside>

      <main className="chat-panel">
        {selectedUser ? (
          <Conversation
            key={`${user.uid}:${selectedUser.uid}`}
            currentUser={
              ownUser
            }
            otherUser={
              selectedUser
            }
            onViewProfile={() =>
              setProfileTarget(
                selectedUser
              )
            }
            onCloseConversation={() =>
              setSelectedUser(
                null
              )
            }
          />
        ) : (
          <section className="empty-chat">
            <div className="empty-logo">
              CT
            </div>

            <h1>
              CyberTalk'a hoş geldin.
            </h1>

            <p>
              Bir sohbet seç veya
              @kullanıcıadı ara.
            </p>

            <span>
              Gerçek zamanlı mesajlaşma ·
              Firebase altyapısı
            </span>
          </section>
        )}
      </main>

      {profileTarget && (
        <ProfilePanel
          user={profileTarget}
          isOwnProfile={
            profileTarget.uid ===
            user.uid
          }
          onClose={() =>
            setProfileTarget(
              null
            )
          }
        />
      )}
    </div>
  );
}