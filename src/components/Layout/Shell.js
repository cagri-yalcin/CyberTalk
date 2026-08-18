import React, { useEffect, useState } from 'react';
import { auth, db, firebase } from '../../services/firebase';
import UsersList from '../Users/UsersList';
import Conversation from '../Chat/Conversation';
import ProfilePanel from '../Profile/ProfilePanel';

export default function Shell({
  user,
  search,
  setSearch,
  selectedUser,
  setSelectedUser,
}) {
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const ref = db.collection('users').doc(user.uid);

    ref.get()
      .then((snap) => {
        const existing = snap.data() || {};

        return ref.set(
          {
            uid: user.uid,
            displayName: user.displayName || existing.displayName || 'CyberTalk Kullanıcısı',
            username: existing.username || '',
            photoURL: user.photoURL || existing.photoURL || '',
            email: user.email || existing.email || '',
            role: existing.role || 'user',
            createdAt:
              existing.createdAt ||
              firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      })
      .catch((error) => console.error('Profil kaydedilemedi:', error));
  }, [user]);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-row compact">
            <div className="brand-mark small">CT</div>

            <div>
              <div className="brand-name">CyberTalk</div>
              <div className="brand-subtitle">Güvenli iletişim</div>
            </div>
          </div>

          <button
            className="current-user current-user-button"
            onClick={() => setShowProfile(true)}
            title="Profilimi aç"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="avatar" />
            ) : (
              <div className="avatar avatar-fallback">
                {(user.displayName || 'CT')
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </div>
            )}

            <div className="current-user-text">
              <strong>{user.displayName || 'Kullanıcı'}</strong>
              <span>Çevrimiçi</span>
            </div>

            <span className="profile-chevron">›</span>
          </button>
        </div>

        <div className="search-wrap">
          <span>⌕</span>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kullanıcı ara..."
          />
        </div>

        <UsersList
          currentUser={user}
          search={search}
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
        />
      </aside>

      <main className="chat-panel">
        {selectedUser ? (
          <Conversation currentUser={user} otherUser={selectedUser} />
        ) : (
          <section className="empty-chat">
            <div className="empty-logo">CT</div>

            <h1>CyberTalk'a hoş geldin.</h1>

            <p>
              Soldan bir kullanıcı seçerek bir konuşma başlat.
            </p>

            <span>Gerçek zamanlı mesajlaşma · Firebase altyapısı</span>
          </section>
        )}
      </main>

      {showProfile && (
        <ProfilePanel
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
