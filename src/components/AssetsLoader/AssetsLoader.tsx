import { ReactNode, useEffect, useState } from "react";
import "./AssetsLoader.less";
import { getAllTiles, loadImage } from "../../utils/utils";
import { PProgress } from "p-progress";

interface AssetsLoaderProps {
  children: ReactNode;
  disabled?: boolean;
}

const imageUrls = getAllTiles();
const AssetsLoader: React.FC<AssetsLoaderProps> = ({ children, disabled }) => {
  const [loading, setLoading] = useState(true);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const promises = imageUrls.map(loadImage);

    const progressPromise = PProgress.allSettled(promises);
    // 3. 监听进度（0～1）
    progressPromise.onProgress((p) => {
      setProgress(p * 100);
    });

    // 4. 等待完成或失败
    progressPromise
      .then(() => {
        setLoading(false);
        setProgress(100);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  }, []);

  return (
    <>
      {children}
      {loading && !disabled ? (
        <div className="assets-loader">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${progress}%`}}></div>
            {progress > 0 && <div className="progress-label">{progress.toFixed(1)} %</div>}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default AssetsLoader;
