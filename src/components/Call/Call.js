import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  useParticipantIds,
  useScreenShare,
  useLocalParticipant,
  useDailyEvent,
  useDaily,
  useWaitingParticipants,
} from "@daily-co/daily-react-hooks";

import "./Call.css";
import Tile from "../Tile/Tile";
import UserMediaError from "../UserMediaError/UserMediaError";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import backImage from "./HD-wallpaper-star-wars-space-x-wing.jpeg";

export default function Call({ customVideo }) {
  /* If a participant runs into a getUserMedia() error, we need to warn them. */
  const [getUserMediaError, setGetUserMediaError] = useState(false);
  const [showAdmit, setShowAdmit] = useState(false);
  const [showCustomVideo, setShowCustomVideo] = useState(false);

  /* We can use the useDailyEvent() hook to listen for daily-js events. Here's a full list
   * of all events: https://docs.daily.co/reference/daily-js/events */
  useDailyEvent(
    "camera-error",
    useCallback((ev) => {
      setGetUserMediaError(true);
    }, [])
  );

  /* This is for displaying remote participants: this includes other humans, but also screen shares. */
  const { screens } = useScreenShare();
  const remoteParticipantIds = useParticipantIds({ filter: "remote" });
  const callObject = useDaily();
  const { waitingParticipants } = useWaitingParticipants();
  const inputVideoRef = useRef();
  const canvasRef = useRef();
  const contextRef = useRef();
  const customVideoRef = useRef(showCustomVideo);

  /* This is for displaying our self-view. */
  const localParticipant = useLocalParticipant();
  const isAlone = useMemo(
    () => remoteParticipantIds?.length < 1 || screens?.length < 1,
    [remoteParticipantIds, screens]
  );

  useEffect(() => {
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    if (showCustomVideo) {
      selfieSegmentation.reset();
      contextRef.current = canvasRef.current.getContext("2d");
      const videoElement = document.getElementsByClassName("input_video")[0];
      let animationFrame;
      selfieSegmentation.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });
      selfieSegmentation.onResults(onResults);

      const sendToMediaPipe = async () => {
        await selfieSegmentation.send({ image: videoElement });
        animationFrame = requestAnimationFrame(sendToMediaPipe);
        if (!customVideoRef.current) {
          cancelAnimationFrame(animationFrame);
        }
      };
      const startStreaming = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoElement.srcObject = stream;
        sendToMediaPipe();
        const canvas = document.querySelector("canvas");
        const streamCanvas = canvas.captureStream();
        console.log(streamCanvas);
        try {
          await callObject.startCustomTrack({
            track: streamCanvas.getVideoTracks()[0],
            trackName: "background",
          });
        } catch (e) {
          console.log(e);
        }
      };
      startStreaming();
    } else {
      const stopCustom = async () => {
        await callObject.stopCustomTrack("background");
      };
      selfieSegmentation.reset();
      selfieSegmentation.close();
      stopCustom();
    }
  }, [showCustomVideo, callObject]);

  useEffect(() => {
    customVideoRef.current = customVideo;
    setShowCustomVideo(customVideo);
  }, [customVideo]);

  const onResults = (results) => {
    contextRef.current.save();
    contextRef.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    contextRef.current.drawImage(
      results.segmentationMask,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    contextRef.current.globalCompositeOperation = "source-out";
    const img = document.getElementById("background");
    const pat = contextRef.current.createPattern(img, "no-repeat");
    contextRef.current.fillStyle = pat;
    contextRef.current.fillRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Only overwrite missing pixels.
    contextRef.current.globalCompositeOperation = "destination-atop";
    contextRef.current.drawImage(
      results.image,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    contextRef.current.restore();
  };

  useEffect(() => {
    if (localParticipant?.owner && waitingParticipants.length > 0) {
      setShowAdmit(true);
    } else {
      setShowAdmit(false);
    }
  }, [waitingParticipants, callObject, localParticipant?.owner]);

  const handleAdmit = () => {
    callObject.updateWaitingParticipants({
      "*": {
        grantRequestedAccess: true,
      },
    });
  };

  const handleReject = () => {
    callObject.updateWaitingParticipants({
      "*": {
        grantRequestedAccess: false,
      },
    });
  };

  const renderCallScreen = () => {
    return (
      <>
        <div className={`${screens.length > 0 ? "is-screenshare" : "call"}`}>
          {localParticipant && (
            <>
              {!showCustomVideo ? (
                <Tile
                  id={localParticipant.session_id}
                  isLocal
                  isAlone={isAlone}
                  videoElement={inputVideoRef}
                  customVideo={customVideo}
                />
              ) : (
                <>
                  <canvas
                    className="output_canvas"
                    width="480px"
                    height="270px"
                    ref={canvasRef}
                    style={customVideo ? {} : { display: "none" }}
                  ></canvas>
                  <video
                    className="input_video"
                    autoPlay
                    style={{
                      display: "none",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  ></video>
                </>
              )}
            </>
          )}
          {showAdmit ? (
            <div style={{ color: "white" }}>
              {`Do you want to admit ${waitingParticipants.map((p, index) => {
                return `${index ? " " : ""}${p.name}`;
              })}`}
              <button type="button" style={{ margin: 4 }} onClick={handleAdmit}>
                Yes
              </button>
              <button
                type="button"
                style={{ margin: 4 }}
                onClick={handleReject}
              >
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
                <Tile
                  key={screen.screenId}
                  id={screen.session_id}
                  isScreenShare
                />
              ))}
            </>
          ) : null}
        </div>
        <div style={{ display: "none" }}>
          <img
            id="background"
            src={backImage}
            alt="background"
            width="720px"
            height="405px"
          />
        </div>
      </>
    );
  };

  return <>{getUserMediaError ? <UserMediaError /> : renderCallScreen()}</>;
}
