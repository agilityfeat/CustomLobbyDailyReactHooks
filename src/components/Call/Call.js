import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useParticipantIds,
  useScreenShare,
  useLocalParticipant,
  useDailyEvent,
  useDaily,
  useWaitingParticipants,
} from '@daily-co/daily-react-hooks';

import './Call.css';
import Tile from '../Tile/Tile';
import UserMediaError from '../UserMediaError/UserMediaError';

export default function Call() {
  /* If a participant runs into a getUserMedia() error, we need to warn them. */
  const [getUserMediaError, setGetUserMediaError] = useState(false);
  const [showAdmit, setShowAdmit] = useState(false);

  /* We can use the useDailyEvent() hook to listen for daily-js events. Here's a full list
   * of all events: https://docs.daily.co/reference/daily-js/events */
  useDailyEvent(
    'camera-error',
    useCallback((ev) => {
      setGetUserMediaError(true);
    }, []),
  );

  /* This is for displaying remote participants: this includes other humans, but also screen shares. */
  const { screens } = useScreenShare();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const callObject = useDaily();
  const { waitingParticipants } = useWaitingParticipants();

  /* This is for displaying our self-view. */
  const localParticipant = useLocalParticipant();
  const isAlone = useMemo(
    () => remoteParticipantIds?.length < 1 || screens?.length < 1,
    [remoteParticipantIds, screens],
  );

  useEffect(() => {
    if (localParticipant?.owner && waitingParticipants.length > 0) {
      setShowAdmit(true);
    } else {
      setShowAdmit(false);
    }
  }, [waitingParticipants, callObject, localParticipant?.owner]);

  const handleAdmit = () => {
    callObject.updateWaitingParticipants({
      '*': {
        grantRequestedAccess: true,
      },
    });
  };

  const handleReject = () => {
    callObject.updateWaitingParticipants({
      '*': {
        grantRequestedAccess: false,
      },
    });
  };

  const renderCallScreen = () => {
    return (
      <div className={`${screens.length > 0 ? 'is-screenshare' : 'call'}`}>
        {/*Your self view*/}
        {localParticipant && <Tile id={localParticipant.session_id} isLocal isAlone={isAlone} />}
        {showAdmit ? (
          <div style={{ color: 'white' }}>
            {`Do you want to admit ${waitingParticipants.map((p, index) => {
              return `${index ? ' ' : ''}${p.name}`;
            })}`}
            <button style={{ margin: 4 }} onClick={handleAdmit}>
              Yes
            </button>
            <button style={{ margin: 4 }} onClick={handleReject}>
              No
            </button>
          </div>
        ) : null}
        {/*Videos of remote participants and screen shares*/}
        {remoteParticipantIds?.length > 0 || screens?.length > 0 ? (
          <>
            {remoteParticipantIds.map((id) => (
              <Tile key={id} id={id} />
            ))}
            {screens.map((screen) => (
              <Tile key={screen.screenId} id={screen.session_id} isScreenShare />
            ))}
          </>
        ) : null}
      </div>
    );
  };

  return <>{getUserMediaError ? <UserMediaError /> : renderCallScreen()}</>;
}
