import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../services/firebase';

function Avatar({ user }) {
  if (user.photoURL) return <img src={user.photoURL} alt="" className="avatar" />;
  const initials = (user.displayName || 'CT')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return <div className="avatar avatar-fallback">{initials || 'CT'}</div>;
}

export default function UsersList({ currentUser, search, selectedUser, onSelect }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = db.collection('users').limit(100).onSnapshot(
      (snapshot) => {
        const list = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.uid !== currentUser.uid);

        setUsers(list);
      },
      (error) => console.error('Kullanıcı listesi alınamadı:', error)
    );

    return unsubscribe;
  }, [currentUser.uid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return users;
    return users.filter((u) =>
      (u.displayName || '').toLocaleLowerCase('tr-TR').includes(q) ||
      (u.email || '').toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [users, search]);

  if (!filtered.length) {
    return (
      <div className="list-state">
        <strong>{users.length ? 'Kullanıcı bulunamadı' : 'Henüz başka kullanıcı yok'}</strong>
        <span>Başka bir hesapla giriş yaptığında burada görünecek.</span>
      </div>
    );
  }

  return (
    <div className="users-list">
      <div className="section-label">KİŞİLER</div>
      {filtered.map((user) => {
        const active = selectedUser && selectedUser.uid === user.uid;
        return (
          <button
            key={user.uid}
            className={`user-row ${active ? 'active' : ''}`}
            onClick={() => onSelect(user)}
          >
            <Avatar user={user} />
            <div className="user-row-content">
              <div className="user-row-main">
                <strong>{user.displayName || 'CyberTalk Kullanıcısı'}</strong>
                <span className="online-dot"></span>
              </div>
              <span>{user.email || 'CyberTalk kullanıcısı'}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
