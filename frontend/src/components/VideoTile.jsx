import { useEffect, useRef } from 'react';
import { Hand, MicOff, MonitorUp, WifiOff } from 'lucide-react';
import { initials } from '../utils';

export default function VideoTile({ tile, large }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== tile.stream) ref.current.srcObject = tile.stream || null;
  }, [tile.stream, tile.v]);

  const showVideo = tile.stream && (tile.cam || tile.sharing);
  return (
    <div className={`tile${large ? ' tile-large' : ''}${tile.sharing ? ' tile-share' : ''}`}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={tile.local}
        className={tile.local && !tile.sharing ? 'mirror' : ''}
        style={{ opacity: showVideo ? 1 : 0 }}
      />
      {!showVideo && (
        <div className="tile-avatar" aria-hidden="true">
          <span>{initials(tile.name)}</span>
        </div>
      )}
      <div className="tile-label">
        {!tile.mic && <MicOff size={14} aria-label="Muted" />}
        <span>{tile.name}{tile.local ? ' (You)' : ''}</span>
        {tile.isHost && <em>Host</em>}
      </div>
      <div className="tile-badges">
        {tile.sharing && <span className="badge"><MonitorUp size={13} /> Sharing</span>}
        {tile.unstable && <span className="badge badge-warn"><WifiOff size={13} /> Reconnecting</span>}
        {tile.hand && <span className="badge badge-amber"><Hand size={13} /> Hand raised</span>}
      </div>
    </div>
  );
}
