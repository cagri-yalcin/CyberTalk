import React, {
  useEffect,
  useState,
} from 'react';

import { db } from '../../services/firebase';

function Avatar({ user }) {
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        className="avatar"
      />
    );
  }

  const initials = (
    user.displayName || 'CT'
  )
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="avatar avatar-fallback">
      {initials || 'CT'}
    </div>
  );
}

export default function UsersList({
  currentUser,
  search,
  selectedUser,
  onSelect,
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  useEffect(() => {
    let alive = true;

    const value =
      search.trim();

    setUser(null);
    setSearched(false);

    if (!value) {
      setLoading(false);
      return undefined;
    }

    if (
      !/^@[a-zA-Z0-9._]{3,20}$/.test(
        value
      )
    ) {
      setLoading(false);
      return undefined;
    }

    const username =
      value
        .slice(1)
        .toLowerCase();

    setLoading(true);

    const timer =
      window.setTimeout(
        async () => {
          try {
            const usernameSnapshot =
              await db
                .collection(
                  'usernames'
                )
                .doc(username)
                .get();

            if (
              !usernameSnapshot.exists
            ) {
              if (alive) {
                setSearched(true);
                setUser(null);
              }

              return;
            }

            const usernameData =
              usernameSnapshot.data() ||
              {};

            if (
              !usernameData.uid ||
              usernameData.uid ===
              currentUser.uid
            ) {
              if (alive) {
                setSearched(true);
                setUser(null);
              }

              return;
            }

            const profileSnapshot =
              await db
                .collection('users')
                .doc(
                  usernameData.uid
                )
                .get();

            if (
              !profileSnapshot.exists
            ) {
              if (alive) {
                setSearched(true);
                setUser(null);
              }

              return;
            }

            if (alive) {
              setUser({
                uid:
                  profileSnapshot.id,
                ...profileSnapshot.data(),
              });

              setSearched(true);
            }
          } catch (error) {
            console.error(
              'Kullanıcı aranamadı:',
              error
            );

            if (alive) {
              setUser(null);
              setSearched(true);
            }
          } finally {
            if (alive) {
              setLoading(false);
            }
          }
        },
        250
      );

    return () => {
      alive = false;
      window.clearTimeout(
        timer
      );
    };
  }, [
    search,
    currentUser.uid,
  ]);

  if (!search.trim()) {
    return null;
  }

  if (
    !/^@[a-zA-Z0-9._]{3,20}$/.test(
      search.trim()
    )
  ) {
    return (
      <div className="list-state">
        <strong>
          @kullanıcıadı kullan
        </strong>

        <span>
          Örneğin: @aligungor
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="list-state">
        Kullanıcı aranıyor...
      </div>
    );
  }

  if (
    searched &&
    !user
  ) {
    return (
      <div className="list-state">
        <strong>
          Kullanıcı bulunamadı
        </strong>

        <span>
          Kullanıcı adını kontrol et.
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const active =
    selectedUser?.uid ===
    user.uid;

  return (
    <div className="users-list">
      <div className="section-label">
        ARAMA SONUCU
      </div>

      <button
        type="button"
        className={`user-row ${active
            ? 'active'
            : ''
          }`}
        onClick={() =>
          onSelect(user)
        }
      >
        <Avatar user={user} />

        <div className="user-row-content">
          <div className="user-row-main">
            <strong>
              {user.displayName ||
                'CyberTalk Kullanıcısı'}
            </strong>

            <span className="online-dot"></span>
          </div>

          <span>
            @{user.username}
          </span>
        </div>
      </button>
    </div>
  );
}