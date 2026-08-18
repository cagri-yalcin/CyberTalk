import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import './styles/global.css';
import './styles/auth.css';

import { auth, db, firebase } from './services/firebase';
import AuthPage from './components/Auth/AuthPage';
import ProfileSetup from './components/Auth/ProfileSetup';
import Shell from './components/Layout/Shell';
import './styles/profile.css';

export default function App() {
  const [user, loading, authError] = useAuthState(auth);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileComplete, setProfileComplete] = useState(null);

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    let alive = true;

    async function checkProfile() {
      if (!user) {
        if (alive) {
          setProfileComplete(null);
          setProfileLoading(false);
        }
        return;
      }

      setProfileLoading(true);

      try {
        const snapshot = await db.collection('users').doc(user.uid).get();
        const data = snapshot.data();

        if (alive) {
          setProfileComplete(Boolean(data && data.username));
        }
      } catch (error) {
        console.error('Profil kontrolü başarısız:', error);
        if (alive) setProfileComplete(false);
      } finally {
        if (alive) setProfileLoading(false);
      }
    }

    checkProfile();

    return () => {
      alive = false;
    };
  }, [user]);

  if (loading || profileLoading) {
    return (
      <main className="loading-screen">
        <div className="loader-ring"></div>
        <strong>CyberTalk hazırlanıyor...</strong>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="loading-screen">
        <div className="error-box">
          <strong>Oturum hatası</strong>
          <p>{authError.message}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!profileComplete) {
    return (
      <ProfileSetup
        user={user}
        onComplete={() => setProfileComplete(true)}
        onSignOut={() => auth.signOut()}
      />
    );
  }

  return (
    <Shell
      user={user}
      search={search}
      setSearch={setSearch}
      selectedUser={selectedUser}
      setSelectedUser={setSelectedUser}
    />
  );
}
