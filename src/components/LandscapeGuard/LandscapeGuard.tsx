import { ReactNode, useEffect, useState } from "react";
import "./LandscapeGuard.less";
import { isMobileBrowser, isWeixinBrowser } from "../../utils/utils";

interface LandscapeGuardProps {
  children: ReactNode;
  disabled?: boolean;
}

const isMobile = isMobileBrowser();
const isWeixin = isWeixinBrowser();

const LandscapeGuard: React.FC<LandscapeGuardProps> = ({ children }) => {
  const [isLandscape, setIsLandscape] = useState(
    window.matchMedia("(orientation: landscape)").matches,
  );

  const [isFullscreen, setIsFullscreen] = useState(
    !!document.fullscreenElement,
  );

  const updateStatus = () => {
    setIsLandscape(window.matchMedia("(orientation: landscape)").matches);

    setIsFullscreen(!!document.fullscreenElement);

    console.log('11', window.matchMedia("(orientation: landscape)"))
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: landscape)");

    const handleOrientationChange = () => {
      updateStatus();
    };

    const handleFullscreenChange = () => {
      updateStatus();
    };

    mediaQuery.addEventListener("change", handleOrientationChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    window.addEventListener("resize", handleOrientationChange);

    return () => {
      mediaQuery.removeEventListener("change", handleOrientationChange);

      document.removeEventListener("fullscreenchange", handleFullscreenChange);

      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      // 尝试锁定横屏
      if (screen.orientation?.lock) {
        try {
          await screen.orientation.lock("landscape");
        } catch (error) {
          console.log("无法锁定屏幕方向:", error);
        }
      }
    } catch (error) {
      console.log("无法进入全屏:", error);
    }

    updateStatus();
  };

  const shouldShowGuard = !isLandscape || !isFullscreen;

  return (
    <>
      {children}

      {shouldShowGuard && isMobile ? (
        <div className="landscape-guard">
          <div className="landscape-guard-content">
            <div className="rotate-icon">↻</div>
            <h2>请横屏使用</h2>
            {!isLandscape ? (
              <p>请将手机旋转至横屏模式</p>
            ) : (
              <p>请点击下方按钮进入全屏模式</p>
            )}
            {isWeixin ? (
              <>
                <p>您正使用微信浏览，若无法横屏，请使用外部浏览器访问</p>
                <p>或启用“我的” → “设置” → “通用” → “开启横屏模式” </p>
              </>
            ) : null}
            <button className="btn" onClick={enterFullscreen}>
              进入全屏
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default LandscapeGuard;
