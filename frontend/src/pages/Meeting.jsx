import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Lobby from './Lobby';
import Room from './Room';
import { extractRoomId } from '../utils';

export default function Meeting() {
  const roomId = extractRoomId(useParams().roomId);
  const [settings, setSettings] = useState(null);
  return settings ? (
    <Room roomId={roomId} settings={settings} onLeft={() => setSettings(null)} />
  ) : (
    <Lobby roomId={roomId} onJoin={setSettings} />
  );
}
