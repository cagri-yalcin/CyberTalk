import React, {
  useEffect,
  useState,
} from 'react';

import {
  useAuthState,
} from 'react-firebase-hooks/auth';

import './styles/global.css';
import './styles/auth.css';
import './styles/profile.css';
import './styles/chat-list.css';

import {
  auth,
  db,
} from './services/firebase';

import AuthPage from './components/Auth/AuthPage';
import ProfileSetup from './components/Auth/ProfileSetup';
import Shell from './components/Layout/Shell';

export default function App() {
  const [
    user,
    loading,
    authError,
  ] = useAuthState(auth);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  const [
    profileComplete,
    setProfileComplete,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    selectedUser,
    setSelectedUser,
  ] = useState(null);

  useEffect(() => {
    setSearch('');
    setSelectedUser(null);
    setProfileComplete(null);
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      setProfileComplete(null);

      return undefined;
    }

    setProfileLoading(true);

    const unsubscribe =
      db
        .collection('users')
        .doc(user.uid)
        .onSnapshot(
          (snapshot) => {
            const data =
              snapshot.exists
                ? snapshot.data() || {}
                : {};

            const username =
              typeof data.username ===
              'string'
                ? data.username
                    .trim()
                : '';

            setProfileComplete(
              username.length > 0
            );

            setProfileLoading(false);
          },
          (error) => {
            console.error(
              'Profil dinleme başarısız:',
              error
            );

            setProfileComplete(false);
            setProfileLoading(false);
          }
        );

    return unsubscribe;
  }, [user]);

  if (
    loading ||
    profileLoading
  ) {
    return (
      <main className="loading-screen">
        <div className="loader-ring"></div>

        <strong>
          CyberTalk hazırlanıyor...
        </strong>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="loading-screen">
        <div className="error-box">
          <strong>
            Oturum hatası
          </strong>

          <p>
            {authError.message}
          </p>
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
        onComplete={() =>
          setProfileComplete(true)
        }
        onSignOut={() =>
          auth.signOut()
        }
      />
    );
  }

  return (
    <Shell
      key={user.uid}
      user={user}
      search={search}
      setSearch={setSearch}
      selectedUser={selectedUser}
      setSelectedUser={
        setSelectedUser
      }
    />
  );
}
