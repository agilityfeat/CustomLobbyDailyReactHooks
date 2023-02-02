import { useMediaTrack } from "@daily-co/daily-react-hooks";
import { memo, useEffect, useRef } from "react";
import { useParticipant } from "@daily-co/daily-react-hooks";

const TileVideo = memo(function ({ id, isScreenShare }) {
  const participant = useParticipant(id);
  const videoTrack = useMediaTrack(id, isScreenShare ? "screenVideo" : "video");
  const videoElement = useRef(null);

  useEffect(() => {
    const video = videoElement.current;
    if (!participant?.tracks?.background?.persistentTrack) {
      if (!video || !videoTrack?.persistentTrack) return;
      /*  The track is ready to be played. We can show video of the participant in the UI.*/
      video.srcObject = new MediaStream([videoTrack?.persistentTrack]);
    } else {
      video.srcObject = new MediaStream([
        participant?.tracks?.background?.persistentTrack,
      ]);
    }
  }, [videoTrack?.persistentTrack, participant?.tracks?.background?.persistentTrack]);

  useEffect(() => {
    console.log(participant?.tracks);
  }, [participant?.tracks]);

  if (!videoElement) return null;
  return <video autoPlay muted playsInline ref={videoElement} />;
});

export default TileVideo;
