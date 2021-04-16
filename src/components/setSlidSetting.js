if (document.getElementById(`slid-layer`))
  document.getElementById(`slid-layer`).remove();
if (document.getElementById(`slid-player-guide-message`))
  document.getElementById(`slid-player-guide-message`).remove();
if (document.getElementById(`slid-viewer-btns-container`))
  document.getElementById(`slid-viewer-btns-container`).remove();
if (selectLayerElements) {
  selectLayerElements.forEach((layerElement) => {
    layerElement.remove();
  });
}

var lang = window.navigator.language.toLowerCase();

var guideMessageContainer = document.createElement("div");
guideMessageContainer.id = `slid-player-guide-message`;
guideMessageContainer.style = `
    position: fixed;
    top: 30px; 
    left: 50%;
    transform: translate(-50%, 0);
    z-index: 2147483647;
    font-size: 15pt;
    box-shadow: 0 0.5rem 1rem rgba(0,0,0,.15);
    border-radius: 5px;
    background-color: #FFFEFE;
    padding: 10px 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Roboto', sans-serif;
`;
guideMessageContainer.innerHTML = `
    <img src="https://www.slid.cc/src/slid_icon/play_btn.png" style="
        height: 20px;
        margin-right: 10px;
    "> ${
      lang.includes("ko")
        ? "Slid에서 재생할 동영상을 선택해주세요!"
        : "Select the video for Slid!"
    }
`;

var layer = document.createElement("div");
layer.id = `slid-layer`;
layer.style = `
    z-index: 2147483644;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(255,255,255,0.5);
`;

var isPlayerSet = false;

layer.addEventListener("click", (event) => {
  if (
    !slidPlayer.contains(event.target) &&
    !videoContainer.contains(event.target)
  ) {
    exitSlidDom(event, isPlayerSet, true);
  }
});

var slidViewsBtnsContainer = document.createElement("div");
slidViewsBtnsContainer.id = `slid-viewer-btns-container`;
slidViewsBtnsContainer.style = `
        position: fixed;
        top: 20px;
        left: 20px;
        padding: .5rem!important;
        box-shadow: 0 .5rem 1rem rgba(0,0,0,.15);
        border-radius: 5px;
        background-color: #414141;
        z-index: 2147483647;
    `;

var slidPlayer = document.createElement("iframe");
slidPlayer.scrolling = "no";
slidPlayer.style = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    
    width: 95%;
    height: 90%;
    background-color: #000;
    border-width: 0;
    overflow: hidden;
    box-shadow: 0 1rem 3rem rgba(0,0,0,.175);
    
    display: flex;
`;
slidPlayer.src = `${SlidWebHostUrl}/vdocs/new${
  SlidAccessToken !== "NO_ACCESS_TOKEN" ? `?token=${SlidAccessToken}` : ""
}`;

var videoContainer = document.createElement("div");
videoContainer.id = `original-video-container`;
videoContainer.style = `
    position: absolute;
    overflow: hidden;
    width:0;
    height:0;
`;

var YouTubePlayer = null;
var isYouTubeInnerHTML5Video = false;

var VimeoPlayer = null;

function setSlidPlayer(elementInfo) {
  window.removeEventListener("message", window.messageEventListener);

  var port = chrome.runtime.connect(null, {
    name: "SLID_CONTENT_TO_BACKGROUND_PORT",
  });

  setMessageListenerFromIframe();
  setMessageListenerFromBackground();

  function setMessageListenerFromIframe() {
    window.messageEventListener = (message) => {
      if (message.origin !== SlidWebHostUrl) return;
      try {
        var dataFromContent = message.data;
        switch (dataFromContent.action) {
          case "IFRAME_TO_CONTENT_checkExtensionVersion":
            slidPlayer.contentWindow.postMessage(
              {
                action: "CONTENT_TO_IFRAME_checkExtensionVersion",
                data: {
                  version: ExtensionVersion,
                },
              },
              "*"
            );
            break;
          case "IFRAME_TO_CONTENT_getVideoInfo":
            slidPlayer.contentWindow.postMessage(
              {
                action: "CONTENT_TO_IFRAME_getVideoInfo",
                data: {
                  videoType: elementInfo.type,
                  videoUniqueKey: elementInfo.videoUniqueKey,
                  videoUrl: elementInfo.videoUrl,
                  originUrl: window.location.href,
                },
              },
              "*"
            );

            break;

          case "IFRAME_TO_CONTENT_sendVideoRect":
            var videoRect = dataFromContent.data.videoRect;
            videoContainer.style.top = `${
              videoRect.top + slidPlayer.getBoundingClientRect().top
            }px`;
            videoContainer.style.left = `${
              videoRect.left + slidPlayer.getBoundingClientRect().left
            }px`;
            videoContainer.style.width = `${videoRect.width}px`;
            videoContainer.style.height = `${videoRect.height}px`;

            resetVideoSize();

            captureRect.left =
              videoContainer.getBoundingClientRect().left + 2.5;
            captureRect.top = videoContainer.getBoundingClientRect().top + 2.5;
            captureRect.width =
              videoContainer.getBoundingClientRect().width - 5;
            captureRect.height =
              videoContainer.getBoundingClientRect().height - 5;

            tempCaptureRect = Object.assign({}, captureRect);

            break;

          case "IFRAME_TO_CONTENT_resetCaptureArea":
            resetVideoSize();

            captureRect.left =
              videoContainer.getBoundingClientRect().left + 2.5;
            captureRect.top = videoContainer.getBoundingClientRect().top + 2.5;
            captureRect.width =
              videoContainer.getBoundingClientRect().width - 5;
            captureRect.height =
              videoContainer.getBoundingClientRect().height - 5;

            tempCaptureRect = Object.assign({}, captureRect);
            break;

          case "IFRAME_TO_CONTENT_controlVideo":
            if (elementInfo.type === "video") {
              switch (dataFromContent.data.type) {
                case "updatePlay":
                  const isPlaying = dataFromContent.data.value;
                  if (isPlaying) {
                    elementInfo.element.play();
                  } else {
                    elementInfo.element.pause();
                  }
                  break;
                case "updateVideoTime":
                  const updateTime = dataFromContent.data.value;
                  elementInfo.element.currentTime =
                    elementInfo.element.currentTime + updateTime;
                  break;
                case "updatePlaybackRate":
                  const playbackRate = dataFromContent.data.value;
                  elementInfo.element.playbackRate = playbackRate;
                  break;
                default:
                  return;
              }
            } else if (
              elementInfo.type === "youtube" ||
              elementInfo.type === "youtube_nocookie" ||
              elementInfo.type === "google_drive"
            ) {
              switch (dataFromContent.data.type) {
                case "updatePlay":
                  var isPlaying = dataFromContent.data.value;

                  if (isPlaying) {
                    if (isYouTubeInnerHTML5Video) {
                      elementInfo.element.play();
                    } else {
                      YouTubePlayer.playVideo();
                    }
                  } else {
                    if (isYouTubeInnerHTML5Video) {
                      elementInfo.element.pause();
                    } else {
                      YouTubePlayer.pauseVideo();
                    }
                  }

                  break;

                case "updateVideoTime":
                  var updateTime = dataFromContent.data.value;

                  if (isYouTubeInnerHTML5Video) {
                    elementInfo.element.currentTime =
                      elementInfo.element.currentTime + updateTime;
                  } else {
                    YouTubePlayer.seekTo(
                      YouTubePlayer.getCurrentTime() + updateTime,
                      true
                    );
                  }

                  break;
                case "updatePlaybackRate":
                  var playbackRate = dataFromContent.data.value;

                  if (isYouTubeInnerHTML5Video) {
                    elementInfo.element.playbackRate = playbackRate;
                  } else {
                    YouTubePlayer.setPlaybackRate(playbackRate);
                  }

                  break;
                default:
                  return;
              }
            } else if (elementInfo.type === "vimeo") {
              switch (dataFromContent.data.type) {
                case "updatePlay":
                  var isPlaying = dataFromContent.data.value;
                  if (isPlaying) {
                    VimeoPlayer.play();
                  } else {
                    VimeoPlayer.pause();
                  }
                  break;
                case "updateVideoTime":
                  VimeoPlayer.getCurrentTime().then(function (
                    vimeoCurrentTime
                  ) {
                    var vimeoUpdateTime = dataFromContent.data.value;
                    VimeoPlayer.setCurrentTime(
                      vimeoCurrentTime + vimeoUpdateTime >= 0
                        ? vimeoCurrentTime + vimeoUpdateTime
                        : 0
                    );
                  });

                  break;
                case "updatePlaybackRate":
                  const playbackRate = dataFromContent.data.value;
                  VimeoPlayer.setPlaybackRate(playbackRate);

                  break;
                default:
                  return;
              }
            }
            break;

          case "IFRAME_TO_CONTENT_setCaptureArea":
            setCaptureArea();
            break;

          case "IFRAME_TO_CONTENT_removeCaptureArea":
            document.getElementById("slid-video-capture-area").remove();
            break;

          case "IFRAME_TO_CONTENT_setCurrentCaptureArea":
            captureRect = Object.assign({}, tempCaptureRect);
            slidPlayer.contentWindow.postMessage(
              {
                action: "CONTENT_TO_IFRAME_setCurrentCaptureArea",
                data: {
                  rect: captureRect,
                  canvasRect: {
                    top: document
                      .getElementById("slid-video-capture-area")
                      .getBoundingClientRect().top,
                    left: document
                      .getElementById("slid-video-capture-area")
                      .getBoundingClientRect().left,
                  },
                },
              },
              "*"
            );
            document.getElementById("slid-video-capture-area").remove();
            break;

          case "IFRAME_TO_CONTENT_captureCurrentArea":
            slidViewsBtnsContainer.style.display = "none";

            if (!captureRect.top) {
              captureRect.left = videoContainer.getBoundingClientRect().left;
              captureRect.top = videoContainer.getBoundingClientRect().top;
              captureRect.width = videoContainer.getBoundingClientRect().width;
              captureRect.height = videoContainer.getBoundingClientRect().height;
            }

            var captureTime = null;
            switch (elementInfo.type) {
              case "video":
                captureTime = elementInfo.element.currentTime;
                break;
              case "iframe":
                break;
              case "youtube":
              case "youtube_nocookie":
              case "google_drive":
                captureTime = isYouTubeInnerHTML5Video
                  ? elementInfo.element.currentTime
                  : YouTubePlayer.getCurrentTime();
                break;
              case "vimeo":
                break;
              default:
                return;
            }

            if (elementInfo.type === "vimeo") {
              VimeoPlayer.getCurrentTime().then(function (vimeoCurrentTime) {
                port.postMessage({
                  action: "CONTENT_TO_BACK_captureCurrentArea",
                  data: {
                    captureRect: captureRect,
                    devicePixelRatio: window.devicePixelRatio,
                    captureTime: vimeoCurrentTime,
                  },
                });
              });
            } else {
              if (elementInfo.type === "video" || isYouTubeInnerHTML5Video) {
                elementInfo.element.controls = false;
              }

              port.postMessage({
                action: "CONTENT_TO_BACK_captureCurrentArea",
                data: {
                  captureRect: captureRect,
                  devicePixelRatio: window.devicePixelRatio,
                  captureTime: captureTime,
                },
              });
            }

            break;

          case "IFRAME_TO_CONTENT_autoCapture":
            if (!captureRect.top) {
              captureRect.left = videoContainer.getBoundingClientRect().left;
              captureRect.top = videoContainer.getBoundingClientRect().top;
              captureRect.width = videoContainer.getBoundingClientRect().width;
              captureRect.height = videoContainer.getBoundingClientRect().height;
            }

            var captureTime = null;
            switch (elementInfo.type) {
              case "video":
                captureTime = elementInfo.element.currentTime;
                break;
              case "iframe":
                break;
              case "youtube":
              case "youtube_nocookie":
              case "google_drive":
                captureTime = isYouTubeInnerHTML5Video
                  ? elementInfo.element.currentTime
                  : YouTubePlayer.getCurrentTime();
                break;
              case "vimeo":
                break;
              default:
                return;
            }

            if (elementInfo.type === "vimeo") {
              VimeoPlayer.getCurrentTime().then(function (vimeoCurrentTime) {
                port.postMessage({
                  action: "CONTENT_TO_BACK_autoCapture",
                  data: {
                    captureRect: captureRect,
                    devicePixelRatio: window.devicePixelRatio,
                    captureTime: vimeoCurrentTime,
                  },
                });
              });
            } else {
              if (elementInfo.type === "video" || isYouTubeInnerHTML5Video) {
                elementInfo.element.controls = false;
              }

              port.postMessage({
                action: "CONTENT_TO_BACK_autoCapture",
                data: {
                  captureRect: captureRect,
                  devicePixelRatio: window.devicePixelRatio,
                  captureTime: captureTime,
                },
              });
            }

            break;

          case "IFRAME_TO_CONTENT_seekToTimestamp":
            if (elementInfo.type === "video") {
              elementInfo.element.currentTime = dataFromContent.data.timestamp;
            } else if (
              elementInfo.type === "youtube" ||
              elementInfo.type === "youtube_nocookie" ||
              elementInfo.type === "google_drive"
            ) {
              if (isYouTubeInnerHTML5Video) {
                elementInfo.element.currentTime =
                  dataFromContent.data.timestamp;
              } else {
                YouTubePlayer.seekTo(dataFromContent.data.timestamp, true);
              }
            } else if (elementInfo.type === "vimeo") {
              VimeoPlayer.setCurrentTime(dataFromContent.data.timestamp);
            }
            break;

          case "IFRAME_TO_CONTENT_getVideoDownloadUrl":
            port.postMessage({
              action: "CONTENT_TO_BACK_getVideoDownloadUrl",
              data: {},
            });
            break;
          case "IFRAME_TO_CONTENT_StartRecordClip":
            if (!captureRect.top) {
              captureRect.left = videoContainer.getBoundingClientRect().left;
              captureRect.top = videoContainer.getBoundingClientRect().top;
              captureRect.width = videoContainer.getBoundingClientRect().width;
              captureRect.height = videoContainer.getBoundingClientRect().height;
            }

            let windowRect = {
              width: window.innerWidth,
              height: window.innerHeight,
            };

            port.postMessage({
              action: "CONTENT_TO_BACK_StartRecordClip",
              data: {
                captureRect: captureRect,
                windowRect: windowRect,
                devicePixelRatio: window.devicePixelRatio,
                audioBitsPerSecond: dataFromContent.data.audioBitsPerSecond,
                videoWidth: dataFromContent.data.videoWidth,
                videoHeight: dataFromContent.data.videoHeight,
                videoFrameRate: dataFromContent.data.videoFrameRate,
              },
            });
            break;

          case "IFRAME_TO_CONTENT_StopRecordClip":
            port.postMessage({
              action: "CONTENT_TO_BACK_StopRecordClip",
              data: {},
            });
            break;

          case "IFRAME_TO_CONTENT_SplitOnDragStart":
            videoContainer.style.pointerEvents = "none";
            break;
          case "IFRAME_TO_CONTENT_SplitOnDragEnd":
            videoContainer.style.pointerEvents = "unset";
            break;
          default:
            return;
        }
      } catch (e) {
        // do nothing
      }
    };

    window.addEventListener("message", window.messageEventListener);
  }

  function setMessageListenerFromBackground() {
    port.onMessage.addListener(async (message) => {
      switch (message.action) {
        case "BACK_TO_CONTENT_sendCaptureImg":
          if (message.data.captureTime !== null) {
            slidPlayer.contentWindow.postMessage(
              `
                            {
                                "action": "CONTENT_TO_IFRAME_sendCaptureImg",
                                "data": {
                                    "captureImgBase64": ${JSON.stringify(
                                      message.data.captureImgBase64
                                    )},
                                    "captureTime": ${JSON.stringify(
                                      message.data.captureTime
                                    )},
                                    "videoType": ${JSON.stringify(
                                      elementInfo.type
                                    )},
                                    "videoUniqueKey": ${JSON.stringify(
                                      elementInfo.videoUniqueKey
                                    )},
                                    "videoUrl": ${JSON.stringify(
                                      elementInfo.videoUrl
                                    )},
                                    "originUrl": ${JSON.stringify(
                                      window.location.href
                                    )}
                                }
                            }
                        `,
              "*"
            );
          } else {
            slidPlayer.contentWindow.postMessage(
              `
                            {
                                "action": "CONTENT_TO_IFRAME_sendCaptureImg",
                                "data": {
                                    "captureImgBase64": ${JSON.stringify(
                                      message.data.captureImgBase64
                                    )},
                                    "videoType": ${JSON.stringify(
                                      elementInfo.type
                                    )},
                                    "videoUniqueKey": ${JSON.stringify(
                                      elementInfo.videoUniqueKey
                                    )},
                                    "videoUrl": ${JSON.stringify(
                                      elementInfo.videoUrl
                                    )},
                                    "originUrl": ${JSON.stringify(
                                      window.location.href
                                    )}
                                }
                            }
                        `,
              "*"
            );
          }

          slidViewsBtnsContainer.style.display = "block";

          if (elementInfo.type === "video") {
            elementInfo.element.controls = true;
          }

          break;
        case "BACK_TO_CONTENT_sendAutoCaptureImg":
          if (message.data.captureTime !== null) {
            slidPlayer.contentWindow.postMessage(
              `
                            {
                                "action": "CONTENT_TO_IFRAME_sendAutoCaptureImg",
                                "data": {
                                    "captureImgBase64": ${JSON.stringify(
                                      message.data.captureImgBase64
                                    )},
                                    "captureTime": ${JSON.stringify(
                                      message.data.captureTime
                                    )},
                                    "videoType": ${JSON.stringify(
                                      elementInfo.type
                                    )},
                                    "videoUniqueKey": ${JSON.stringify(
                                      elementInfo.videoUniqueKey
                                    )},
                                    "videoUrl": ${JSON.stringify(
                                      elementInfo.videoUrl
                                    )},
                                    "originUrl": ${JSON.stringify(
                                      window.location.href
                                    )}
                                }
                            }
                        `,
              "*"
            );
          } else {
            slidPlayer.contentWindow.postMessage(
              `
                            {
                                "action": "CONTENT_TO_IFRAME_sendAutoCaptureImg",
                                "data": {
                                    "captureImgBase64": ${JSON.stringify(
                                      message.data.captureImgBase64
                                    )},
                                    "videoType": ${JSON.stringify(
                                      elementInfo.type
                                    )},
                                    "videoUniqueKey": ${JSON.stringify(
                                      elementInfo.videoUniqueKey
                                    )},
                                    "videoUrl": ${JSON.stringify(
                                      elementInfo.videoUrl
                                    )},
                                    "originUrl": ${JSON.stringify(
                                      window.location.href
                                    )}
                                }
                            }
                        `,
              "*"
            );
          }

          if (elementInfo.type === "video") {
            elementInfo.element.controls = true;
          }

          break;
        case "BACK_TO_CONTENT_getVideoDownloadUrl":
          let videoDownloadUrl = null;

          switch (elementInfo.type) {
            case "video":
              videoDownloadUrl = elementInfo.videoUrl;
              break;
            case "iframe":
              videoDownloadUrl = message.data.videoDownloadUrl;
              break;
            case "google_drive":
              videoDownloadUrl = `https://drive.google.com/file/d/${elementInfo.videoUniqueKey}/view`;
              break;
            case "youtube":
            case "youtube_nocookie":
              videoDownloadUrl = elementInfo.videoUrl;
              break;
            case "vimeo":
              videoDownloadUrl = elementInfo.videoUrl;
              break;
            default:
              return;
          }

          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_getVideoDownloadUrl",
              data: {
                videoDownloadUrl: videoDownloadUrl,
              },
            },
            "*"
          );

          break;
        case "BACK_TO_CONTENT_detectVideoDownloadUrl":
          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_detectVideoDownloadUrl",
              data: {
                videoDownloadUrl: message.data.videoDownloadUrl,
              },
            },
            "*"
          );

          break;
        case "BACK_TO_CONTENT_detectVideoDownloadUrl":
          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_detectVideoDownloadUrl",
              data: {
                videoDownloadUrl: message.data.videoDownloadUrl,
              },
            },
            "*"
          );
          break;
        case "BACK_TO_CONTENT_sendVideoBlobURL":
          const blobURL = message.data.blobURL;
          const posterUrl = message.data.posterUrl;
          const response = await fetch(blobURL);

          const blob = await response.blob();

          // blob is not transferable object. transferable object is an object that can be transfered between different execution contexts.
          // arrayBuffer is transferable object
          const buffer = await blob.arrayBuffer();
          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_sendVideoArrayBuffer",
              data: {
                buffer,
                posterUrl,
              },
            },
            "*"
          );

          URL.revokeObjectURL(blobURL);
          break;
        default:
          return;
      }
    });
  }

  function resetVideoSize() {
    elementInfo.element.style = `
            width: 100%!important;
            height: 100%!important;
            overflow: hidden;
        `;
  }

  // set listener end

  // set slid player & video

  setSlidViewsBtnsContainer();
  layer.appendChild(slidPlayer);

  guideMessageContainer.remove();
  selectLayerElements.forEach((layerElement) => {
    layerElement.remove();
  });

  var isFailed = false;

  function setSlidViewsBtnsContainer() {
    // set slid player controller btns

    var slidHideBtn = document.createElement("img");
    slidHideBtn.src = `${SlidWebHostUrl}/src/design/assets/slid_video_show_icon.png`;
    slidHideBtn.style = `
        cursor: pointer;
        width: 25px;
        display: inline;
    `;
    slidHideBtn.addEventListener("click", toggleSlidDom);

    var isSlidHidden = false;
    var isFullScreen = false;

    function toggleSlidDom(event) {
      layer.style.display = isSlidHidden ? "block" : "none";

      if (isSlidHidden) {
        isSlidHidden = false;
        slidHideBtn.src = `${SlidWebHostUrl}/src/design/assets/slid_video_show_icon.png`;

        layer.style.display = "block";
      } else {
        isSlidHidden = true;
        slidHideBtn.src = `${SlidWebHostUrl}/src/design/assets/slid_video_hide_icon.png`;

        layer.style.display = "none";
      }
    }

    var slidFullScreenBtn = document.createElement("img");
    slidFullScreenBtn.src = `${SlidWebHostUrl}/src/design/assets/slid_video_expand_icon.png`;
    slidFullScreenBtn.className = `slid-fullscreen-btn`;
    slidFullScreenBtn.style = `
        cursor: pointer;
        margin-right: 0.3rem!important;
        width: 25px;
        display: inline;
    `;
    slidFullScreenBtn.addEventListener("click", (event) => {
      // full screen
      if (isFullScreen) {
        document.webkitExitFullscreen();
        isFullScreen = false;

        slidPlayer.style.width = "90%";
        slidPlayer.style.height = "90%";

        slidFullScreenBtn.src = `${SlidWebHostUrl}/src/design/assets/slid_video_expand_icon.png`;
      } else {
        document.documentElement.webkitRequestFullscreen();
        isFullScreen = true;

        slidPlayer.style.width = "100%";
        slidPlayer.style.height = "100%";

        slidFullScreenBtn.src = `${SlidWebHostUrl}/src/design/assets/slid_video_shrink_icon.png`;
      }
    });

    var slidCloseBtnImg = document.createElement("img");
    slidCloseBtnImg.src = `${SlidWebHostUrl}/src/design/assets/slid_video_close_icon.png`;
    slidCloseBtnImg.style = `
        cursor: pointer;
        margin-right: 0.3rem!important;
        width: 25px;
        display: inline;
    `;
    slidCloseBtnImg.addEventListener("click", exitSlidDom);

    slidViewsBtnsContainer.appendChild(slidCloseBtnImg);
    slidViewsBtnsContainer.appendChild(slidFullScreenBtn);
    slidViewsBtnsContainer.appendChild(slidHideBtn);

    document.body.appendChild(slidViewsBtnsContainer);
  }

  if (elementInfo.type === "video") {
    var embedPlayer = getEmbedPlayerFromVideoUrl(
      elementInfo.element.currentSrc
    );
    if (embedPlayer.type) {
      switch (embedPlayer.type) {
        case "youtube":
          elementInfo.element.pause();

          elementInfo.yotubueOriginElement = elementInfo.element;
          elementInfo.element = document.createElement("iframe");
          elementInfo.element.setAttribute("data-hj-allow-iframe", "");
          elementInfo.element.src = embedPlayer.url;
          elementInfo.type = "youtube";
          elementInfo.videoUniqueKey = embedPlayer.videoId;
          elementInfo.videoUrl = embedPlayer.url;

          break;
        case "vimeo":
          elementInfo.element.pause();

          elementInfo.element = document.createElement("iframe");
          elementInfo.element.setAttribute("data-hj-allow-iframe", "");
          elementInfo.element.src = embedPlayer.url;
          elementInfo.type = "vimeo";
          elementInfo.videoUniqueKey = embedPlayer.videoId;
          elementInfo.videoUrl = embedPlayer.url;

          break;
        default:
          // iframe

          elementInfo.element = document.createElement("iframe");
          elementInfo.element.setAttribute("data-hj-allow-iframe", "");
          elementInfo.element.src = embedPlayer.url;
          elementInfo.type = "iframe";
          elementInfo.videoUniqueKey = embedPlayer.videoId;
          elementInfo.videoUrl = embedPlayer.url;

          return;
      }
    } else {
      elementInfo.element.controls = true;
      elementInfo.element.controlsList = "nodownload";
      elementInfo.videoUniqueKey = elementInfo.element.src;

      elementInfo.element.addEventListener("click", (event) => {
        event.preventDefault();
      });

      if (elementInfo.element.currentSrc.includes("blob:")) {
        elementInfo.videoUniqueKey = lastM3u8UniqueKey;
        elementInfo.videoUrl = lastM3u8Url;
      } else {
        elementInfo.videoUniqueKey = elementInfo.element.currentSrc;
        elementInfo.videoUrl = elementInfo.element.currentSrc;
      }

      elementInfo.element.pause();
    }

    function getEmbedPlayerFromVideoUrl(videoSrc) {
      var embedPlayerWebsites = [
        {
          type: "youtube",
          videoUrl: "www.youtube.com/",
        },
        {
          type: "vimeo",
          videoUrl: "blob:https://vimeo.com",
        },
      ];

      var embedPlayer = {};
      embedPlayerWebsites.forEach((embedPlayerWebsite) => {
        if (videoSrc.includes(embedPlayerWebsite.videoUrl)) {
          switch (embedPlayerWebsite.type) {
            case "youtube":
              var youtubeId = null;
              if (window.location.href.includes("youtube.com/watch?")) {
                youtubeId = window.location.search.split("v=")[1];
                var ampersandPosition = youtubeId.indexOf("&");
                if (ampersandPosition != -1) {
                  youtubeId = youtubeId.substring(0, ampersandPosition);
                }
              } else if (window.location.href.includes("youtube.com/embed/")) {
                youtubeId = window.location.href
                  .split("?")[0]
                  .split("embed/")[1];
              } else if (window.location.href.includes("youtu.be/")) {
                youtubeId = window.location.href
                  .split("?")[0]
                  .split("youtu.be/")[1];
              } else if (
                window.location.href.includes("youtube-nocookie.com/embed/")
              ) {
                youtubeId = window.location.href
                  .split("?")[0]
                  .split("youtube-nocookie.com/embed/")[1];
              }

              if (youtubeId) {
                youtubeId = youtubeId.replace("/", "");

                embedPlayer.type = "youtube";
                embedPlayer.url = `https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`;
                embedPlayer.videoId = youtubeId;
              } else {
                embedPlayer.type = "iframe";
                embedPlayer.url = videoSrc;
                embedPlayer.videoId = videoSrc;
              }

              break;

            case "vimeo":
              var vimeoId = null;
              if (window.location.href.includes("//vimeo.com/")) {
                vimeoId = window.location.href
                  .split("?")[0]
                  .split("vimeo.com/")[1];
              } else if (
                window.location.href.includes("player.vimeo.com/video/")
              ) {
                vimeoId = window.location.href
                  .split("?")[0]
                  .split("player.vimeo.com/video/")[1];
              }

              if (vimeoId) {
                embedPlayer.type = "vimeo";
                embedPlayer.url = `https://player.vimeo.com/video/${vimeoId}?api=1`;
                embedPlayer.videoId = vimeoId;
              } else {
                embedPlayer.type = "iframe";
                embedPlayer.url = videoSrc;
                embedPlayer.videoId = videoSrc;
              }

              break;
            default:
              // error
              port.postMessage({
                action: "CONTENT_TO_BACK_error",
                data: {
                  msg: "SLID_EXTENSION_getEmbedPlayerFromVideoUrl_ERROR",
                },
              });

              alert(
                lang.includes("ko")
                  ? "에러가 발생했습니다! 다시 시도해주세요! 😅"
                  : "Oops! Something went wrong. Please try again. 😅"
              );
              isFailed = true;
              return;
          }
        }
      });

      return embedPlayer;
    }
  } else {
    // when iframe

    var knownEmbedPlayerWebsites = [
      {
        type: "youtube",
        embedUrl: "//www.youtube.com/embed/",
      },
      {
        type: "youtube_nocookie",
        embedUrl: "//www.youtube-nocookie.com/embed/",
      },
      {
        type: "google_drive",
        embedUrl: "//youtube.googleapis.com/embed/",
      },
      {
        type: "vimeo",
        embedUrl: "//player.vimeo.com/video/",
      },
    ];

    var isEmbedPlayerFound = false;
    var foundEmbedPlayerWebsite = null;

    knownEmbedPlayerWebsites.forEach((embedPlayerWebsite) => {
      if (elementInfo.element.src.includes(embedPlayerWebsite.embedUrl)) {
        if (isEmbedPlayerFound) return;

        isEmbedPlayerFound = true;
        foundEmbedPlayerWebsite = embedPlayerWebsite;
      }
    });

    if (isEmbedPlayerFound) {
      elementInfo.type = foundEmbedPlayerWebsite.type;

      switch (elementInfo.type) {
        case "youtube":
          var iframeOriginUrl;

          if (elementInfo.element.src.includes("?")) {
            iframeOriginUrl =
              elementInfo.element.src.split("?")[0] + "?enablejsapi=1";
          } else {
            iframeOriginUrl = elementInfo.element.src + "?enablejsapi=1";
          }

          elementInfo.element = document.createElement("iframe");
          elementInfo.element.src = iframeOriginUrl;

          var videoId = elementInfo.element.src
            .split("?")[0]
            .split("youtube.com/embed/")[1]
            .replace("/", "");
          elementInfo.videoUniqueKey = videoId;
          elementInfo.videoUrl = elementInfo.element.src;

          break;
        case "youtube_nocookie":
          var iframeOriginUrl;

          if (elementInfo.element.src.includes("?")) {
            iframeOriginUrl =
              elementInfo.element.src.split("?")[0] + "?enablejsapi=1";
          } else {
            iframeOriginUrl = elementInfo.element.src + "?enablejsapi=1";
          }

          elementInfo.element = document.createElement("iframe");
          elementInfo.element.src = iframeOriginUrl;

          var videoId = elementInfo.element.src
            .split("?")[0]
            .split("youtube-nocookie.com/embed/")[1]
            .replace("/", "");
          elementInfo.videoUniqueKey = videoId;
          elementInfo.videoUrl = elementInfo.element.src;

          break;
        case "vimeo":
          var iframeOriginUrl;

          if (elementInfo.element.src.includes("?")) {
            iframeOriginUrl = elementInfo.element.src.split("?")[0] + "?api=1";
          } else {
            iframeOriginUrl = elementInfo.element.src + "?api=1";
          }

          elementInfo.element = document.createElement("iframe");
          elementInfo.element.src = iframeOriginUrl;

          var videoId = elementInfo.element.src
            .split("?")[0]
            .split("player.vimeo.com/video/")[1]
            .replace("/", "");
          elementInfo.videoUniqueKey = videoId;
          elementInfo.videoUrl = elementInfo.element.src;

          break;
        case "google_drive":
          var iframeOriginUrl;

          if (!elementInfo.element.src.includes("enablejsapi=1")) {
            iframeOriginUrl = elementInfo.element.src + "&enablejsapi=1";
          } else {
            iframeOriginUrl = elementInfo.element.src;
          }

          try {
            elementInfo.element = document.createElement("iframe");
            elementInfo.element.src = iframeOriginUrl;

            var videoId = new URLSearchParams(elementInfo.element.src).get(
              "docid"
            );
            elementInfo.videoUniqueKey = videoId;
            elementInfo.videoUrl = elementInfo.element.src;

            break;
          } catch (e) {
            // error

            port.postMessage({
              action: "CONTENT_TO_BACK_error",
              data: {
                msg: "SLID_EXTENSION_URLSearchParams_ERROR",
              },
            });
            alert(
              lang.includes("ko")
                ? "에러가 발생했습니다! 다시 시도해주세요! 😅"
                : "Oops! Something went wrong. Please try again. 😅"
            );
            isFailed = true;

            break;
          }

        default:
          port.postMessage({
            action: "CONTENT_TO_BACK_error",
            data: {
              msg: "SLID_EXTENSION_foundEmbedPlayerWebsite.type_ERROR",
            },
          });
          alert(
            lang.includes("ko")
              ? "에러가 발생했습니다! 다시 시도해주세요! 😅"
              : "Oops! Something went wrong. Please try again. 😅"
          );
          isFailed = true;

          return;
      }
    } else {
      var iframeOriginUrl = elementInfo.element.src;

      elementInfo.type = "iframe";
      elementInfo.element = document.createElement("iframe");
      elementInfo.element.src = iframeOriginUrl;

      if (
        iframeOriginUrl &&
        typeof iframeOriginUrl === "string" &&
        (iframeOriginUrl.includes("eclass3.cau.ac.kr") ||
          iframeOriginUrl.includes("portfolio.ajou.ac.kr") ||
          iframeOriginUrl.includes("https://ncms.yonsei.ac.kr/em/"))
      ) {
        elementInfo.videoUniqueKey = iframeOriginUrl.split(/[?#]/)[0];
      } else {
        elementInfo.videoUniqueKey = iframeOriginUrl;
      }

      elementInfo.videoUrl = iframeOriginUrl;
    }
  }

  if (isFailed) return;

  elementInfo.element.className = "";
  elementInfo.element.id = "slid-video-player";
  elementInfo.element.style = `
                width: 100%!important;
                height: 100%!important;
                overflow: hidden;
            `;
  elementInfo.element.scrolling = "no";

  if (document.body.contains(elementInfo.element)) {
    var videoOriginPosition = document.createElement(`span`);
    videoOriginPosition.id = `slid-video-origin-position`;
    videoOriginPosition.style.display = `none`;
    elementInfo.element.outerHTML = videoOriginPosition.outerHTML;
  }

  videoContainer.appendChild(elementInfo.element);
  layer.appendChild(videoContainer);

  isPlayerSet = true;

  setVideoEventListener(elementInfo);

  function setVideoEventListener(elementInfo) {
    switch (elementInfo.type) {
      case "video":
        elementInfo.element.addEventListener("play", () => {
          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_playedVideo",
              data: {},
            },
            "*"
          );
        });
        elementInfo.element.addEventListener("pause", () => {
          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_pausedVideo",
              data: {},
            },
            "*"
          );
        });
        break;

      case "youtube":
      case "youtube_nocookie":
      case "google_drive":
        YouTubePlayer = new YT.Player("slid-video-player", {
          videoId: elementInfo.videoId,
          events: {
            onStateChange: onPlayerStateChange,
            onPlaybackRateChange: onPlayerPlaybackRateChange,
            onError: onPlayerError,
          },
        });

        var lastState = YT.PlayerState.PAUSED;
        function onPlayerStateChange(event) {
          if (event.data === lastState) return;

          if (event.data === YT.PlayerState.PLAYING) {
            slidPlayer.contentWindow.postMessage(
              {
                action: "CONTENT_TO_IFRAME_playedVideo",
                data: {},
              },
              "*"
            );
          } else if (event.data === YT.PlayerState.PAUSED) {
            slidPlayer.contentWindow.postMessage(
              {
                action: "CONTENT_TO_IFRAME_pausedVideo",
                data: {},
              },
              "*"
            );
          }

          lastState = event.data;
        }

        function onPlayerPlaybackRateChange(event) {
          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_changePlaybackRate",
              data: {
                value: event.data,
              },
            },
            "*"
          );
        }

        function onPlayerError(event) {
          if (event.data === 101 || event.data === 150) {
            // if youtube embed is not available, use html5 video inside the youtube.
            if (window.location.href.includes("//www.youtube.com")) {
              elementInfo.element = elementInfo.yotubueOriginElement;

              videoContainer.innerHTML = "";
              videoContainer.appendChild(elementInfo.element);
              elementInfo.element.style = `
                            width: 100%!important;
                            height: 100%!important;
                            `;
              elementInfo.element.controls = true;
              elementInfo.element.controlsList = "nodownload";
              isYouTubeInnerHTML5Video = true;

              elementInfo.element.addEventListener("play", () => {
                elementInfo.element.controls = true;
                elementInfo.element.style = `
                                    width: 100%!important;
                                    height: 100%!important;
                                `;
                slidPlayer.contentWindow.postMessage(
                  {
                    action: "CONTENT_TO_IFRAME_playedVideo",
                    data: {},
                  },
                  "*"
                );
              });
              elementInfo.element.addEventListener("pause", () => {
                elementInfo.element.controls = true;
                elementInfo.element.style = `
                                    width: 100%!important;
                                    height: 100%!important;
                                `;
                slidPlayer.contentWindow.postMessage(
                  {
                    action: "CONTENT_TO_IFRAME_pausedVideo",
                    data: {},
                  },
                  "*"
                );
              });
              elementInfo.element.addEventListener("timeupdate", () => {
                elementInfo.element.controls = true;
              });
              elementInfo.element.addEventListener("seeked", () => {
                elementInfo.element.controls = true;
              });
              elementInfo.element.addEventListener("seeking", () => {
                elementInfo.element.controls = true;
              });
            }
          }
        }

        break;
      case "vimeo":
        VimeoPlayer = new Vimeo.Player(elementInfo.element);

        VimeoPlayer.on("play", () => {
          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_playedVideo",
              data: {},
            },
            "*"
          );
        });
        VimeoPlayer.on("pause", () => {
          slidPlayer.contentWindow.postMessage(
            {
              action: "CONTENT_TO_IFRAME_pausedVideo",
              data: {},
            },
            "*"
          );
        });

        break;
      default:
        return;
    }
  }
}

var captureRect = {};
var tempCaptureRect = {};
function setCaptureArea() {
  const captureArea = document.createElement("canvas");
  captureArea.id = `slid-video-capture-area`;
  captureArea.style = `
        position: absolute;
        top: 0;
        left: 0;
        cursor: crosshair;
    `;
  captureArea.width = videoContainer.getBoundingClientRect().width;
  captureArea.height = videoContainer.getBoundingClientRect().height;

  videoContainer.appendChild(captureArea);

  let rectStartX = 2.5;
  let rectStartY = 2.5;

  let captureAreaWidth = captureArea.getBoundingClientRect().width - 5;
  let captureAreaHeight = captureArea.getBoundingClientRect().height - 5;

  if (captureRect.top) {
    rectStartX = captureRect.left - captureArea.getBoundingClientRect().left;
    rectStartY = captureRect.top - captureArea.getBoundingClientRect().top;
    captureAreaWidth = captureRect.width;
    captureAreaHeight = captureRect.height;
  } else {
    captureRect.left = captureArea.getBoundingClientRect().left;
    captureRect.top = captureArea.getBoundingClientRect().top;
    captureRect.width = captureArea.getBoundingClientRect().width;
    captureRect.height = captureArea.getBoundingClientRect().height;
  }

  const captureAreaCtx = captureArea.getContext("2d");

  captureAreaCtx.clearRect(
    0,
    0,
    captureArea.getBoundingClientRect().width,
    captureArea.getBoundingClientRect().height
  ); //clear canvas
  captureAreaCtx.beginPath();
  captureAreaCtx.rect(
    rectStartX,
    rectStartY,
    captureAreaWidth,
    captureAreaHeight
  );
  captureAreaCtx.strokeStyle = "#007bff";
  captureAreaCtx.setLineDash([10, 5]);
  captureAreaCtx.lineWidth = 5;
  captureAreaCtx.stroke();

  const canvasx = captureArea.getBoundingClientRect().left;
  const canvasy = captureArea.getBoundingClientRect().top;

  let last_mousex = 0;
  let last_mousey = 0;
  let mousex = 0;
  let mousey = 0;
  let mousedown = false;

  let absoluteStartX = 0;
  let absoluteStartY = 0;

  captureArea.addEventListener("mousedown", (e) => {
    absoluteStartX = parseInt(e.clientX);
    absoluteStartY = parseInt(e.clientY);

    last_mousex = parseInt(e.clientX - canvasx);
    last_mousey = parseInt(e.clientY - canvasy);

    mousedown = true;
  });

  captureArea.addEventListener("mouseup", (e) => {
    mousedown = false;
  });

  captureArea.addEventListener("mousemove", (e) => {
    mousex = parseInt(e.clientX - canvasx);
    mousey = parseInt(e.clientY - canvasy);
    if (mousedown) {
      captureAreaCtx.clearRect(0, 0, captureArea.width, captureArea.height); //clear canvas
      captureAreaCtx.beginPath();
      const width = mousex - last_mousex;
      const height = mousey - last_mousey;
      captureAreaCtx.rect(last_mousex, last_mousey, width, height);
      captureAreaCtx.fillRect(last_mousex, last_mousey, width, height);
      captureAreaCtx.fillStyle = "rgba(255,255,255,0.3)";
      captureAreaCtx.strokeStyle = "#007bff";
      captureAreaCtx.setLineDash([10, 5]);
      captureAreaCtx.lineWidth = 5;
      captureAreaCtx.stroke();

      tempCaptureRect.top =
        height >= 0 ? absoluteStartY : absoluteStartY + height;
      tempCaptureRect.left =
        width >= 0 ? absoluteStartX : absoluteStartX + width;
      tempCaptureRect.width = width >= 0 ? width : Math.abs(width);
      tempCaptureRect.height = height >= 0 ? height : Math.abs(height);
    }
  });
}

function exitSlidDom(event, isPlayerSet = true, shouldShowConfirm = false) {
  if (isPlayerSet) {
    if (shouldShowConfirm) {
      const shouldLeave = confirm(
        lang.includes("ko")
          ? "Slid를 종료하시겠어요?"
          : "Are you sure you want to leave?"
      );
      if (shouldLeave) {
        var videoOriginPosition = document.getElementById(
          `slid-video-origin-position`
        );
        if (videoOriginPosition) {
          videoOriginPosition.appendChild(
            document.getElementById(`slid-video-player`)
          );
          videoOriginPosition.replaceWith(videoOriginPosition.firstChild);
        }

        layer.remove();
        guideMessageContainer.remove();
        selectLayerElements.forEach((layerElement) => {
          layerElement.remove();
        });
        slidViewsBtnsContainer.remove();

        window.removeEventListener("message", window.messageEventListener);
      } else {
        return;
      }
    } else {
      var videoOriginPosition = document.getElementById(
        `slid-video-origin-position`
      );
      if (videoOriginPosition) {
        videoOriginPosition.appendChild(
          document.getElementById(`slid-video-player`)
        );
        videoOriginPosition.replaceWith(videoOriginPosition.firstChild);
      }

      layer.remove();
      guideMessageContainer.remove();
      selectLayerElements.forEach((layerElement) => {
        layerElement.remove();
      });
      slidViewsBtnsContainer.remove();

      window.removeEventListener("message", window.messageEventListener);
    }
  } else {
    var videoOriginPosition = document.getElementById(
      `slid-video-origin-position`
    );
    if (videoOriginPosition) {
      videoOriginPosition.appendChild(
        document.getElementById(`slid-video-player`)
      );
      videoOriginPosition.replaceWith(videoOriginPosition.firstChild);
    }

    layer.remove();
    guideMessageContainer.remove();
    selectLayerElements.forEach((layerElement) => {
      layerElement.remove();
    });

    window.removeEventListener("message", window.messageEventListener);
  }
}

var selectLayerElements = [];
function setLayersOnVideosAndIframes() {
  var videos = document.getElementsByTagName("video");
  var videoRectInfos = [];
  Array.from(videos).forEach((videoElement) => {
    videoRectInfos.push({
      element: videoElement,
      rect: videoElement.getBoundingClientRect(),
      type: "video",
    });
  });

  var iframes = document.getElementsByTagName("iframe");
  var iframeRectInfos = [];
  Array.from(iframes).forEach((iframeElement) => {
    if (iframeElement.src.includes(SlidWebHostUrl)) return;

    if (
      iframeElement.src === undefined ||
      iframeElement.src === "about:blank"
    ) {
      // only look inside iframe if iframe has un-openable url
      try {
        var iframeDocument = iframeElement.contentDocument;

        var innerVideos = iframeDocument.getElementsByTagName("video");
        Array.from(innerVideos).forEach((videoElement) => {
          videoRectInfos.push({
            element: videoElement,
            rect: videoElement.getBoundingClientRect(),
            type: "video",
          });
        });

        var innerIframes = iframeDocument.getElementsByTagName("iframe");
        Array.from(innerIframes).forEach((iframeElement) => {
          if (!iframeElement.src) return;
          iframeRectInfos.push({
            element: iframeElement,
            rect: iframeElement.getBoundingClientRect(),
            type: "iframe",
          });
        });
      } catch (e) {
        // do nothing
      }
    } else {
      iframeRectInfos.push({
        element: iframeElement,
        rect: iframeElement.getBoundingClientRect(),
        type: "iframe",
      });
    }
  });

  if (videoRectInfos.length === 0 && iframeRectInfos.length === 0) {
    return false;
  } else {
    videoRectInfos.forEach((videoRectInfo) => {
      var videoLayer = document.createElement("div");
      videoLayer.style = `
                position: absolute;
                top: ${
                  videoRectInfo.rect.top + document.documentElement.scrollTop
                }px;
                left: ${
                  videoRectInfo.rect.left + document.documentElement.scrollLeft
                }px;
                z-index: 2147483646;
                
                width: ${videoRectInfo.rect.width}px;
                height: ${videoRectInfo.rect.height}px;
                
                background-color: rgba(184, 234, 252,0.5);
                
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
            `;

      var slidPlayImg = document.createElement("img");
      slidPlayImg.src = "https://www.slid.cc/src/slid_icon/play_btn.png";
      slidPlayImg.style = `
                cursor: pointer;
                width: 100px;
            `;

      slidPlayImg.addEventListener("click", () => {
        setSlidPlayer(videoRectInfo);
      });

      videoLayer.appendChild(slidPlayImg);
      selectLayerElements.push(videoLayer);
      document.body.appendChild(videoLayer);
    });

    iframeRectInfos.forEach((iframeRectInfo) => {
      var iframeLayer = document.createElement("div");
      iframeLayer.style = `
                position: absolute;
                top: ${
                  iframeRectInfo.rect.top + document.documentElement.scrollTop
                }px;
                left: ${
                  iframeRectInfo.rect.left + document.documentElement.scrollLeft
                }px;
                z-index: 2147483645;
                
                width: ${iframeRectInfo.rect.width}px;
                height: ${iframeRectInfo.rect.height}px;
                
                background-color: rgba(184, 234, 252,0.5);
                
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
            `;

      var openNewTab = document.createElement("span");
      openNewTab.style = `
                position: absolute;
                top: 10px;
                right: 10px;
                cursor: pointer;
            `;
      openNewTab.addEventListener("click", () => {
        window.open(iframeRectInfo.element.src);
      });

      var newTabIcon = document.createElement("img");
      newTabIcon.src = `https://slid-public-assets.s3-us-west-1.amazonaws.com/new_tab_icon.png`;
      newTabIcon.style = `
                width: 30px;
            `;
      openNewTab.appendChild(newTabIcon);
      iframeLayer.appendChild(openNewTab);

      var slidPlayImg = document.createElement("img");
      slidPlayImg.src = "https://www.slid.cc/src/slid_icon/play_btn.png";
      slidPlayImg.style = `
                cursor: pointer;
                width: 100px;
            `;

      slidPlayImg.addEventListener("click", () => {
        setSlidPlayer(iframeRectInfo);
      });

      iframeLayer.appendChild(slidPlayImg);
      selectLayerElements.push(iframeLayer);
      document.body.appendChild(iframeLayer);
    });

    document.body.appendChild(guideMessageContainer);
    document.body.appendChild(layer);

    return true;
  }
}

setLayersOnVideosAndIframes();
